import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { UserDataComp } from "./UserDataComp";
import { smc } from "../common/SingletonModuleComp";

/**
 * 比赛排行榜项目接口
 */
export interface RaceLeaderboardItem {
    rank: number;
    userId: string;
    netProfit: number;
    totalBetAmount: number;
    sessionCount: number;
}

/**
 * 比赛信息接口
 */
export interface RaceInfo {
    raceId: string;
    startTime: string;
    endTime: string;
    remainingTime: number;
    status: string;
    prizePool: {
        totalPool: number;
        contributedAmount: number;
        participants: number;
        shouldDistributePrizes: boolean;
    };
}

/**
 * 用户比赛信息接口
 */
export interface UserRaceInfo {
    rank: number;
    displayRank: number;
    netProfit: number;
    sessionCount: number;
    contribution: number;
}

/**
 * 用户奖励信息接口
 */
export interface UserPrizeInfo {
    _id: string;
    userId:string,
    prizeId: string;
    raceId: string;
    rank: number;
    prizeAmount: number;
    score:number;
    userNetProfit:number;
    status: 'pending' | 'claimed';
    createdAt: string;
}

/**
 * 历史比赛奖励统计信息
 */
export interface RacePrizeStats {
    totalPrizes: number;
    totalAmount: number;
    claimedAmount: number;
    pendingAmount: number;
}

/**
 * 历史比赛奖励信息
 */
export interface HistoryRacePrizesInfo {
    raceId: string;
    prizes: UserPrizeInfo[];
    stats: RacePrizeStats;
}

/**
 * 比赛状态枚举
 */
export enum RaceState {
    IDLE = 'idle',           // 空闲状态
    LOADING = 'loading',     // 加载中
    ACTIVE = 'active',       // 有活跃比赛
    NO_RACE = 'no_race',     // 无比赛
    ERROR = 'error'          // 错误状态
}

/**
 * 比赛组件 - 统一管理比赛相关逻辑和数据
 */
@ecs.register('Race')
export class RaceComp extends ecs.Comp {
    // 比赛状态
    public state: RaceState = RaceState.IDLE;
    
    // 当前比赛信息
    public currentRace: RaceInfo | null = null;
    
    // 排行榜数据
    public leaderboard: RaceLeaderboardItem[] = [];
    public userRaceInfo: UserRaceInfo | null = null;
    
    // 用户奖励数据
    public userPendingPrizes: UserPrizeInfo[] = [];
    public totalPendingAmount: number = 0;
    
    // 更新时间控制
    public lastUpdateTime: number = 0;
    public updateInterval: number = 150000; // 2.5分钟更新一次
    public lastPastTime:number = 0;
    
    // race/current接口独立时间控制
    private lastRaceInfoUpdateTime: number = 0;
    private raceInfoUpdateInterval: number = 300000; // 5分钟更新race/current接口
    
    // 比赛结束检测
    private lastCheckedRaceId: string = "";

    reset(): void {
        this.state = RaceState.IDLE;
        this.currentRace = null;
        this.leaderboard = [];
        this.userRaceInfo = null;
        this.userPendingPrizes = [];
        this.totalPendingAmount = 0;
        this.lastUpdateTime = 0;
        this.lastPastTime = 0;
        this.lastCheckedRaceId = "";
    }

    /**
     * 初始化比赛组件
     */
    public async initialize(): Promise<void> {
        console.log("RaceComp initialized, using oops.http for API calls"); 
        // // 立即获取一次数据
        // await this.fetchRaceData();
    }

    /**
     * 检查是否需要更新数据
     */
    public shouldUpdate(currentTime: number): boolean {
        return (currentTime - this.lastUpdateTime) >= this.updateInterval;
    }

    /**
     * 更新比赛数据（由CrashGameSystem调用）
     */
    public updateRaceData(currentTime: number) {
        if(this.lastUpdateTime <= 0.001 && this.lastUpdateTime > -0.001) {
            this.lastUpdateTime = currentTime;
        }
        this.lastPastTime += currentTime - this.lastUpdateTime;
        if( this.lastPastTime >= this.updateInterval ){
            this.lastPastTime = 0;
            this.fetchRaceData();
        } else{
            // 如果有活跃比赛，更新剩余时间并检查是否结束
            if (this.currentRace && this.state === RaceState.ACTIVE) {
                const deltaTime = currentTime - this.lastUpdateTime;
                this.currentRace.remainingTime = Math.max(0, this.currentRace.remainingTime - deltaTime);
            }
        }
        this.lastUpdateTime = currentTime;
        
    }

    /**
     * 获取比赛数据
     */
    public async fetchRaceData(): Promise<void> {
        try {
            this.state = RaceState.LOADING;
            
            // 获取当前比赛信息
            const raceResponse = await this.fetchCurrentRace();
            console.log("fetchRaceData - raceResponse:", raceResponse);
            console.log("fetchRaceData - raceResponse.success:", raceResponse.success);
            console.log("fetchRaceData - raceResponse.data:", raceResponse.data);
            
            if (!raceResponse.success || !raceResponse.data || !raceResponse.data.hasActiveRace || !raceResponse.data.race) {
                console.log("No active race found or API not ready");
                this.state = RaceState.NO_RACE;
                this.currentRace = null;
                this.leaderboard = [];
                this.userRaceInfo = null;
                return;
            }
            
            this.currentRace = raceResponse.data.race;
            
            // 获取用户ID
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.warn("No user ID available for race data");
                this.state = RaceState.ACTIVE;
                return;
            }
            
            // 并行获取排行榜和用户奖励数据
            const [leaderboardResponse, prizesResponse] = await Promise.all([
                this.fetchRaceLeaderboard(this.currentRace!.raceId, 20, userId),
                this.fetchUserPendingPrizes(userId)
            ]);
            
            // 处理排行榜数据
            if (leaderboardResponse.success && leaderboardResponse.data) {
                this.leaderboard = leaderboardResponse.data.topLeaderboard || [];
                this.userRaceInfo = leaderboardResponse.data.userInfo || null;
            }
            
            // 处理奖励数据
            if (prizesResponse.success && prizesResponse.data) {
                this.userPendingPrizes = prizesResponse.data.pendingPrizes || [];
                this.totalPendingAmount = prizesResponse.data.totalPendingAmount || 0;   
            }
            // 检查是否有新的比赛结束需要显示
            this.checkForRaceResults();

            this.state = RaceState.ACTIVE;
            
            // 发送数据更新事件
            oops.message.dispatchEvent("RACE_DATA_UPDATED", {
                race: this.currentRace,
                leaderboard: this.leaderboard,
                userInfo: this.userRaceInfo,
                prizes: this.userPendingPrizes
            });
            
        } catch (error) {
            console.error("Failed to fetch race data:", error);
            this.state = RaceState.ERROR;
        }
    }

    /**
     * 领取奖励
     */
    public async claimPrize(prizeId: string): Promise<boolean> {
        return new Promise((resolve) => {
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.error("No user ID available for claiming prize");
                resolve(false);
                return;
            }

            oops.http.post(`race/prizes/${prizeId}/claim`, (ret) => {
                if (ret.isSucc && ret.res && ret.res.success) {
                    const data = ret.res.data;
                    console.log(`Prize claimed: ${data.prizeAmount} coins`);
                    
                    // 从待领取列表中移除已领取的奖励
                    this.userPendingPrizes = this.userPendingPrizes.filter(prize => prize._id !== prizeId);
                    this.totalPendingAmount = this.userPendingPrizes.reduce((sum, prize) => sum + prize.prizeAmount, 0);
                    
                    // 发送奖励领取事件
                    oops.message.dispatchEvent("PRIZE_CLAIMED", {
                        prizeAmount: data.prizeAmount,
                        rank: data.rank,
                        raceId: data.raceId
                    });
                    
                    resolve(true);
                } else {
                    console.error('Failed to claim prize:', ret.err);
                    resolve(false);
                }
            }, { userId: userId });
        });
    }

    /**
     * 比赛倒计时结束处理
     */
    private onRaceTimerEnded(raceId: string): void {
        console.log(`Race timer ended for: ${raceId}`);
        
        // 不再强制刷新数据，等待下次定时更新获取奖励信息
        console.log("Race timer ended, will fetch new data on next scheduled update");
    }

    /**
     * 检查是否有新的比赛结果需要显示
     */
    private async checkForRaceResults(): Promise<void> {
        if( !this.lastCheckedRaceId || this.lastCheckedRaceId == ''){
            if(this.currentRace){
                this.lastCheckedRaceId = this.currentRace?.raceId;
            }
        }
        if(this.currentRace && this.currentRace.raceId != this.lastCheckedRaceId){
            this.showRaceResult(this.lastCheckedRaceId);
            this.lastCheckedRaceId = this.currentRace.raceId;
        }
    }
    
    /**
     * 标记比赛结果已显示
     */
    public markRaceResultShown(raceId: string): void {
        if (raceId === this.lastCheckedRaceId) {
            console.log(`Race result marked as shown: ${raceId}`);
        }
    }

    public async getUserPendingRaceId():Promise<string>{
        if(this.userPendingPrizes && this.userPendingPrizes.length > 0){
            return this.userPendingPrizes[0].raceId;
        }
        return new Promise((resolve, reject) => {
            oops.http.get('race/history?limit=1', (ret) => {
                console.log("=== fetch history completed race DEBUG ===");
                console.log("ret object:", ret);
                console.log("ret.isSucc:", ret.isSucc);
                console.log("ret.res:", JSON.stringify(ret.res, null, 2));
                
                if (ret.isSucc && ret.res && ret.res.data) {
                    const data = ret.res.data.history;
                    // 验证返回数据的结构
                    if(data && data.length > 0){
                        resolve(data[0].raceId);
                    } else {
                        console.warn("Invalid data structure in race/history response:", data);
                        reject(new Error("Invalid data structure in race/history response"));
                    }
                } else {
                    console.warn("Failed to fetch race/history prizes:", ret);
                    reject(new Error("Failed to fetch race/history prizes"));
                }
            });
        });
    }


    /**
     * 显示比赛结果弹窗
     */
    public async showRaceResult(raceId: string): Promise<void> {
        try {
            console.log(`Showing race result for: ${raceId}`);
            // 获取用户ID
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.warn("No user ID available for race~!!!");
                return;
            }
            // 获取奖励数据
            const racePrizes:HistoryRacePrizesInfo = await this.fetchHistoryRacePrizes(raceId);
            // 发送显示比赛结果事件
            oops.message.dispatchEvent("SHOW_RACE_RESULT", {
                raceId: raceId,
                racePrizes: racePrizes?.prizes
            });

        } catch (error) {
            console.error('Error showing race result:', error);
            oops.gui.toast("Failed to show race results");
        }
    }

    // === API调用方法 ===

    /**
     * 获取历史race信息的API调用
     * @param raceId 比赛ID
     * @returns Promise<HistoryRacePrizesInfo> 历史比赛奖励信息
     */
    public async fetchHistoryRacePrizes(raceId: string): Promise<HistoryRacePrizesInfo> {
        return new Promise((resolve, reject) => {
            oops.http.get(`race/prizes/race/${raceId}`, (ret) => {
                console.log("=== fetchHistoryRacePrizes DEBUG ===");
                console.log("raceId:", raceId);
                console.log("ret object:", ret);
                console.log("ret.isSucc:", ret.isSucc);
                console.log("ret.res:", JSON.stringify(ret.res, null, 2));
                
                if (ret.isSucc && ret.res && ret.res.data) {
                    const data = ret.res.data;
                    // 验证返回数据的结构
                    if (data.raceId && data.prizes && data.stats) {
                        resolve(data as HistoryRacePrizesInfo);
                    } else {
                        console.warn("Invalid data structure in history race prizes response:", data);
                        reject(new Error("Invalid data structure in response"));
                    }
                } else {
                    console.warn("Failed to fetch history race prizes:", ret);
                    reject(new Error("Failed to fetch history race prizes"));
                }
            });
        });
    }

    

    /**
     * 获取当前比赛信息的API调用
     */
    private async fetchCurrentRace(): Promise<any> {
        return new Promise((resolve) => {
            oops.http.get(`race/current`, (ret) => {
                console.log("=== fetchCurrentRace DEBUG ===");
                console.log("ret object:", ret);
                console.log("ret.isSucc:", ret.isSucc);
                console.log("ret.res type:", typeof ret.res);
                console.log("ret.res:", JSON.stringify(ret.res, null, 2));
                
                if (ret.isSucc && ret.res) {
                    resolve(ret.res);
                } else {
                    console.warn("Race current API error:", ret.err);
                    resolve({ success: false, error: ret.err });
                }
            });
        });
    }

    /**
     * 获取比赛排行榜的API调用
     */
    private async fetchRaceLeaderboard(raceId: string, limit: number, userId: string): Promise<any> {
        return new Promise((resolve) => {
            oops.http.get(`race/${raceId}/leaderboard?limit=${limit}&userId=${userId}`, (ret) => {
                if (ret.isSucc && ret.res) {
                    resolve(ret.res);
                } else {
                    console.warn("Race leaderboard API error:", ret.err);
                    resolve({ success: false, error: ret.err });
                }
            });
        });
    }

    /**
     * 获取用户待领取奖励
     */
    private async fetchUserPendingPrizes(userId: string): Promise<any> {
        return new Promise((resolve) => {
            oops.http.get(`race/prizes/user/${userId}`, (ret) => {
                if (ret.isSucc && ret.res) {
                    resolve(ret.res);
                } else {
                    console.warn("Race prizes API error:", ret.err);
                    resolve({ success: false, error: ret.err });
                }
            });
        });
    }

    /**
     * 获取当前用户ID
     */
    public getCurrentUserId(): string | null {
        try {
            // 获取CrashGame实体
            const crashGameEntity = smc.crashGame;
            if (!crashGameEntity) {
                console.warn("CrashGame entity not found");
                return this.generateTempUserId();
            }
            
            const userData = crashGameEntity.get(UserDataComp);
            if (userData && userData.userId) {
                return userData.userId;
            }
            return null;
        } catch (error) {
            console.error("Error getting user ID:", error);
            return this.generateTempUserId();
        }
    }

    /**
     * 生成临时用户ID
     */
    private generateTempUserId(): string {
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        console.log(`Generated temporary user ID: ${tempUserId}`);
        return tempUserId;
    }

    // === 工具方法 ===

    /**
     * 格式化剩余时间
     */
    public formatRemainingTime(milliseconds: number): string {
        if (milliseconds <= 0) return "00:00:00";
        
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 格式化奖池数字显示
     */
    public formatPrizePool(value: number): string {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(0)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        } else {
            return value.toLocaleString();
        }
    }

    /**
     * 格式化奖励数字显示
     */
    public formatPrizeNumber(value: number,fixnum:number = 2): string {
        const absValue = Math.abs(value);
        if (absValue >= 1000000) {
            const formatted = `${(absValue / 1000000).toFixed(fixnum)}M`;
            return value < 0 ? `-${formatted}` : formatted;
        } else if (absValue >= 1000) {
            const formatted = `${(absValue / 1000).toFixed(fixnum)}K`;
            return value < 0 ? `-${formatted}` : formatted;
        } else {
            return value.toFixed(fixnum);
        }
    }

    /**
     * 格式化用户ID显示
     */
    public formatUserId(userId: string): string {
        if (userId.length > 8) {
            return userId.substring(0, 6) + "...";
        }
        return userId;
    }

    /**
     * 根据排名计算奖励金额（估算）
     */
    public calculatePrizeAmount(rank: number): number {
        if (!this.currentRace) return 0;
        
        const totalPool = this.currentRace.prizePool.totalPool;
        
        switch (rank) {
            case 1: return Math.floor(totalPool * 0.5);  // 50%
            case 2: return Math.floor(totalPool * 0.25); // 25%
            case 3: return Math.floor(totalPool * 0.11); // 11%
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
                // 4-10名均分14%
                return Math.floor(totalPool * 0.14 / 7);
            default: 
                return 0;
        }
    }

    /**
     * 检查用户是否有待领取奖励
     */
    public hasPendingPrizes(): boolean {
        return this.userPendingPrizes.length > 0;
    }

    /**
     * 获取指定比赛的用户奖励
     */
    public getUserPrizeForRace(raceId: string): UserPrizeInfo | null {
        return this.userPendingPrizes.find(prize => prize.raceId === raceId) || null;
    }

    /**
     * 获取比赛状态文本
     */
    public getStateText(): string {
        switch (this.state) {
            case RaceState.LOADING: return "Loading...";
            case RaceState.ACTIVE: return "Active Race";
            case RaceState.NO_RACE: return "No Active Race";
            case RaceState.ERROR: return "Error";
            default: return "Idle";
        }
    }
}