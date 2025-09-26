import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

/**
 * 下注金额项接口
 */
export interface BetAmountItem {
    display: string;    // 显示文本 (如 "free", "1K", "1M")
    value: number;      // 实际数值 (如 90, 1000, 1000000)
    isFree: boolean;    // 是否为免费模式
}

@ecs.register('Betting')
export class BettingComp extends ecs.Comp {
    private static readonly SELECTED_BET_KEY = "crash_game_selected_bet";

    betAmount: number = 0;
    // balance: number = 1000;
    // money: number = 100;
    isHolding: boolean = false;

    // 下注金额数据
    readonly betAmountData: BetAmountItem[] = [
        { display: "   ", value: 0, isFree: true }, // 空白项
        { display: "   ", value: 0, isFree: true }, // 空白项
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
        { display: "1M", value: 1000000, isFree: false },
        { display: "   ", value: 0, isFree: true },
        { display: "   ", value: 0, isFree: true },
    ];

    // 当前选择的下注项
    currentBetItem: BetAmountItem = this.betAmountData[2]; // 默认选择free

    // 游戏模式设置
    _gameMode: "SPG" | "PIG" = "SPG"; // SPG=Single-Player Game, PIG=Play Interactive Games
    
    // PIG模式下的自动提现设置
    pigCashOutMultiplier: number = 0.0;
    pigTotalBets: number = -1; // -1表示无限
    pigCurrentBets: number = 0; // 当前已进行的下注次数
    
    // PIG模式下的服务器状态
    serverPhase: "betting" | "waiting" | "gaming" | "idle" = "idle";
    serverRemainingTime: number = 0;
    serverIsCountingDown: boolean = false;
    serverCrashMultiplier: number = 0; // 服务器返回的爆率值

    pigCountdownActive: boolean = false; // 倒计时是否激活
    pigGameEndByUIThisTurn: boolean = true; // 游戏手是否结束当前回合
    private lastUpdateTime: number = 0; // 上次更新时间，用于计算时间差
    private isTransitioning: boolean = false; // 是否正在进行阶段转换，防止重复执行
    
    public get gameMode(){
        return this._gameMode;
    }

    public set gameMode(gameMode:"SPG" | "PIG"){
        this._gameMode = gameMode;
    }

    // 客户端倒计时同步已移至CrashGameSystem

    reset() {
        this.betAmount = 0;
        this.isHolding = false;
        // 注意：不重置currentBetItem和游戏模式设置，保持用户的选择
    }

    /**
     * 初始化时加载保存的下注选择
     */
    init(): void {
        this.loadSavedBetSelection();
    }

    public set goNextRound(bend:boolean){
        this.pigGameEndByUIThisTurn = bend;
    }

    public get goNextRound():boolean{
        return this.pigGameEndByUIThisTurn;
    }


    /**
     * 设置当前下注选择
     * @param betItem 下注项
     */
    setCurrentBetItem(betItem: BetAmountItem): void {
        this.currentBetItem = betItem;
        this.betAmount = betItem.value;
        this.saveBetSelection();
        console.log(`Set current bid: ${betItem.display} (value: ${betItem.value}, free: ${betItem.isFree})`);
    }

    /**
     * 根据显示文本查找下注项
     * @param display 显示文本
     * @returns 匹配的下注项或null
     */
    findBetItemByDisplay(display: string): BetAmountItem | null {
        return this.betAmountData.find(item => item.display === display) || null;
    }

    /**
     * 将数值转换为短文本格式
     * @param value 数值
     * @returns 短文本 (如: 1000 -> "1K", 1000000 -> "1M")
     */
    formatValueToShortText(value: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + "M";
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + "K";
        } else {
            return value.toString();
        }
    }

    /**
     * 保存当前下注选择到本地存储
     */
    private saveBetSelection(): void {
        try {
            const betData = JSON.stringify({
                display: this.currentBetItem.display,
                value: this.currentBetItem.value,
                isFree: this.currentBetItem.isFree
            });
            oops.storage.set(BettingComp.SELECTED_BET_KEY, betData);
            console.log(`Saved selected bid: ${this.currentBetItem.display} (${this.currentBetItem.value}) to local storage`);
        } catch (error) {
            console.error("Failed to save selected bid:", error);
        }
    }

    /**
     * 从本地存储加载保存的下注选择
     */
    private loadSavedBetSelection(): void {
        try {
            const betData = oops.storage.get(BettingComp.SELECTED_BET_KEY);
            if (betData) {
                const savedBet = JSON.parse(betData) as { display: string; value: number; isFree: boolean };

                // 在betAmountData中查找匹配的项
                const matchedItem = this.betAmountData.find(item =>
                    item.display === savedBet.display &&
                    item.value === savedBet.value &&
                    item.isFree === savedBet.isFree
                );

                if (matchedItem) {
                    this.currentBetItem = matchedItem;
                    this.betAmount = matchedItem.value;
                    console.log(`Loaded selected bid: ${matchedItem.display} (${matchedItem.value}) from local storage`);
                } else {
                    console.warn("Saved bid item not found in current data, using default");
                }
            }
        } catch (error) {
            console.error("Failed to load selected bid:", error);
        }
    }

    /**
     * 清空保存的下注选择
     */
    clearSavedBetSelection(): void {
        oops.storage.remove(BettingComp.SELECTED_BET_KEY);
        console.log("Cleared saved bid selection from local storage");
    }

    /**
     * 设置游戏模式
     * @param mode 游戏模式 ("SPG" | "PIG")
     */
    setGameMode(mode: "SPG" | "PIG"): void {
        const wasInPigMode = this.gameMode === "PIG";
        this.gameMode = mode;
        if( mode == "PIG" ){
            this.pigCountdownActive = true;
        }
        console.log(`Game mode set to: ${mode}`);        
        // 如果从PIG模式切换到SPG模式，发送模式切换事件
        if (wasInPigMode && mode === "SPG") {
            oops.message.dispatchEvent("GAME_MODE_CHANGED", {
                from: "PIG",
                to: "SPG"
            });
        }
    }
    
    /**
     * 设置PIG模式的自动提现参数
     * @param multiplier 自动提现倍数
     * @param totalBets 总下注次数 (-1表示无限)
     */
    setPigCashOut(multiplier: number = 2.01, totalBets: number = -1): void {
        this.pigCashOutMultiplier = multiplier;
        this.pigTotalBets = totalBets;
        this.pigCurrentBets = 0; // 重置计数
        if( multiplier <= 0 ){
            this.pigCashOutMultiplier = 0;
            this.goNextRound = true;
        }else{
            if( this.serverPhase == "betting" || this.serverPhase == "idle" ){
                this.goNextRound = false;
            }else{
                // this.pigCashOutMultiplier = 0;
                this.goNextRound = true;
            }
        }

        console.log(`PIG mode cashout set: multiplier=${multiplier}, totalBets=${totalBets}`);
    }

    /**
     * 检查是否应该进行PIG模式自动提现
     */
    shouldPigCashOut(currentMultiplier: number): boolean {
        return this.gameMode === "PIG" && 
               this.pigCashOutMultiplier > 0 && 
               currentMultiplier >= this.pigCashOutMultiplier;
    }

    /**
     * 增加PIG模式下注计数
     */
    incrementPigBets(): void {
        if (this.gameMode === "PIG") {
            this.pigCurrentBets++;
            console.log(`BettingComp: Incremented PIG bets: ${this.pigCurrentBets}/${this.pigTotalBets === -1 ? 'infinite' : this.pigTotalBets}`);

            // 检查是否达到总次数限制
            if (this.pigTotalBets > 0 && this.pigCurrentBets >= this.pigTotalBets) {
                // 发送PIG模式结束事件
                oops.message.dispatchEvent("PIG_MODE_ENDED", {
                    reason: "limit_reached",
                    totalBets: this.pigTotalBets,
                    completedBets: this.pigCurrentBets
                });
                // this.setGameMode("SPG");
                console.log(`BettingComp: PIG mode disabled: reached total bets limit (${this.pigTotalBets})`);
            } else {
                console.log(`BettingComp: PIG mode still enabled, continuing...`);
            }
        } else {
            console.log(`BettingComp: incrementPigBets called but not in PIG mode`);
        }
    }

    /**
     * 获取游戏模式状态信息
     */
    getGameModeStatus(): { 
        mode: "SPG" | "PIG"; 
        pigMultiplier: number; 
        pigTotalBets: number; 
        pigCurrentBets: number;
        serverPhase: "betting" | "waiting" | "gaming" | "idle";
        serverRemainingTime: number;
    } {
        return {
            mode: this.gameMode,
            pigMultiplier: this.pigCashOutMultiplier,
            pigTotalBets: this.pigTotalBets,
            pigCurrentBets: this.pigCurrentBets,
            serverPhase: this.serverPhase,
            serverRemainingTime: this.serverRemainingTime
        };
    }
    
    /**
     * 更新服务器状态 (PIG模式使用)
     */
    updateServerStatus(phase: "betting" | "waiting" | "gaming" | "idle", remainingTime: number, isCountingDown: boolean): void {
        this.serverPhase = phase;
        this.serverRemainingTime = remainingTime;
        this.serverIsCountingDown = isCountingDown;
        
        console.log(`Server status updated: phase=${phase}, remainingTime=${remainingTime}, isCountingDown=${isCountingDown}`);
    }
    
    /**
     * 获取服务器倒计时状态 (通过API)
     */
    async fetchServerCountdown(): Promise<any> {
        return new Promise((resolve) => {
            oops.http.get('game/countdown', (ret) => {
                console.log("=== fetchServerCountdown DEBUG ===");
                console.log("ret object:", ret);
                console.log("ret.isSucc:", ret.isSucc);
                console.log("ret.res type:", typeof ret.res);
                console.log("ret.res:", JSON.stringify(ret.res, null, 2));
                
                if (ret.isSucc && ret.res && ret.res.success) {
                    const data = ret.res;
                    this.updateServerStatus(
                        data.data.phase,
                        data.data.remainingTime,
                        data.data.isCountingDown
                    );
                    
                    // 存储服务器返回的爆率值
                    if (data.data.fixedCrashMultiplier !== undefined) {
                        this.serverCrashMultiplier = data.data.fixedCrashMultiplier;
                        console.log(`Server crash multiplier: ${this.serverCrashMultiplier}`);
                    }
                    
                    resolve(data.data);
                } else {
                    console.error('Failed to fetch server countdown:', ret.err);
                    resolve(null);
                }
            });
        });
    }
    
    /**
     * 启动PIG模式下注倒计时
     */
    async startPigBettingCountdown(): Promise<void> {
        if (this.gameMode !== "PIG") return;
        const serverData = await this.fetchServerCountdown();
        if (serverData) {
            this.pigCountdownActive = true;
            this.lastUpdateTime = 0; // 重置更新时间
            if(serverData.phase === "betting"){
                oops.message.dispatchEvent("ONLINE_START_BETTING");
            }
        }
    }
    /**
     * 启动PIG模式等待游戏开始倒计时
     */
    async startPigWaitingCountdown(): Promise<void> {
        if (this.gameMode !== "PIG") return;
        
        // 获取服务器等待倒计时
        const serverData = await this.fetchServerCountdown();
        if (serverData) {
            this.pigCountdownActive = true;
            this.lastUpdateTime = 0; // 重置更新时间
            // 客户端倒计时同步已移至CrashGameSystem
            
            console.log(`PIG waiting countdown started: ${this.serverRemainingTime}ms`);
        } else {
            console.error("Failed to get server waiting countdown, falling back to betting countdown");
            this.startPigBettingCountdown();
        }
    }
    
    /**
     * 启动PIG模式游戏倒计时
     */
    async startPigGameCountdown(): Promise<void> {
        if (this.gameMode !== "PIG") return;
        
        // 获取服务器游戏倒计时
        const serverData = await this.fetchServerCountdown();
        if (serverData) {
            this.pigCountdownActive = true;
            // 客户端倒计时同步已移至CrashGameSystem
            console.log(`PIG game countdown started: ${this.serverRemainingTime}ms`);
        } else {
            console.error("Failed to get server countdown, falling back to waiting countdown");
            await this.startPigWaitingCountdown();
        }
    }
    
    /**
     * 停止PIG模式倒计时
     */
    stopPigCountdown(): void {
        this.serverPhase = "idle";
        this.pigCountdownActive = false;
        this.lastUpdateTime = 0; // 重置更新时间
        // 客户端倒计时同步已移至CrashGameSystem
        console.log("PIG countdown stopped");
        this.goNextRound = false;
    }
    
    /**
     * 获取当前倒计时剩余时间
     */
    getPigCountdownRemainingTime(): number {
        if (!this.pigCountdownActive) {
            return 0;
        }
       return this.serverRemainingTime;
    }
    
    /**
     * 检查倒计时是否结束
     */
    isPigCountdownFinished(): boolean {
        return this.pigCountdownActive && this.getPigCountdownRemainingTime() <= 0;
    }
    
    /**
     * 统一的倒计时更新方法 - 集中管理所有倒计时逻辑
     */
    updatePigCountdown(): void {
        // 只有在PIG模式且倒计时激活时才处理
        if (this.gameMode !== "PIG" || !this.pigCountdownActive) {
            return;
        }
        
        const currentTime = Date.now();
        
        // 初始化lastUpdateTime
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = currentTime;
            return;
        }
        
        // 计算时间差（毫秒）
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // 减少剩余时间
        this.serverRemainingTime = Math.max(0, this.serverRemainingTime - deltaTime);
        
        const remainingTime = this.getPigCountdownRemainingTime();
        
        // 分发倒计时更新事件
        oops.message.dispatchEvent("PIG_COUNTDOWN_UPDATE", {
            phase: this.serverPhase,
            remainingTime: remainingTime
        });
        if( remainingTime <= 0 && this.serverPhase === "gaming" && !this.goNextRound){
            return;
        }
        // 检查倒计时是否结束
        if (remainingTime <= 0 && !this.isTransitioning) {
            console.log(`BettingComp: Countdown finished for phase: ${this.serverPhase}`);
            
            // 设置转换标志，防止重复执行
            this.isTransitioning = true;
            
            // 分发倒计时结束事件
            oops.message.dispatchEvent("PIG_COUNTDOWN_FINISHED", {
                phase: this.serverPhase
            });
            
            // 处理阶段转换
            this.handleCountdownPhaseTransition();
        }
    }
    
    /**
     * 处理倒计时阶段转换
     */
    private async handleCountdownPhaseTransition(): Promise<void> {
        if (this.serverPhase === "betting") {
            // 下注倒计时结束，开始等待游戏开始倒计时
            console.log("BettingComp: Betting countdown finished, starting waiting countdown");
            await this.startPigWaitingCountdown();
        } else if (this.serverPhase === "waiting") {
            // 等待倒计时结束，开始游戏倒计时
            console.log("BettingComp: Waiting countdown finished, starting game countdown");
            await this.startPigGameCountdown();
        } else if (this.serverPhase === "gaming") {
            // 游戏倒计时结束，停止倒计时并准备新游戏
            console.log("BettingComp: Game countdown finished, stopping countdown");
            this.stopPigCountdown();
            // 通知系统重置游戏
            oops.message.dispatchEvent("PIG_GAME_RESET_NEEDED");
        }
        
        // 转换完成，重置标志
        this.isTransitioning = false;
    }
    
    /**
     * 获取倒计时状态信息
     */
    getCountdownStatus(): {
        active: boolean;
        phase: "betting" | "waiting" | "gaming" | "idle";
        remainingTime: number;
        remainingSeconds: number;
    } {
        const remainingTime = this.getPigCountdownRemainingTime();
        
        return {
            active: this.pigCountdownActive,
            phase: this.serverPhase as "betting" | "waiting" | "gaming" | "idle",
            remainingTime: remainingTime,
            remainingSeconds: Math.ceil(remainingTime / 1000)
        };
    }
}