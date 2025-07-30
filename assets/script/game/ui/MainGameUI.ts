import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component, ScrollView, Prefab, tween, Vec3, UITransform } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { GameHistoryComp } from "../comp/GameHistoryComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SceneData } from "../scene/SceneData";
import { SceneScriptComp } from '../scene/SceneScriptComp';
import { UIID } from "../common/config/GameUIConfig";
import { GameResultUI, GameResultParams } from "./GameResultUI";
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

    // 下注金额数据
    private betAmountData: BetAmountItem[] = [
        { display: "free", value: 90, isFree: true },
        { display: "100", value: 100, isFree: false },
        { display: "200", value: 200, isFree: false },
        { display: "500", value: 500, isFree: false },
        { display: "1K", value: 1000, isFree: false },
        { display: "2K", value: 2000, isFree: false },
        { display: "5K", value: 5000, isFree: false },
        { display: "10K", value: 10000, isFree: false },
        { display: "20K", value: 20000, isFree: false },
        { display: "50K", value: 50000, isFree: false },
        { display: "100K", value: 100000, isFree: false },
        { display: "200K", value: 200000, isFree: false },
        { display: "500K", value: 500000, isFree: false },
        { display: "1M", value: 1000000, isFree: false }
    ];

    private currentBetItem: BetAmountItem = this.betAmountData[0]; // 默认选择free
    private isBetPanelVisible: boolean = false;

    /**
     * 将数值转换为短文本格式
     * @param value 数值
     * @returns 短文本 (如: 1000 -> "1K", 1000000 -> "1M")
     */
    private formatValueToShortText(value: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + "M";
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + "K";
        } else {
            return value.toString();
        }
    }

    /**
     * 加载保存的下注选择
     */
    private loadSavedBetSelection(): void {
        if (!smc.crashGame) return;

        const localData = smc.crashGame.get(LocalDataComp);
        if (localData) {
            const savedBet = localData.loadSelectedBet();
            if (savedBet) {
                // 在betAmountData中查找匹配的项
                const matchedItem = this.betAmountData.find(item =>
                    item.display === savedBet.display &&
                    item.value === savedBet.value &&
                    item.isFree === savedBet.isFree
                );

                if (matchedItem) {
                    this.currentBetItem = matchedItem;
                    console.log(`Restored saved bet selection: ${matchedItem.display} (${matchedItem.value})`);
                } else {
                    console.warn("Saved bet item not found in current data, using default");
                }
            }
        }
    }

    /**
     * 保存当前下注选择
     */
    private saveBetSelection(): void {
        if (!smc.crashGame) return;

        const localData = smc.crashGame.get(LocalDataComp);
        if (localData) {
            localData.saveSelectedBet({
                display: this.currentBetItem.display,
                value: this.currentBetItem.value,
                isFree: this.currentBetItem.isFree
            });
        }
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

        // 加载保存的下注选择
        this.loadSavedBetSelection();

        // 初始化历史记录
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        if (gameHistory && localData) {
            gameHistory.initializeHistory(localData);
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
            const betAmount = this.currentBetItem.value;
            const isFreeMode = this.currentBetItem.isFree;

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

                console.log(`Game started with bet: ${betAmount} (free: ${isFreeMode}) - HOLD button pressed`);
                oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
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
        if (this.currentBetItem.isFree) {
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

        console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x, won: ${winAmount.toFixed(0)} (free: ${this.currentBetItem.isFree})`);

        // 延迟显示成功结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: true,
                profit: profit
            });
        }, 0.2);
    }

    private onGameCrashed(_data: any): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        const localData = smc.crashGame.get(LocalDataComp);

        let loss: number;

        // 免费模式：不扣除余额，损失为0
        if (this.currentBetItem.isFree) {
            loss = 0; // 免费模式没有实际损失
        } else {
            betting.balance -= betting.betAmount;
            loss = betting.betAmount;
        }

        CrashGameAudio.playCrashExplosion();

        // 使用服务器预设的崩盘倍数（而不是data.crashMultiplier）
        const serverCrashMultiplier = localData ? localData.currentCrashMultiplier : 1.0;

        // 添加崩盘记录到历史并保存到本地存储
        if (gameHistory && localData) {
            gameHistory.addCrashRecord(serverCrashMultiplier, localData);
        }

        console.log(`Game crashed at ${serverCrashMultiplier.toFixed(2)}x (free: ${this.currentBetItem.isFree})`);

        // 延迟显示失败结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: false,
                profit: -loss
            });
        }, 0.2);
    }

    private onGameCashedOut(data: any): void {
        // 安全检查data.cashOutMultiplier
        const cashOutMultiplier = data && data.cashOutMultiplier ? data.cashOutMultiplier : 1.0;
        console.log(`Game cashed out at ${cashOutMultiplier.toFixed(2)}x`);
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

        const startPos = this.betPanel.position.clone();
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

        // 创建下注选项
        this.betAmountData.forEach((betItem, index) => {
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

        console.log(`Filled bet scroll view with ${this.betAmountData.length} items`);
    }

    /**
     * 下注选项点击事件
     */
    private onBetItemClick(betItem: BetAmountItem): void {
        CrashGameAudio.playButtonClick();

        this.currentBetItem = betItem;
        this.updateSelectedBetState();

        // 更新UI显示
        this.updateBetAmount(betItem.value, betItem.display);

        // 保存选择到本地存储
        this.saveBetSelection();

        // 选择完成后立即隐藏面板
        this.hideBetPanel();

        console.log(`Selected bet: ${betItem.display} (value: ${betItem.value}, free: ${betItem.isFree})`);
    }

    /**
     * 滚动到当前选中的下注金额
     */
    private scrollToCurrentBet(): void {
        if (!this.betScrollView || !this.betItemContainer) return;

        const selectedIndex = this.betAmountData.indexOf(this.currentBetItem);
        if (selectedIndex === -1) return;

        // 计算滚动位置 (简单实现，假设每个item宽度为120)
        const itemWidth = 120;
        const spacing = 10;
        const targetX = selectedIndex * (itemWidth + spacing);
        const containerWidth = this.betItemContainer.children.length * (itemWidth + spacing);
        const viewWidth = this.betScrollView.node.getComponent(UITransform)?.width || 0;

        if (containerWidth > viewWidth) {
            const scrollRatio = targetX / (containerWidth - viewWidth);
            this.betScrollView.scrollToPercentHorizontal(Math.max(0, Math.min(1, scrollRatio)), 0.3);
        }

        console.log(`Scrolled to bet item: ${this.currentBetItem.display}`);
    }

    /**
     * 更新选中的下注状态
     */
    private updateSelectedBetState(): void {
        if (!this.betItemContainer) return;

        this.betItemContainer.children.forEach((child, index) => {
            const betItem = this.betAmountData[index];

            if (betItem === this.currentBetItem) {
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
        const shortText = this.formatValueToShortText(this.currentBetItem.value);
        this.updateBetButtonDisplay(shortText);
    }

    private updatePotentialWin(): void {
        if (!smc.crashGame || !this.potentialWinLabel) return;

        const betting = smc.crashGame.get(BettingComp);
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

        if (this.historyButton) {
            this.historyButton.node.off(Button.EventType.CLICK, this.onHistoryButtonClick, this);
        }

        if (this.betButton) {
            this.betButton.node.off(Button.EventType.CLICK, this.onBetButtonClick, this);
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

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
    }
}