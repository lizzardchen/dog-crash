import { oops } from "db://oops-framework/core/Oops";
import { smc } from "../common/SingletonModuleComp";
import { UserDataComp } from "../comp/UserDataComp";
import { ITaskConfig, ITaskData, ITaskEvent, TaskStatus, TaskType } from "../data/TaskData";

/**
 * 任务基类
 */
export abstract class TaskItem {
    protected _config: ITaskConfig;
    protected _data: ITaskData;

    constructor(config: ITaskConfig) {
        this._config = config;
        this._data = {
            id: config.id,
            config: config,
            status: TaskStatus.UNLOCKED,
            progress: 0,
            canClaim: false
        };
    }

    /**
     * 获取任务数据
     */
    public get data(): ITaskData {
        return this._data;
    }

    /**
     * 获取任务配置
     */
    public get config(): ITaskConfig {
        return this._config;
    }

    /**
     * 更新任务进度
     */
    public abstract updateProgress(event: ITaskEvent): boolean;

    /**
     * 检查任务是否完成
     */
    public checkCompletion(): void {
        if (this._data.progress >= this._config.target && this._data.status !== TaskStatus.COMPLETED && this._data.status !== TaskStatus.CLAIMED) {
            this._data.canClaim = true;
            this._data.status = TaskStatus.COMPLETED;
        }
    }

    /**
     * 领取奖励
     */
    public claimReward(): boolean {
        if (this._data.canClaim) {
            this._data.canClaim = false;
            this._data.status = TaskStatus.CLAIMED;
            oops.message.dispatchEvent("coin")
            return true;
        }
        return false;
    }

    /**
     * 重置任务
     */
    public reset(): void {
        this._data.progress = 0;
        this._data.canClaim = false;
        this._data.status = TaskStatus.UNLOCKED;
    }

    /**
     * 设置任务状态
     */
    public setStatus(status: TaskStatus): void {
        this._data.status = status;
    }

    /**
     * 从保存数据恢复任务状态
     */
    public loadFromSave(saveData: any): void {
        if (saveData) {
            this._data.progress = saveData.progress || 0;
            this._data.status = saveData.status || TaskStatus.UNLOCKED;
            this._data.canClaim = saveData.canClaim || false;
        }
    }

    /**
     * 获取保存数据
     */
    public getSaveData(): any {
        return {
            id: this._data.id,
            progress: this._data.progress,
            status: this._data.status,
            canClaim: this._data.canClaim
        };
    }
}

/**
 * 通关任务
 */
export class PassLevelTask extends TaskItem {
    public updateProgress(event: ITaskEvent): boolean {
        if (event.type === TaskType.PASS_LEVEL) {
            this._data.progress += event.value;
            this.checkCompletion();
            return true;
        }
        return false;
    }
}

/**
 * 收集金币任务
 */
export class CollectCoinsTask extends TaskItem {
    public updateProgress(event: ITaskEvent): boolean {
        if (event.type === TaskType.COLLECT_COINS) {
            this._data.progress += event.value;
            this.checkCompletion();
            return true;
        }
        return false;
    }
}

/**
 * 单机飞行任务
 */
export class SingleFlightTask extends TaskItem {
    public updateProgress(event: ITaskEvent): boolean {
        if (event.type === TaskType.SINGLE_FLIGHT) {
            this._data.progress += event.value;
            this.checkCompletion();
            return true;
        }
        return false;
    }
}

/**
 * 联网飞行任务
 */
export class OnlineFlightTask extends TaskItem {
    public updateProgress(event: ITaskEvent): boolean {
        if (event.type === TaskType.ONLINE_FLIGHT) {
            this._data.progress += event.value;
            this.checkCompletion();
            return true;
        }
        return false;
    }
}

/**
 * 达到倍率任务
 */
export class CrashMultiplierTask extends TaskItem {
    public updateProgress(event: ITaskEvent): boolean {
        if (event.type === TaskType.CRASH_MULTIPLIER) {
            this._data.progress += event.value;
            this.checkCompletion();
            return true;
        }
        return false;
    }
}

/**
 * 任务工厂类
 */
export class TaskFactory {
    public static createTask(config: ITaskConfig): TaskItem {
        switch (config.type) {
            case TaskType.PASS_LEVEL:
                return new PassLevelTask(config);
            case TaskType.COLLECT_COINS:
                return new CollectCoinsTask(config);
            case TaskType.SINGLE_FLIGHT:
                return new SingleFlightTask(config);
            case TaskType.ONLINE_FLIGHT:
                return new OnlineFlightTask(config);
            case TaskType.CRASH_MULTIPLIER:
                return new CrashMultiplierTask(config);
            default:
                throw new Error(`Unknown task type: ${config.type}`);
        }
    }
}