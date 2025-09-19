import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ITaskConfig, ITaskData, ITaskEvent, ITaskManager, ITaskUICallback, TaskStatus } from "../data/TaskData";
import { TaskItem, TaskFactory } from "../task/TaskItem";
import { JsonAsset, TextAsset } from "cc";

@ecs.register('TaskComp')
export class TaskComp extends ecs.Comp implements ITaskManager {
    private _tasks: Map<number, TaskItem> = new Map();
    private _taskConfigs: ITaskConfig[] = [];
    private _uiCallbacks: ITaskUICallback[] = [];
    private _isInitialized: boolean = false;

    reset(): void {
        this._tasks.clear();
        this._taskConfigs = [];
        this._uiCallbacks = [];
        this._isInitialized = false;
    }

    init(): void {
        this.loadTaskConfig();
    }

    /**
     * 加载任务配置
     */
    private loadTaskConfig(): void {
        oops.res.load("config/game/tasks",JsonAsset, (err: any, data: JsonAsset) => {
            if (err) {
                console.error("Failed to load task config:", err);
                return;
            }
            
            try {
                this._taskConfigs = data.json?.tasks || [];
                this.initializeTasks();
                this.loadTaskData();
                this._isInitialized = true;
                console.log("Task system initialized with", this._taskConfigs.length, "tasks");
            } catch (error) {
                console.error("Failed to parse task config:", error);
            }
        });
    }

    /**
     * 初始化任务
     */
    private initializeTasks(): void {
        this._tasks.clear();
        
        // 按顺序排序任务配置
        this._taskConfigs.sort((a, b) => a.order - b.order);
        
        // 创建任务实例
        for (const config of this._taskConfigs) {
            try {
                const task = TaskFactory.createTask(config);
                this._tasks.set(config.id, task);
            } catch (error) {
                console.error(`Failed to create task ${config.id}:`, error);
            }
        }
    }

    /**
     * 获取所有任务
     */
    public getAllTasks(): ITaskData[] {
        const tasks: ITaskData[] = [];
        for (const task of this._tasks.values()) {
            tasks.push(task.data);
        }
        return tasks.sort((a, b) => a.config.order - b.config.order);
    }

    /**
     * 根据ID获取任务
     */
    public getTaskById(id: number): ITaskData | null {
        const task = this._tasks.get(id);
        return task ? task.data : null;
    }

    /**
     * 更新任务进度
     */
    public updateTaskProgress(event: ITaskEvent): void {
        if (!this._isInitialized) {
            return;
        }

        let hasUpdate = false;
        for (const task of this._tasks.values()) {
            if (task.data.status === TaskStatus.UNLOCKED && task.updateProgress(event)) {
                hasUpdate = true;
                this.notifyTaskProgressChanged(task.data);
                
                if (task.data.isCompleted) {
                    this.notifyTaskStatusChanged(task.data);
                }
            }
        }

        if (hasUpdate) {
            this.saveTaskData();
        }
    }

    /**
     * 领取任务奖励
     */
    public claimTaskReward(taskId: number): boolean {
        const task = this._tasks.get(taskId);
        if (task && task.claimReward()) {
            // 添加金币奖励
            // TODO: 这里需要调用金币系统添加奖励
            console.log(`Claimed reward: ${task.config.reward} coins for task ${taskId}`);
            
            this.notifyTaskRewardClaimed(task.data);
            this.saveTaskData();
            return true;
        }
        return false;
    }

    /**
     * 检查任务完成状态
     */
    public checkTaskCompletion(taskId: number): void {
        const task = this._tasks.get(taskId);
        if (task) {
            const wasCompleted = task.data.isCompleted;
            task.checkCompletion();
            
            if (!wasCompleted && task.data.isCompleted) {
                this.notifyTaskStatusChanged(task.data);
                this.saveTaskData();
            }
        }
    }

    /**
     * 保存任务数据
     */
    public saveTaskData(): void {
        const saveData: any = {};
        for (const [id, task] of this._tasks) {
            saveData[id] = task.getSaveData();
        }
        
        // 使用oops框架的本地存储
        oops.storage.set("task_data", JSON.stringify(saveData));
    }

    /**
     * 加载任务数据
     */
    public loadTaskData(): void {
        const saveDataStr = oops.storage.get("task_data");
        if (saveDataStr) {
            try {
                const saveData = JSON.parse(saveDataStr);
                for (const [id, task] of this._tasks) {
                    if (saveData[id]) {
                        task.loadFromSave(saveData[id]);
                    }
                }
            } catch (error) {
                console.error("Failed to load task data:", error);
            }
        }
    }

    /**
     * 注册UI回调
     */
    public registerUICallback(callback: ITaskUICallback): void {
        if (this._uiCallbacks.indexOf(callback) === -1) {
            this._uiCallbacks.push(callback);
        }
    }

    /**
     * 取消注册UI回调
     */
    public unregisterUICallback(callback: ITaskUICallback): void {
        const index = this._uiCallbacks.indexOf(callback);
        if (index !== -1) {
            this._uiCallbacks.splice(index, 1);
        }
    }

    /**
     * 通知任务状态变化
     */
    private notifyTaskStatusChanged(taskData: ITaskData): void {
        for (const callback of this._uiCallbacks) {
            callback.onTaskStatusChanged(taskData);
        }
    }

    /**
     * 通知任务进度变化
     */
    private notifyTaskProgressChanged(taskData: ITaskData): void {
        for (const callback of this._uiCallbacks) {
            callback.onTaskProgressChanged(taskData);
        }
    }

    /**
     * 通知任务奖励领取
     */
    private notifyTaskRewardClaimed(taskData: ITaskData): void {
        for (const callback of this._uiCallbacks) {
            callback.onTaskRewardClaimed(taskData);
        }
    }

    /**
     * 获取任务系统是否已初始化
     */
    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * 重置所有任务（用于测试）
     */
    public resetAllTasks(): void {
        for (const task of this._tasks.values()) {
            task.reset();
        }
        this.saveTaskData();
    }
}

