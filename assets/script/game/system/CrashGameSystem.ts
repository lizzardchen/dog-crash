import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { EnergyComp } from "../comp/EnergyComp";
import { UserDataComp } from "../comp/UserDataComp";

@ecs.register('CrashGameSystem')
export class CrashGameSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    private processedStates = new Set<string>();
    private autoRestartTimer: number = 0;
    private autoRestartStartTime: number = 0;
    private autoRestartDelay: number = 4000; // 4秒延迟
    
    filter(): ecs.IMatcher {
        return ecs.allOf(GameStateComp, BettingComp, MultiplierComp, LocalDataComp, EnergyComp, UserDataComp);
    }

    update(entity: CrashGame): void {
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const energy = entity.get(EnergyComp);

        // 定期检查能源自动恢复
        if (energy) {
            energy.checkAutoRecovery();
        }

        // 处理自动重启计时器
        this.handleAutoRestartTimer(entity);

        // 减少日志频率，只在状态改变时或auto betting相关时记录
        if (gameState.state !== this.lastLoggedState || betting.autoCashOutEnabled) {
            console.log(`CrashGameSystem: update - state: ${gameState.state}, autoBetting: ${betting.autoCashOutEnabled}`);
            this.lastLoggedState = gameState.state;
        }

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

    private lastLoggedState: GameState = GameState.INIT;

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
        
        // 防止在同一个等待周期内重复开始游戏
        const waitingKey = `waiting_${Date.now()}`;
        if (betting.autoCashOutEnabled && !betting.isHolding && gameState.startTime === 0) {
            // 自动开始游戏
            const betAmount = betting.currentBetItem.value;
            const isFreeMode = betting.currentBetItem.isFree;
            
            console.log(`CrashGameSystem: Starting auto bet with amount: ${betAmount}, free: ${isFreeMode}`);
            
            // 验证下注金额和能源
            if (this.validateBetAmount(betAmount, isFreeMode, betting) && this.validateAndConsumeEnergy(entity)) {
                betting.betAmount = betAmount;
                betting.isHolding = true;
                gameState.state = GameState.FLYING;
                gameState.startTime = Date.now();
                multiplier.startTime = Date.now();
                
                console.log(`CrashGameSystem: Auto bet started: ${betAmount} (free: ${isFreeMode})`);
                oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
            } else {
                console.log(`CrashGameSystem: Auto bet validation failed (insufficient balance or energy)`);
                // 如果验证失败，禁用自动下注
                betting.setAutoCashOut(false);
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
            
            // 游戏成功：退还能源
            this.refundEnergy(entity);
            
            oops.message.dispatchEvent("GAME_CASHED_OUT", { cashOutMultiplier: multiplier.cashOutMultiplier });
        }
    }

    private handleCrashedState(entity: CrashGame): void {
        const gameState = entity.get(GameStateComp);
        const stateKey = `crashed_${gameState.startTime}`;
        
        // 防止重复处理同一次游戏的崩盘状态
        if (this.processedStates.has(stateKey)) {
            return;
        }
        this.processedStates.add(stateKey);
        
        // 播放崩盘动画，结算游戏
        console.log("CrashGameSystem: Game crashed - processing crash state");
        
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const localData = entity.get(LocalDataComp);
        
        // 上传游戏结果到服务器
        this.uploadGameResult(entity, false, multiplier.currentMultiplier, 0);
        
        console.log(`CrashGameSystem: handleCrashedState - autoCashOutEnabled: ${betting.autoCashOutEnabled}`);
        
        if (betting.autoCashOutEnabled) {
            // 增加自动下注计数
            betting.incrementAutoCashOutBets();
            console.log(`CrashGameSystem: Auto betting - incremented bet count, still enabled: ${betting.autoCashOutEnabled}`);
        }
        
        // 如果启用自动下注，开始计时等待重启
        if (betting.autoCashOutEnabled) {
            this.startAutoRestartTimer();
        }
    }

    private handleCashedOutState(entity: CrashGame): void {
        const gameState = entity.get(GameStateComp);
        const stateKey = `cashedout_${gameState.startTime}`;
        
        // 防止重复处理同一次游戏的提现状态
        if (this.processedStates.has(stateKey)) {
            return;
        }
        this.processedStates.add(stateKey);
        
        // 播放成功提现动画，结算收益
        console.log("CrashGameSystem: Game cashed out - processing cashout state");
        
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        
        // 计算奖金
        const winAmount = betting.betAmount * multiplier.cashOutMultiplier;
        
        // 上传游戏结果到服务器
        this.uploadGameResult(entity, true, multiplier.cashOutMultiplier, winAmount);
        
        console.log(`CrashGameSystem: handleCashedOutState - autoCashOutEnabled: ${betting.autoCashOutEnabled}`);
        
        if (betting.autoCashOutEnabled) {
            // 增加自动下注计数
            betting.incrementAutoCashOutBets();
            console.log(`CrashGameSystem: Auto betting - incremented bet count, still enabled: ${betting.autoCashOutEnabled}`);
        }
        
        // 如果启用自动下注，开始计时等待重启
        if (betting.autoCashOutEnabled) {
            this.startAutoRestartTimer();
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

    private async resetForNextRound(entity: CrashGame): Promise<void> {
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const localData = entity.get(LocalDataComp);

        // 再次检查自动下注是否仍然启用
        if (!betting.autoCashOutEnabled) {
            console.log("CrashGameSystem: Auto betting disabled, not resetting for next round");
            return;
        }

        console.log("CrashGameSystem: Resetting for next round");

        // 清理已处理状态的记录
        this.processedStates.clear();

        // 重置游戏状态
        gameState.state = GameState.WAITING;
        gameState.startTime = 0;
        gameState.crashPoint = 0;

        // 重置倍数
        multiplier.reset();

        // 从服务器生成新的崩盘倍数
        localData.currentCrashMultiplier = await localData.generateCrashMultiplierAsync();

        // 重置下注状态但保持自动下注设置
        betting.betAmount = 0;
        betting.isHolding = false;

        console.log(`CrashGameSystem: Game reset complete for auto betting. Target crash: ${localData.currentCrashMultiplier.toFixed(2)}x`);
    }

    private handleAutoRestartTimer(entity: CrashGame): void {
        const betting = entity.get(BettingComp);

        // 如果自动重启计时器正在运行
        if (this.autoRestartTimer > 0) {
            // 检查自动下注是否被禁用，如果是则取消计时器
            if (!betting.autoCashOutEnabled) {
                console.log("CrashGameSystem: Auto betting disabled, cancelling restart timer");
                this.autoRestartTimer = 0;
                this.autoRestartStartTime = 0;
                return;
            }

            // 检查是否到时间了
            const currentTime = Date.now();
            if (currentTime - this.autoRestartStartTime >= this.autoRestartDelay) {
                console.log("CrashGameSystem: Auto restart timer expired, resetting game");
                this.autoRestartTimer = 0;
                this.autoRestartStartTime = 0;
                this.resetForNextRound(entity); // 异步调用，不等待
            }
        }
    }

    private startAutoRestartTimer(): void {
        if (this.autoRestartTimer === 0) {
            console.log("CrashGameSystem: Starting auto restart timer (4 seconds)");
            this.autoRestartTimer = 1; // 标记计时器正在运行
            this.autoRestartStartTime = Date.now();
        }
    }

    public cancelAutoRestartTimer(): void {
        if (this.autoRestartTimer > 0) {
            console.log("CrashGameSystem: Cancelling auto restart timer");
            this.autoRestartTimer = 0;
            this.autoRestartStartTime = 0;
        }
    }

    /**
     * 验证并消耗能源
     * @param entity 游戏实体
     * @returns 是否成功消耗能源
     */
    private validateAndConsumeEnergy(entity: CrashGame): boolean {
        const energy = entity.get(EnergyComp);
        if (energy) {
            return energy.consumeEnergy(1);
        }
        
        console.warn("CrashGameSystem: EnergyComp not found");
        return false;
    }

    /**
     * 退还能源（游戏成功时调用）
     * @param entity 游戏实体
     */
    private refundEnergy(entity: CrashGame): void {
        const energy = entity.get(EnergyComp);
        if (energy) {
            energy.recoverEnergy(1, "refund");
            console.log("CrashGameSystem: Energy refunded (game won)");
        }
    }

    /**
     * 上传游戏结果到服务器
     * @param entity 游戏实体
     * @param isWin 是否获胜
     * @param crashMultiplier 崩盘倍数
     * @param winAmount 奖金
     */
    private async uploadGameResult(entity: CrashGame, isWin: boolean, crashMultiplier: number, winAmount: number): Promise<void> {
        const betting = entity.get(BettingComp);
        const gameState = entity.get(GameStateComp);
        const userDataComp = entity.get(UserDataComp);
        
        if (!betting || !gameState || !userDataComp) {
            console.warn("CrashGameSystem: Missing components for game result upload");
            return;
        }

        // 更新本地用户数据
        userDataComp.updateGameStats(betting.betAmount, crashMultiplier, winAmount, isWin);

        // 准备游戏结果数据
        const gameResult = {
            betAmount: betting.betAmount,
            crashMultiplier: crashMultiplier,
            winAmount: winAmount,
            isWin: isWin,
            duration: Date.now() - gameState.startTime,
            isFreeMode: betting.currentBetItem.isFree
        };

        // 上传到服务器
        try {
            const success = await entity.uploadGameRecord(gameResult);
            if (success) {
                console.log("CrashGameSystem: Game result uploaded successfully");
            } else {
                console.log("CrashGameSystem: Game result saved locally (offline mode)");
            }
        } catch (error) {
            console.error("CrashGameSystem: Failed to upload game result:", error);
        }
    }
}