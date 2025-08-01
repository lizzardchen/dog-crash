import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component, ScrollView, Prefab, tween, Vec3, UITransform, Sprite, Color } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp, BetAmountItem } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { GameHistoryComp } from "../comp/GameHistoryComp";
import { EnergyComp } from "../comp/EnergyComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SceneData } from "../scene/SceneData";
import { SceneScriptComp } from '../scene/SceneScriptComp';
import { UIID } from "../common/config/GameUIConfig";
import { GameResultUI, GameResultParams } from "./GameResultUI";
import { AutoCashOutUI, AutoCashOutParams } from "./AutoCashOutUI";
import { RaceUI } from "./RaceUI";
import { UICallbacks } from "../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";

const { ccclass, property } = _decorator;

/**
 * 下注金额项接口
 */
interface BetAmountItem {
    display: string;    // 显示文本 (如 "free", "1K", "1M")
    value: number;      // 实际数值 (如 90, 1000, 1000000)
    isFree: boolean;    // 是否为免费模式
}

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

    @property(Button)
    historyButton: Button = null!;

    @property(Button)
    betButton: Button = null!;

    @property(Button)
    autoBetButton: Button = null!;

    @property(Button)
    energyButton: Button = null!;

    @property(Label)
    energyLabel: Label = null!;

    @property(Button)
    raceButton: Button = null!;

    @property(Label)
    raceCountdownLabel: Label = null!;

    @property(Node)
    betPanel: Node = null!;

    @property(ScrollView)
    betScrollView: ScrollView = null!;

    @property(Node)
    betItemContainer: Node = null!;

    @property(Prefab)
    betItemPrefab: Prefab = null!;

    @property(Node)
    rocketNode: Node = null!;

    @property(Node)
    backScene: Node = null!;

    @property(Node)
    frontScene: Node = null!;

    // 可扩展的场景配置数组
    @property({ type: [SceneData], tooltip: "场景配置数组，根据rocket状态自动排序 (ground->sky->atmosphere->space)" })
    sceneConfigs: SceneData[] = [];

    private isBetPanelVisible: boolean = false;
    private raceUpdateTimer: number = 0;
    private readonly RACE_UPDATE_INTERVAL = 10000; // 10秒更新一次

    /**
     * 将数值转换为短文本格式
     * @param value 数值
     * @returns 短文本 (如: 1000 -> "1K", 1000000 -> "1M")
     */
    private formatValueToShortText(value: number): string {
        if (!smc.crashGame) return value.toString();

        const betting = smc.crashGame.get(BettingComp);
        return betting ? betting.formatValueToShortText(value) : value.toString();
    }

    private formatValueFromShotText(value: string): number {
        if (value.endsWith("M")) {
            return parseFloat(value.slice(0, -1)) * 1000000;
        } else if (value.endsWith("K")) {
            return parseFloat(value.slice(0, -1)) * 1000;
        } else {
            return parseFloat(value);
        }
    }



    onLoad() {
        console.log("MainGameUI loaded");

        // 初始化游戏数据
        this.initGameData();

        // 设置UI事件监听
        this.setupUIEvents();

        // 初始化下注面板
        this.initBetPanel();

        // 初始化UI显示
        this.updateUI();
        
        // 初始化比赛倒计时显示
        this.updateRaceCountdownDisplay();
    }

    private initGameData(): void {
        if (!smc.crashGame) {
            console.error("CrashGame entity not found in smc");
            return;
        }
        // 初始化本地数据组件（不在这里生成崩盘倍率，由游戏系统处理）
        const localData = smc.crashGame.get(LocalDataComp);

        // 初始化下注组件
        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            betting.init();
        }

        // 初始化历史记录
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        if (gameHistory && localData) {
            gameHistory.initializeHistory(localData);
        }

        // 初始化能源系统
        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            energy.init();
        }

        // 初始化场景管理系统
        this.initSceneManager();
        this.updateHoldButtonState();
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

        // 历史记录按钮事件
        if (this.historyButton) {
            this.historyButton.node.on(Button.EventType.CLICK, this.onHistoryButtonClick, this);
        }

        // 下注按钮事件
        if (this.betButton) {
            this.betButton.node.on(Button.EventType.CLICK, this.onBetButtonClick, this);
        }

        // 自动下注按钮事件
        if (this.autoBetButton) {
            this.autoBetButton.node.on(Button.EventType.CLICK, this.onAutoBetButtonClick, this);
        }

        // 能源按钮事件
        if (this.energyButton) {
            this.energyButton.node.on(Button.EventType.CLICK, this.onEnergyButtonClick, this);
        }

        // 比赛按钮事件
        if (this.raceButton) {
            this.raceButton.node.on(Button.EventType.CLICK, this.onRaceButtonClick, this);
        }

        // 监听游戏事件
        oops.message.on("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.on("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.on("GAME_STARTED", this.onGameStarted, this);
        oops.message.on("ENERGY_CHANGED", this.onEnergyChanged, this);
        oops.message.on("SCENE_CHANGED", this.onSceneChanged, this);
    }

    private onHoldButtonTouchStart(_event: EventTouch): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        if (gameState.state === GameState.WAITING) {
            // 用户手动按下HOLD按钮 - 禁用自动下注，切换到手动模式
            if (betting.autoCashOutEnabled) {
                console.log("MainGameUI: User pressed HOLD, disabling auto betting");
                betting.setAutoCashOut(false);
                this.updateAutoBetButtonState();
            }
            // 检查并消耗能源（每局游戏都消耗1个能源）
            if (!this.consumeEnergy(1)) {
                console.warn("Not enough energy to start game");
                // TODO: 显示能源不足提示
                oops.gui.toast("Energy not enough!");
                return;
            }

            // 开始游戏 - 按下按钮时开始
            const betAmount = betting.currentBetItem.value;
            const isFreeMode = betting.currentBetItem.isFree;

            const localData = smc.crashGame.get(LocalDataComp);
            localData.generateCrashMultiplierAsync().then((remote_mulitplier: number) => {
                localData.currentCrashMultiplier = remote_mulitplier;
                if (this.validateBetAmount(betAmount, isFreeMode)) {


                    CrashGameAudio.playButtonClick();

                    betting.betAmount = betAmount;
                    betting.isHolding = true;
                    gameState.state = GameState.FLYING;
                    gameState.startTime = Date.now();
                    multiplier.startTime = Date.now();

                    CrashGameAudio.playDogRocketLaunch();
                    this.updateHoldButtonState();
                    this.addButtonPressedEffect();

                    console.log(`Game started with bet: ${betAmount} (free: ${isFreeMode}) - HOLD button pressed (manual mode)`);
                    oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
                }

            }).catch((error) => {
                console.error("Failed to generate crash multiplier", error);
            });
        }
    }

    private onHoldButtonTouchEnd(_event: EventTouch): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        if (gameState.state === GameState.FLYING && betting.isHolding) {
            // 用户手动提现 - 如果当前是自动模式，切换到手动模式
            if (betting.autoCashOutEnabled) {
                console.log("MainGameUI: User manually cashed out, disabling auto betting");
                betting.setAutoCashOut(false);
                this.updateAutoBetButtonState();
            }

            // 提现 - 松开按钮时提现
            betting.isHolding = false;
            gameState.state = GameState.CASHED_OUT;
            multiplier.cashOutMultiplier = multiplier.currentMultiplier;

            this.removeButtonPressedEffect();
            this.processCashOut();

            console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x - HOLD button released (manual cashout)`);
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

    private validateBetAmount(amount: number, isFreeMode: boolean = false): boolean {
        if (!smc.crashGame) return false;

        const betting = smc.crashGame.get(BettingComp);

        if (amount <= 0) {
            console.warn("Invalid bet amount:", amount);
            return false;
        }

        // 免费模式不需要检查余额
        if (!isFreeMode && amount > betting.balance) {
            console.warn("Insufficient balance:", amount, "vs", betting.balance);
            return false;
        }

        return true;
    }

    private processCashOut(): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);

        const winAmount = betting.betAmount * multiplier.cashOutMultiplier;
        let profit: number;

        // 免费模式：不扣除下注金额，收益就是全部奖金
        if (betting.currentBetItem.isFree) {
            profit = winAmount;
            betting.balance += winAmount; // 免费模式直接加奖金
        } else {
            profit = winAmount - betting.betAmount;
            betting.balance += profit; // 正常模式加净收益
        }

        // 记录服务器预设的崩盘倍数（不是玩家提现的倍数）
        if (gameHistory && localData) {
            const serverCrashMultiplier = localData.currentCrashMultiplier;
            gameHistory.addCrashRecord(serverCrashMultiplier, localData);
            console.log(`Recorded server crash multiplier: ${serverCrashMultiplier.toFixed(2)}x (player cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x)`);
        }

        console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x, won: ${winAmount.toFixed(0)} (free: ${betting.currentBetItem.isFree})`);

        // 游戏成功：退还消耗的能源
        if (this.refundEnergy(1)) {
            console.log("Game won - energy refunded");
        }

        // 延迟显示成功结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: true,
                profit: profit
            });
        }, 0.2);
    }

    private onGameCrashed(_data: any): void {
        console.log("MainGameUI: onGameCrashed event received", _data);
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        const localData = smc.crashGame.get(LocalDataComp);

        let loss: number;

        // 免费模式：不扣除余额，损失为0
        if (betting.currentBetItem.isFree) {
            loss = 0; // 免费模式没有实际损失
        } else {
            betting.balance -= betting.betAmount;
            loss = betting.betAmount;
        }

        // 游戏失败：能源已消耗，不退还
        console.log("Game crashed - energy consumed (not refunded)");

        CrashGameAudio.playCrashExplosion();

        // 使用服务器预设的崩盘倍数（而不是data.crashMultiplier）
        const serverCrashMultiplier = localData ? localData.currentCrashMultiplier : 1.0;

        // 添加崩盘记录到历史并保存到本地存储
        if (gameHistory && localData) {
            gameHistory.addCrashRecord(serverCrashMultiplier, localData);
        }

        console.log(`Game crashed at ${serverCrashMultiplier.toFixed(2)}x (free: ${betting.currentBetItem.isFree})`);

        // 延迟显示失败结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: false,
                profit: -loss
            });
        }, 0.2);
    }

    private onGameCashedOut(data: any): void {
        console.log("MainGameUI: onGameCashedOut event received", data);

        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);

        // 安全检查data.cashOutMultiplier
        const cashOutMultiplier = data && data.cashOutMultiplier ? data.cashOutMultiplier : 1.0;
        console.log(`MainGameUI: Game cashed out at ${cashOutMultiplier.toFixed(2)}x`);

        // 计算收益并更新余额（和processCashOut相同的逻辑）
        const winAmount = betting.betAmount * cashOutMultiplier;
        let profit: number;

        // 免费模式：不扣除下注金额，收益就是全部奖金
        if (betting.currentBetItem.isFree) {
            profit = winAmount;
            betting.balance += winAmount; // 免费模式直接加奖金
        } else {
            profit = winAmount - betting.betAmount;
            betting.balance += profit; // 正常模式加净收益
        }

        // 游戏成功：退还消耗的能源
        if (this.refundEnergy(1)) {
            console.log("Game won - energy refunded");
        }

        // 记录服务器预设的崩盘倍数（不是玩家提现的倍数）
        if (gameHistory && localData) {
            const serverCrashMultiplier = localData.currentCrashMultiplier;
            gameHistory.addCrashRecord(serverCrashMultiplier, localData);
            console.log(`MainGameUI: Recorded server crash multiplier: ${serverCrashMultiplier.toFixed(2)}x (player cashed out at ${cashOutMultiplier.toFixed(2)}x)`);
        }

        console.log(`MainGameUI: Auto cashed out at ${cashOutMultiplier.toFixed(2)}x, won: ${winAmount.toFixed(0)} (free: ${betting.currentBetItem.isFree})`);

        // 延迟显示成功结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: true,
                profit: profit
            });
        }, 0.2);
    }

    private onGameStarted(data: any): void {
        console.log(`Game started with bet: ${data.betAmount}`);
        console.log("=== Game Started - Debug Info ===");

        if (smc.crashGame) {
            const gameHistory = smc.crashGame.get(GameHistoryComp);
            const localData = smc.crashGame.get(LocalDataComp);

            if (gameHistory && localData) {
                console.log(`Current history length: ${gameHistory.crashHistory.length}`);
                console.log(`Latest crash multiplier: ${gameHistory.getLatestCrashMultiplier()}`);
                console.log(`Target crash multiplier for this round: ${localData.currentCrashMultiplier.toFixed(2)}x`);
            }
        }

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
        const sceneComp = smc.crashGame.get(SceneBackgroundComp);

        // 重置游戏状态
        gameState.reset();
        betting.reset();
        multiplier.reset();
        sceneComp.reset();

        // 重置场景到地面场景
        this.resetToGroundScene();

        this.updateHoldButtonState();
        this.updateUI();

        console.log(`MainGameUI: Game reset, ready for next round`);
    }

    private onBetAmountChanged(): void {
        this.updatePotentialWin();
    }

    private onHistoryButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("History button clicked - opening history popup");

        // 触发打开历史记录弹窗的事件
        oops.message.dispatchEvent("OPEN_HISTORY_POPUP");
    }

    private onBetButtonClick(): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);

        // 只有在等待状态下才能修改下注金额
        if (gameState.state !== GameState.WAITING) {
            console.log("Cannot change bet amount during game");
            return;
        }

        CrashGameAudio.playButtonClick();
        console.log("Bet button clicked - showing bet panel");

        // 检查下注面板是否存在
        if (!this.betPanel) {
            console.warn("Bet panel not found - cannot show/hide");
            return;
        }

        if (this.isBetPanelVisible) {
            this.hideBetPanel();
        } else {
            this.showBetPanel();
        }
    }

    private onAutoBetButtonClick(): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);

        CrashGameAudio.playButtonClick();

        if (betting) {
            const status = betting.getAutoCashOutStatus();

            if (status.enabled) {
                // 当前已启用，关闭自动下注（允许在任何状态下关闭）
                betting.setAutoCashOut(false);
                console.log("MainGameUI: Auto bet disabled by user (via AUTO button)");

                // 更新按钮状态
                this.updateAutoBetButtonState();
            } else {
                // 当前未启用，只有在等待状态下才能启用新的自动下注
                if (gameState.state !== GameState.WAITING) {
                    console.log("Cannot start auto bet during game - please wait for current game to finish");
                    return;
                }

                // 显示设置界面
                this.showAutoCashOutUI();
            }
        }
    }

    /**
     * 初始化下注面板
     */
    private initBetPanel(): void {
        if (!this.betPanel) {
            console.warn("BetPanel node not found - skipping bet panel initialization");
            return;
        }

        // 初始隐藏下注面板
        this.betPanel.active = false;
        this.isBetPanelVisible = false;

        // 初始化下注选项
        this.fillBetScrollView();

        console.log("Bet panel initialized");
    }

    /**
     * 显示下注面板 (从右向左滑入)
     */
    private showBetPanel(): void {
        if (!this.betPanel) return;

        this.betPanel.active = true;
        this.isBetPanelVisible = true;

        // 在动画期间禁用所有按钮交互
        this.setBetItemsInteractable(false);

        // 设置初始位置 (屏幕右侧外)
        const startPos = new Vec3(1000, 0, 0);
        const endPos = new Vec3(0, 0, 0);

        this.betPanel.setPosition(startPos);

        // 从右向左滑入动画
        tween(this.betPanel)
            .to(0.3, { position: endPos }, { easing: 'sineOut' })
            .call(() => {
                // 滑入完成后，启用按钮交互并滚动到当前选中的下注金额
                this.setBetItemsInteractable(true);
                this.scrollToCurrentBet();
            })
            .start();

        console.log("Bet panel shown");
    }

    /**
     * 隐藏下注面板 (从左向右滑出)
     */
    private hideBetPanel(): void {
        if (!this.betPanel) return;

        const endPos = new Vec3(1000, 0, 0);

        // 从左向右滑出动画
        tween(this.betPanel)
            .to(0.3, { position: endPos }, { easing: 'sineIn' })
            .call(() => {
                this.betPanel.active = false;
                this.isBetPanelVisible = false;
            })
            .start();

        console.log("Bet panel hidden");
    }

    /**
     * 填充下注ScrollView
     */
    private fillBetScrollView(): void {
        if (!this.betItemContainer) {
            console.warn("BetItemContainer not found - skipping bet scroll view fill");
            return;
        }

        if (!this.betItemPrefab) {
            console.warn("BetItemPrefab not found - skipping bet scroll view fill");
            return;
        }

        // 清空现有子节点
        this.betItemContainer.removeAllChildren();

        // 获取BettingComp
        if (!smc.crashGame) {
            console.warn("CrashGame not found - skipping bet scroll view fill");
            return;
        }

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) {
            console.warn("BettingComp not found - skipping bet scroll view fill");
            return;
        }

        // 创建下注选项
        betting.betAmountData.forEach((betItem) => {
            try {
                const itemNode = instantiate(this.betItemPrefab);
                itemNode.name = `BetItem_${betItem.display}`;

                // 设置显示文本
                const label = itemNode.getComponent(Label);
                if (label) {
                    label.string = betItem.display;
                } else {
                    console.warn(`No Label found in bet item prefab for ${betItem.display}`);
                }

                // 设置按钮事件
                const button = itemNode.getComponent(Button);
                if (button) {
                    button.node.on(Button.EventType.CLICK, () => {
                        this.onBetItemClick(betItem);
                    }, this);
                } else {
                    console.warn(`No Button found in bet item prefab for ${betItem.display}`);
                }

                // 添加到容器
                this.betItemContainer.addChild(itemNode);

                console.log(`Created bet item: ${betItem.display} (${betItem.value})`);
            } catch (error) {
                console.error(`Error creating bet item ${betItem.display}:`, error);
            }
        });

        console.log(`Filled bet scroll view with ${betting.betAmountData.length} items`);
    }

    /**
     * 下注选项点击事件
     */
    private onBetItemClick(betItem: BetAmountItem): void {
        if (!smc.crashGame) return;

        CrashGameAudio.playButtonClick();

        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            // 使用BettingComp的方法设置选择
            betting.setCurrentBetItem(betItem);

            this.updateSelectedBetState();

            // 更新UI显示
            this.updateBetAmount(betItem.value, betItem.display);
        }

        // 选择完成后立即隐藏面板
        this.hideBetPanel();

        console.log(`Selected bet: ${betItem.display} (value: ${betItem.value}, free: ${betItem.isFree})`);
    }

    /**
     * 滚动到当前选中的下注金额
     */
    private scrollToCurrentBet(): void {
        if (!this.betScrollView || !this.betItemContainer || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        const selectedIndex = betting.betAmountData.indexOf(betting.currentBetItem);
        if (selectedIndex === -1) return;

        // 计算滚动位置 (简单实现，假设每个item宽度为120)
        const itemWidth = 120;
        const spacing = 10;
        const targetX = selectedIndex * (itemWidth + spacing);
        const containerWidth = this.betItemContainer.children.length * (itemWidth + spacing);
        const viewWidth = this.betScrollView.node.getComponent(UITransform)?.width || 0;

        if (containerWidth > viewWidth) {
            const scrollRatio = targetX / (containerWidth - viewWidth);
            this.betScrollView.scrollToPercentHorizontal(Math.max(0, Math.min(1, scrollRatio)), 0.3, true);
        }

        console.log(`Scrolled to bet item: ${betting.currentBetItem.display}`);
    }

    /**
     * 更新选中的下注状态
     */
    private updateSelectedBetState(): void {
        if (!this.betItemContainer || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        this.betItemContainer.children.forEach((child, index) => {
            const betItem = betting.betAmountData[index];

            if (betItem === betting.currentBetItem) {
                // 选中状态 - 缩放效果
                child.scale = new Vec3(1.1, 1.1, 1.1);
            } else {
                // 未选中状态
                child.scale = new Vec3(1.0, 1.0, 1.0);
            }
        });
    }

    /**
     * 设置下注选项按钮的交互状态
     * @param interactable 是否可交互
     */
    private setBetItemsInteractable(interactable: boolean): void {
        if (!this.betItemContainer) return;

        this.betItemContainer.children.forEach((child) => {
            const button = child.getComponent(Button);
            if (button) {
                button.interactable = interactable;
            }
        });

        console.log(`Set bet items interactable: ${interactable}`);
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

        // 更新历史记录按钮
        this.updateHistoryButton();

        // 更新下注按钮显示 - 使用短文本格式
        const shortText = this.formatValueToShortText(betting.currentBetItem.value);
        this.updateBetButtonDisplay(shortText);

        // 更新AutoBet按钮状态
        this.updateAutoBetButtonState();

        // 更新能源显示
        this.updateEnergyDisplay();
        
        // 更新比赛倒计时显示
        this.updateRaceCountdownDisplay();
    }

    private updatePotentialWin(): void {
        if (!smc.crashGame || !this.potentialWinLabel) return;

        const multiplier = smc.crashGame.get(MultiplierComp);
        const betAmount = this.betAmountInput ? (this.formatValueFromShotText(this.betAmountInput.string) || 0) : 0;

        const potentialWin = betAmount * multiplier.currentMultiplier;
        const shortText = this.formatValueToShortText(Math.floor(potentialWin));
        this.potentialWinLabel.string = ` ${shortText}`;
    }

    private updateHistoryButton(): void {
        if (!smc.crashGame || !this.historyButton) {
            console.log("updateHistoryButton: Missing crashGame or historyButton");
            return;
        }

        const gameHistory = smc.crashGame.get(GameHistoryComp);
        const buttonLabel = this.historyButton.getComponentInChildren(Label);

        // console.log(`updateHistoryButton: gameHistory exists: ${!!gameHistory}, buttonLabel exists: ${!!buttonLabel}`);

        if (buttonLabel && gameHistory) {
            const latestCrash = gameHistory.getLatestCrashMultiplier();
            // console.log(`updateHistoryButton: latestCrash = ${latestCrash}, crashHistory length = ${gameHistory.crashHistory.length}`);

            if (latestCrash > 0) {
                buttonLabel.string = `${latestCrash.toFixed(2)}x`;
                // console.log(`updateHistoryButton: Updated button to ${latestCrash.toFixed(2)}x`);
            } else {
                buttonLabel.string = "1.00x";
                // console.log("updateHistoryButton: Set button to default 1.00x");
            }
        }
    }

    private updateHoldButtonState(): void {
        if (!smc.crashGame || !this.holdButton) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const buttonLabel = this.holdButton.getComponentInChildren(Label);

        switch (gameState.state) {
            case GameState.INIT:
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
        
        // 定期更新比赛倒计时
        this.raceUpdateTimer += _deltaTime * 1000;
        if (this.raceUpdateTimer >= this.RACE_UPDATE_INTERVAL) {
            this.raceUpdateTimer = 0;
            this.fetchAndUpdateRaceCountdown();
        }
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.off("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.off("GAME_STARTED", this.onGameStarted, this);
        oops.message.off("ENERGY_CHANGED", this.onEnergyChanged, this);
        oops.message.off("SCENE_CHANGED", this.onSceneChanged, this);

        // 清理能源按钮事件
        if (this.energyButton) {
            this.energyButton.node.off(Button.EventType.CLICK, this.onEnergyButtonClick, this);
        }

        // 清理比赛按钮事件
        if (this.raceButton) {
            this.raceButton.node.off(Button.EventType.CLICK, this.onRaceButtonClick, this);
        }

        // 清理按钮事件监听
        if (this.holdButton) {
            this.holdButton.node.off(Node.EventType.TOUCH_START, this.onHoldButtonTouchStart, this);
            this.holdButton.node.off(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
            this.holdButton.node.off(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
        }

        if (this.historyButton) {
            this.historyButton.node.off(Button.EventType.CLICK, this.onHistoryButtonClick, this);
        }

        if (this.betButton) {
            this.betButton.node.off(Button.EventType.CLICK, this.onBetButtonClick, this);
        }

        if (this.autoBetButton) {
            this.autoBetButton.node.off(Button.EventType.CLICK, this.onAutoBetButtonClick, this);
        }

        // 清理下注面板中的按钮事件
        if (this.betItemContainer) {
            this.betItemContainer.children.forEach((child) => {
                const button = child.getComponent(Button);
                if (button) {
                    button.node.off(Button.EventType.CLICK);
                }
            });
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

    /**
     * 更新下注按钮显示
     * @param display 显示文本
     */
    private updateBetButtonDisplay(display: string): void {
        if (this.betButton) {
            const buttonLabel = this.betButton.getComponentInChildren(Label);
            if (buttonLabel) {
                buttonLabel.string = display;
            }
        }
    }

    /**
     * 更新下注金额
     * @param amount 新的下注金额
     * @param display 显示文本
     */
    private updateBetAmount(amount: number, display: string): void {
        if (this.betAmountInput) {
            this.betAmountInput.string = amount.toString();
        }

        // 更新下注按钮显示 - 使用短文本格式
        const shortText = this.formatValueToShortText(amount);
        this.updateBetButtonDisplay(shortText);

        // 更新潜在收益
        this.updatePotentialWin();

        console.log(`Bet amount updated to: ${amount} (${display}) -> button shows: ${shortText}`);
    }

    /**
     * 显示游戏结果弹窗
     * @param params 游戏结果参数
     */
    private showGameResult(params: GameResultParams): void {
        console.log("Showing game result with params:", params);

        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const gameResultUI = node.getComponent(GameResultUI);
                if (gameResultUI) {
                    gameResultUI.onOpen(params, () => {
                        // 关闭弹窗回调
                        oops.gui.remove(UIID.GameResult);
                        // 重置游戏
                        this.resetGame();
                    });
                }
            }
        };

        oops.gui.open(UIID.GameResult, params, callbacks);
    }

    /**
     * 显示自动提现设置弹窗
     */
    showAutoCashOutUI(): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        const status = betting.getAutoCashOutStatus();
        const params: AutoCashOutParams = {
            multiplier: status.multiplier,
            totalBets: status.totalBets
        };

        console.log("Showing auto cashout UI with params:", params);

        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const autoCashOutUI = node.getComponent(AutoCashOutUI);
                if (autoCashOutUI) {
                    autoCashOutUI.onOpen(params,
                        (multiplier: number, totalBets: number) => {
                            // 开始自动提现回调
                            this.startAutoCashOut(multiplier, totalBets);
                        },
                        () => {
                            // 关闭弹窗回调
                            oops.gui.remove(UIID.AutoCashOut);
                        }
                    );
                }
            }
        };

        oops.gui.open(UIID.AutoCashOut, params, callbacks);
    }

    /**
     * 显示比赛界面
     */
    private showRaceUI(): void {
        console.log("Showing race UI");

        const callbacks: UICallbacks = {
            onAdded: (node: Node | null, params: any) => {
                if (!node) {
                    console.error("RaceUI node is null");
                    return;
                }
                
                const raceUI = node.getComponent(RaceUI);
                if (raceUI) {
                    // RaceUI不需要参数，直接初始化
                    console.log("RaceUI component loaded successfully");
                } else {
                    console.error("Failed to get RaceUI component");
                }
            },
            onRemoved: (node: Node | null, params: any) => {
                console.log("RaceUI closed");
            }
        };

        oops.gui.open(UIID.Race, null, callbacks);
    }

    /**
     * 开始自动提现
     * @param multiplier 自动提现倍数
     * @param totalBets 总下注次数
     */
    private startAutoCashOut(multiplier: number, totalBets: number): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            betting.setAutoCashOut(true, multiplier, totalBets);
            console.log(`MainGameUI: Started auto cashout: ${multiplier}x, ${totalBets === -1 ? 'infinite' : totalBets} bets`);

            // 验证设置是否正确
            const status = betting.getAutoCashOutStatus();
            console.log(`MainGameUI: Auto cashout status after setting:`, status);

            // 更新按钮状态
            this.updateAutoBetButtonState();
        }
    }

    /**
     * 更新AutoBet按钮状态
     */
    private updateAutoBetButtonState(): void {
        if (!this.autoBetButton || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        const status = betting.getAutoCashOutStatus();
        const buttonLabel = this.autoBetButton.getComponentInChildren(Label);

        if (buttonLabel) {
            if (status.enabled) {
                // 启用状态：显示"AUTO ON"和设置信息
                buttonLabel.string = `AUTO\n${status.multiplier.toFixed(2)}x`;
                // 设置按钮颜色为激活状态
                const sprite = this.autoBetButton.node.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(0, 255, 0, 255); // 绿色
                }
            } else {
                // 禁用状态：显示"AUTO"
                buttonLabel.string = "AUTO";
                // 设置按钮颜色为默认状态
                const sprite = this.autoBetButton.node.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(255, 255, 255, 255); // 白色
                }
            }
        }
        // console.log(`Updated auto bet button state: ${status.enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * 能源按钮点击事件
     */
    private onEnergyButtonClick(): void {
        if (!smc.crashGame) return;

        CrashGameAudio.playButtonClick();

        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            const status = energy.getEnergyStatus();

            if (status.canRecover) {
                // 显示观看广告恢复能源的提示或直接恢复
                console.log(`Energy recovery available. Current: ${status.current}/${status.max}`);

                // 这里可以集成广告系统，暂时直接恢复
                energy.recoverEnergyByAd();

                // TODO: 集成真实的广告系统
                // this.showAdForEnergyRecovery();
            } else {
                console.log("Energy is already full");
                // TODO: 显示能源已满的提示
            }
        }
    }

    /**
     * 比赛按钮点击事件
     */
    private onRaceButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Race button clicked - opening race UI");
        
        this.showRaceUI();
    }
    
    /**
     * 获取并更新比赛倒计时
     */
    private async fetchAndUpdateRaceCountdown(): Promise<void> {
        try {
            const response = await fetch('http://localhost:3000/api/race/current');
            const data = await response.json();
            
            if (data.success && data.data.hasActiveRace) {
                const remainingTime = data.data.race.remainingTime;
                this.updateRaceCountdownDisplay(remainingTime);
            } else {
                this.updateRaceCountdownDisplay(0);
            }
        } catch (error) {
            console.error('Failed to fetch race countdown:', error);
            this.updateRaceCountdownDisplay(0);
        }
    }
    
    /**
     * 更新比赛倒计时显示
     */
    private updateRaceCountdownDisplay(remainingTime?: number): void {
        if (!this.raceCountdownLabel) return;
        
        if (remainingTime !== undefined) {
            if (remainingTime > 0) {
                const timeText = this.formatRaceRemainingTime(remainingTime);
                this.raceCountdownLabel.string = timeText;
                this.raceCountdownLabel.node.active = true;
            } else {
                this.raceCountdownLabel.string = "No Race";
                this.raceCountdownLabel.node.active = true;
            }
        } else {
            // 初始化时获取一次数据
            this.fetchAndUpdateRaceCountdown();
        }
    }
    
    /**
     * 格式化比赛剩余时间显示
     */
    private formatRaceRemainingTime(milliseconds: number): string {
        if (milliseconds <= 0) return "00:00:00";
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 能源状态改变事件
     */
    private onEnergyChanged(data: any): void {
        this.updateEnergyDisplay();
        console.log(`Energy changed: ${data.current}/${data.max}`);
    }

    /**
     * 更新能源显示
     */
    private updateEnergyDisplay(): void {
        if (!smc.crashGame || !this.energyLabel) return;

        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            const status = energy.getEnergyStatus();
            this.energyLabel.string = `${status.current}/${status.max}`;

            // 更新能源按钮的可用状态
            if (this.energyButton) {
                this.energyButton.interactable = status.canRecover;

                // 根据能源状态设置按钮颜色
                const sprite = this.energyButton.node.getComponent(Sprite);
                if (sprite) {
                    if (status.canRecover) {
                        sprite.color = new Color(255, 255, 0, 255); // 黄色 - 可恢复
                    } else {
                        sprite.color = new Color(255, 255, 255, 255); // 白色 - 已满
                    }
                }
            }
        }
    }

    /**
     * 检查并消耗能源
     * @param amount 消耗的能源数量，默认为1
     * @returns 是否成功消耗
     */
    private consumeEnergy(amount: number = 1): boolean {
        if (!smc.crashGame) return false;

        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            return energy.consumeEnergy(amount);
        }
        return false;
    }

    /**
     * 退还能源（游戏成功时调用）
     * @param amount 退还的能源数量，默认为1
     * @returns 是否成功退还
     */
    private refundEnergy(amount: number = 1): boolean {
        if (!smc.crashGame) return false;

        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            energy.recoverEnergy(amount, "refund");
            return true;
        }
        return false;
    }


    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
    }
}