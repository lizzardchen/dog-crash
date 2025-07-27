export interface CrashGameConfig {
    minBet: number;                // 最小下注金额
    maxBet: number;                // 最大下注金额
    minMultiplier: number;         // 最小崩盘倍数
    maxMultiplier: number;         // 最大崩盘倍数
    multiplierSpeed: number;       // 倍数增长速度
    rocketSpeed: number;           // 火箭飞行速度
    defaultBalance: number;        // 默认余额
    maxHistoryCount: number;       // 最大历史记录数量
}

// 默认游戏配置
export const DEFAULT_GAME_CONFIG: CrashGameConfig = {
    minBet: 1,
    maxBet: 1000,
    minMultiplier: 1.0,
    maxMultiplier: 100.0,
    multiplierSpeed: 1.0,
    rocketSpeed: 1.0,
    defaultBalance: 1000,
    maxHistoryCount: 50
};