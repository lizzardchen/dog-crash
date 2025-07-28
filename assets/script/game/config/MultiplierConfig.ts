import { _decorator } from 'cc';
import { RocketSceneState } from "../comp/RocketViewComp";

const { ccclass, property } = _decorator;

/** 倍率时间点配置 */
export interface MultiplierTimePoint {
    time: number;                    // 时间点（秒）
    multiplier: number;              // 对应的倍率
    rocketState: RocketSceneState;   // Rocket状态，用于驱动场景切换
}

/** 倍率曲线配置 */
export interface MultiplierCurveConfig {
    name: string;                           // 配置名称
    description: string;                    // 描述
    timePoints: MultiplierTimePoint[];      // 时间点数组
    maxTime: number;                        // 最大时间（秒）
    interpolationType: 'linear' | 'exponential' | 'custom'; // 插值类型
}

/** 崩盘概率配置 */
export interface CrashProbabilityConfig {
    minMultiplier: number;      // 最小倍率
    maxMultiplier: number;      // 最大倍率
    probability: number;        // 概率（0-1）
    description: string;        // 描述
}

/** 倍率配置管理器 */
@ccclass('MultiplierConfig')
export class MultiplierConfig {
    /** 默认倍率曲线配置（基于策划文档 Dog_Crash_Req.pdf）*/
    private static readonly DEFAULT_CURVE_CONFIG: MultiplierCurveConfig = {
        name: "official",
        description: "官方倍率增长曲线 - 基于公式 Multiplier = 1 × e^(0.15 × t)",
        timePoints: [
            { time: 0, multiplier: 1.0, rocketState: RocketSceneState.GROUND },
            { time: 1, multiplier: 1.16, rocketState: RocketSceneState.GROUND },
            { time: 2, multiplier: 1.35, rocketState: RocketSceneState.GROUND },
            { time: 3, multiplier: 1.56, rocketState: RocketSceneState.GROUND },
            { time: 4, multiplier: 1.81, rocketState: RocketSceneState.GROUND },
            { time: 5, multiplier: 2.10, rocketState: RocketSceneState.SKY },
            { time: 6, multiplier: 2.43, rocketState: RocketSceneState.SKY },
            { time: 7, multiplier: 2.81, rocketState: RocketSceneState.SKY },
            { time: 8, multiplier: 3.25, rocketState: RocketSceneState.SKY },
            { time: 9, multiplier: 3.75, rocketState: RocketSceneState.SKY },
            { time: 10, multiplier: 4.32, rocketState: RocketSceneState.ATMOSPHERE },
            { time: 15, multiplier: 8.47, rocketState: RocketSceneState.ATMOSPHERE },
            { time: 20, multiplier: 16.63, rocketState: RocketSceneState.ATMOSPHERE },
            { time: 30, multiplier: 64.65, rocketState: RocketSceneState.SPACE },
            { time: 40, multiplier: 251.50, rocketState: RocketSceneState.SPACE }
        ],
        maxTime: 40,
        interpolationType: 'exponential'
    };

    /** 默认崩盘概率配置 */
    private static readonly DEFAULT_CRASH_PROBABILITY: CrashProbabilityConfig[] = [
        { minMultiplier: 1.1, maxMultiplier: 2.0, probability: 0.30, description: "早期崩盘" },
        { minMultiplier: 2.0, maxMultiplier: 4.0, probability: 0.40, description: "中期崩盘" },
        { minMultiplier: 4.0, maxMultiplier: 8.0, probability: 0.20, description: "后期崩盘" },
        { minMultiplier: 8.0, maxMultiplier: 15.0, probability: 0.08, description: "高倍数崩盘" },
        { minMultiplier: 15.0, maxMultiplier: 30.0, probability: 0.02, description: "超高倍数崩盘" }
    ];

    /** 当前使用的倍率曲线配置 */
    private static currentCurveConfig: MultiplierCurveConfig = MultiplierConfig.DEFAULT_CURVE_CONFIG;

    /** 当前使用的崩盘概率配置 */
    private static currentCrashConfig: CrashProbabilityConfig[] = MultiplierConfig.DEFAULT_CRASH_PROBABILITY;

    /** 初始化倍率配置（可从服务器加载） */
    static async initialize(serverConfig?: any): Promise<void> {
        if (serverConfig) {
            // 从服务器配置更新
            if (serverConfig.curveConfig) {
                this.currentCurveConfig = serverConfig.curveConfig;
            }
            if (serverConfig.crashConfig) {
                this.currentCrashConfig = serverConfig.crashConfig;
            }
            console.log("MultiplierConfig loaded from server");
        } else {
            // 使用默认配置
            console.log("MultiplierConfig using default configuration");
        }
    }

    /** 根据时间计算倍率 */
    static calculateMultiplierForTime(timeInSeconds: number): number {
        const config = this.currentCurveConfig;

        // 超出最大时间，返回最后一个时间点的倍率
        if (timeInSeconds >= config.maxTime) {
            return config.timePoints[config.timePoints.length - 1].multiplier;
        }

        // 查找时间点区间
        for (let i = 0; i < config.timePoints.length - 1; i++) {
            const currentPoint = config.timePoints[i];
            const nextPoint = config.timePoints[i + 1];

            if (timeInSeconds >= currentPoint.time && timeInSeconds <= nextPoint.time) {
                return this.interpolateMultiplier(
                    currentPoint,
                    nextPoint,
                    timeInSeconds,
                    config.interpolationType
                );
            }
        }

        // 如果时间小于第一个时间点，返回第一个时间点的倍率
        return config.timePoints[0].multiplier;
    }

    /** 插值计算倍率 */
    private static interpolateMultiplier(
        point1: MultiplierTimePoint,
        point2: MultiplierTimePoint,
        currentTime: number,
        type: 'linear' | 'exponential' | 'custom'
    ): number {
        const timeDiff = point2.time - point1.time;
        const multiplierDiff = point2.multiplier - point1.multiplier;
        const timeProgress = (currentTime - point1.time) / timeDiff;

        switch (type) {
            case 'linear':
                return point1.multiplier + multiplierDiff * timeProgress;

            case 'exponential':
                // 指数插值，后期增长更快
                const exponentialProgress = Math.pow(timeProgress, 1.2);
                return point1.multiplier + multiplierDiff * exponentialProgress;

            case 'custom':
                // 自定义曲线，可以根据需要调整
                const customProgress = this.customCurve(timeProgress);
                return point1.multiplier + multiplierDiff * customProgress;

            default:
                return point1.multiplier + multiplierDiff * timeProgress;
        }
    }

    /** 自定义曲线函数 */
    private static customCurve(progress: number): number {
        // 可以根据需要调整这个函数
        // 这里使用一个S型曲线
        return progress * progress * (3 - 2 * progress);
    }

    /** 生成崩盘倍数 */
    static generateCrashMultiplier(): number {
        const random = Math.random();
        let cumulativeProbability = 0;

        for (const config of this.currentCrashConfig) {
            cumulativeProbability += config.probability;
            if (random <= cumulativeProbability) {
                const range = config.maxMultiplier - config.minMultiplier;
                return config.minMultiplier + Math.random() * range;
            }
        }

        // 如果没有匹配到（理论上不应该发生），返回最后一个配置的随机值
        const lastConfig = this.currentCrashConfig[this.currentCrashConfig.length - 1];
        const range = lastConfig.maxMultiplier - lastConfig.minMultiplier;
        return lastConfig.minMultiplier + Math.random() * range;
    }

    /** 获取当前倍率曲线配置 */
    static getCurrentCurveConfig(): MultiplierCurveConfig {
        return { ...this.currentCurveConfig };
    }

    /** 获取当前崩盘概率配置 */
    static getCurrentCrashConfig(): CrashProbabilityConfig[] {
        return [...this.currentCrashConfig];
    }

    /** 更新倍率曲线配置 */
    static updateCurveConfig(config: MultiplierCurveConfig): void {
        this.currentCurveConfig = config;
        console.log(`MultiplierConfig curve updated: ${config.name}`);
    }

    /** 更新崩盘概率配置 */
    static updateCrashConfig(config: CrashProbabilityConfig[]): void {
        this.currentCrashConfig = config;
        console.log("MultiplierConfig crash probabilities updated");
    }

    /** 根据时间获取 Rocket 状态 */
    static getRocketStateForTime(timeInSeconds: number): RocketSceneState {
        const config = this.currentCurveConfig;

        // 超出最大时间，返回最后一个时间点的状态
        if (timeInSeconds >= config.maxTime) {
            return config.timePoints[config.timePoints.length - 1].rocketState;
        }

        // 查找时间点区间
        for (let i = 0; i < config.timePoints.length - 1; i++) {
            const currentPoint = config.timePoints[i];
            const nextPoint = config.timePoints[i + 1];

            if (timeInSeconds >= currentPoint.time && timeInSeconds < nextPoint.time) {
                return currentPoint.rocketState;
            }
        }

        // 如果时间小于第一个时间点，返回第一个时间点的状态
        return config.timePoints[0].rocketState;
    }

    /** 检查 Rocket 状态是否发生变化 */
    static checkRocketStateChange(oldTime: number, newTime: number): {
        changed: boolean;
        newState: RocketSceneState;
        oldState: RocketSceneState;
    } {
        const oldState = this.getRocketStateForTime(oldTime);
        const newState = this.getRocketStateForTime(newTime);

        return {
            changed: oldState !== newState,
            newState,
            oldState
        };
    }

    /** 根据倍率计算对应的时间 */
    static calculateTimeForMultiplier(targetMultiplier: number): number {
        const config = this.currentCurveConfig;

        for (let i = 0; i < config.timePoints.length - 1; i++) {
            const currentPoint = config.timePoints[i];
            const nextPoint = config.timePoints[i + 1];

            if (targetMultiplier >= currentPoint.multiplier && targetMultiplier <= nextPoint.multiplier) {
                // 简单线性插值计算时间
                const multiplierDiff = nextPoint.multiplier - currentPoint.multiplier;
                const timeDiff = nextPoint.time - currentPoint.time;
                const multiplierProgress = (targetMultiplier - currentPoint.multiplier) / multiplierDiff;

                return currentPoint.time + timeDiff * multiplierProgress;
            }
        }

        // 如果倍率超出范围，返回最大时间
        return config.maxTime;
    }
}