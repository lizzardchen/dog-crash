import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component, ScrollView, Prefab, tween, Vec3, Vec2, UITransform, Sprite, Color, view, Widget, SpriteFrame } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp,BetAmountItem } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { GameHistoryComp } from "../comp/GameHistoryComp";
import { EnergyComp } from "../comp/EnergyComp";
import { UserDataComp } from "../comp/UserDataComp";
import { RaceComp } from "../comp/RaceComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { tips } from "../common/tips/TipsManager";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SceneData } from "../scene/SceneData";
import { SceneScriptComp } from '../scene/SceneScriptComp';
import { UIID } from "../common/config/GameUIConfig";
import { GameResultUI, GameResultParams } from "./GameResultUI";
import { AutoCashOutUI, AutoCashOutParams } from "./AutoCashOutUI";
import { RaceUI } from "./RaceUI";
import { UICallbacks } from "../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { CrashGame } from '../entity/CrashGame';
import { RaceResultUI } from './RaceResultUI';
import { CoinFlyEffect } from '../effect/CoinFlyEffect';
import { EnergyProgressBar } from './EnergyProgressBar';
import { SimpleTutorial } from '../system/SimpleTutorial';
import { GoldPopupUI } from './GoldPopupUI';
import { MoneyPopupUI } from './MoneyPopupUI';
import { EnergyBuyUI } from './EnergyBuyUI';
import { SDKMgr } from '../common/SDKMgr';
import { TimerCDShow } from './TimerCDShow';
import { MultiplierConfig } from '../config/MultiplierConfig';
import { LevelSelUI } from './LevelSelUI';
import { DialogsUI } from './DialogsUI';
import { TaskComp } from '../comp/TaskComp';
import { ITaskData, ITaskEvent, TaskStatus, TaskType } from '../data/TaskData';
import { TaskCallbackComp } from '../task/TaskCallbackComp';

const { ccclass, property } = _decorator;

enum ButtonState{
    Unpressed = 0,
    Pressed_Waiting_CountDown = 1,
    Pressed_Waiting_Release = 2,
    UnPressed_Waiting_Result = 3
}

// /**
//  * 下注金额项接口
//  */
// interface BetAmountItem {
//     display: string;    // 显示文本 (如 "free", "1K", "1M")
//     value: number;      // 实际数值 (如 90, 1000, 1000000)
//     isFree: boolean;    // 是否为免费模式
// }

@ccclass('MainGameUI')
@ecs.register('MainGameUI', false)
export class MainGameUI extends CCComp {
    @property(Label)
    balanceLabel: Label = null!;

    @property(Label)
    moneyLabel: Label = null!;

    @property(Node)
    topNode:Node = null!;

    @property(Node)
    leftNode: Node = null!;

    @property(Node)
    rightNode: Node = null!;

    @property(Node)
    multiplierNode : Node = null!;

    @property(Label)
    multiplierLabel: Label = null!;

    @property(Label)
    potentialWinLabel: Label = null!;

    @property(Label)
    starLabel: Label = null!;

    @property(Label)
    betAmountInput: Label = null!;

    @property(Button)
    holdButton: Button = null!;

    @property(Sprite)
    holdTextSprite: Sprite = null!; //"HOLD"

    @property(Label)
    holdButtonLabel: Label = null!;

    @property(Label)
    holdButtonGameStateLabel: Label = null!;

    @property(TimerCDShow)
    holdButtonGameStateCD: TimerCDShow = null!;

    @property(Node)
    hold_unpressed_node:Node = null!;

    @property(Node)
    hold_pressed_node:Node = null!;

    @property(Node)
    hold_waiting_node:Node = null!;

    @property(Button)
    historyButton: Button = null!;

    @property(Label)
    historyMuiltiplierLabel: Label = null!;

    @property(Button)
    betButton: Button = null!;

    @property(Button)
    PIGBetButton: Button = null!;

    @property(Button)
    SPGBetButton: Button = null!;

    @property(Button)
    PIGModeSelButton: Button = null!;

    @property(Button)
    ModelSelCloseButton: Button = null!;

    @property(Label)
    currentModeLabel:Label = null!;

    @property(Node)
    modelSelNode: Node = null!;

    @property(Button)
    energyButton: Button = null!;

    @property(Label)
    energyLabel: Label = null!;

    @property(EnergyProgressBar)
    energyProgressBar: EnergyProgressBar = null!;

    @property(Button)
    raceButton: Button = null!;

    @property(Label)
    raceCountdownLabel: Label = null!;

    @property(Button)
    settingsButton: Button = null!;

    @property(Button)
    taskButton: Button = null!;

    @property(Node)
    taskTipNode: Node = null!;
    
    @property(Button)
    levelBackButton: Button = null!;

    @property(Node)
    betPanel: Node = null!;

    @property(Button)
    closeBetPanelButton: Button = null!;

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

    @property(Node)
    starScene:Node = null!;

    @property(Node)
    pig_change_node:Node = null!;

    // 可扩展的场景配置数组
    @property({ type: [SceneData], tooltip: "场景配置数组，根据rocket状态自动排序 (ground->sky->atmosphere->space)" })
    sceneConfigs: SceneData[] = [];

    @property(CoinFlyEffect)
    coinFlyEffect: CoinFlyEffect = null!;

    @property(CoinFlyEffect)
    moneyFlyEffect: CoinFlyEffect = null!;

    // 倒计时相关属性
    @property(Node)
    countdownNode: Node = null!;

    @property(Sprite)
    countdownSprite: Sprite = null!;

    // 倒计时图片资源
    @property(SpriteFrame)
    countdown3SpriteFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    countdown2SpriteFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    countdown1SpriteFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    countdownGoSpriteFrame: SpriteFrame = null!;

    @property(Node)
    levelNode: Node = null!;

    @property(DialogsUI)
    dialogsUI: DialogsUI = null!;

    @property(Node)
    loadingNode:Node = null!;

    private isBetPanelVisible: boolean = false;
    private isCountdownActive: boolean = false; // 倒计时是否激活
    private localRaceRemainingTime: number = 0; // 本地倒计时剩余时间（毫秒）
    private raceCountdownTimer: number = 0; // 本地倒计时更新器
    private isScrollSnapping: boolean = false; // 防止滚动递归调用
    private isHistoryPopupOpen: boolean = false; // 记录history弹窗状态

    // private isButtonHolding:boolean = false;
    private buttonState:ButtonState = ButtonState.Unpressed;
    private needHoldUp:boolean = false;

    // 存储Widget组件的原始值
    private originalWidgetValues: Map<Node, {top?: number, bottom?: number, left?: number, right?: number}> = new Map();
    private isUIAnimating: boolean = false; // 防止动画重复执行
    
    // 保存balance标签的原始世界坐标（在UI初始化时保存，不会受到动画影响）
    private originalBalanceLabelWorldPos: Vec3 = new Vec3();
    private originalMoneyLabelWordlPos:Vec3 = new Vec3();

    private taskCallbackComp: TaskCallbackComp = new TaskCallbackComp();

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
        if(oops.gui.effect2){
            const backoinflyeffect = this.coinFlyEffect;
            this.coinFlyEffect = oops.gui.effect2.addComponent(CoinFlyEffect);
            this.coinFlyEffect.coinPrefab = backoinflyeffect.coinPrefab;
        }
        // 初始化游戏数据
        this.initGameData();

        // 设置UI事件监听
        this.setupUIEvents();

        // 初始化下注面板
        this.initBetPanel();

        // 初始化UI显示
        this.updateUI();
        
        // 保存Widget组件的原始值
        this.saveOriginalWidgetValues();
         
        // 初始时隐藏multiplierNode
        if (this.multiplierNode) {
            this.multiplierNode.active = false;
        }
    }


    protected start(): void {
        //初始化show raceResultUI - 如果有新手教程则延后显示
        this.showRaceResultAfterTutorial();
        // 检查是否需要显示新手引导
        this.checkAndShowTutorial();
        
        // 检查是否是第1关，如果是则显示开场对话
        const userdatacomp = smc.crashGame.get(UserDataComp);
        if(userdatacomp && (userdatacomp.completedLevelId===-1)||
            (userdatacomp.completedLevelId===3)||
            (userdatacomp.completedLevelId===8)) {
            this.scheduleOnce(() => {
                this.showStoryDialog(0); // 显示第1关对话
            }, 0.5);
        }
        
        this.scheduleOnce(() => {
            // 保存balance标签的原始世界坐标
            this.saveOriginalBalanceLabelWorldPos();
            this.saveOriginalMoneyLabelWorldPos();
            this.resetGame();
            this.checkTaskCompletion();
        }, 0.1);
    }

    private onTaskChanged(taskData: ITaskData): void {
        if(taskData){
            if(taskData.status === TaskStatus.COMPLETED){
                this.taskTipNode.active = true;
            }
        }
    }

    private checkTaskCompletion(): void {
        const userdata = smc.crashGame.get(UserDataComp);
        const taskComp = smc.crashGame.get(TaskComp);
        if (taskComp) {
            this.taskCallbackComp.taskStatusChanedCallback = this.onTaskChanged.bind(this);
            taskComp.registerUICallback(this.taskCallbackComp);
            const levelTaskEvent: ITaskEvent = {
                type: TaskType.PASS_LEVEL,
                value: userdata.completedLevelId
            };
            taskComp.updateTaskProgress(levelTaskEvent);

            const goldTaskEvent: ITaskEvent = {
                type: TaskType.COLLECT_COINS,
                value: userdata.balance
            };
            taskComp.updateTaskProgress(goldTaskEvent);

            const totalflightsevent:ITaskEvent = {
                type: TaskType.SINGLE_FLIGHT,
                value: userdata.totalFlights
            };
            taskComp.updateTaskProgress(totalflightsevent);

            const onlineflightsevent:ITaskEvent = {
                type: TaskType.ONLINE_FLIGHT,
                value: userdata.onlineFlights
            };
            taskComp.updateTaskProgress(onlineflightsevent);

            const highestMultiplierEvent:ITaskEvent = {
                type: TaskType.CRASH_MULTIPLIER,
                value: userdata.highestMultiplier
            };
            taskComp.updateTaskProgress(highestMultiplierEvent);
        }
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
        this.initHoldButtonState();
    }

    /** 初始化场景管理系统 */
    private initSceneManager(): void {
        if (!smc.crashGame) return;

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (sceneComp) {
            // 加载星星预制体
            sceneComp.loadStarPrefab();
            // 设置场景节点引用
            sceneComp.setSceneNodes(this.backScene, this.frontScene,this.starScene);

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
                const scenscriptcomp = frontNode.getComponent(SceneScriptComp);
                if( scenscriptcomp ){
                    scenscriptcomp.initializeNodes();
                } 
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
            // this.holdButton.node.on(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
            // this.holdButton.node.on(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
        }

        // 余额标签点击事件
        if (this.balanceLabel) {
            const balanceButton = this.balanceLabel.node.parent?.getComponent(Button);
            balanceButton?.node.on(Node.EventType.TOUCH_START, this.onBalanceClick, this);
        }

        if(this.moneyLabel){
            const moneyButton = this.moneyLabel.node.parent?.getComponent(Button);
            moneyButton?.node.on(Node.EventType.TOUCH_START, this.onMoneyClick, this);
        }

        // 历史记录按钮事件
        if (this.historyButton) {
            this.historyButton.node.on(Button.EventType.CLICK, this.onHistoryButtonClick, this);
        }

        // 下注按钮事件
        if (this.betButton) {
            this.betButton.node.on(Button.EventType.CLICK, this.onBetButtonClick, this);
        }

        if(this.closeBetPanelButton){
            this.closeBetPanelButton.node.on(Button.EventType.CLICK, this.onCloseBetPanelButtonClick, this);
        }

        // 自动下注按钮事件
        if (this.PIGBetButton) {
            this.PIGBetButton.node.on(Button.EventType.CLICK, this.onAutoBetButtonClick, this);
        }
        if (this.SPGBetButton) {
            this.SPGBetButton.node.on(Button.EventType.CLICK, this.onSPGBetButtonClick, this);
        }

        if(this.PIGModeSelButton){
            this.PIGModeSelButton.node.on(Button.EventType.CLICK,this.onPIGModeSelOpen,this);
        }

        if(this.ModelSelCloseButton){
            this.ModelSelCloseButton.node.on(Button.EventType.CLICK,this.onCloseModeSelPanel,this);
        }

        // 能源按钮事件
        if (this.energyButton) {
            this.energyButton.node.on(Button.EventType.CLICK, this.onEnergyButtonClick, this);
        }

        // 比赛按钮事件
        if (this.raceButton) {
            this.raceButton.node.on(Button.EventType.CLICK, this.onRaceButtonClick, this);
        }

        // 设置按钮事件
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsButtonClick, this);
        }

        // 任务按钮事件
        if (this.taskButton) {
            this.taskButton.node.on(Button.EventType.CLICK, this.onTaskButtonClick, this);
        }

        if(this.levelBackButton){
            this.levelBackButton.node.on(Button.EventType.CLICK,this.onLevelBackClick,this);
        }

        // 监听游戏事件
        oops.message.on("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.on("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.on("GAME_STARTED", this.onGameStarted, this);
        oops.message.on("ENERGY_CHANGED", this.onEnergyChanged, this);
        oops.message.on("SCENE_CHANGED", this.onSceneChanged, this);
        oops.message.on("AUTO_CANCEL_AUTOGAME", this.onAutoCancelAutoGame, this);
        oops.message.on("SERVER_CANCEL_AUTOGAME",this.onServerCancelAutoGame,this);
        
        // 监听比赛数据更新事件
        oops.message.on("RACE_DATA_UPDATED", this.onRaceDataUpdated, this);
        // 监听显示比赛结果事件
        oops.message.on("SHOW_RACE_RESULT", this.onShowRaceResultUI, this);
        // 监听自动下注结束事件
        oops.message.on("AUTO_CASHOUT_ENDED", this.onAutoCashOutEnded, this);
        //race 发奖励
        oops.message.on("PRIZE_CLAIMED",this.onRaceClaimed,this);
        
        // 监听PIG倒计时事件
        oops.message.on("PIG_COUNTDOWN_UPDATE", this.onPigCountdownUpdate, this);
        oops.message.on("PIG_COUNTDOWN_FINISHED", this.onPigCountdownFinished, this);
        oops.message.on("GAME_MODE_CHANGED",this.onGameModeChanged,this);

        // 监听下注ScrollView滚动事件
        if (this.betScrollView) {
            this.betScrollView.node.on('scroll-ended', this.onBetScrollEnd, this);
            this.betScrollView.node.on('scrolling', this.onBetScrolling, this);
        }

        // 监听history弹窗状态变化
        oops.message.on("OPEN_HISTORY_POPUP", this.onHistoryPopupOpened, this);
        
        // 添加全局点击监听（用于关闭history弹窗）
        this.node.on(Node.EventType.TOUCH_END, this.onGlobalTouch, this);

        //guide
        oops.message.on("GUIDE_SHOW_BETPANEL",this.onGuideEvent,this);
        oops.message.on("GUIDE_SHOW_HOLD",this.onGuideEvent,this);
        oops.message.on("GUIDE_ON_HOLDED",this.onGuideEvent,this);
        oops.message.on("GUIDE_SHOW_MODE",this.onGuideEvent,this);
        oops.message.on("GUIDE_SHOW_MODE_ONLINE",this.onGuideEvent,this);
        oops.message.on("GUIDE_AFTER_CLICK_ONLINE",this.onGuideEvent,this);
        //level
        oops.message.on("TASK_COMPLETED_LEVEL",this.onLevelComplete,this);
        oops.message.on("STAR_COLLECTED",this.onStarsChanged,this);
        oops.message.on("COINS_UPDATED",this.onAddCoins,this);
    }

    private onHoldButtonTouchStart(_event: EventTouch): void {
        const energycomp = smc.crashGame.get(EnergyComp);
        const betting = smc.crashGame.get(BettingComp);

        if(betting.gameMode == "PIG"){
            if(betting.serverPhase == "betting"){
                this.showAutoCashOutUI();
                return;
            }
            else if( betting.serverPhase == "waiting" ){
                return;
            }
            else if(betting.serverPhase == "gaming"){
                if(!betting.goNextRound){
                    this.holdButton.node.on(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
                    this.holdButton.node.on(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
                }
                return;
            }
        }

        if(energycomp && energycomp.currentEnergy <= 0 && betting.gameMode !== "PIG") {
            oops.gui.toast("Energy not enough!");
            return;
        }
        const userData = smc.crashGame.get(UserDataComp);
        if(!this.validateBetAmount(betting.currentBetItem.value)) {
            return;
        }
        
        this.holdButton.node.on(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
        this.holdButton.node.on(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);

        if( betting.isHolding ) return;

        CrashGameAudio.playButtonClick();
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();

        if(this.buttonState >= ButtonState.Pressed_Waiting_CountDown){
            return;
        }

        this.buttonState = ButtonState.Pressed_Waiting_CountDown;
        this.hold_unpressed_node.active = false;
        this.hold_pressed_node.active = true;
        
        // 完成新手引导（如果正在引导中）
        this.onTutorialHoldButtonClicked();
        let wait_server_multiplier:boolean = true;
        const localData = smc.crashGame.get(LocalDataComp);
        localData.generateCrashMultiplierAsync().then((remote_mulitplier: number) => {
            localData.currentCrashMultiplier = remote_mulitplier;
            wait_server_multiplier = false;
        }).catch((error) => {
            console.error("Failed to generate crash multiplier", error);
            wait_server_multiplier = false;
            localData.currentCrashMultiplier = MultiplierConfig.generateCrashMultiplier();
            // 播放游戏开始UI动画
            // this.playGameEndUIAnimation();
        });
        const thisvalue = this;
        // 开始3秒倒计时
        this.startCountdown(()=>{
            this.playGameStartUIAnimation();
            const gameState = smc.crashGame.get(GameStateComp);
            
            const multiplier = smc.crashGame.get(MultiplierComp);
            if( this.buttonState <= ButtonState.Pressed_Waiting_CountDown ){
                this.buttonState = ButtonState.Pressed_Waiting_Release;
                if(this.needHoldUp){
                    this.onHoldButtonTouchEnd(null);
                    this.needHoldUp = false; // 重置需要松开状态
                    return;
                }
            }else{
                return;
            }
            if (gameState.state === GameState.WAITING) {
                // 检查并消耗能源（每局游戏都消耗1个能源）
                if (!this.consumeEnergy(1)) {
                    console.warn("Not enough energy to start game");
                    // TODO: 显示能源不足提示
                    oops.gui.toast("Energy not enough!");
                    if(this.needHoldUp){
                        this.onHoldButtonTouchEnd(null);
                        this.needHoldUp = false; // 重置需要松开状态
                    }
                    return;
                }
                // 开始游戏 - 按下按钮时开始
                const betAmount = betting.currentBetItem.value;
                const isFreeMode = betting.currentBetItem.isFree;
                let callback = ()=>{
                    if(wait_server_multiplier){
                        localData.currentCrashMultiplier = MultiplierConfig.generateCrashMultiplier();
                    }
                    if (thisvalue.validateBetAmount(betAmount, isFreeMode)) {
                        betting.betAmount = betAmount;
                        betting.isHolding = true;
                        gameState.state = GameState.FLYING;
                        gameState.startTime = Date.now();
                        multiplier.startTime = Date.now();

                        thisvalue.updateHoldButtonState();
                        thisvalue.addButtonPressedEffect();

                        console.log(`Game started with bid: ${betAmount} (free: ${isFreeMode}) - HOLD button pressed (manual mode)`);
                        oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
                    }
                };
                if( wait_server_multiplier ){
                    this.scheduleOnce(callback,1);
                }else{
                    callback();
                }
                // localData.generateCrashMultiplierAsync().then((remote_mulitplier: number) => {
                //     localData.currentCrashMultiplier = remote_mulitplier;
                //     if (this.validateBetAmount(betAmount, isFreeMode)) {
                //         betting.betAmount = betAmount;
                //         betting.isHolding = true;
                //         gameState.state = GameState.FLYING;
                //         gameState.startTime = Date.now();
                //         multiplier.startTime = Date.now();

                //         this.updateHoldButtonState();
                //         this.addButtonPressedEffect();

                //         console.log(`Game started with bid: ${betAmount} (free: ${isFreeMode}) - HOLD button pressed (manual mode)`);
                        
                        
                //         oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
                //     }

                // }).catch((error) => {
                //     console.error("Failed to generate crash multiplier", error);
                //     // 播放游戏开始UI动画
                //     this.playGameEndUIAnimation();
                // });
            }
        });
    }

    private onHoldButtonTouchEnd(_event: EventTouch | null): void {
        this.holdButton.node.off(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
        this.holdButton.node.off(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);
        const betting = smc.crashGame.get(BettingComp);
        if (!smc.crashGame) return;
        const userData = smc.crashGame.get(UserDataComp);
        if(this.buttonState == ButtonState.Pressed_Waiting_CountDown) {
            this.needHoldUp = true; // 标记为需要松开状态
            return; // 如果已经在按住状态，则不处理松开事件
        }
        if(this.buttonState >= ButtonState.UnPressed_Waiting_Result){
            return;
        }
        if(this.buttonState == ButtonState.Pressed_Waiting_Release){
            this.buttonState = ButtonState.UnPressed_Waiting_Result;
        }
        
        this.hold_unpressed_node.active = true;
        this.hold_pressed_node.active = false;
        const gameState = smc.crashGame.get(GameStateComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        if ((gameState.state === GameState.FLYING ||gameState.state === GameState.WAITING)) {
            // 用户手动提现 - 如果当前是PIG模式，切换到SPG模式
            // if (betting.gameMode === "PIG") {
                // console.log("MainGameUI: User manually cashed out, switching to SPG mode");
                // betting.setGameMode("SPG");
                // this.updateAutoBetButtonState();
            // }
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
        // if (this.holdButton) {
        //     this.holdButton.node.scale = new Vec3(1,1,1);
        //     this.holdButton.node.scale = this.holdButton.node.scale.clone().multiplyScalar(0.95);
        // }
        this.hold_unpressed_node.active = false;
        this.hold_pressed_node.active = true;
    }

    private removeButtonPressedEffect(): void {
        // 移除按钮按下时的视觉反馈
        // if (this.holdButton) {
        //     this.holdButton.node.scale = new Vec3(1,1,1);
        // }
        this.hold_unpressed_node.active = true;
        this.hold_pressed_node.active = false;
    }

    private validateBetAmount(amount: number, isFreeMode: boolean = false): boolean {
        if (!smc.crashGame) return false;

        const userData = smc.crashGame.get(UserDataComp);

        if (amount <= 0) {
            console.warn("Invalid bid amount:", amount);
            return false;
        }

        // 免费模式不需要检查余额
        if (!isFreeMode && amount > userData.balance) {
            console.warn("Insufficient balance:", amount, "vs", userData.balance);
            // 金币不足，提示观看广告
            this.showInsufficientCoinsDialog(amount - userData.balance);
            return false;
        }

        return true;
    }

    /**
     * 显示金币不足对话框
     */
    private showInsufficientCoinsDialog(neededAmount: number): void {
        const rewardAmount = 1000;//Math.max(100, Math.ceil(neededAmount / 100) * 100); // 向上取整到100的倍数
        
        tips.confirm(
            `Insufficient coins!`,
            () => {
                // 用户点击确认，播放广告
                console.log("MainGameUI: User confirmed coins recovery ad");
                this.showAdForCoins(rewardAmount);
            },
            () => {
                // 用户点击取消
                console.log("MainGameUI: User cancelled coins recovery ad");
            },
            "Insufficient Coins",
            "Watch Ad"
        );
    }

    /**
     * 显示广告获取金币
     */
    private showAdForCoins(coinAmount: number): void {
        console.log("MainGameUI: Showing ad for coins:", coinAmount);
        SDKMgr.instance.showVideo(
            () => {
                // 广告观看成功 - 增加金币
                if (smc.crashGame) {
                    const userData = smc.crashGame.get(UserDataComp);
                    
                    if (userData) {
                        userData.balance += coinAmount;
                        userData.saveToLocal(); // 现在saveToLocal函数会自动同步到服务器
                    }
                    
                    oops.gui.toast(`Congratulations! Got ${coinAmount} coins!`);
                    
                    // 发送金币更新事件
                    oops.message.dispatchEvent("COINS_UPDATED", { 
                        amount: coinAmount, 
                        newBalance: userData ? userData.balance : 0 
                    });
                }
            },
            () => {
                // 广告取消
                console.log("MainGameUI: Coins ad cancelled");
                oops.gui.toast("Ad cancelled");
            },
            () => {
                // 广告错误
                console.log("MainGameUI: Coins ad error");
                oops.gui.toast("Ad failed to load, please try again later");
            }
        );
    }

    private processCashOut(): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        const userData = smc.crashGame.get(UserDataComp);

        const winAmount = betting.betAmount * multiplier.cashOutMultiplier;

        let profit: number = winAmount - betting.betAmount;
        userData.balance += profit; // 正常模式加净收益
        userData.money += profit/10; // 正常模式加money
        const levelstars:number = userData.levelstars;

        // 记录服务器预设的崩盘倍数（不是玩家提现的倍数）
        if (gameHistory && localData) {
            const serverCrashMultiplier = localData.currentCrashMultiplier;
            gameHistory.addCrashRecord(serverCrashMultiplier, localData);
            console.log(`Recorded server crash multiplier: ${serverCrashMultiplier.toFixed(2)}x (player cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x)`);
        }

        console.log(`Cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x, won: ${winAmount.toFixed(0)} (free: ${betting.currentBetItem.isFree})`);

        // 游戏成功：退还消耗的能源
        if(profit > 0){
            if (this.refundEnergy(1)) {
                console.log("Game won - energy refunded");
            }
        }
        

        // 延迟显示成功结果弹窗
        this.scheduleOnce(() => {
            this.showGameResult({
                isWin: true,
                profit: profit,
                stars:levelstars
            },()=>{
                console.log("GameResultUI closed, game won!!");
                // 先播放UI恢复动画，然后播放金币飞行动画
                this.scheduleOnce(() => {
                    this.playGameEndUIAnimation();
                }, 0.1);
                
                // 并行播放金币飞行动画（目标位置已经保存，不会受UI动画影响）
                if (profit > 0) {
                    this.scheduleOnce(() => {
                        this.playCoinFlyAnimation(profit, () => {
                            console.log("Coin fly animation completed!");
                            this.buttonState = ButtonState.Unpressed;
                            this.completedNowLevel(levelstars);
                            const coinsaddTask:ITaskEvent = {
                                type: TaskType.COLLECT_COINS,
                                value: userData.balance
                            }
                            const taskcomp = smc.crashGame.get(TaskComp);
                            taskcomp.updateTaskProgress(coinsaddTask);
                        });
                        this.playMoneyFlyAnimation(profit/10, () => {
                            console.log("money fly animation completed!");
                        });
                    }, 0.2); // 稍微延迟播放金币动画
                }
                else{
                    this.buttonState = ButtonState.Unpressed;
                    this.completedNowLevel(levelstars);
                }
            });
        }, 0.2);
    }

    private onGameCrashed(event:string,_data: any): void {
        console.log("MainGameUI: onGameCrashed event received", _data);
        if (!smc.crashGame) return;
        
        this.holdButton.node.off(Node.EventType.TOUCH_END, this.onHoldButtonTouchEnd, this);
        this.holdButton.node.off(Node.EventType.TOUCH_CANCEL, this.onHoldButtonTouchEnd, this);

        const betting = smc.crashGame.get(BettingComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const userData = smc.crashGame.get(UserDataComp);
         const multiplier = _data.crashMultiplier;//smc.crashGame.get(MultiplierComp);
        const winAmount = betting.betAmount * multiplier;
        const levelstars = userData.levelstars;

        let loss: number = winAmount; // 默认损失为当前可能的奖励金额

        // 免费模式：不扣除余额，损失为0
        if (!betting.currentBetItem.isFree) {
            userData.balance -= betting.betAmount;
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
                profit: -loss,
                stars:levelstars
            },()=>{
                this.buttonState = ButtonState.Unpressed;
                console.log("GameResultUI closed, game failed!!");
                // 游戏失败后也要播放UI恢复动画
                this.scheduleOnce(() => {
                    this.playGameEndUIAnimation();
                }, 0.1);
            });
        }, 0.2);
    }

    private onGameCashedOut(event:string,data: any): void {
        console.log("MainGameUI: onGameCashedOut event received", data);

        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        const localData = smc.crashGame.get(LocalDataComp);
        const userData = smc.crashGame.get(UserDataComp);
        const gameHistory = smc.crashGame.get(GameHistoryComp);

        // 安全检查data.cashOutMultiplier
        const cashOutMultiplier = data && data.cashOutMultiplier ? data.cashOutMultiplier : 1.0;
        console.log(`MainGameUI: Game cashed out at ${cashOutMultiplier.toFixed(2)}x`);

        // 计算收益并更新余额（和processCashOut相同的逻辑）
        const winAmount = betting.betAmount * cashOutMultiplier;
        let profit: number = winAmount - betting.betAmount;
        userData.balance += profit; // 正常模式加净收益
        userData.money += profit/10;

        // 游戏成功：退还消耗的能源
        if(profit > 0){
            if (this.refundEnergy(1)) {
                console.log("Game won - energy refunded");
            }
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
                profit: profit,
                stars:userData.levelstars
            },()=>{
                this.buttonState = ButtonState.Unpressed;
                console.log("GameResultUI closed, game won!!");
                // 先播放UI恢复动画，然后播放金币飞行动画
                this.scheduleOnce(() => {
                    console.log('start playGameEndUIAnimation');
                    this.playGameEndUIAnimation();
                }, 0.1);
                
                // 并行播放金币飞行动画（目标位置已经保存，不会受UI动画影响）
                if (profit > 0) {
                    this.scheduleOnce(() => {
                        this.playCoinFlyAnimation(profit, () => {
                            console.log("Coin fly animation completed!");
                        });
                        this.playMoneyFlyAnimation(profit/10, () => {
                            console.log("money fly animation completed!");
                        });
                    }, 0.2); // 稍微延迟播放金币动画
                }
            });
        }, 0.2);
    }

    private onAutoCancelAutoGame(event:string,data:any):void{
        const energy = smc.crashGame.get(EnergyComp);
        if(energy && energy.currentEnergy <= 0){
            oops.gui.toast("Not enough energy!");
        }
        const userdata = smc.crashGame.get(UserDataComp);
        const betting = smc.crashGame.get(BettingComp);
        if( userdata && userdata.balance <= betting.currentBetItem.value ){
            oops.gui.toast("Not enough coins!");
        }
        this.playGameEndUIAnimation();
        this.updateHoldButtonState();
    }

    private onServerCancelAutoGame(event:string,data:any):void{
        this.playGameEndUIAnimation();
        this.updateHoldButtonState();
    }

    private onGameStarted(data: any): void {
        console.log(`Game started with bid: ${data.betAmount}`);
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

        // Check if this is PIG mode (not triggered by manual HOLD button)
        if (smc.crashGame) {
            const betting = smc.crashGame.get(BettingComp);
            if (betting && betting.gameMode === "PIG") {
                // For PIG mode, play UI animation and update button state
                this.playGameStartUIAnimation();
                this.updateHoldButtonState();
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

    //race 奖励
    private onRaceClaimed(event:string,data: any): void {
        console.log("Race claimed:", data);
        // 在这里处理比赛奖励的逻辑
        this.playCoinFlyAnimation(data.prizeAmount, () => {
            console.log("Coin fly animation completed!");
            const userData = smc.crashGame.get(UserDataComp);
            if (userData) {
                userData.balance += data.prizeAmount;
                this.updateUI();
            }
        });
    }

    /**
     * 自动下注结束事件处理
     */
    private onAutoCashOutEnded(event:string,data: any): void {
        console.log("MainGameUI: Auto cashout ended event received", data);
        
        // 显示通知告知用户自动下注已结束
        // if (data && data.reason) {
        //     let message = "Auto cashout ended";
        //     if (data.reason === "limit_reached") {
        //         message = 'Auto cashout completed';
        //     }
        //     oops.gui.toast(message);
        // }
        
        // 更新AutoBet按钮状态
        this.updateAutoBetButtonState();
        
        // 更新HOLD按钮状态（能量不足时自动下注结束，需要恢复按钮状态）
        this.updateHoldButtonState();
        
        // // 播放UI恢复动画（如果游戏当前处于非游戏状态）
        // if (smc.crashGame) {
        //     const gameState = smc.crashGame.get(GameStateComp);
        //     if (gameState.state === GameState.WAITING || gameState.state === GameState.FLYING) {
        //         // 如果当前是等待状态，说明游戏已经结束，播放UI恢复动画
        //         this.scheduleOnce(() => {
        //             this.playGameEndUIAnimation();
        //         }, 0.1);
        //     }
        // }
    }

    /**
     * 比赛数据更新事件处理
     */
    private onRaceDataUpdated(event: string, data: any): void {
        if (data && data.race && data.race.remainingTime !== undefined) {
            // 更新本地比赛剩余时间
            this.localRaceRemainingTime = data.race.remainingTime;
            this.updateRaceCountdownDisplay(this.localRaceRemainingTime);
            console.log(`Race countdown updated from RaceComp: ${this.formatRaceRemainingTime(this.localRaceRemainingTime)}`);
        }
    }

    private resetGame(isauto:boolean = false): void {
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

    private onHistoryButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("History button clicked - opening history popup");
        this.onCloseBetPanelButtonClick();

        // 触发打开历史记录弹窗的事件
        oops.message.dispatchEvent("OPEN_HISTORY_POPUP");
    }

    /**
     * 监听history弹窗打开事件
     */
    private onHistoryPopupOpened(): void {
        this.isHistoryPopupOpen = !this.isHistoryPopupOpen; // toggle状态
        console.log(`History popup state: ${this.isHistoryPopupOpen ? 'opened' : 'closed'}`);
    }

    /**
     * 全局点击处理 - 用于关闭history弹窗
     */
    private onGlobalTouch(): void {
        if (this.isHistoryPopupOpen) {
            console.log("Global touch detected, closing history popup");
            this.closeHistoryPopup();
        }
        this.onCloseBetPanelButtonClick();
    }

    /**
     * 关闭history弹窗的通用方法
     */
    private closeHistoryPopup(): void {
        if (this.isHistoryPopupOpen) {
            this.isHistoryPopupOpen = false;
            oops.message.dispatchEvent("CLOSE_HISTORY_POPUP");
        }
    }

    private onCloseBetPanelButtonClick(): void {
        this.hideBetPanel();
    }

    private onBetButtonClick(): void {
        if (!smc.crashGame) return;
        
        this.closeHistoryPopup();

        const gameState = smc.crashGame.get(GameStateComp);

        // 只有在等待状态下才能修改下注金额
        if (gameState.state !== GameState.WAITING) {
            console.log("Cannot change bid amount during game");
            return;
        }

        CrashGameAudio.playButtonClick();
        console.log("Bid button clicked - showing bid panel");

        // 检查下注面板是否存在
        if (!this.betPanel) {
            console.warn("Bid panel not found - cannot show/hide");
            return;
        }

        if (this.isBetPanelVisible) {
            this.hideBetPanel();
        } else {
            this.showBetPanel();
        }
    }

    private onPIGModeSelOpen():void{
        if(this.modelSelNode){
            // 设置初始位置
            this.modelSelNode.setPosition(this.modelSelNode.position.x, 0, this.modelSelNode.position.z);
            // 显示节点
            this.modelSelNode.active = true;
            
            // 创建向上滑动的tween动画
            tween(this.modelSelNode)
                .to(0.1, { position: new Vec3(this.modelSelNode.position.x, 292, this.modelSelNode.position.z) }, {
                    easing: 'cubicOut'
                })
                .start();
        }
    }

    private onCloseModeSelPanel():void{
        if(this.modelSelNode){
            // 创建向上滑动的tween动画
            tween(this.modelSelNode)
                .to(0.1, { position: new Vec3(this.modelSelNode.position.x, 0, this.modelSelNode.position.z) }, {
                    easing: 'cubicOut'
                })
                .start();
        }
    }

    private onSPGBetButtonClick():void{
        if (!smc.crashGame) return;
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);

        CrashGameAudio.playButtonClick();
        if (betting) {
            // 从PIG切换到SPG模式（允许在任何状态下切换）
            betting.setGameMode("SPG");
            console.log("MainGameUI: Switched to SPG mode");
            // 更新按钮状态
            this.updateAutoBetButtonState();
            this.updateHoldButtonState();
        }
        this.onCloseModeSelPanel();
    }

    private onGameModeChanged():void{
        // 更新按钮状态
        this.updateAutoBetButtonState();
        this.updateHoldButtonState();
    }

    private onAutoBetButtonClick(): void {
        if (!smc.crashGame) return;
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        CrashGameAudio.playButtonClick();
        if (betting) {
            const currentMode = betting.gameMode;

            if (currentMode === "SPG") {
                // 从SPG切换到PIG模式
                // 只有在等待状态下才能切换到PIG模式
                if (gameState.state !== GameState.WAITING) {
                    console.log("Cannot switch to PIG mode during game - please wait for current game to finish");
                    return;
                }
                if(this.pig_change_node){
                    this.pig_change_node.active = true;
                }
                let can_disable_change_node:boolean = false;
                let wait_change_node_timeend:boolean = false;
                // 获取服务器状态
                betting.fetchServerCountdown().then(() => {
                    if (betting.serverPhase === "betting") {
                        // 如果是下注阶段，显示AutoCashOutUI设置界面
                        // this.showAutoCashOutUI();
                        betting.setGameMode("PIG");
                        betting.setPigCashOut(0, -1);
                        this.updateAutoBetButtonState();
                        this.updateHoldButtonState();
                    } else if (betting.serverPhase === "waiting") {
                        // 如果是等待游戏开始阶段，直接切换到PIG模式并启动等待倒计时
                        betting.setGameMode("PIG");
                        betting.setPigCashOut(0, -1);
                        this.updateAutoBetButtonState();
                        this.updateHoldButtonState();
                    } else if (betting.serverPhase === "gaming") {
                        // 如果是游戏阶段，直接切换到PIG模式并启动游戏倒计时
                        betting.setGameMode("PIG");
                        betting.setPigCashOut(0, -1);
                        this.updateAutoBetButtonState();
                        this.updateHoldButtonState();
                    }
                    can_disable_change_node = true;
                    if(wait_change_node_timeend){
                        if(this.pig_change_node){
                            this.pig_change_node.active = false;
                        }
                    }
                    this.onCloseModeSelPanel();
                }).catch((error) => {
                    console.error("Failed to fetch server countdown:", error);
                    oops.gui.toast("Failed to connect to server");
                    can_disable_change_node = true;
                    if(wait_change_node_timeend){
                        if(this.pig_change_node){
                            this.pig_change_node.active = false;
                        }
                    }
                    this.onCloseModeSelPanel();
                });
                this.scheduleOnce(()=>{
                    wait_change_node_timeend = true;
                    if(can_disable_change_node){
                        if(this.pig_change_node){
                            this.pig_change_node.active = false;
                        }
                    }
                },1.2);
            }
            else{
                this.onCloseModeSelPanel();
            }
        }
    }

    /**
     * 初始化下注面板
     */
    private initBetPanel(): void {
        if (!this.betPanel) {
            console.warn("BetPanel node not found - skipping bid panel initialization");
            return;
        }

        // 初始隐藏下注面板
        this.betPanel.active = false;
        this.isBetPanelVisible = false;

        // 初始化下注选项
        this.fillBetScrollView();

        console.log("Bid panel initialized");
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
        const startPos = new Vec3(0, -533, 0);
        const endPos = new Vec3(0, 0, 0);

        this.betPanel.setPosition(startPos);

        // 从右向左滑入动画
        tween(this.betPanel)
            .to(0.2, { position: endPos }, { easing: 'sineOut' })
            .call(() => {
                // 滑入完成后，启用按钮交互并滚动到当前选中的下注金额
                this.setBetItemsInteractable(true);
                this.scrollToCurrentBet();
            })
            .start();

        console.log("Bid panel shown");
    }

    /**
     * 隐藏下注面板 (从左向右滑出)
     */
    private hideBetPanel(): void {
        if (!this.betPanel) return;
        if(this.betPanel.active === false) return;

        const endPos = new Vec3(0, -533, 0);

        // 从左向右滑出动画
        tween(this.betPanel)
            .to(0.2, { position: endPos }, { easing: 'sineIn' })
            .call(() => {
                this.betPanel.active = false;
                this.isBetPanelVisible = false;
            })
            .start();

        console.log("Bid panel hidden");
    }

    /**
     * 填充下注ScrollView
     */
    private fillBetScrollView(): void {
        if (!this.betItemContainer) {
            console.warn("BetItemContainer not found - skipping bid scroll view fill");
            return;
        }

        if (!this.betItemPrefab) {
            console.warn("BetItemPrefab not found - skipping bid scroll view fill");
            return;
        }

        // 清空现有子节点
        this.betItemContainer.removeAllChildren();

        // 获取BettingComp
        if (!smc.crashGame) {
            console.warn("CrashGame not found - skipping bid scroll view fill");
            return;
        }

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) {
            console.warn("BettingComp not found - skipping bid scroll view fill");
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
                    console.warn(`No Label found in bid item prefab for ${betItem.display}`);
                }

                // 设置按钮事件
                const button = itemNode.getComponent(Button);
                if (button) {
                    button.node.on(Button.EventType.CLICK, () => {
                        this.onBetItemClick(betItem);
                    }, this);
                } else {
                    console.warn(`No Button found in bid item prefab for ${betItem.display}`);
                }

                // 添加到容器
                this.betItemContainer.addChild(itemNode);

                console.log(`Created bid item: ${betItem.display} (${betItem.value})`);
            } catch (error) {
                console.error(`Error creating bid item ${betItem.display}:`, error);
            }
        });

        console.log(`Filled bid scroll view with ${betting.betAmountData.length} items`);
        
        // 初始化完成后滚动到当前选中项
        this.scheduleOnce(() => {
            this.scrollToCurrentBet();
        }, 0.1);
    }

    /**
     * 下注选项点击事件
     */
    private onBetItemClick(betItem: BetAmountItem): void {
        if (!smc.crashGame) return;

        CrashGameAudio.playButtonClick();

        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            // 找到点击的item在数组中的索引
            const clickedIndex = betting.betAmountData.indexOf(betItem);
            if (clickedIndex === -1) return;

            // 应用边界限制逻辑
            const targetIndex = this.applyBoundaryRestrictions(clickedIndex);
            const targetBetItem = betting.betAmountData[targetIndex];

            // 验证余额是否足够
            if (!this.validateBetAmount(targetBetItem.value)) {
                console.warn(`Insufficient balance for bid amount: ${targetBetItem.value}`);
                return;
            }

            // 滚动到目标item并选中
            this.snapToItem(targetIndex);
            
            // 设置选中状态
            betting.setCurrentBetItem(targetBetItem);
            this.updateSelectedBetState();
            
            // 更新UI显示
            this.updateBetAmount(targetBetItem.value, targetBetItem.display);

            console.log(`Clicked bid: ${betItem.display} (index: ${clickedIndex}), scrolled to: ${targetBetItem.display} (index: ${targetIndex})`);
        }
    }

    /**
     * 应用边界限制逻辑
     * 前2个和后2个不能被选中，如果点击它们则重定向到允许的范围
     */
    private applyBoundaryRestrictions(clickedIndex: number): number {
        if (!this.betItemContainer) return clickedIndex;
        
        const totalItems = this.betItemContainer.children.length;
        console.log(`Boundary check: clickedIndex=${clickedIndex}, totalItems=${totalItems}`);
        
        // 如果总item数少于等于4，则没有有效的选择范围
        if (totalItems <= 4) {
            console.warn("Not enough items to apply boundary restrictions");
            return Math.max(0, Math.min(clickedIndex, totalItems - 1));
        }
        
        // 前2个：重定向到第3个（索引2）
        if (clickedIndex < 2) {
            console.log(`Index ${clickedIndex} is in top boundary (< 2), redirecting to index 2`);
            return 2;
        }
        
        // 后2个：重定向到倒数第3个（索引 totalItems - 3）
        if (clickedIndex >= totalItems - 2) {
            const targetIndex = totalItems - 3;
            console.log(`Index ${clickedIndex} is in bottom boundary (>= ${totalItems - 2}), redirecting to index ${targetIndex}`);
            return targetIndex;
        }
        
        // 在有效范围内，直接返回
        console.log(`Index ${clickedIndex} is in valid range [2, ${totalItems - 3}]`);
        return clickedIndex;
    }

    /**
     * 滚动事件处理 - 滚动中
     */
    private onBetScrolling(): void {
        // 滚动过程中可以添加一些实时反馈，暂时留空
    }

    /**
     * 滚动事件处理 - 滚动结束
     */
    private onBetScrollEnd(): void {
        if (!smc.crashGame || !this.betScrollView || !this.betItemContainer) return;
        
        // 防止递归调用
        if (this.isScrollSnapping) {
            console.log("Ignoring scroll end event during snapping");
            this.isScrollSnapping = false;
            return;
        }

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        // 记录当前选中的索引作为原始位置（滚动前的位置）
        const originalIndex = betting.betAmountData.indexOf(betting.currentBetItem);
        
        // 计算滚动后应该选中的item索引
        const rawSelectedIndex = this.calculateSelectedItemIndex();
        
        // 应用边界限制逻辑
        const finalSelectedIndex = this.applyBoundaryRestrictions(rawSelectedIndex);
        
        // 验证新选择的下注金额
        const selectedBetItem = betting.betAmountData[finalSelectedIndex];
        if (selectedBetItem && !this.validateBetAmount(selectedBetItem.value)) {
            // 验证失败，恢复到原始选择
            const restoreIndex = originalIndex >= 0 ? originalIndex : 0;
            console.log(`Balance validation failed, restoring to index: ${restoreIndex}`);
            
            this.isScrollSnapping = true;
            this.snapToItem(restoreIndex);
            this.selectItemByIndex(restoreIndex);
            return;
        }
        
        // 验证通过，执行正常的snap对齐
        this.isScrollSnapping = true;
        this.snapToItem(finalSelectedIndex);
        
        // 更新选中状态
        this.selectItemByIndex(finalSelectedIndex);
        
        if (rawSelectedIndex !== finalSelectedIndex) {
            console.log(`Scroll boundary redirect: ${rawSelectedIndex} -> ${finalSelectedIndex}`);
        } else {
            console.log(`Scroll snap to current item: ${finalSelectedIndex}`);
        }
    }

    /**
     * 获取item的实际尺寸信息
     */
    private getItemSizeInfo(): { itemHeight: number, spacing: number, itemTotalHeight: number } {
        if (!this.betItemContainer || this.betItemContainer.children.length === 0) {
            return { itemHeight: 0, spacing: 0, itemTotalHeight: 0 };
        }

        // 获取第一个item的高度
        const firstChild = this.betItemContainer.children[0];
        const firstChildTransform = firstChild.getComponent(UITransform);
        const itemHeight = firstChildTransform ? firstChildTransform.height : 0;
        
        // 如果有多个item，计算间距
        let spacing = 0;
        if (this.betItemContainer.children.length > 1) {
            const secondChild = this.betItemContainer.children[1];
            const firstChildPos = firstChild.position.y;
            const secondChildPos = secondChild.position.y;
            const actualSpacing = Math.abs(firstChildPos - secondChildPos) - itemHeight;
            spacing = actualSpacing > 0 ? actualSpacing : 0;
        }
        
        const itemTotalHeight = itemHeight + spacing;
        
        console.log(`Item size info - height: ${itemHeight}, spacing: ${spacing}, total: ${itemTotalHeight}`);
        
        return { itemHeight, spacing, itemTotalHeight };
    }

    /**
     * 计算当前选择框内应该选中的item索引
     */
    private calculateSelectedItemIndex(): number {
        if (!this.betScrollView || !this.betItemContainer) return 2; // 默认返回第3个item

        const scrollView = this.betScrollView;
        const container = this.betItemContainer;
        
        // 获取ScrollView的view子节点的尺寸（真正的显示区域）
        const viewNode = scrollView.node.getChildByName('view');
        if (!viewNode) return 2;
        
        const viewTransform = viewNode.getComponent(UITransform);
        if (!viewTransform) return 2;
        
        const viewHeight = viewTransform.height;
        const scrollOffset = scrollView.getScrollOffset();
        
        // 计算选择框中心位置在世界坐标中的Y值
        const centerY = Math.abs(scrollOffset.y) + viewHeight / 2;
        
        // 遍历所有item，找到最接近中心的那个
        let closestIndex = 0;
        let minDistance = Infinity;
        
        container.children.forEach((child, index) => {
            const itemY = Math.abs(child.position.y);
            const distance = Math.abs(itemY - centerY);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });
        
        console.log(`calculateSelectedItemIndex:`);
        console.log(`  - scrollOffset.y: ${scrollOffset.y}, viewHeight: ${viewHeight}`);
        console.log(`  - centerY: ${centerY}`);
        console.log(`  - closestIndex: ${closestIndex}, distance: ${minDistance}`);
        
        return closestIndex;
    }

    /**
     * 自动对齐到指定item
     */
    private snapToItem(index: number): void {
        if (!this.betScrollView || !this.betItemContainer) return;

        const scrollView = this.betScrollView;
        const container = this.betItemContainer;
        
        if (index < 0 || index >= container.children.length) return;

        // 动态获取item尺寸信息
        const { itemHeight, spacing, itemTotalHeight } = this.getItemSizeInfo();
        if (itemTotalHeight === 0) return;
        
        // 获取ScrollView的view子节点的尺寸（真正的显示区域）
        const viewNode = scrollView.node.getChildByName('view');
        if (!viewNode) return;
        
        const viewTransform = viewNode.getComponent(UITransform);
        if (!viewTransform) return;
        
        const viewHeight = viewTransform.height;
        
        // 获取目标item的实际位置
        const targetChild = container.children[index];
        const targetChildTransform = targetChild.getComponent(UITransform);
        if (!targetChildTransform) return;
        
        // 获取item在content中的位置
        const itemPositionY = targetChild.position.y;
        
        // 计算需要的滚动偏移：
        // 目标：让item中心对齐到view的中心(viewHeight/2)
        // itemPositionY是item在content中的位置(通常是负值，向下递减)
        // 我们需要滚动content，让item中心出现在view中心
        const targetScrollY = -(itemPositionY + viewHeight / 2);
        
        // 滚动到目标位置
        scrollView.scrollToOffset(new Vec2(0, targetScrollY), 0.2);
        
        console.log(`Snapped to item ${index}:`);
        console.log(`  - itemHeight: ${itemHeight}, spacing: ${spacing}`);
        console.log(`  - itemPositionY: ${itemPositionY}, viewHeight: ${viewHeight}`);
        console.log(`  - targetScrollY: ${targetScrollY}`);
    }

    /**
     * 通过索引选中item
     */
    private selectItemByIndex(index: number): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting || index < 0 || index >= betting.betAmountData.length) return;

        const selectedBetItem = betting.betAmountData[index];
        
        // 验证余额是否足够
        if (!this.validateBetAmount(selectedBetItem.value)) {
            console.warn(`Insufficient balance for bid amount: ${selectedBetItem.value}`);
            return;
        }
        
        // 设置当前选中的下注项
        betting.setCurrentBetItem(selectedBetItem);
        
        // 更新选中状态显示
        this.updateSelectedBetState();
        
        // 更新UI显示
        this.updateBetAmount(selectedBetItem.value, selectedBetItem.display);
        
        console.log(`Auto selected bid: ${selectedBetItem.display} (index: ${index})`);
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

        // 使用新的snapToItem方法
        this.snapToItem(selectedIndex);

        console.log(`Scrolled to bid item: ${betting.currentBetItem.display}`);
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

        console.log(`Set bid items interactable: ${interactable}`);
    }

    private updateUI(): void {
        if (!smc.crashGame) return;

        const userData = smc.crashGame.get(UserDataComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        // 安全更新余额显示
        if (this.balanceLabel) {
            this.balanceLabel.string = CrashGame.formatPrizeNumber(userData.balance);
        }
        if(this.moneyLabel){
            this.moneyLabel.string = CrashGame.formatPrizeNumber(userData.money);
        }

        // 安全更新倍数显示
        if (this.multiplierLabel) {
            this.multiplierLabel.string = `${multiplier.currentMultiplier.toFixed(2)}x`;
        }

        if(this.starLabel){
            this.starLabel.string = userData.levelstars.toString();
        }

        // 更新潜在收益
        this.updatePotentialWin();

        // 更新历史记录按钮
        this.updateHistoryButton();

        const betting = smc.crashGame.get(BettingComp);
        // 更新下注按钮显示 - 使用短文本格式
        const shortText = this.formatValueToShortText(betting.currentBetItem.value);
        this.updateBetButtonDisplay(shortText);

        // 更新AutoBet按钮状态
        this.updateAutoBetButtonState();

        // 更新能源显示
        this.updateEnergyDisplay();

        const racecomp = smc.crashGame.get(RaceComp);
        if(racecomp && racecomp.currentRace){
            this.localRaceRemainingTime = racecomp.currentRace.remainingTime;
            this.updateRaceCountdownDisplay(racecomp.currentRace.remainingTime);
        }
        
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
        const buttonLabel = this.historyMuiltiplierLabel;

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

    private initHoldButtonState(){
        this.hold_unpressed_node.active = true;
        this.hold_pressed_node.active = false;
    }

    private updateHoldButtonState(): void {
        if (!smc.crashGame || !this.holdButton) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const buttonLabel = this.holdButtonLabel;

        switch (gameState.state) {
            case GameState.INIT:
            case GameState.WAITING:
                if (buttonLabel) {
                    if (betting.gameMode === "SPG") {
                        // SPG模式：不显示文本
                        buttonLabel.string = "";
                        this.holdTextSprite.node.active = true;
                        this.holdButtonGameStateCD.node.active = false;
                        this.holdButtonGameStateLabel.node.active = false;
                        this.hold_waiting_node.active = false;
                    }
                    else{
                        buttonLabel.string = "";
                        this.holdTextSprite.node.active = false;
                    }
                }
                this.holdButton.interactable = true;
                this.removeButtonPressedEffect();
                
                break;
            case GameState.FLYING:
                if (betting.isHolding) {
                    if (buttonLabel) {
                        buttonLabel.string = '';
                    }
                    this.holdButton.interactable = true;
                    this.addButtonPressedEffect();
                } else {
                    // if (buttonLabel) {
                    //     buttonLabel.string = CrashGameLanguage.getText("cashed_out");
                    // }
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
                this.updateSceneScrollSpeed(multiplier.currentMultiplier);
            }
        }
                
        // 本地倒计时更新（每秒更新）
        this.raceCountdownTimer += _deltaTime * 1000;
        if (this.raceCountdownTimer >= 1000) { // 每秒更新一次
            this.raceCountdownTimer = 0;
            if (this.localRaceRemainingTime > 0) {
                this.localRaceRemainingTime -= 1000;
                if (this.localRaceRemainingTime <= 0) {
                    this.localRaceRemainingTime = 0;
                }
                this.updateRaceCountdownDisplay(this.localRaceRemainingTime);
            }
            
            // PIG模式倒计时显示通过事件系统更新，无需在update中直接调用
        }
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.off("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.off("GAME_STARTED", this.onGameStarted, this);
        oops.message.off("AUTO_CANCEL_AUTOGAME", this.onAutoCancelAutoGame, this);
        oops.message.off("SERVER_CANCEL_AUTOGAME",this.onServerCancelAutoGame,this);
        oops.message.off("ENERGY_CHANGED", this.onEnergyChanged, this);
        oops.message.off("SCENE_CHANGED", this.onSceneChanged, this);
        oops.message.off("RACE_DATA_UPDATED", this.onRaceDataUpdated, this);
        oops.message.off("SHOW_RACE_RESULT", this.onShowRaceResultUI, this);
        oops.message.off("AUTO_CASHOUT_ENDED", this.onAutoCashOutEnded, this);
         oops.message.off("PRIZE_CLAIMED",this.onRaceClaimed,this);
         oops.message.off("GAME_MODE_CHANGED",this.onGameModeChanged,this);
         oops.message.off("TASK_COMPLETED_LEVEL",this.onLevelComplete,this);
         oops.message.off("COINS_UPDATED",this.onAddCoins,this);

        // 清理余额标签点击事件
        if (this.balanceLabel) {
            const balanceButton = this.balanceLabel.node.parent?.getComponent(Button);
            balanceButton?.node.off(Node.EventType.TOUCH_START, this.onBalanceClick, this);
        }

        if(this.moneyLabel){
            const moneyButton = this.moneyLabel.node.parent?.getComponent(Button);
            moneyButton?.node.off(Node.EventType.TOUCH_START, this.onMoneyClick, this);
        }

        // 清理能源按钮事件
        if (this.energyButton) {
            this.energyButton.node.off(Button.EventType.CLICK, this.onEnergyButtonClick, this);
        }

        // 清理比赛按钮事件
        if (this.raceButton) {
            this.raceButton.node.off(Button.EventType.CLICK, this.onRaceButtonClick, this);
        }

        // 清理设置按钮事件
        if (this.settingsButton) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsButtonClick, this);
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

        if(this.closeBetPanelButton){
            this.closeBetPanelButton.node.off(Button.EventType.CLICK, this.onCloseBetPanelButtonClick, this);
        }

        if (this.PIGBetButton) {
            this.PIGBetButton.node.off(Button.EventType.CLICK, this.onAutoBetButtonClick, this);
        }
        
        if (this.SPGBetButton) {
            this.SPGBetButton.node.off(Button.EventType.CLICK, this.onSPGBetButtonClick, this);
        }

        if(this.PIGModeSelButton){
            this.PIGModeSelButton.node.off(Button.EventType.CLICK,this.onPIGModeSelOpen,this);
        }

        if(this.ModelSelCloseButton){
            this.ModelSelCloseButton.node.off(Button.EventType.CLICK,this.onCloseModeSelPanel,this);
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

        // 清理ScrollView滚动事件
        if (this.betScrollView) {
            this.betScrollView.node.off('scroll-ended', this.onBetScrollEnd, this);
            this.betScrollView.node.off('scrolling', this.onBetScrolling, this);
        }

        // 清理history弹窗相关事件
        oops.message.off("OPEN_HISTORY_POPUP", this.onHistoryPopupOpened, this);
        this.node.off(Node.EventType.TOUCH_END, this.onGlobalTouch, this);
        //guide
        oops.message.off("GUIDE_SHOW_BETPANEL",this.onGuideEvent,this);
        oops.message.off("GUIDE_SHOW_HOLD",this.onGuideEvent,this);
        oops.message.off("GUIDE_ON_HOLDED",this.onGuideEvent,this);
        oops.message.off("GUIDE_SHOW_MODE",this.onGuideEvent,this);
        oops.message.off("GUIDE_SHOW_MODE_ONLINE",this.onGuideEvent,this);
        oops.message.off("GUIDE_AFTER_CLICK_ONLINE",this.onGuideEvent,this);
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
            const buttonLabel = this.betButton.node.getChildByName("Label")?.getComponent(Label);
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

        console.log(`Bid amount updated to: ${amount} (${display}) -> button shows: ${shortText}`);
    }

    /**
     * 显示游戏结果弹窗
     * @param params 游戏结果参数
     */
    private showGameResult(params: GameResultParams,onCloseGameResult: () => void): void {
        console.log("Showing game result with params:", params);
        const maingameui_this = this;
        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const gameResultUI = node.getComponent(GameResultUI);
                if (gameResultUI) {
                    gameResultUI.onOpen(params, () => {
                        console.log("game result callback inn ...1");
                        // 关闭弹窗回调
                        oops.gui.remove(UIID.GameResult,false);
                    });
                }
            },
            onRemoved(node, params) {
                console.log("game result callback out ...1");
                //callback
                onCloseGameResult?.();
                console.log("game result callback inn ...3");
                // 重置游戏
                
                maingameui_this.resetGame();
                const betting = smc.crashGame.get(BettingComp);
                if (betting && betting.gameMode === "PIG") {
                    betting.goNextRound = true;
                }
                console.log("game result callback inn ...4");
                // 增加引导步骤
                maingameui_this.scheduleOnce(()=>{
                    SimpleTutorial.getInstance().IncrStep();
                },0.6);
            },
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

        const status = betting.getGameModeStatus();
        const params: AutoCashOutParams = {
            multiplier: 2.01,
            totalBets: status.pigTotalBets
        };

        console.log("Showing auto cashout UI with params:", params);

        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const autoCashOutUI = node.getComponent(AutoCashOutUI);
                if (autoCashOutUI) {
                    autoCashOutUI.onOpen(params,
                        (multiplier: number, totalBets: number) => {
                            if(!this.validateBetAmount(betting.currentBetItem.value)){
                                return;
                            }
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

    private onShowRaceResultUI(event: string, data: any): void {
        console.log("Showing race result UI");

        const callbacks: UICallbacks = {
            onAdded: (node: Node | null, params: any) => {
                if (!node) {
                    console.error("RaceResultUI node is null");
                    return;
                }
                
                const raceResultUI = node.getComponent(RaceResultUI);
                if (raceResultUI) {
                    // RaceUI需要参数，直接初始化
                    params.race = data;
                    raceResultUI.onOpen(params,()=>{
                        console.log("RaceResultUI removed");
                        oops.gui.remove(UIID.RaceReward);
                    });
                } else {
                    console.error("Failed to get RaceResultUI component");
                }
            },
            onRemoved: (node: Node | null, params: any) => {
                console.log("RaceResultUI closed");
            }
        };

        oops.gui.open(UIID.RaceReward, null, callbacks);
    }

    /**
     * 显示比赛界面
     */
    private showRaceUI(): void {
        console.log("Showing race UI");
        const thisui:MainGameUI = this;

        const callbacks: UICallbacks = {
            onAdded: (node: Node | null, params: any) => {
                if (!node) {
                    console.error("RaceUI node is null");
                    return;
                }
                params.joined = false;
                const raceUI = node.getComponent(RaceUI);
                if (raceUI) {
                    raceUI.onShowRaceUI(params);
                    // RaceUI不需要参数，直接初始化
                    console.log("RaceUI component loaded successfully");
                } else {
                    console.error("Failed to get RaceUI component");
                }
            },
            onRemoved: (node: Node | null, params: any) => {
                console.log("RaceUI closed");
                if(params&&params.joined){
                    const levelselui = this.levelNode.getComponent(LevelSelUI);
                    if(levelselui){
                        levelselui.onHideLevelSel();
                    }
                    const betting = smc.crashGame.get(BettingComp);
                    if(betting){
                        betting.gameMode = "SPG";
                        thisui.onAutoBetButtonClick();
                        thisui.loadingNode.active =true;
                        thisui.scheduleOnce(()=>{
                            thisui.loadingNode.active =false;
                        },1.0);
                    }
                }
            }
        };

        oops.gui.open(UIID.Race, null, callbacks);
    }

    /**
     * 显示设置界面
     */
    private showSettingsUI(): void {
        console.log("Showing settings UI");

        const callbacks: UICallbacks = {
            onAdded: (node: Node | null, params: any) => {
                if (!node) {
                    console.error("SettingsUI node is null");
                    return;
                }
                
                const settingsUI = node.getComponent('SettingsUI' as any);
                if (settingsUI) {
                    console.log("SettingsUI component loaded successfully");
                } else {
                    console.error("Failed to get SettingsUI component");
                }
            },
            onRemoved: (node: Node | null, params: any) => {
                console.log("SettingsUI closed");
            }
        };

        oops.gui.open(UIID.Settings, null, callbacks);
    }

    /**
     * 开始PIG模式自动提现
     * @param multiplier 自动提现倍数
     * @param totalBets 总下注次数
     */
    private startAutoCashOut(multiplier: number, totalBets: number): void {
        if (!smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (betting) {
            betting.setPigCashOut(multiplier, totalBets);
            console.log(`MainGameUI: Started PIG mode cashout: ${multiplier}x, ${totalBets === -1 ? 'infinite' : totalBets} bets`);
            // 验证设置是否正确
            const status = betting.getGameModeStatus();
            console.log(`MainGameUI: PIG mode status after setting:`, status);
            // 更新按钮状态
            this.updateAutoBetButtonState();
            this.updateHoldButtonState();
        }
    }

    /**
     * 更新模式切换按钮状态
     */
    private updateAutoBetButtonState(): void {
        if (!this.PIGBetButton || !smc.crashGame) return;

        const betting = smc.crashGame.get(BettingComp);
        if (!betting) return;

        const status = betting.getGameModeStatus();
        const pigbuttonLabel = this.PIGBetButton.getComponentInChildren(Label);
        const spgbuttonLabel = this.SPGBetButton.getComponentInChildren(Label);
        if( status.mode === "PIG" ){
            if(pigbuttonLabel){
                pigbuttonLabel.color = new Color(1,144,255,255);
            }
            if(spgbuttonLabel){
                spgbuttonLabel.color = new Color(7,53,131,255);
            }
            if(this.currentModeLabel){
                this.currentModeLabel.string = "ONLINE";
            }
        }else{
            if(pigbuttonLabel){
                pigbuttonLabel.color = new Color(7,53,131,255);
            }
            if(spgbuttonLabel){
                spgbuttonLabel.color = new Color(1,144,255,255);
            }
            if(this.currentModeLabel){
                this.currentModeLabel.string = "SINGLE";
            }
        }
        // const buttonLabel = this.PIGBetButton.getComponentInChildren(Label);

        // if (buttonLabel) {
            // if (status.mode === "PIG") {
            //     // PIG模式：显示"PIG"和设置信息
            //     buttonLabel.string = 'PIG';
            //     buttonLabel.color = new Color(2,253, 247, 255); // 亮色
            // } else {
            //     // SPG模式：显示"SPG"
            //     buttonLabel.string = "SPG";
            //     buttonLabel.color = new Color(2,253, 247, 255);//new Color(2,68, 66, 255); // 默认颜色
            // }
        // }
        // console.log(`Updated mode button state: ${status.mode}`);
    }

    /**
     * 能源按钮点击事件
     */
    private onEnergyButtonClick(): void {
        if (!smc.crashGame) return;

        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();

        CrashGameAudio.playButtonClick();

        const energy = smc.crashGame.get(EnergyComp);
        if (energy) {
            const status = energy.getEnergyStatus();

            if (status.canRecover) {
                // 显示确认弹窗，询问是否观看广告
                this.showEnergyRecoveryConfirm();
            } else {
                console.log("Energy is already full");
                oops.gui.toast("Energy is full!");
            }
        }
    }

    /**
     * 显示能源恢复确认弹窗
     */
    private showEnergyRecoveryConfirm(): void {
        console.log("MainGameUI: Showing energy recovery confirmation");
        
        tips.confirm(
            "Watch ad to get 1 energy. Continue?",
            () => {
                // 用户点击确认，播放广告
                console.log("MainGameUI: User confirmed energy recovery ad");
                this.showAdForEnergyRecovery();
            },
            () => {
                // 用户点击取消
                console.log("MainGameUI: User cancelled energy recovery ad");
            },
            "Energy Recovery",
            "Watch Ad",
            "Cancel"
        );
    }

    /**
     * 显示广告恢复能源
     */
    private showAdForEnergyRecovery(): void {
        console.log("MainGameUI: Showing ad for energy recovery");
        SDKMgr.instance.showVideo(
            () => {
                // 广告观看成功 - 恢复能源
                if (smc.crashGame) {
                    const energy = smc.crashGame.get(EnergyComp);
                    if (energy) {
                        energy.recoverEnergyByAd();
                        oops.gui.toast("Congratulations! Got 1 energy!");
                        console.log("MainGameUI: Energy recovered via ad");
                    }
                }
            },
            () => {
                // 广告取消
                console.log("MainGameUI: Energy ad cancelled");
                oops.gui.toast("Ad cancelled");
            },
            () => {
                // 广告错误
                console.log("MainGameUI: Energy ad error");
                oops.gui.toast("Ad failed to load, please try again later");
            }
        );
    }

    /**
     * 比赛按钮点击事件
     */
    private onRaceButtonClick(): void {
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();
        
        CrashGameAudio.playButtonClick();
        console.log("Race button clicked - opening race UI");
        
        this.showRaceUI();
    }

    /**
     * 设置按钮点击事件
     */
    private onSettingsButtonClick(): void {
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();
        
        CrashGameAudio.playButtonClick();
        console.log("Settings button clicked - opening settings UI");
        
        this.showSettingsUI();
    }

    /**
     * 任务按钮点击事件
     */
    private onTaskButtonClick(): void {
        // 关闭history弹窗（如果打开的话）
        this.closeHistoryPopup();
        this.onCloseBetPanelButtonClick();
        
        CrashGameAudio.playButtonClick();
        console.log("Task button clicked - opening task UI");
        
        this.showTaskUI();
    }

    /**
     * 显示任务界面
     */
    private showTaskUI(): void {
        console.log("Showing task UI");
        if(this.taskTipNode){
            this.taskTipNode.active = false;
        }
        const callbacks: UICallbacks = {
            onAdded: (node: Node | null, params: any) => {
                if (!node) {
                    console.error("TaskUI node is null");
                    return;
                }
            },
            onRemoved: (node: Node | null, params: any) => {
                console.log("TaskUI closed");
            }
        };

        oops.gui.open(UIID.TaskUI, null, callbacks);
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
            if(this.energyProgressBar){
                this.energyProgressBar.setProgress(status.current/status.max);
            }

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


    /**
     * 播放金币飞行动画
     * @param coinAmount 金币数量
     * @param onComplete 完成回调
     */
    private playCoinFlyAnimation(coinAmount: number, onComplete?: () => void): void {
        if (!this.coinFlyEffect) {
            console.warn("CoinFlyEffect not configured");
            onComplete?.();
            return;
        }

        // 获取起始位置（GameResult弹窗的金币位置）
        const startWorldPos = this.getGameResultCoinWorldPos();
        // 获取目标位置（余额显示位置）
        const endWorldPos = this.getBalanceLabelWorldPos();

        console.log(`Playing coin fly animation: ${coinAmount} coins`);
        console.log(`From:`, startWorldPos, `To:`, endWorldPos);

        // 开始飞币动画
        this.coinFlyEffect.startCoinFly(coinAmount, startWorldPos, endWorldPos, onComplete);
    }

    private playMoneyFlyAnimation(moneyAmount: number, onComplete?: () => void): void {
        if (!this.moneyFlyEffect) {
            console.warn("MoneyFlyEffect not configured");
            onComplete?.();
            return;
        }

        // 获取起始位置（GameResult弹窗的金币位置）
        const startWorldPos = this.getGameResultCoinWorldPos();
        // 获取目标位置（余额显示位置）
        const endWorldPos = this.getMoneyWorldPos();

        console.log(`Playing money fly animation: ${moneyAmount} money`);
        console.log(`From:`, startWorldPos, `To:`, endWorldPos);

        // 开始飞币动画
        this.moneyFlyEffect.startCoinFly(moneyAmount, startWorldPos, endWorldPos, onComplete);
    }

    /**
     * 获取GameResult弹窗中金币显示的世界坐标
     */
    private getGameResultCoinWorldPos(): Vec3 {
        // 获取屏幕可见尺寸来计算真正的屏幕中心
        const visibleSize = view.getVisibleSize();
        
        // 屏幕中心坐标 = 屏幕尺寸的一半
        const screenCenter = new Vec3(
            visibleSize.width / 2, 
            visibleSize.height / 2, 
            0
        );
        
        console.log("Screen visible size:", visibleSize);
        console.log("Screen center world pos:", screenCenter);
        
        return screenCenter;
    }

    private getMoneyWorldPos():Vec3{
        
        // 如果保存了原始坐标，就使用原始坐标
        if (this.originalMoneyLabelWordlPos.x !== 0 || this.originalMoneyLabelWordlPos.y !== 0) {
            return this.originalMoneyLabelWordlPos.clone();
        }

        // 如果没有保存坐标，则实时计算（作为备用）
        if (!this.moneyLabel) {
            console.warn("money label not found and no saved position available");
            return new Vec3(0, 0, 0);
        }

        const uiTransform = this.moneyLabel.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn("money label UITransform not found");
            return new Vec3(0, 0, 0);
        }

        // 获取实时世界坐标
        const worldPos = new Vec3();
        uiTransform.convertToWorldSpaceAR(Vec3.ZERO, worldPos);
        return worldPos;
    }

    /**
     * 获取余额标签的世界坐标（返回保存的原始位置，不受UI动画影响）
     */
    private getBalanceLabelWorldPos(): Vec3 {
        // 如果保存了原始坐标，就使用原始坐标
        if (this.originalBalanceLabelWorldPos.x !== 0 || this.originalBalanceLabelWorldPos.y !== 0) {
            console.log(`Using saved balance label world position:`, this.originalBalanceLabelWorldPos);
            return this.originalBalanceLabelWorldPos.clone();
        }

        // 如果没有保存坐标，则实时计算（作为备用）
        if (!this.balanceLabel) {
            console.warn("Balance label not found and no saved position available");
            return new Vec3(0, 0, 0);
        }

        const uiTransform = this.balanceLabel.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn("Balance label UITransform not found");
            return new Vec3(0, 0, 0);
        }

        // 获取实时世界坐标
        const worldPos = new Vec3();
        uiTransform.convertToWorldSpaceAR(Vec3.ZERO, worldPos);
        console.log(`Using real-time balance label world position:`, worldPos);
        return worldPos;
    }

    /**
     * 保存Widget组件的原始值
     */
    private saveOriginalWidgetValues(): void {
        const nodes = [this.topNode, this.leftNode, this.rightNode];
        
        nodes.forEach(node => {
            if (node) {
                const widget = node.getComponent(Widget);
                if (widget) {
                    this.originalWidgetValues.set(node, {
                        top: widget.top,
                        bottom: widget.bottom,
                        left: widget.left,
                        right: widget.right
                    });
                    console.log(`Saved widget values for ${node.name}:`, this.originalWidgetValues.get(node));
                }
            }
        });
    }


    private saveOriginalMoneyLabelWorldPos(): void {
        if (!this.moneyLabel) {
            console.warn("money label not found - cannot save original world position");
            return;
        }

        const uiTransform = this.moneyLabel.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn("money label UITransform not found - cannot save original world position");
            return;
        }

        // 获取并保存世界坐标
        uiTransform.convertToWorldSpaceAR(Vec3.ZERO, this.originalMoneyLabelWordlPos);
    }
    /**
     * 保存balance标签的原始世界坐标
     */
    private saveOriginalBalanceLabelWorldPos(): void {
        if (!this.balanceLabel) {
            console.warn("Balance label not found - cannot save original world position");
            return;
        }

        const uiTransform = this.balanceLabel.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn("Balance label UITransform not found - cannot save original world position");
            return;
        }

        // 获取并保存世界坐标
        uiTransform.convertToWorldSpaceAR(Vec3.ZERO, this.originalBalanceLabelWorldPos);
        console.log(`Saved original balance label world position:`, this.originalBalanceLabelWorldPos);
    }

    /**
     * 开始游戏时的UI动画 - 滑出节点
     */
    private playGameStartUIAnimation(): void {
        // 强制重置动画状态，确保新游戏可以正常播放动画
        this.isUIAnimating = true;
        
        console.log("Playing game start UI animation");
        
        // 获取屏幕尺寸用于计算滑出距离
        const visibleSize = view.getVisibleSize();
        const slideDistance = Math.max(visibleSize.width, visibleSize.height) + 200; // 增加额外距离确保完全滑出
        
        // 使用一个统一的tweener对象来驱动所有动画
        const tweenTarget = { progress: 0 };
        
        // 保存初始状态
        const initialStates = {
            topWidget: this.topNode?.getComponent(Widget),
            leftWidget: this.leftNode?.getComponent(Widget),
            rightWidget: this.rightNode?.getComponent(Widget)
        };
        
        const startValues = {
            top: initialStates.topWidget?.top || 0,
            left: initialStates.leftWidget?.left || 0,
            right: initialStates.rightWidget?.right || 0
        };
        
        const targetValues = {
            top: -slideDistance,
            left: -slideDistance,
            right: -slideDistance
        };
        
        console.log(`Animation start values:`, startValues);
        console.log(`Animation target values:`, targetValues);
        
        tween(tweenTarget)
            .to(0.5, { progress: 1 }, { 
                easing: 'sineIn',
                onUpdate: (target: any) => {
                    const progress = target.progress;
                    
                    // 更新topNode
                    if (initialStates.topWidget && initialStates.topWidget.isAlignTop) {
                        const currentTop = startValues.top + (targetValues.top - startValues.top) * progress;
                        initialStates.topWidget.top = currentTop;
                        initialStates.topWidget.updateAlignment();
                    }
                    
                    // 更新leftNode
                    if (initialStates.leftWidget && initialStates.leftWidget.isAlignLeft) {
                        const currentLeft = startValues.left + (targetValues.left - startValues.left) * progress;
                        initialStates.leftWidget.left = currentLeft;
                        initialStates.leftWidget.updateAlignment();
                    }
                    
                    // 更新rightNode
                    if (initialStates.rightWidget && initialStates.rightWidget.isAlignRight) {
                        const currentRight = startValues.right + (targetValues.right - startValues.right) * progress;
                        initialStates.rightWidget.right = currentRight;
                        initialStates.rightWidget.updateAlignment();
                    }
                }
            })
            .start();
        
        // 显示multiplierNode
        if (this.multiplierNode) {
            this.multiplierNode.active = true;
            // 添加fade in效果
            this.multiplierNode.setScale(0, 0, 1);
            tween(this.multiplierNode)
                .delay(0.2) // 稍微延迟显示
                .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    /**
     * 游戏结束后的UI动画 - 滑回原位置
     */
    private playGameEndUIAnimation(): void {
        if (!this.isUIAnimating) return;
        
        console.log("Playing game end UI animation");
        
        // 使用一个统一的tweener对象来驱动所有动画
        const tweenTarget = { progress: 0 };
        
        // 获取当前状态
        const currentStates = {
            topWidget: this.topNode?.getComponent(Widget),
            leftWidget: this.leftNode?.getComponent(Widget),
            rightWidget: this.rightNode?.getComponent(Widget)
        };
        
        const startValues = {
            top: currentStates.topWidget?.top || 0,
            left: currentStates.leftWidget?.left || 0,
            right: currentStates.rightWidget?.right || 0
        };
        
        // 获取原始值
        const targetValues = {
            top: this.originalWidgetValues.get(this.topNode)?.top || 0,
            left: this.originalWidgetValues.get(this.leftNode)?.left || 0,
            right: this.originalWidgetValues.get(this.rightNode)?.right || 0
        };
        
        console.log(`Restore animation start values:`, startValues);
        console.log(`Restore animation target values:`, targetValues);
        
        tween(tweenTarget)
            .to(0.5, { progress: 1 }, { 
                easing: 'sineOut',
                onUpdate: (target: any) => {
                    const progress = target.progress;
                    
                    // 更新topNode
                    if (currentStates.topWidget && currentStates.topWidget.isAlignTop) {
                        const currentTop = startValues.top + (targetValues.top - startValues.top) * progress;
                        currentStates.topWidget.top = currentTop;
                        currentStates.topWidget.updateAlignment();
                    }
                    
                    // 更新leftNode
                    if (currentStates.leftWidget && currentStates.leftWidget.isAlignLeft) {
                        const currentLeft = startValues.left + (targetValues.left - startValues.left) * progress;
                        currentStates.leftWidget.left = currentLeft;
                        currentStates.leftWidget.updateAlignment();
                    }
                    
                    // 更新rightNode
                    if (currentStates.rightWidget && currentStates.rightWidget.isAlignRight) {
                        const currentRight = startValues.right + (targetValues.right - startValues.right) * progress;
                        currentStates.rightWidget.right = currentRight;
                        currentStates.rightWidget.updateAlignment();
                    }
                },
                onComplete: () => {
                    this.isUIAnimating = false;
                    console.log("Game end UI animation completed");
                }
            })
            .start();
        
        // 隐藏multiplierNode
        if (this.multiplierNode) {
            tween(this.multiplierNode)
                .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                .call(() => {
                    this.multiplierNode.active = false;
                })
                .start();
        }
    }

    /**
     * 显示energy free
     */
    private showEnergyFree(callback: ()=>void): void {
        const energyComp = smc.crashGame.get(EnergyComp);
        if (energyComp) {
            const mid_time = (Date.now() - energyComp.lastUpdateTime)/60000;
            if( mid_time >= 100 ){//大于100分钟
                const callbacks: UICallbacks = {
                    onAdded: (node: Node, params: any) => {
                        const energybuyUI = node.getComponent(EnergyBuyUI);
                        if (energybuyUI) {
                            energybuyUI.onOpen(params);
                        }
                    },
                    onRemoved: (node: Node | null, params: any) => {
                        console.log("EnergyBuyUI closed");
                        callback?.();
                    }
                };
                // 打开energy free window
                oops.gui.open(UIID.EnergyFree,{ currentEnergy: 10 },callbacks);
            }else{
                callback?.();
            }
        }else{
            callback?.();
        }
    }

    /**
     * 显示race结果
     */
    private async showRaceResult(): Promise<void> {
        const raceComp = smc.crashGame.get(RaceComp);
        if (raceComp) {
            try {
                const raceid = await raceComp.getUserPendingRaceId();
                if( raceid && raceid != '' ){
                    await raceComp.showRaceResult(raceid || "");
                }
            } catch (error) {
                console.log(error);
            }
            
        }
    }

    /**
     * 显示race结果 - 根据是否有新手教程来决定时机
     */
    private showRaceResultAfterTutorial(): void {
        const tutorial = SimpleTutorial.getInstance();
        
        if (!tutorial.shouldShowTutorial()) {
            // 如果需要显示新手教程，则等教程完成后再显示race结果
            // 不需要延迟，直接传入回调函数
            // 没有新手教程，直接显示
            this.scheduleOnce(() => {
                this.showEnergyFree(()=>{
                    this.showRaceResult();
                });
            }, 0);
        }
    }

    /**
     * 检查并显示新手引导
     */
    private checkAndShowTutorial(): void {
        const tutorial = SimpleTutorial.getInstance();
        if (tutorial.shouldShowTutorial()) {
            // 延迟一下显示，确保UI完全加载
            this.scheduleOnce(() => {
                tutorial.showTutorial(this.holdButton.node, () => {
                    // // 教程完成后的回调 - 显示race结果
                    // this.showRaceResult();
                });
            }, 0.3);
        }
    }

    /**
     * 当用户点击HOLD按钮时调用（完成引导）
     */
    private onTutorialHoldButtonClicked(): void {
        const tutorial = SimpleTutorial.getInstance();
        tutorial.completeTutorial();
    }

    /**
     * 余额标签点击事件
     */
    private onBalanceClick(): void {
        CrashGameAudio.playButtonClick();
        
        // 获取当前余额
        const userData = smc.crashGame.get(UserDataComp);
        const currentBalance = userData ? userData.balance : 0;

        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const goldpopupUI = node.getComponent(GoldPopupUI);
                if (goldpopupUI) {
                    goldpopupUI.onOpen(params);
                }
            }
        };
        
        // 打开金币弹窗
        oops.gui.open(UIID.GoldPopup, { balance: currentBalance }, callbacks);
    }

    /**
     * 余额标签点击事件
     */
    private onMoneyClick(): void {
        CrashGameAudio.playButtonClick();
        
        // 获取当前余额
        const userData = smc.crashGame.get(UserDataComp);
        const currentMoney = userData ? userData.money : 0;
        
        const callbacks: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const moneypopupUI = node.getComponent(MoneyPopupUI);
                if (moneypopupUI) {
                    moneypopupUI.onOpen(params);
                }
            }
        };

        // 打开金币弹窗
        oops.gui.open(UIID.MoneyPopup, { balance: currentMoney },callbacks);
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
        // 重置倒计时状态
        this.isCountdownActive = false;
    }

    /**
     * 开始3秒倒计时
     */
    private startCountdown(callback:Function): void {
        this.isCountdownActive = true;
        CrashGameAudio.playCountDown();
        // 显示倒计时节点
        if (this.countdownNode) {
            this.countdownNode.active = true;
        }
        
        // 显示第一个数字 "3"
        this.showCountdownNumber(3);
        this.scheduleOnce(()=>{
            this.showCountdownNumber(2);
            this.scheduleOnce(()=>{
                this.showCountdownNumber(1);
                this.scheduleOnce(()=>{
                    this.showCountdownGO();
                    this.scheduleOnce(()=>{
                        // 倒计时结束
                        this.onCountdownComplete(callback);
                    },0.1);
                },0.6);
            },0.6);
        },0.6);
        
    }

    /**
     * 显示倒计时数字
     */
    private showCountdownNumber(number: number): void {
        if (!this.countdownSprite) return;
        
        let spriteFrame: SpriteFrame | null = null;
        
        switch (number) {
            case 3:
                spriteFrame = this.countdown3SpriteFrame;
                break;
            case 2:
                spriteFrame = this.countdown2SpriteFrame;
                break;
            case 1:
                spriteFrame = this.countdown1SpriteFrame;
                break;
        }
        
        if (spriteFrame) {
            this.countdownSprite.spriteFrame = spriteFrame;
            
            // 添加放大再恢复正常的动画效果
            const node = this.countdownSprite.node;
            // 先重置缩放
            node.setScale(new Vec3(1, 1, 1));
            
            // 创建放大再恢复的动画
            tween(node)
                .to(0.1, { scale: new Vec3(1.3, 1.3, 1) }) // 0.1秒内放大到1.2倍
                .to(0.2, { scale: new Vec3(1, 1, 1) })     // 0.2秒内恢复到正常大小
                .start();
        }
    }
    /**
     * 显示GO
     */
    private showCountdownGO(): void {
        if (!this.countdownSprite || !this.countdownGoSpriteFrame) return;
        
        this.countdownSprite.spriteFrame = this.countdownGoSpriteFrame;
    }

    /**
     * 倒计时完成回调
     */
    private onCountdownComplete(callback:Function): void {
        this.isCountdownActive = false;
        
        // 隐藏倒计时节点
        if (this.countdownNode) {
            this.countdownNode.active = false;
        }
        callback?.();
    }

    private onGuideEvent(event:string,data:any){
        if(event == "GUIDE_SHOW_BETPANEL"){
            this.node.off(Node.EventType.TOUCH_END, this.onGlobalTouch, this);
            this.showBetPanel();
            this.snapToItem(6);
        }else if(event == "GUIDE_SHOW_HOLD"){
            this.hideBetPanel();
        }
        else if(event == "GUIDE_ON_HOLDED"){
              this.scheduleOnce(()=>{
                this.onHoldButtonTouchEnd(null as any);
            },5);
            this.onHoldButtonTouchStart(null as any);
        }else if(event == "GUIDE_SHOW_MODE"){
            
        }else if(event == "GUIDE_SHOW_MODE_ONLINE"){
            this.onPIGModeSelOpen();
        }
        else if(event == "GUIDE_AFTER_CLICK_ONLINE"){
            this.onAutoBetButtonClick();
            this.node.on(Node.EventType.TOUCH_END, this.onGlobalTouch, this);
            SimpleTutorial.getInstance().endGuide();
        }
        
    }

    private onAddCoins(event:string,data:any){
        const addedcoins:number = data.amount;
        this.playCoinFlyAnimation(addedcoins, () => {
            console.log("onAddCoins fly animation completed!");
            this.updateUI();
        });
    }

    /**
     * 更新PIG模式倒计时显示
     */
    /**
     * 处理PIG倒计时更新事件
     */
    /**
     * 处理PIG倒计时更新事件 - 只负责UI更新
     */
    private onPigCountdownUpdate(event: string, data: any): void {
        this.updatePigCountdownDisplay(data);
    }
    
    /**
     * 处理PIG倒计时结束事件 - 只负责UI更新
     */
    private onPigCountdownFinished(event: string, data: any): void {
        console.log("MainGameUI: PIG countdown finished, phase:", data.phase);
        // 倒计时结束时的UI处理
        this.updatePigCountdownDisplay(data);
        const betting = smc.crashGame.get(BettingComp);
        if( data.phase === "waiting" &&betting.goNextRound && betting.pigCashOutMultiplier <=0){
            tips.alert("Sorry, your bid was not successful. Please wait for the next round!");
        }
    }

    /**
     * 更新PIG倒计时显示 - 纯UI逻辑，不包含倒计时计算
     */
    private updatePigCountdownDisplay(eventData?: any): void {
        if (!smc.crashGame) return;
        
        const betting = smc.crashGame.get(BettingComp);
        if (!betting || betting.gameMode !== "PIG") {
            // 隐藏倒计时相关UI
            this.holdButtonGameStateCD.node.active = false;
            this.hold_waiting_node.active = false;
            return;
        }
        
        // 使用事件数据或从BettingComp获取状态
        const phase = eventData?.phase || betting.serverPhase;
        const remainingTime = eventData?.remainingTime || betting.getPigCountdownRemainingTime();
        const seconds = Math.ceil(remainingTime / 1000);
        
        let message = "";
        
        if (phase === "betting") {
            message = `BIDDING TIME`;
            this.holdButtonGameStateCD.node.active = true;
            this.holdButtonGameStateCD.setTime(seconds);
            this.hold_waiting_node.active = false;
            this.holdTextSprite.node.active = false;
            this.updateAutoBetButtonState();
        } else if (phase === "waiting") {
            message = `STARTING IN`;
            this.holdButtonGameStateCD.node.active = true;
            this.hold_waiting_node.active = false;
            this.holdButtonGameStateCD.setTime(seconds);
        } else if (phase === "gaming") {
            if( betting.goNextRound ){
                message = `WAITING \n FOR \n PLAYER`;
            }else{
                message = '';
            }
            this.holdButtonGameStateCD.node.active = false;
            this.hold_waiting_node.active = true;
        } else {
            // idle状态，隐藏倒计时UI
            this.holdButtonGameStateCD.node.active = false;
            this.hold_waiting_node.active = false;
        }
        
        if (message) {
            console.log(`MainGameUI: PIG countdown display - ${message}`);
            this.holdButtonGameStateLabel.string = message;
            this.holdButtonGameStateLabel.node.active = true;
        }
        else{
            this.holdButtonGameStateLabel.string = '';
            this.holdButtonGameStateLabel.node.active = false;
        }
    }

    public showLevelPanel(nextLevelid:number){
        const levelselui = this.levelNode.getComponent(LevelSelUI);
        if(levelselui){
            levelselui.openLevel(nextLevelid);
            this.levelNode.active = true;
            const betting = smc.crashGame.get(BettingComp);
            if(betting){
                betting.setGameMode("SPG");
                this.updateAutoBetButtonState();
                this.updateHoldButtonState();
            }
        }
        else{
            this.levelNode.active = false;
        }
    }

    public onLevelComplete(event:string,data:any){
        if(data && data.levelId >= 0){
            const userdatacomp = smc.crashGame.get(UserDataComp);
            if(userdatacomp){
                
                
                if( userdatacomp.completedLevelId > data.levelId){
                    this.showLevelPanel(userdatacomp.completedLevelId+1);
                }else{
                    if(data.completed!=undefined && data.completed){
                        // 检查是否完成了特定关卡，需要在进入下一关时显示对话
                // 完成第4关（id=3）后进入第5关（id=4）时显示对话
                // 完成第9关（id=8）后进入第10关（id=9）时显示对话
                if(data.levelId === 3 || data.levelId === 8) {
                    this.showStoryDialog(data.levelId + 1);
                }
                        this.showLevelPanel(data.levelId+1);
                    }else{
                        this.showLevelPanel(userdatacomp.completedLevelId+1);
                    }
                }
            }
        }
    }

    public completedNowLevel(levelstars:number){
        const userdatacomp = smc.crashGame.get(UserDataComp);
        if(userdatacomp){
            const currentLevelId = userdatacomp.currentPlayLevelId;
            if(currentLevelId>userdatacomp.completedLevelId){
                if( levelstars >= currentLevelId+1 ){
                    userdatacomp.updateCompletedLevel(currentLevelId,true);  
                }else{
                    userdatacomp.updateCompletedLevel(currentLevelId,false);
                }
            }else{
                userdatacomp.updateCompletedLevel(currentLevelId,true);
            }
            
        }
    }

    public onLevelBackClick(){
        const userdatacomp = smc.crashGame.get(UserDataComp);
        if(userdatacomp){
            const currentLevelId = userdatacomp.completedLevelId+1;
            this.showLevelPanel(currentLevelId);
        }
    }

    public onStarsChanged(event:string,data:any){
        const userdatacomp = smc.crashGame.get(UserDataComp);
        if(userdatacomp&&this.starLabel){
            this.starLabel.string = userdatacomp.levelstars.toString();
        }
    }

    private showStoryDialog(levelId: number): void {
        if (this.dialogsUI) {
            this.dialogsUI.showStoryDialog(levelId);
        }
    }
}