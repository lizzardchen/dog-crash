import { _decorator, Node, Label, Button, EditBox, EventTouch, Prefab, instantiate } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { SceneBackgroundComp } from "../comp/SceneBackgroundComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SceneData, SceneManagerData, createEmptySceneData } from "../scene/SceneData";
import { SceneScriptComp } from "../scene/SceneScriptComp";

const { ccclass, property } = _decorator;

@ccclass('MainGameUI')
@ecs.register('MainGameUI', false)
export class MainGameUI extends CCComp {
    @property(Label)
    balanceLabel: Label = null!;

    @property(Label)
    multiplierLabel: Label = null!;

    @property(Label)
    potentialWinLabel: Label = null!;

    @property(Label)
    betAmountInput: Label = null!;

    @property(Button)
    holdButton: Button = null!;

    @property(Node)
    rocketNode: Node = null!;

    @property(Node)
    sceneContainer: Node = null!;

    // 场景预制体数组
    @property({ type: [Prefab], tooltip: "地面场景预制体 [back, front]" })
    groundScenePrefabs: Prefab[] = [];

    @property({ type: [Prefab], tooltip: "天空场景预制体 [back, front]" })
    skyScenePrefabs: Prefab[] = [];

    @property({ type: [Prefab], tooltip: "太空场景预制体 [back, front]" })
    spaceScenePrefabs: Prefab[] = [];

    // 场景管理数据
    private sceneManager: SceneManagerData = {
        scenes: new Map(),
        currentScene: "ground",
        sceneContainer: null
    };

    onLoad() {
        console.log("MainGameUI loaded");

        // 初始化游戏数据
        this.initGameData();

        // 设置UI事件监听
        this.setupUIEvents();

        // 初始化UI显示
        this.updateUI();
    }

    private initGameData(): void {
        if (!smc.crashGame) {
            console.error("CrashGame entity not found in smc");
            return;
        }

        // 初始化本地数据
        const localData = smc.crashGame.get(LocalDataComp);
        if (localData && localData.currentCrashMultiplier === 0) {
            localData.currentCrashMultiplier = localData.generateCrashMultiplier();
            console.log(`Generated crash multiplier: ${localData.currentCrashMultiplier.toFixed(2)}x`);
        }

        // 初始化场景管理系统
        this.initSceneManager();
    }

    /** 初始化场景管理系统 */
    private initSceneManager(): void {
        if (!smc.crashGame) return;

        // 设置场景容器
        this.sceneManager.sceneContainer = this.sceneContainer;

        // 初始化场景数据
        this.initSceneData();

        // 加载并激活默认场景
        this.loadScene("ground").then(() => {
            this.switchToScene("ground");
        });

        console.log("Scene manager initialized");
    }

    /** 初始化场景数据 */
    private initSceneData(): void {
        // 创建地面场景数据
        const groundScene = createEmptySceneData("ground");
        groundScene.backPrefab = this.groundScenePrefabs[0] || null;
        groundScene.frontPrefab = this.groundScenePrefabs[1] || null;
        this.sceneManager.scenes.set("ground", groundScene);

        // 创建天空场景数据
        const skyScene = createEmptySceneData("sky");
        skyScene.backPrefab = this.skyScenePrefabs[0] || null;
        skyScene.frontPrefab = this.skyScenePrefabs[1] || null;
        this.sceneManager.scenes.set("sky", skyScene);

        // 创建太空场景数据
        const spaceScene = createEmptySceneData("space");
        spaceScene.backPrefab = this.spaceScenePrefabs[0] || null;
        spaceScene.frontPrefab = this.spaceScenePrefabs[1] || null;
        this.sceneManager.scenes.set("space", spaceScene);
    }

    /** 加载场景 */
    private async loadScene(sceneType: string): Promise<void> {
        const sceneData = this.sceneManager.scenes.get(sceneType);
        if (!sceneData || sceneData.isLoaded) return;

        try {
            // 加载背景层
            if (sceneData.backPrefab) {
                sceneData.backNode = instantiate(sceneData.backPrefab);
                sceneData.backScript = sceneData.backNode.getComponent(SceneScriptComp);
                if (this.sceneContainer) {
                    this.sceneContainer.addChild(sceneData.backNode);
                }
            }

            // 加载前景层
            if (sceneData.frontPrefab) {
                sceneData.frontNode = instantiate(sceneData.frontPrefab);
                sceneData.frontScript = sceneData.frontNode.getComponent(SceneScriptComp);
                if (this.sceneContainer) {
                    this.sceneContainer.addChild(sceneData.frontNode);
                }
            }

            sceneData.isLoaded = true;
            console.log(`Scene ${sceneType} loaded successfully`);

        } catch (error) {
            console.error(`Failed to load scene ${sceneType}:`, error);
        }
    }

    /** 切换到指定场景 */
    private switchToScene(sceneType: string): void {
        // 停用当前场景
        if (this.sceneManager.currentScene) {
            this.deactivateScene(this.sceneManager.currentScene);
        }

        // 激活新场景
        this.activateScene(sceneType);
        this.sceneManager.currentScene = sceneType;

        console.log(`Switched to scene: ${sceneType}`);
    }

    /** 激活场景 */
    private activateScene(sceneType: string): void {
        const sceneData = this.sceneManager.scenes.get(sceneType);
        if (!sceneData || !sceneData.isLoaded) return;

        // 激活背景层
        if (sceneData.backScript) {
            sceneData.backScript.setActive(true);
        }

        // 激活前景层
        if (sceneData.frontScript) {
            sceneData.frontScript.setActive(true);
        }

        sceneData.isActive = true;
    }

    /** 停用场景 */
    private deactivateScene(sceneType: string): void {
        const sceneData = this.sceneManager.scenes.get(sceneType);
        if (!sceneData || !sceneData.isActive) return;

        // 停用背景层
        if (sceneData.backScript) {
            sceneData.backScript.setActive(false);
        }

        // 停用前景层
        if (sceneData.frontScript) {
            sceneData.frontScript.setActive(false);
        }

        sceneData.isActive = false;
    }

    /** 更新场景滚动速度 */
    private updateSceneScrollSpeed(speedMultiplier: number): void {
        const currentSceneData = this.sceneManager.scenes.get(this.sceneManager.currentScene);
        if (!currentSceneData || !currentSceneData.isActive) return;

        // 更新背景层速度
        if (currentSceneData.backScript) {
            currentSceneData.backScript.updateScrollSpeed(speedMultiplier * 0.6); // 背景层较慢
        }

        // 更新前景层速度
        if (currentSceneData.frontScript) {
            currentSceneData.frontScript.updateScrollSpeed(speedMultiplier * 1.2); // 前景层较快
        }
    }

    private setupUIEvents(): void {
        // HOLD按钮事件（只有在按钮存在时才绑定）
        if (this.holdButton) {
            // 使用触摸事件而不是点击事件，实现按住交互
            this.holdButton.node.on(Node.EventType.TOUCH_START, this.onHoldButtonTouchStart, this);
            this.holdButton.node.on(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
            this.holdButton.node.on(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
        }

        // 下注金额输入事件（只有在输入框存在时才绑定）
        if (this.betAmountInput) {
            this.betAmountInput.node.on(EditBox.EventType.TEXT_CHANGED, this.onBetAmountChanged, this);
        }

        // 监听游戏事件
        oops.message.on("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.on("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.on("GAME_STARTED", this.onGameStarted, this);
        oops.message.on("SCENE_CHANGED", this.onSceneChanged, this);
    }

    private onHoldButtonTouchStart(event: EventTouch): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        if (gameState.state === GameState.WAITING) {
            // 开始游戏 - 按下按钮时开始
            const betAmount = this.betAmountInput ? (parseFloat(this.betAmountInput.string) || 0) : 100;
            if (this.validateBetAmount(betAmount)) {
                CrashGameAudio.playButtonClick();

                betting.betAmount = betAmount;
                betting.isHolding = true;
                gameState.state = GameState.FLYING;
                gameState.startTime = Date.now();
                multiplier.startTime = Date.now();

                CrashGameAudio.playDogRocketLaunch();
                this.updateHoldButtonState();
                this.addButtonPressedEffect();

                console.log(`Game started with bet: ${betAmount} - HOLD button pressed`);
                oops.message.dispatchEvent("GAME_STARTED", { betAmount });
            }
        }
    }

    private onHoldButtonTouchEnd(event: EventTouch): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        if (gameState.state === GameState.FLYING && betting.isHolding) {
            // 提现 - 松开按钮时提现
            betting.isHolding = false;
            gameState.state = GameState.CASHED_OUT;
            multiplier.cashOutMultiplier = multiplier.currentMultiplier;

            this.removeButtonPressedEffect();
            this.processCashOut();

            console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x - HOLD button released`);
        }
    }

    private addButtonPressedEffect(): void {
        // 添加按钮按下时的视觉反馈
        if (this.holdButton) {
            this.holdButton.node.scale = this.holdButton.node.scale.clone().multiplyScalar(0.95);
        }
    }

    private removeButtonPressedEffect(): void {
        // 移除按钮按下时的视觉反馈
        if (this.holdButton) {
            this.holdButton.node.scale = this.holdButton.node.scale.clone().multiplyScalar(1 / 0.95);
        }
    }

    private validateBetAmount(amount: number): boolean {
        if (!smc.crashGame) return false;

        const betting = smc.crashGame.get(BettingComp);

        if (amount <= 0) {
            console.warn("Invalid bet amount:", amount);
            return false;
        }

        if (amount > betting.balance) {
            console.warn("Insufficient balance:", amount, "vs", betting.balance);
            return false;
        }

        return true;
    }

    private processCashOut(): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        const winAmount = betting.betAmount * multiplier.cashOutMultiplier;
        betting.balance += winAmount - betting.betAmount;

        CrashGameAudio.playCashOutSuccess();
        console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x, won: ${winAmount.toFixed(0)}`);

        this.scheduleOnce(() => {
            this.resetGame();
        }, 2);
    }

    private onGameCrashed(data: any): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        betting.balance -= betting.betAmount;

        CrashGameAudio.playCrashExplosion();
        console.log(`Game crashed at ${data.crashMultiplier.toFixed(2)}x`);

        this.scheduleOnce(() => {
            this.resetGame();
        }, 2);
    }

    private onGameCashedOut(data: any): void {
        console.log(`Game cashed out at ${data.cashOutMultiplier.toFixed(2)}x`);
    }

    private onGameStarted(data: any): void {
        console.log(`Game started with bet: ${data.betAmount}`);
        this.updateUI();
    }

    private onSceneChanged(data: any): void {
        console.log(`Scene changed from ${data.oldScene} to ${data.newScene} at ${data.multiplier.toFixed(2)}x`);

        // 加载新场景（如果未加载）
        this.loadScene(data.newScene).then(() => {
            // 切换到新场景
            this.switchToScene(data.newScene);
        });
    }

    private resetGame(): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const sceneComp = smc.crashGame.get(SceneBackgroundComp);

        // 重置游戏状态
        gameState.reset();
        betting.reset();
        multiplier.reset();
        sceneComp.reset();

        // 生成新的崩盘倍数
        localData.currentCrashMultiplier = localData.generateCrashMultiplier();

        // 重置场景到地面场景
        this.switchToScene("ground");

        this.updateHoldButtonState();
        this.updateUI();

        console.log(`Game reset, ready for next round. Target crash: ${localData.currentCrashMultiplier.toFixed(2)}x`);
    }

    private onBetAmountChanged(): void {
        this.updatePotentialWin();
    }

    private updateUI(): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        // 安全更新余额显示
        if (this.balanceLabel) {
            this.balanceLabel.string = `${CrashGameLanguage.getText("balance")}: ${betting.balance.toFixed(0)}`;
        }

        // 安全更新倍数显示
        if (this.multiplierLabel) {
            this.multiplierLabel.string = `${multiplier.currentMultiplier.toFixed(2)}x`;
        }

        // 更新潜在收益
        this.updatePotentialWin();
    }

    private updatePotentialWin(): void {
        if (!smc.crashGame || !this.potentialWinLabel) return;

        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        const betAmount = this.betAmountInput ? (parseFloat(this.betAmountInput.string) || 0) : 0;

        const potentialWin = betAmount * multiplier.currentMultiplier;
        this.potentialWinLabel.string = ` ${potentialWin.toFixed(0)}`;
    }

    private updateHoldButtonState(): void {
        if (!smc.crashGame || !this.holdButton) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const buttonLabel = this.holdButton.getComponentInChildren(Label);

        switch (gameState.state) {
            case GameState.WAITING:
                if (buttonLabel) {
                    buttonLabel.string = CrashGameLanguage.getText("hold_to_fly");
                }
                this.holdButton.interactable = true;
                this.removeButtonPressedEffect();
                break;
            case GameState.FLYING:
                if (betting.isHolding) {
                    if (buttonLabel) {
                        buttonLabel.string = CrashGameLanguage.getText("release_to_cash_out");
                    }
                    this.holdButton.interactable = true;
                } else {
                    if (buttonLabel) {
                        buttonLabel.string = CrashGameLanguage.getText("cashed_out");
                    }
                    this.holdButton.interactable = false;
                    this.removeButtonPressedEffect();
                }
                break;
            case GameState.CRASHED:
            case GameState.CASHED_OUT:
                if (buttonLabel) {
                    buttonLabel.string = CrashGameLanguage.getText("game_over");
                }
                this.holdButton.interactable = false;
                this.removeButtonPressedEffect();
                break;
            default:
                this.holdButton.interactable = false;
                this.removeButtonPressedEffect();
                break;
        }
    }

    update(deltaTime: number) {
        // 实时更新UI显示
        this.updateUI();

        // 更新场景滚动速度
        if (smc.crashGame) {
            const multiplier = smc.crashGame.get(MultiplierComp);
            const gameState = smc.crashGame.get(GameStateComp);

            if (gameState.state === GameState.FLYING && multiplier) {
                const speedMultiplier = Math.min(1 + (multiplier.currentMultiplier - 1) * 0.3, 5);
                this.updateSceneScrollSpeed(speedMultiplier);
            }
        }
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.off("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.off("GAME_STARTED", this.onGameStarted, this);
        oops.message.off("SCENE_CHANGED", this.onSceneChanged, this);

        // 清理按钮事件监听
        if (this.holdButton) {
            this.holdButton.node.off(Node.EventType.TOUCH_START, this.onHoldButtonTouchStart, this);
            this.holdButton.node.off(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
            this.holdButton.node.off(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
        }
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
    }
}