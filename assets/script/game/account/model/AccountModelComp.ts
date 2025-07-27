

/*
 * @Author: dgflash
 * @Date: 2021-11-12 10:02:31
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-25 17:03:45
 */
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

/** 
 * 游戏账号数据 
 */
@ecs.register('AccountModel')
export class AccountModelComp extends ecs.Comp {
    /** 账号名 */
    AccountName: string = null!;

    /** 用户ID */
    userId: string = "";

    /** 用户等级 */
    level: number = 1;

    /** 经验值 */
    experience: number = 0;

    /** 下一级所需经验 */
    nextLevelExp: number = 1000;

    /** 游戏余额 */
    balance: number = 1000;

    /** VIP等级 */
    vipLevel: number = 0;

    /** 注册时间 */
    registrationDate: number = 0;

    /** 最后登录时间 */
    lastLoginDate: number = 0;

    /** 邮箱 */
    email: string = "";

    /** 头像 */
    avatar: string = "";

    /** 游戏统计数据 */
    gameStats = {
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        totalBetAmount: 0,
        totalWinAmount: 0,
        totalProfit: 0,
        biggestWin: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        playTime: 0
    };

    /** 初始化账户数据 */
    initializeAccount(userId: string, username: string): void {
        this.userId = userId;
        this.AccountName = username;
        this.registrationDate = Date.now();
        this.lastLoginDate = Date.now();
    }

    /** 更新余额 */
    updateBalance(newBalance: number): void {
        this.balance = Math.max(0, newBalance);
    }

    /** 增加经验值 */
    addExperience(exp: number): boolean {
        this.experience += exp;

        // 检查是否升级
        if (this.experience >= this.nextLevelExp) {
            this.levelUp();
            return true;
        }
        return false;
    }

    /** 升级 */
    private levelUp(): void {
        this.level++;
        this.experience -= this.nextLevelExp;
        this.nextLevelExp = this.calculateNextLevelExp(this.level);
    }

    /** 计算下一级所需经验 */
    private calculateNextLevelExp(level: number): number {
        return 1000 + (level - 1) * 500;
    }

    /** 更新游戏统计 */
    updateGameStats(gameResult: {
        won: boolean;
        betAmount: number;
        winAmount?: number;
        profit: number;
        playTime: number;
    }): void {
        this.gameStats.totalGames++;
        this.gameStats.totalBetAmount += gameResult.betAmount;
        this.gameStats.totalProfit += gameResult.profit;
        this.gameStats.playTime += gameResult.playTime;

        if (gameResult.won) {
            this.gameStats.totalWins++;
            this.gameStats.totalWinAmount += gameResult.winAmount || 0;

            if (gameResult.profit > this.gameStats.biggestWin) {
                this.gameStats.biggestWin = gameResult.profit;
            }
        } else {
            this.gameStats.totalLosses++;
        }
    }

    /** 获取胜率 */
    getWinRate(): number {
        return this.gameStats.totalGames > 0 ?
            this.gameStats.totalWins / this.gameStats.totalGames : 0;
    }

    /** 获取平均下注金额 */
    getAverageBetAmount(): number {
        return this.gameStats.totalGames > 0 ?
            this.gameStats.totalBetAmount / this.gameStats.totalGames : 0;
    }

    /** 更新最后登录时间 */
    updateLastLoginTime(): void {
        this.lastLoginDate = Date.now();
    }

    reset() {
        this.AccountName = null!;
        this.userId = "";
        this.level = 1;
        this.experience = 0;
        this.nextLevelExp = 1000;
        this.balance = 1000;
        this.vipLevel = 0;
        this.registrationDate = 0;
        this.lastLoginDate = 0;
        this.email = "";
        this.avatar = "";
        this.gameStats = {
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0,
            totalBetAmount: 0,
            totalWinAmount: 0,
            totalProfit: 0,
            biggestWin: 0,
            longestWinStreak: 0,
            longestLossStreak: 0,
            playTime: 0
        };
    }
}