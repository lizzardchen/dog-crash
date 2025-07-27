import { _decorator, Component, Node, Label, Button, EditBox } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";

const { ccclass, property } = _decorator;

@ccclass('MainGameUI')
export class MainGameUI extends CCComp {
    @property(Label)
    balanceLabel: Label = null!;

    @property(Label)
    multiplierLabel: Label = null!;

    @property(Label)
    potentialWinLabel: Label = null!;

    @property(EditBox)
    betAmountInput: EditBox = null!;

    @property(Button)
    holdButton: Button = null!;

    @property(Node)
    rocketNode: Node = null!;

    private gameEntity: CrashGame | null = null;

    onLoad() {
        // 初始化游戏实体
        this.initGameEntity();

        // 设置UI事件监听
        this.setupUIEvents();

        // 初始化UI显示
        this.updateUI();
    }

    private initGameEntity(): void {
        // 获取或创建游戏实体
        this.gameEntity = ecs.getEntity(CrashGame);
        if (!this.gameEntity) {
            console.error("Failed to get CrashGame entity");
            return;
        }

        // 初始化本地数据
        const localData = this.gameEntity.get(LocalDataComp);
        if (localData) {
            localData.currentCrashMultiplier = localData.generateCrashMultiplier();
        }

        // 初始化火箭视觉组件
        const rocketView = this.gameEntity.get(RocketViewComp);
        if (rocketView && this.rocketNode) {
            // 将UI中的火箭节点绑定到RocketViewComp
            rocketView.rocketNode = this.rocketNode;
            // 可以在这里绑定其他视觉节点，如粒子系统、动画等
        }
    }

    private setupUIEvents(): void {
        // HOLD按钮事件
        this.holdButton.node.on(Button.EventType.CLICK, this.onHoldButtonPressed, this);

        // 下注金额输入事件
        this.betAmountInput.node.on(EditBox.EventType.TEXT_CHANGED, this.onBetAmountChanged, this);

        // 监听游戏事件
        oops.message.on("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.on("GAME_CASHED_OUT", this.onGameCashedOut, this);
    }

    private onHoldButtonPressed(): void {
        if (!this.gameEntity) return;

        CrashGameAudio.playButtonClick();

        const gameState = this.gameEntity.get(GameStateComp);
        const betting = this.gameEntity.get(BettingComp);
        const multiplier = this.gameEntity.get(MultiplierComp);

        if (gameState.state === GameState.WAITING) {
            // 开始游戏
            const betAmount = parseFloat(this.betAmountInput.string) || 0;
            if (this.validateBetAmount(betAmount)) {
                betting.betAmount = betAmount;
                betting.isHolding = true;
                gameState.state = GameState.FLYING;
                gameState.startTime = Date.now();
                multiplier.startTime = Date.now();

                CrashGameAudio.playDogRocketLaunch();
                this.updateHoldButtonState();
            }
        } else if (gameState.state === GameState.FLYING) {
            // 提现
            betting.isHolding = false;
            gameState.state = GameState.CASHED_OUT;
            multiplier.cashOutMultiplier = multiplier.currentMultiplier;

            this.processCashOut();
        }
    }

    private validateBetAmount(amount: number): boolean {
        if (!this.gameEntity) return false;

        const betting = this.gameEntity.get(BettingComp);

        if (amount <= 0) {
            oops.gui.toast(CrashGameLanguage.getText("invalid_bet_amount"));
            return false;
        }

        if (amount > betting.balance) {
            oops.gui.toast(CrashGameLanguage.getText("insufficient_balance"));
            return false;
        }

        return true;
    }

    private processCashOut(): void {
        if (!this.gameEntity) return;

        const betting = this.gameEntity.get(BettingComp);
        const multiplier = this.gameEntity.get(MultiplierComp);

        const winAmount = betting.betAmount * multiplier.cashOutMultiplier;
        betting.balance += winAmount - betting.betAmount; // 减去下注金额，加上奖金

        CrashGameAudio.playCashOutSuccess();
        oops.gui.toast(`${CrashGameLanguage.getText("cash_out")} ${multiplier.cashOutMultiplier.toFixed(2)}x`);

        this.resetGame();
    }

    private onGameCrashed(): void {
        if (!this.gameEntity) return;

        const betting = this.gameEntity.get(BettingComp);
        betting.balance -= betting.betAmount; // 扣除下注金额

        CrashGameAudio.playCrashExplosion();
        oops.gui.toast(CrashGameLanguage.getText("crashed"));

        this.resetGame();
    }

    private onGameCashedOut(): void {
        // 处理提现成功
    }

    private resetGame(): void {
        if (!this.gameEntity) return;

        const gameState = this.gameEntity.get(GameStateComp);
        const betting = this.gameEntity.get(BettingComp);
        const multiplier = this.gameEntity.get(MultiplierComp);
        const localData = this.gameEntity.get(LocalDataComp);

        // 重置游戏状态
        gameState.reset();
        betting.reset();
        multiplier.reset();

        // 生成新的崩盘倍数
        localData.currentCrashMultiplier = localData.generateCrashMultiplier();

        this.updateHoldButtonState();
        this.updateUI();
    }

    private onBetAmountChanged(): void {
        this.updatePotentialWin();
    }

    private updateUI(): void {
        if (!this.gameEntity) return;

        const betting = this.gameEntity.get(BettingComp);
        const multiplier = this.gameEntity.get(MultiplierComp);

        // 更新余额显示
        this.balanceLabel.string = `${CrashGameLanguage.getText("balance")}: ${betting.balance.toFixed(0)}`;

        // 更新倍数显示
        this.multiplierLabel.string = `${multiplier.currentMultiplier.toFixed(2)}x`;

        // 更新潜在收益
        this.updatePotentialWin();
    }

    private updatePotentialWin(): void {
        if (!this.gameEntity) return;

        const betting = this.gameEntity.get(BettingComp);
        const multiplier = this.gameEntity.get(MultiplierComp);
        const betAmount = parseFloat(this.betAmountInput.string) || 0;

        const potentialWin = betAmount * multiplier.currentMultiplier;
        this.potentialWinLabel.string = `${CrashGameLanguage.getText("potential_win")}: ${potentialWin.toFixed(0)}`;
    }

    private updateHoldButtonState(): void {
        if (!this.gameEntity) return;

        const gameState = this.gameEntity.get(GameStateComp);

        switch (gameState.state) {
            case GameState.WAITING:
                this.holdButton.getComponentInChildren(Label).string = CrashGameLanguage.getText("hold_to_fly");
                this.holdButton.interactable = true;
                break;
            case GameState.FLYING:
                this.holdButton.getComponentInChildren(Label).string = CrashGameLanguage.getText("cash_out");
                this.holdButton.interactable = true;
                break;
            default:
                this.holdButton.interactable = false;
                break;
        }
    }

    update(deltaTime: number) {
        this.updateUI();
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.off("GAME_CASHED_OUT", this.onGameCashedOut, this);
    }
}