import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../common/SingletonModuleComp";
import { BettingComp } from "./BettingComp";
import { TaskComp } from "./TaskComp";
import { ITaskEvent,TaskType } from "../data/TaskData";

@ecs.register('UserData')
export class UserDataComp extends ecs.Comp {
    userId: string = "";
    username: string = "";
    joinDate: Date = new Date();
    private _balance: number = 1000;
    private _money:number = 100;
    private _completedLevelId:number = -1;
    private _currentPlayLevelId:number = 0;
    private _completeTaskId:number = -1;
    private _stars:number = 0;
    private _levelstars:number = 0;
    totalFlights: number = 0;
    flightsWon: number = 0;
    onlineFlights:number = 0;
    highestMultiplier: number = 1.0;
    highestBetAmount: number = 0;
    highestWinAmount: number = 0;
    lastSyncTime: Date = new Date();
    
    // 用户设置
    settings: UserSettings = {
        soundEnabled: true,
        musicEnabled: true,
        language: "zh",
        autoCashOut: {
            enabled: false,
            multiplier: 2.0,
            totalBets: -1
        }
    };

    public get currentPlayLevelId(): number {
        return this._currentPlayLevelId;
    }

    public set currentPlayLevelId(value: number) {
        this._currentPlayLevelId = value;
    }

    public get completedLevelId(): number {
        return this._completedLevelId;
    }

    public set completedLevelId(value: number) {
        this._completedLevelId = value;
        const passLevelTask:ITaskEvent = {
                                type: TaskType.PASS_LEVEL,
                                value: value
                            }
                            const taskcomp = smc.crashGame.get(TaskComp);
                            taskcomp.updateTaskProgress(passLevelTask);
    }

    public get completeTaskId():number{
        return this._completeTaskId;
    }
    public set completeTaskId(value:number){
        this._completeTaskId = value;
    }

    public get levelstars():number{
        return this._levelstars;
    }

    public set levelstars(value:number){
        this._levelstars = value;
    }

    public get stars():number{
        return this._stars;
    }

    public set stars(s:number){
        if(s >= 0){
            this._stars = s;
        }
        else{
            this._stars = 0;
        }
        
    }

    public get balance(): number {
    return this._balance;
}

    public set balance(value: number) {
        this._balance = value;
        if(this._balance <= 0) this._balance = 0;
        const goldTaskEvent: ITaskEvent = {
                type: TaskType.COLLECT_COINS,
                value: this._balance
            };
        if(smc.crashGame){
            const taskcomp = smc.crashGame.get(TaskComp);
            if(taskcomp){
                taskcomp.updateTaskProgress(goldTaskEvent);
            }
        }
    }

    public get money(): number {
        return this._money;
    }

    public set money(value: number) {
        this._money = value;
        if(this._money <= 0) this._money = 0;
    }

    reset() {
        this.userId = "";
        this.username = "";
        this.balance = 1000;
        this.money = 100;
        this.stars = 0;
        this.totalFlights = 0;
        this.onlineFlights = 0;
        this.flightsWon = 0;
        this.highestMultiplier = 1.0;
        this.highestBetAmount = 0;
        this.highestWinAmount = 0;
        this.lastSyncTime = new Date();
        this.settings = {
            soundEnabled: true,
            musicEnabled: true,
            language: "zh",
            autoCashOut: {
                enabled: false,
                multiplier: 2.0,
                totalBets: -1
            }
        };
    }
    
    /**
     * 获取用户ID，如果不存在则生成新的
     */
    getUserId(): string {
        if (!this.userId) {
            this.userId = UserIdManager.getUserId();
            this.username = this.userId;//`Player_${this.userId.substring(0, 8)}`;
        }
        return this.userId;
    }
    
    /**
     * 计算胜率
     */
    getWinRate(): number {
        if (this.totalFlights === 0) return 0;
        return Math.round((this.flightsWon / this.totalFlights) * 100);
    }
    
    /**
     * 计算净收益
     */
    getNetProfit(): number {
        return this.balance - 1000; // 假设初始余额为1000
    }

    /**
     * 完成关卡
     */
    updateCompletedLevel(levelid:number,completed:boolean){
        if(levelid > this.completedLevelId){
            if(!completed){
                // 通知任务组件更新任务进度
                oops.message.dispatchEvent("TASK_COMPLETED_LEVEL", { levelId: levelid ,completed:false});
                return;
            }
            oops.http.post(`user/${this.getUserId()}/completelevel`, (ret) => {
            if (ret.isSucc) {
                console.log("User completed level synced to server successfully");
                // 更新本地同步时间
                this.lastSyncTime = new Date();
                if(completed){
                    this.completedLevelId = ret.res.data.completedLevelId;
                }
                // 通知任务组件更新任务进度
                oops.message.dispatchEvent("TASK_COMPLETED_LEVEL", { levelId: levelid ,completed:completed});
            } else {
                console.error("Failed to sync user completed level to server:", ret.err);
            }
        }, {levelId:levelid});
        }else{
            // 通知任务组件更新任务进度
                oops.message.dispatchEvent("TASK_COMPLETED_LEVEL", { levelId: levelid,completed:completed });
        }
    }
    
    /**
     * 更新游戏统计
     */
    updateGameStats(betAmount: number, multiplier: number, winAmount: number, isWin: boolean): void {
        const taskcomp = smc.crashGame.get(TaskComp);
        const betting = smc.crashGame.get(BettingComp);
        this.totalFlights += 1;
        const singleFlightTask:ITaskEvent = {
            type: TaskType.SINGLE_FLIGHT,
            value: this.totalFlights
        }
        taskcomp.updateTaskProgress(singleFlightTask);
        if(betting.gameMode === "PIG"){
            this.onlineFlights+=1;
            const onlineFlightsTask:ITaskEvent = {
                type: TaskType.ONLINE_FLIGHT,
                value: this.onlineFlights
            }
            taskcomp.updateTaskProgress(onlineFlightsTask);
        }
        if (isWin) {
            this.flightsWon += 1;
            // this.balance += (winAmount - betAmount); // 净收益
            
            // 更新最高记录
            if (multiplier > this.highestMultiplier) {
                this.highestMultiplier = multiplier;
                this.highestBetAmount = betAmount;
                this.highestWinAmount = winAmount;
                const highestMultiplierTask:ITaskEvent = {
                    type: TaskType.CRASH_MULTIPLIER,
                    value: multiplier
                }
                const taskcomp = smc.crashGame.get(TaskComp);
                taskcomp.updateTaskProgress(highestMultiplierTask);
            }
        }
        // else {
            // this.balance -= betAmount; // 损失
        // }
        
        this.lastSyncTime = new Date();
        
        // 发送数据更新事件
        oops.message.dispatchEvent("USER_STATS_UPDATED", {
            balance: this.balance,
            totalFlights: this.totalFlights,
            flightsWon: this.flightsWon,
            winRate: this.getWinRate(),
            netProfit: this.getNetProfit()
        });

        this.saveToLocal();
    }
    
    /**
     * 保存用户数据到本地存储并同步到服务器
     */
    saveToLocal(): void {
        const userData = {
            userId: this.userId,
            username: this.username,
            balance: this.balance,
            totalFlights: this.totalFlights,
            onlineFlights:this.onlineFlights,
            flightsWon: this.flightsWon,
            highestMultiplier: this.highestMultiplier,
            highestBetAmount: this.highestBetAmount,
            highestWinAmount: this.highestWinAmount,
            settings: this.settings,
            lastSyncTime: this.lastSyncTime.getTime()
        };
        
        UserIdManager.saveUserData(userData);
        
        // 同步用户设置到服务器
        const settingsData = {
            balance: this.balance,
            money: this.money,
            settings: this.settings,
            lastSyncTime: new Date().getTime()
        };
        
        oops.http.post(`user/${this.getUserId()}/settings`, (ret) => {
            if (ret.isSucc) {
                console.log("User settings synced to server successfully");
                // 更新本地同步时间
                this.lastSyncTime = new Date();
            } else {
                console.error("Failed to sync user settings to server:", ret.err);
            }
        }, settingsData);
    }
    
    /**
     * 从本地存储加载用户数据
     */
    loadFromLocal(): void {
        const userData = UserIdManager.loadUserData();
        if (userData && Object.keys(userData).length > 0) {
            this.userId = userData.userId || this.getUserId();
            this.username = this.userId;//userData.username || `Player_${this.userId.substring(0, 8)}`;
            this.balance = userData.balance || 1000;
            this.totalFlights = userData.totalFlights || 0;
            this.onlineFlights = userData.onlineFlights || 0;
            this.flightsWon = userData.flightsWon || 0;
            this.highestMultiplier = userData.highestMultiplier || 1.0;
            this.highestBetAmount = userData.highestBetAmount || 0;
            this.highestWinAmount = userData.highestWinAmount || 0;
            this.settings = userData.settings || this.settings;
            this.lastSyncTime = userData.lastSyncTime ? new Date(userData.lastSyncTime) : new Date();
            
            console.log("User data loaded from local storage:", {
                userId: this.userId,
                balance: this.balance,
                totalFlights: this.totalFlights
            });
        } else {
            // 首次运行，初始化用户ID
            this.getUserId();
        }
    }
}

// 用户ID管理器 - 基于Oops Framework的StorageManager
export class UserIdManager {
    private static readonly USER_ID_KEY = "dog_crash_user_id";

    // 获取或生成用户ID
    static getUserId(): string {
        let userId = oops.storage.get(this.USER_ID_KEY);
        if (!userId) {
            userId = this.generateUserId();
            oops.storage.set(this.USER_ID_KEY, userId);
        }
        return userId;
    }

    // 生成唯一用户ID
    private static generateUserId(): string {
        // 结合时间戳和随机数生成8位数的唯一数字
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        // 取时间戳的后5位 + 3位随机数，确保8位数字且具有唯一性
        let timestampPart = (timestamp % 100000).toString().padStart(5, '0');
        // 确保首位不为0
        if (timestampPart.charAt(0) === '0') {
            timestampPart = '1' + timestampPart.substring(1);
        }
        const randomPart = random.toString().padStart(3, '0');
        return timestampPart + randomPart;
    }

    // 清除用户ID（用于测试或重置）
    static clearUserId(): void {
        oops.storage.remove(this.USER_ID_KEY);
    }

    // 保存用户数据到本地存储
    static saveUserData(userData: any): void {
        oops.storage.set("user_data", userData);
    }

    // 从本地存储加载用户数据
    static loadUserData(): any {
        return oops.storage.getJson("user_data", {});
    }
}

// 用户设置接口
export interface UserSettings {
    soundEnabled: boolean;
    musicEnabled: boolean;
    language: "zh" | "en";
    autoCashOut: {
        enabled: boolean;
        multiplier: number;
        totalBets: number; // -1表示无限
    };
}