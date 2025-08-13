import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameStateComp } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { UserDataComp } from "../comp/UserDataComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { GameHistoryComp } from "../comp/GameHistoryComp";
import { SceneBackgroundComp } from "../comp/SceneBackgroundComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { EnergyComp } from "../comp/EnergyComp";
import { RaceComp } from "../comp/RaceComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { MultiplierConfig } from "../config/MultiplierConfig";
import { SDKMgr } from "../common/SDKMgr";

@ecs.register('CrashGame')
export class CrashGame extends ecs.Entity {
    init() {
        this.add(GameStateComp);
        this.add(BettingComp);
        this.add(MultiplierComp);
        this.add(UserDataComp);
        this.add(LocalDataComp);
        this.add(GameHistoryComp);
        // this.add(RocketViewComp);
        this.add(SceneBackgroundComp);
        this.add(EnergyComp);
        this.add(RaceComp);
        
        // 初始化用户数据
        const userDataComp = this.get(UserDataComp);
        if (userDataComp) {
            userDataComp.loadFromLocal();
        }
        
        // 初始化音频系统
        CrashGameAudio.init();

        SDKMgr.instance.init(true,true);
    }
    // 服务器配置
    public static serverConfig = {
        baseURL: "https://crash.realfunplay.cn/api/",//"http://localhost:3000/api/"
        //baseURL: "http://localhost:3000/api/",
        timeout: 10000,
        retryAttempts: 3
    };

    // 网络状态
    private isOnline: boolean = false;
    private lastSyncTime: number = 0;

    public async InitServer(): Promise<void> {
        // 配置 HTTP 服务器地址
        oops.http.server = CrashGame.serverConfig.baseURL;
        oops.http.timeout = CrashGame.serverConfig.timeout;
        
        // 添加Content-Type头
        oops.http.addHeader("Content-Type", "application/json");
        
        // 从服务器初始化倍率配置系统
        await MultiplierConfig.initialize();
        
        // 初始化用户数据和服务器连接
        await this.initializeUserData();
        
        // 初始化RaceComp
        const raceComp = this.get(RaceComp);
        if (raceComp) {
            raceComp.initialize();
        }
        
        console.log("CrashGame: Server initialization completed................");
    }

    /**
     * 初始化用户数据 - 从服务器获取或创建用户
     */
    private async initializeUserData(): Promise<void> {
        const userDataComp = this.get(UserDataComp);
        if (!userDataComp) {
            console.error("UserDataComp not found");
            return;
        }

        try {
            // 1. 获取本地用户ID
            const userId = userDataComp.getUserId();
            console.log(`Initializing user: ${userId}`);

            // 2. 尝试从服务器获取用户信息
            const serverUserData = await this.fetchUserFromServer(userId);
            
            if (serverUserData) {
                // 3. 合并服务器数据到本地
                this.mergeServerUserData(serverUserData);
                this.isOnline = true;
                this.lastSyncTime = Date.now();
                console.log("User data synced from server", serverUserData);
            } else {
                console.log("Using offline mode - server unavailable");
                this.isOnline = false;
            }

            // 4. 启动定期同步（每5分钟）
            this.startPeriodicSync();

        } catch (error) {
            console.error("Failed to initialize user data:", error);
            this.isOnline = false;
        }
    }

    /**
     * 从服务器获取用户信息
     */
    private async fetchUserFromServer(userId: string): Promise<any> {
        return new Promise((resolve) => {
            try {
                oops.http.get(`user/${userId}`, (ret) => {
                    if (ret.isSucc && ret.res) {
                        resolve(ret.res.data);
                    } else {
                        console.error("Failed to fetch user from server:", ret.err);
                        resolve(null);
                    }
                });
            } catch (error) {
                console.error("Failed to fetch user from server:", error);
                resolve(null);
            }
        });
    }

    /**
     * 合并服务器用户数据到本地
     */
    private mergeServerUserData(serverData: any): void {
        const userDataComp = this.get(UserDataComp);
        if (!userDataComp || !serverData) return;

        // 更新用户数据（服务器数据为准）
        userDataComp.username = serverData.username || userDataComp.username;
        userDataComp.balance = serverData.balance || userDataComp.balance;
        userDataComp.totalFlights = Math.max(userDataComp.totalFlights, serverData.totalFlights || 0);
        userDataComp.flightsWon = Math.max(userDataComp.flightsWon, serverData.flightsWon || 0);
        
        // 更新最高记录
        if (serverData.highestMultiplier > userDataComp.highestMultiplier) {
            userDataComp.highestMultiplier = serverData.highestMultiplier;
            userDataComp.highestBetAmount = serverData.highestBetAmount || 0;
            userDataComp.highestWinAmount = serverData.highestWinAmount || 0;
        }

        // 更新设置
        if (serverData.settings) {
            // 合并设置，本地设置优先
            userDataComp.settings = { ...serverData.settings, ...userDataComp.settings };
        }

        console.log("User data merged:", {
            balance: userDataComp.balance,
            totalFlights: userDataComp.totalFlights,
            highestMultiplier: userDataComp.highestMultiplier
        });
    }

    /**
     * 上传游戏记录到服务器
     */
    public async uploadGameRecord(gameResult: GameResultData): Promise<boolean> {
        if (!this.isOnline) {
            console.log("Offline mode - game record saved locally");
            return false;
        }

        const userDataComp = this.get(UserDataComp);
        if (!userDataComp) return false;

        return new Promise(async (resolve) => {
            try {
                // 确保用户在服务器端存在
                if (!this.isOnline) {
                    console.log("Offline mode - trying to reconnect for game record upload");
                    const serverUserData = await this.fetchUserFromServer(userDataComp.getUserId());
                    if (serverUserData) {
                        this.isOnline = true;
                        console.log("Reconnected to server for game record upload");
                    } else {
                        console.log("Still offline - game record saved locally");
                        resolve(false);
                        return;
                    }
                }

                let cur_betAmount:Number = Number(gameResult.betAmount);
                if(cur_betAmount == 90){
                    if(gameResult.isWin){
                        cur_betAmount = 90;
                    }
                    else{
                        cur_betAmount = 0;
                    }
                }

                const recordData = {
                    betAmount: Number(cur_betAmount),
                    multiplier: Number(gameResult.crashMultiplier),
                    winAmount: Number(gameResult.winAmount),
                    isWin: Boolean(gameResult.isWin),
                    sessionId: `${userDataComp.getUserId()}_${Date.now()}`,
                    gameDuration: Number(gameResult.duration || 0),
                    isFreeMode: Boolean(gameResult.isFreeMode || false)
                };

                console.log("Uploading game record:", recordData);

                oops.http.post(`user/${userDataComp.getUserId()}/record`, (ret) => {
                    if (ret.isSucc) {
                        console.log("Game record uploaded successfully");
                        // 更新本地数据为服务器返回的数据
                        if (ret.res && ret.res.data) {
                            const serverData = ret.res.data;
                            userDataComp.balance = serverData.balance;
                            userDataComp.totalFlights = serverData.totalFlights;
                            userDataComp.flightsWon = serverData.flightsWon;
                            userDataComp.highestMultiplier = serverData.highestMultiplier;
                        }
                        resolve(true);
                    } else {
                        console.error("Failed to upload game record:", ret.err);
                        // 如果是404错误，可能用户不存在，尝试重新创建
                        if (ret.err && ret.err.indexOf('404') !== -1) {
                            console.log("User not found on server, will retry initialization");
                            this.isOnline = false;
                        }
                        resolve(false);
                    }
                }, recordData);

            } catch (error) {
                console.error("Failed to upload game record:", error);
                this.isOnline = false;
                resolve(false);
            }
        });
    }
    
    /**
     * 手动同步用户数据
     */
    public async syncUserData(): Promise<boolean> {
        const userDataComp = this.get(UserDataComp);
        if (!userDataComp) return false;

        try {
            const serverData = await this.fetchUserFromServer(userDataComp.getUserId());
            if (serverData) {
                this.mergeServerUserData(serverData);
                this.isOnline = true;
                this.lastSyncTime = Date.now();
                
                // 发送同步完成事件
                oops.message.dispatchEvent("USER_DATA_SYNCED", {
                    userId: userDataComp.getUserId(),
                    balance: userDataComp.balance,
                    isOnline: this.isOnline
                });
                
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to sync user data:", error);
            this.isOnline = false;
            return false;
        }
    }

    /**
     * 启动定期同步
     */
    private startPeriodicSync(): void {
        // 每5分钟同步一次
        oops.timer.schedule(() => {
            if (this.isOnline) {
                this.syncUserData();
            }
        }, 5 * 60 * 1000); // 5分钟间隔
    }

    /**
     * 获取网络状态
     */
    public getNetworkStatus(): { isOnline: boolean; lastSyncTime: number } {
        return {
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime
        };
    }

    /**
     * 检查网络连接
     */
    public async checkConnection(): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                oops.http.get(`health`, (ret) => {
                    this.isOnline = ret.isSucc;
                    resolve(this.isOnline);
                });
            } catch (error) {
                this.isOnline = false;
                resolve(false);
            }
        });
    }

    /**
     * 从服务器获取崩盘倍数
     */
    public async fetchCrashMultiplierFromServer(): Promise<number | null> {
        if (!this.isOnline) {
            console.log("Offline mode - using local crash multiplier generation");
            return null;
        }

        return new Promise((resolve) => {
            try {
                oops.http.get(`game/crash-multiplier`, (ret) => {
                    if (ret.isSucc && ret.res && ret.res.data) {
                        const crashMultiplier = ret.res.data.crashMultiplier;
                        console.log(`Received crash multiplier from server: ${crashMultiplier}x`);
                        resolve(crashMultiplier);
                    } else {
                        console.error("Failed to fetch crash multiplier from server:", ret.err);
                        resolve(null);
                    }
                });
            } catch (error) {
                console.error("Error fetching crash multiplier from server:", error);
                resolve(null);
            }
        });
    }

}

// 游戏结果数据接口
export interface GameResultData {
    betAmount: number;
    crashMultiplier: number;
    winAmount: number;
    isWin: boolean;
    duration?: number;
    isFreeMode?: boolean;
}