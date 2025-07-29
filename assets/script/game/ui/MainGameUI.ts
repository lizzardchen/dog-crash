import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SceneData } from "../scene/SceneData";
import { SceneScriptComp } from '../scene/SceneScriptComp';

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
    backScene: Node = null!;

    @property(Node)
    frontScene: Node = null!;

    // 可扩展的场景配置数组
    @property({ type: [SceneData], tooltip: "场景配置数组，根据rocket状态自动排序 (ground->sky->atmosphere->space)" })
    sceneConfigs: SceneData[] = [];



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

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (sceneComp) {
            // 设置场景节点引用
            sceneComp.setSceneNodes(this.backScene, this.frontScene);

            // 设置场景配置
            sceneComp.setSceneConfigs(this.sceneConfigs);

            // 初始化场景实例
            this.initSceneInstances(sceneComp);

            // 初始化场景状态 - 只显示第一个场景
            this.initSceneVisibility(sceneComp);

            console.log(`Extensible scene system initialized with ${this.sceneConfigs.length} scenes`);
        }
    }

    /** 初始化场景实例 */
    private initSceneInstances(sceneComp: SceneBackgroundComp): void {
        sceneComp.sceneInstances = [];

        this.sceneConfigs.forEach((config) => {
            const sceneInstance: SceneInstance = {
                sceneName: config.sceneName,
                backNode: null,
                frontNode: null,
                backScrollSpeed: config.backScrollSpeed,
                frontScrollSpeed: config.frontScrollSpeed
            };

            // 实例化背景层预制体
            if (config.backPrefab && this.backScene) {
                const backNode = instantiate(config.backPrefab);
                backNode.name = config.sceneName;
                backNode.active = false; // 初始隐藏
                this.backScene.addChild(backNode);
                sceneInstance.backNode = backNode;
            }

            // 实例化前景层预制体
            if (config.frontPrefab && this.frontScene) {
                const frontNode = instantiate(config.frontPrefab);
                frontNode.name = config.sceneName;
                frontNode.active = false; // 初始隐藏
                this.frontScene.addChild(frontNode);
                sceneInstance.frontNode = frontNode;
            }

            sceneComp.sceneInstances.push(sceneInstance);
            console.log(`Scene initialized: ${config.sceneName} (${config.rocketState}) - Path: ${config.getPrefabPath("back")}, ${config.getPrefabPath("front")}`);
        });
    }

    /** 初始化场景可见性 */
    private initSceneVisibility(sceneComp: SceneBackgroundComp): void {
        console.log(`Initializing scene visibility with ${sceneComp.sceneInstances.length} scenes`);

        // 隐藏所有场景
        sceneComp.sceneInstances.forEach((instance, index) => {
            if (instance.backNode) {
                instance.backNode.active = false;
                console.log(`Hidden back scene ${index}: ${instance.sceneName}`);
            }
            if (instance.frontNode) {
                instance.frontNode.active = false;
                console.log(`Hidden front scene ${index}: ${instance.sceneName}`);
            }
        });

        // 显示第一个场景（地面场景）
        if (sceneComp.sceneInstances.length > 0) {
            const firstScene = sceneComp.sceneInstances[0];
            if (firstScene.backNode) {
                firstScene.backNode.active = true;
                console.log(`Activated back scene: ${firstScene.sceneName}`);
            }
            if (firstScene.frontNode) {
                firstScene.frontNode.active = true;
                console.log(`Activated front scene: ${firstScene.sceneName}`);
            }
            sceneComp.currentSceneIndex = 0;

            // 立即启动场景脚本
            this.activateSceneScripts(firstScene);

            console.log(`Scene initialization complete. Current scene: ${firstScene.sceneName}`);
        } else {
            console.error("No scene instances found during initialization!");
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

    private onHoldButtonTouchStart(_event: EventTouch): void {
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

    private onHoldButtonTouchEnd(_event: EventTouch): void {
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

        // 安全检查data.crashMultiplier
        const crashMultiplier = data && data.crashMultiplier ? data.crashMultiplier : 1.0;
        console.log(`Game crashed at ${crashMultiplier.toFixed(2)}x`);

        this.scheduleOnce(() => {
            this.resetGame();
        }, 2);
    }

    private onGameCashedOut(data: any): void {
        // 安全检查data.cashOutMultiplier
        const cashOutMultiplier = data && data.cashOutMultiplier ? data.cashOutMultiplier : 1.0;
        console.log(`Game cashed out at ${cashOutMultiplier.toFixed(2)}x`);
    }

    private onGameStarted(data: any): void {
        console.log(`Game started with bet: ${data.betAmount}`);
        this.updateUI();
    }

    private onSceneChanged(data: any): void {
        // 安全检查data属性
        const oldScene = data && data.oldScene ? data.oldScene : 'unknown';
        const newScene = data && data.newScene ? data.newScene : 'unknown';
        const multiplier = data && data.multiplier ? data.multiplier : 1.0;
        console.log(`Scene changed from ${oldScene} to ${newScene} at ${multiplier.toFixed(2)}x`);
        // 场景切换由SceneBackgroundSystem自动处理，这里只需要记录日志
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
        this.resetToGroundScene();

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

    update(_deltaTime: number) {
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

    /** 重置到地面场景 */
    private resetToGroundScene(): void {
        if (!smc.crashGame) return;

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (sceneComp && sceneComp.sceneInstances.length > 0) {
            // 查找地面场景索引
            const groundIndex = sceneComp.sceneConfigs.findIndex(config => config.rocketState === 'ground');
            if (groundIndex !== -1) {
                // 隐藏所有场景
                sceneComp.sceneInstances.forEach(instance => {
                    if (instance.backNode) instance.backNode.active = false;
                    if (instance.frontNode) instance.frontNode.active = false;
                });

                // 显示地面场景
                const groundScene = sceneComp.sceneInstances[groundIndex];
                if (groundScene.backNode) groundScene.backNode.active = true;
                if (groundScene.frontNode) groundScene.frontNode.active = true;
                sceneComp.currentSceneIndex = groundIndex;

                console.log("Reset to ground scene");
            }
        }
    }

    /** 激活场景脚本 */
    private activateSceneScripts(sceneInstance: SceneInstance): void {
        // 查找对应的场景配置以获取场景类型
        const sceneConfig = this.sceneConfigs.find(config => config.sceneName === sceneInstance.sceneName);
        const sceneType = sceneConfig ? sceneConfig.rocketState : 'ground'; // 默认为ground

        console.log(`🔄 Activating scene scripts for: ${sceneInstance.sceneName} (${sceneType})`);

        // 激活背景层脚本
        if (sceneInstance.backNode) {
            console.log(`Checking back node: ${sceneInstance.backNode.name}, active: ${sceneInstance.backNode.active}`);

            // 尝试多种方式获取组件
            let backScript: SceneScriptComp = sceneInstance.backNode.getComponent(SceneScriptComp) as SceneScriptComp;

            if (!backScript) {
                // 尝试从子节点查找
                backScript = sceneInstance.backNode.getComponentInChildren(SceneScriptComp) as SceneScriptComp;
            }

            if (backScript) {
                backScript.setSceneInfo(sceneType, 'back');
                backScript.setActive(true);
                console.log(`✓ Activated back script for: ${sceneInstance.sceneName} (${sceneType})`);
            } else {
                console.warn(`✗ No SceneScriptComp found on back node: ${sceneInstance.sceneName}`);
                // 列出所有组件用于调试
                const components = sceneInstance.backNode.getComponents(Component);
                console.log(`Available components on back node:`, components.map(c => c.constructor.name));
            }
        }

        // 激活前景层脚本
        if (sceneInstance.frontNode) {
            console.log(`Checking front node: ${sceneInstance.frontNode.name}, active: ${sceneInstance.frontNode.active}`);

            // 尝试多种方式获取组件
            let frontScript: SceneScriptComp = sceneInstance.frontNode.getComponent(SceneScriptComp) as SceneScriptComp;

            if (!frontScript) {
                // 尝试从子节点查找
                frontScript = sceneInstance.frontNode.getComponentInChildren(SceneScriptComp) as SceneScriptComp;
            }

            if (frontScript) {
                frontScript.setSceneInfo(sceneType, 'front');
                frontScript.setActive(true);
                console.log(`✓ Activated front script for: ${sceneInstance.sceneName} (${sceneType})`);
            } else {
                console.warn(`✗ No SceneScriptComp found on front node: ${sceneInstance.sceneName}`);
                // 列出所有组件用于调试
                const components = sceneInstance.frontNode.getComponents(Component);
                console.log(`Available components on front node:`, components.map(c => c.constructor.name));
            }
        }
    }

    /** 更新场景滚动速度 */
    private updateSceneScrollSpeed(speedMultiplier: number): void {
        if (!smc.crashGame) return;

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (sceneComp) {
            // 设置当前的速度倍数，由SceneBackgroundSystem使用
            sceneComp.currentSpeedMultiplier = speedMultiplier;
        }
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
    }
}