import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";

@ecs.register('CrashGameSystem')
export class CrashGameSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(GameStateComp, BettingComp, MultiplierComp, LocalDataComp);
    }

    update(entity: CrashGame): void {
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);

        switch (gameState.state) {
            case GameState.INIT:
                this.handleInitState(entity);
                break;
            case GameState.WAITING:
                this.handleWaitingState(entity);
                break;
            case GameState.FLYING:
                this.handleFlyingState(entity);
                break;
            case GameState.CRASHED:
                this.handleCrashedState(entity);
                break;
            case GameState.CASHED_OUT:
                this.handleCashedOutState(entity);
                break;
        }
    }

    private handleInitState(entity: CrashGame): void {
        console.log("Game initialized - ready to start");
        oops.message.dispatchEvent("GAME_INITIALIZED", {});
        // 初始化游戏状态，设置初始倍率等
        const gameState = entity.get(GameStateComp);
        gameState.state = GameState.WAITING;
        gameState.startTime = 0;
        gameState.crashPoint = 0;
    }

    private handleWaitingState(entity: CrashGame): void {
        // 等待玩家下注和按住HOLD按钮
        // 检查是否启用了自动下注
        const betting = entity.get(BettingComp);
        const gameState = entity.get(GameStateComp);
        const multiplier = entity.get(MultiplierComp);
        
        if (betting.autoCashOutEnabled) {
            // 自动开始游戏
            const betAmount = betting.currentBetItem.value;
            const isFreeMode = betting.currentBetItem.isFree;
            
            // 验证下注金额
            if (this.validateBetAmount(betAmount, isFreeMode, betting)) {
                betting.betAmount = betAmount;
                betting.isHolding = true;
                gameState.state = GameState.FLYING;
                gameState.startTime = Date.now();
                multiplier.startTime = Date.now();
                
                console.log(`Auto bet started: ${betAmount} (free: ${isFreeMode})`);
                oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
            }
        }
    }

    private handleFlyingState(entity: CrashGame): void {
        // 更新倍数，检查崩盘条件，处理提现
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const gameState = entity.get(GameStateComp);
        
        // 检查自动提现条件
        if (betting.isHolding && betting.shouldAutoCashOut(multiplier.currentMultiplier)) {
            // 自动提现
            betting.isHolding = false;
            gameState.state = GameState.CASHED_OUT;
            multiplier.cashOutMultiplier = multiplier.currentMultiplier;
            
            console.log(`Auto cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x`);
            oops.message.dispatchEvent("GAME_CASHED_OUT", { cashOutMultiplier: multiplier.cashOutMultiplier });
        }
    }

    private handleCrashedState(entity: CrashGame): void {
        // 播放崩盘动画，结算游戏
        console.log("Game crashed - playing crash sound");
        // TODO: 添加实际的音频资源后启用
        // oops.audio.playEffect("game/audio/crash_explosion");
        
        const betting = entity.get(BettingComp);
        if (betting.autoCashOutEnabled) {
            // 增加自动下注计数
            betting.incrementAutoCashOutBets();
            
            // 如果自动下注仍然启用，延迟重置游戏继续下注
            if (betting.autoCashOutEnabled) {
                this.scheduleAutoRestart(entity);
            }
        }
    }

    private handleCashedOutState(entity: CrashGame): void {
        // 播放成功提现动画，结算收益
        // console.log("Game cashed out - playing success sound");
        // TODO: 添加实际的音频资源后启用
        // oops.audio.playEffect("game/audio/cash_out_success");
        
        const betting = entity.get(BettingComp);
        if (betting.autoCashOutEnabled) {
            // 增加自动下注计数
            betting.incrementAutoCashOutBets();
            
            // 如果自动下注仍然启用，延迟重置游戏继续下注
            if (betting.autoCashOutEnabled) {
                this.scheduleAutoRestart(entity);
            }
        }
    }

    private validateBetAmount(amount: number, isFreeMode: boolean, betting: BettingComp): boolean {
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

    private scheduleAutoRestart(entity: CrashGame): void {
        // 延迟2秒后重置游戏，让玩家看到结果
        setTimeout(() => {
            const gameState = entity.get(GameStateComp);
            const betting = entity.get(BettingComp);
            const multiplier = entity.get(MultiplierComp);
            const localData = entity.get(LocalDataComp);
            
            // 重置游戏状态回到等待状态，以便自动开始下一轮
            gameState.state = GameState.WAITING;
            gameState.startTime = 0;
            gameState.crashPoint = 0;
            
            // 重置倍数
            multiplier.reset();
            
            // 生成新的崩盘倍数
            localData.currentCrashMultiplier = localData.generateCrashMultiplier();
            
            // 重置下注状态但保持自动下注设置
            betting.betAmount = 0;
            betting.isHolding = false;
            
            console.log(`Auto bet: Game reset for next round. Target crash: ${localData.currentCrashMultiplier.toFixed(2)}x`);
        }, 2000);
    }
}