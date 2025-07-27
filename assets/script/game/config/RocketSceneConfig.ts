import { RocketSceneState } from "../comp/RocketViewComp";

/** 火箭场景时间段配置 */
export interface RocketSceneTimeConfig {
    startTime: number;           // 开始时间（秒）
    endTime: number;            // 结束时间（秒），-1表示无限
    sceneState: RocketSceneState; // 对应的场景状态
}

/** 火箭场景配置管理 */
export class RocketSceneConfig {
    /** 默认的场景时间段配置 */
    private static readonly DEFAULT_TIME_CONFIGS: RocketSceneTimeConfig[] = [
        {
            startTime: 0,
            endTime: 10,
            sceneState: RocketSceneState.GROUND
        },
        {
            startTime: 10,
            endTime: 20,
            sceneState: RocketSceneState.SKY
        },
        {
            startTime: 20,
            endTime: 35,
            sceneState: RocketSceneState.ATMOSPHERE
        },
        {
            startTime: 35,
            endTime: -1, // 无限
            sceneState: RocketSceneState.SPACE
        }
    ];

    /** 根据飞行时间获取对应的场景状态 */
    static getSceneStateForTime(timeInSeconds: number): RocketSceneState {
        for (const config of this.DEFAULT_TIME_CONFIGS) {
            if (timeInSeconds >= config.startTime &&
                (config.endTime === -1 || timeInSeconds < config.endTime)) {
                return config.sceneState;
            }
        }

        // 默认返回地面场景
        return RocketSceneState.GROUND;
    }

    /** 获取所有时间段配置 */
    static getTimeConfigs(): RocketSceneTimeConfig[] {
        return [...this.DEFAULT_TIME_CONFIGS];
    }

    /** 检查场景状态是否发生变化 */
    static checkSceneStateChange(oldTime: number, newTime: number): {
        changed: boolean;
        newState: RocketSceneState;
        oldState: RocketSceneState;
    } {
        const oldState = this.getSceneStateForTime(oldTime);
        const newState = this.getSceneStateForTime(newTime);

        return {
            changed: oldState !== newState,
            newState,
            oldState
        };
    }
}