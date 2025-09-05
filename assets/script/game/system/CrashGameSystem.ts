import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { EnergyComp } from "../comp/EnergyComp";
import { UserDataComp } from "../comp/UserDataComp";
import { RaceComp } from "../comp/RaceComp";
import { smc } from "../common/SingletonModuleComp";

@ecs.register('CrashGameSystem')
export class CrashGameSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    private processedStates = new Set<string>();
    
    filter(): ecs.IMatcher {
        return ecs.allOf(GameStateComp, BettingComp, MultiplierComp, LocalDataComp, EnergyComp, UserDataComp, RaceComp);
    }

    update(entity: CrashGame): void {
        if( !entity.isPrepared() ) return;
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const energy = entity.get(EnergyComp);
        const race = entity.get(RaceComp);

        // 定期检查能源自动恢复
        if (energy) {
            energy.checkAutoRecovery();
        }

        // 更新比赛数据
        if (race) {
            race.updateRaceData(Date.now());
        }

        // 处理PIG模式倒计时
        this.handlePigCountdown(entity);

        // 减少日志频率，只在状态改变时或PIG模式相关时记录
        // if (gameState.state !== this.lastLoggedState || betting.gameMode === "PIG") {
        //     console.log(`CrashGameSystem: update - state: ${gameState.state}, gameMode: ${betting.gameMode}`);
        //     this.lastLoggedState = gameState.state;
        // }

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
        // SPG模式下等待用户手动操作
        
        const betting = entity.get(BettingComp);
        const gameState = entity.get(GameStateComp);
        const multiplier = entity.get(MultiplierComp);
        
        // PIG模式自动游戏逻辑
        if (betting.gameMode === "PIG" && !betting.isHolding && !betting.goNextRound) {
            // 检查是否应该开始游戏（在合适的倒计时阶段）
            if (betting.serverPhase === "gaming" && betting.pigCountdownActive) {
                const betAmount = betting.currentBetItem.value;
                const isFreeMode = betting.currentBetItem.isFree;
                const localData = entity.get(LocalDataComp);
                
                console.log(`CrashGameSystem: Starting PIG mode bid with amount: ${betAmount}, free: ${isFreeMode}`);
                betting.isHolding = true;
                
                // 验证下注金额和能源
                if (this.validateBetAmount(betAmount, isFreeMode) && this.validateAndConsumeEnergy(entity)) {
                    // PIG模式使用/api/game/countdown返回的倍率
                    const remote_multiplier = betting.serverCrashMultiplier;
                    if (remote_multiplier > 0) {
                        localData.currentCrashMultiplier = remote_multiplier;
                        
                        betting.betAmount = betAmount;
                        gameState.state = GameState.FLYING;
                        gameState.startTime = Date.now();
                        multiplier.startTime = Date.now();
                        
                        console.log(`CrashGameSystem: PIG mode bid started: ${betAmount} (free: ${isFreeMode}), target crash: ${remote_multiplier.toFixed(2)}x`);
                        oops.message.dispatchEvent("GAME_STARTED", { betAmount, isFreeMode });
                    } else {
                        betting.isHolding = false;
                        console.error("CrashGameSystem: Invalid server crash multiplier for PIG mode:", remote_multiplier);
                        // 如果服务器倍率无效，切换到SPG模式
                        // betting.setGameMode("SPG");
                        betting.goNextRound = true;
                        oops.message.dispatchEvent("SERVER_CANCEL_AUTOGAME");
                    }
                } else {
                    betting.isHolding = false;
                    console.log(`CrashGameSystem: PIG mode bid validation failed (insufficient balance or energy)`);
                    // 如果验证失败，切换到SPG模式
                    // betting.setGameMode("SPG");
                    betting.goNextRound = true;
                    oops.message.dispatchEvent("AUTO_CANCEL_AUTOGAME");
                }
            }
        }
    }

    private handleFlyingState(entity: CrashGame): void {
        // 更新倍数，检查崩盘条件，处理提现
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const gameState = entity.get(GameStateComp);
        
        // 检查自动提现条件（PIG模式）
        if (betting.isHolding && betting.gameMode === "PIG" && betting.shouldPigCashOut(multiplier.currentMultiplier)) {
            gameState.state = GameState.CASHED_OUT;
            multiplier.cashOutMultiplier = multiplier.currentMultiplier;
            console.log(`PIG mode auto cashed out at ${multiplier.cashOutMultiplier.toFixed(2)}x`);
            // 游戏成功：退还能源
            this.refundEnergy(entity);
            oops.message.dispatchEvent("GAME_CASHED_OUT", { cashOutMultiplier: multiplier.cashOutMultiplier });
            // 自动提现
            betting.isHolding = false;
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
        
        // 上传游戏结果到服务器
        this.uploadGameResult(entity, false, multiplier.currentMultiplier, 0);
        
        console.log(`CrashGameSystem: handleCrashedState - gameMode: ${betting.gameMode}`);
        
        // if (betting.gameMode === "PIG") {
            // 增加PIG模式下注计数
            // betting.incrementPigBets();
            // console.log(`CrashGameSystem: PIG mode - incremented bid count, still in PIG mode: ${betting.gameMode === "PIG"}`);
            // // 如果仍在PIG模式，启动下注倒计时
            // if (betting.gameMode === "PIG") {
            //     betting.startPigBettingCountdown();
            // }
        // }
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
        
        console.log(`CrashGameSystem: handleCashedOutState - gameMode: ${betting.gameMode}`);
        
        // if (betting.gameMode === "PIG") {
        //     // 增加PIG模式下注计数
        //     betting.incrementPigBets();
        //     console.log(`CrashGameSystem: PIG mode - incremented bid count, still in PIG mode: ${betting.gameMode === "PIG"}`);
            
        //     // // 如果仍在PIG模式，启动下注倒计时
        //     // if (betting.gameMode === "PIG") {
        //     //     betting.startPigBettingCountdown();
        //     // }
        // }
    }

    private validateBetAmount(amount: number, isFreeMode: boolean): boolean {
        if (amount <= 0) {
            console.warn("Invalid bid amount:", amount);
            return false;
        }

        const userData = smc.crashGame.get(UserDataComp);

        // 免费模式不需要检查余额
        if (!isFreeMode && amount > userData.balance) {
            console.warn("Insufficient balance:", amount, "vs", userData.balance);
            return false;
        }

        return true;
    }



    private async resetForNextRound(entity: CrashGame): Promise<void> {
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);
        const localData = entity.get(LocalDataComp);

        console.log("CrashGameSystem: Resetting for next round");

        // 清理已处理状态的记录
        this.processedStates.clear();

        // 重置游戏状态
        gameState.state = GameState.WAITING;
        gameState.startTime = 0;
        gameState.crashPoint = 0;

        // 重置倍数
        multiplier.reset();

        // PIG模式使用/api/game/countdown返回的倍率
        localData.currentCrashMultiplier = betting.serverCrashMultiplier;
        // 重置下注状态但保持自动下注设置
        betting.betAmount = 0;
        betting.isHolding = false;

        // 再次检查PIG模式是否仍然启用
        if (betting.gameMode !== "PIG") {
            console.log("CrashGameSystem: PIG mode disabled, not resetting for next round");
            return;
        }else{
            betting.startPigBettingCountdown().then(()=>{
                betting.setPigCashOut(0,-1);
            });
            
        }

        console.log(`CrashGameSystem: Game reset complete for auto betting. Target crash: ${localData.currentCrashMultiplier.toFixed(2)}x`);
    }



    private handlePigCountdown(entity: CrashGame): void {
        const betting = entity.get(BettingComp);
        
        // 调用BettingComp的统一倒计时更新方法
        betting.updatePigCountdown();
        
        // 监听游戏重置事件
        if (!this.gameResetListenerAdded) {
            oops.message.on("PIG_GAME_RESET_NEEDED", () => {
                this.resetForNextRound(entity);
            }, this);
            this.gameResetListenerAdded = true;
        }
    }
    
    private gameResetListenerAdded: boolean = false;
    
    /**
     * 获取当前倒计时阶段的总时间
     */




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

        // 计算游戏持续时间，添加验证逻辑防止startTime为0的情况
        let duration = Date.now() - gameState.startTime;
        
        // 如果startTime为0或duration超过合理范围（10分钟），使用默认值
        if (gameState.startTime === 0 || duration < 0 || duration > 600000) {
            console.warn(`CrashGameSystem: Invalid duration calculated (${duration}ms), startTime: ${gameState.startTime}, using default duration`);
            duration = 5000; // 默认5秒
        }

        // 准备游戏结果数据
        const gameResult = {
            betAmount: betting.betAmount,
            crashMultiplier: crashMultiplier,
            winAmount: winAmount,
            isWin: isWin,
            duration: duration,
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