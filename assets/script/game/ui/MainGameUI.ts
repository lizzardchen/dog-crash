import { _decorator, Node, Label, Button, EditBox } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { smc } from "../common/SingletonModuleComp";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';

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
    }

    private setupUIEvents(): void {
        // HOLD按钮事件（只有在按钮存在时才绑定）
        if (this.holdButton) {
            this.holdButton.node.on(Button.EventType.CLICK, this.onHoldButtonPressed, this);
        }

        // 下注金额输入事件（只有在输入框存在时才绑定）
        if (this.betAmountInput) {
            this.betAmountInput.node.on(EditBox.EventType.TEXT_CHANGED, this.onBetAmountChanged, this);
        }

        // 监听游戏事件
        oops.message.on("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.on("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.on("GAME_STARTED", this.onGameStarted, this);
    }

    private onHoldButtonPressed(): void {
        if (!smc.crashGame) return;

        CrashGameAudio.playButtonClick();

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);

        if (gameState.state === GameState.WAITING) {
            // 开始游戏
            const betAmount = this.betAmountInput ? (parseFloat(this.betAmountInput.string) || 0) : 100;
            if (this.validateBetAmount(betAmount)) {
                betting.betAmount = betAmount;
                betting.isHolding = true;
                gameState.state = GameState.FLYING;
                gameState.startTime = Date.now();
                multiplier.startTime = Date.now();

                CrashGameAudio.playDogRocketLaunch();
                this.updateHoldButtonState();

                console.log(`Game started with bet: ${betAmount}`);
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

    private resetGame(): void {
        if (!smc.crashGame) return;

        const gameState = smc.crashGame.get(GameStateComp);
        const betting = smc.crashGame.get(BettingComp);
        const multiplier = smc.crashGame.get(MultiplierComp);
        const localData = smc.crashGame.get(LocalDataComp);

        // 重置游戏状态
        gameState.reset();
        betting.reset();
        multiplier.reset();

        // 生成新的崩盘倍数
        localData.currentCrashMultiplier = localData.generateCrashMultiplier();

        this.updateHoldButtonState();
        this.updateUI();

        console.log("Game reset, ready for next round");
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
        const buttonLabel = this.holdButton.getComponentInChildren(Label);

        switch (gameState.state) {
            case GameState.WAITING:
                if (buttonLabel) {
                    buttonLabel.string = CrashGameLanguage.getText("hold_to_fly");
                }
                this.holdButton.interactable = true;
                break;
            case GameState.FLYING:
                if (buttonLabel) {
                    buttonLabel.string = CrashGameLanguage.getText("cash_out");
                }
                this.holdButton.interactable = true;
                break;
            default:
                this.holdButton.interactable = false;
                break;
        }
    }

    update(deltaTime: number) {
        // 实时更新UI显示
        this.updateUI();
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("GAME_CRASHED", this.onGameCrashed, this);
        oops.message.off("GAME_CASHED_OUT", this.onGameCashedOut, this);
        oops.message.off("GAME_STARTED", this.onGameStarted, this);
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("MainGameUI reset");
    }
}