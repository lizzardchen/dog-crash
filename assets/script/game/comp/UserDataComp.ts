import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

@ecs.register('UserData')
export class UserDataComp extends ecs.Comp {
    userId: string = "";
    username: string = "";
    joinDate: Date = new Date();
    balance: number = 1000;
    totalFlights: number = 0;
    flightsWon: number = 0;
    highestMultiplier: number = 1.0;
    highestBetAmount: number = 0;
    highestWinAmount: number = 0;
    lastSyncTime: Date = new Date();

    reset() {
        this.userId = "";
        this.username = "";
        this.balance = 1000;
        this.totalFlights = 0;
        this.flightsWon = 0;
        this.highestMultiplier = 1.0;
        this.highestBetAmount = 0;
        this.highestWinAmount = 0;
        this.lastSyncTime = new Date();
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
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 15);
        return `${timestamp}_${randomStr}`;
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