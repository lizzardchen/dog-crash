/*
 * @Author: dgflash
 * @Date: 2021-11-23 15:28:39
 * @LastEditors: dgflash
 * @LastEditTime: 2022-01-26 16:42:00
 */

/** 游戏事件 */
export enum GameEvent {
    /** 游戏服务器连接成功 */
    GameServerConnected = "GameServerConnected",
    /** 登陆成功 */
    LoginSuccess = "LoginSuccess",

    // Crash Game Events
    /** 游戏开始 */
    GameStart = "GameStart",
    /** Crash游戏开始 */
    CrashGameStart = "CrashGameStart",
    /** 游戏结束 */
    GameEnd = "GameEnd",
    /** Crash游戏结束 */
    CrashGameEnd = "CrashGameEnd",
    /** 游戏状态变化 */
    GameStateChange = "GameStateChange",
    /** 下注成功 */
    BetPlaced = "BetPlaced",
    /** 火箭起飞 */
    RocketLaunch = "RocketLaunch",
    /** 火箭崩盘 */
    RocketCrash = "RocketCrash",
    /** 成功提现 */
    CashOut = "CashOut",
    /** 倍数更新 */
    MultiplierUpdate = "MultiplierUpdate",
    /** 余额更新 */
    BalanceUpdate = "BalanceUpdate",
    /** 用户数据更新 */
    UserDataUpdate = "UserDataUpdate",
    /** 排行榜更新 */
    LeaderboardUpdate = "LeaderboardUpdate",
    /** 奖励更新 */
    RewardUpdate = "RewardUpdate",

    // HOLD Button Events
    /** HOLD按钮开始游戏 */
    HoldButtonStartGame = "HoldButtonStartGame",
    /** HOLD按钮提现 */
    HoldButtonCashOut = "HoldButtonCashOut"
}