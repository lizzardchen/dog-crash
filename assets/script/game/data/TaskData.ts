/**
 * 任务类型枚举
 */
export enum TaskType {
    PASS_LEVEL = "pass_level",           // 通关任务
    COLLECT_COINS = "collect_coins",     // 收集金币任务
    SINGLE_FLIGHT = "single_flight",     // 单机飞行任务
    ONLINE_FLIGHT = "online_flight",     // 联网飞行任务
    CRASH_COUNT = "crash_count"          // 撞击次数任务
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
    LOCKED = 0,      // 未解锁
    UNLOCKED = 1,    // 已解锁但未完成
    COMPLETED = 2    // 已完成
}

/**
 * 任务配置数据接口
 */
export interface ITaskConfig {
    id: number;                    // 任务ID
    type: TaskType;               // 任务类型
    name: string;                 // 任务名称
    description: string;          // 任务描述
    target: number;               // 目标数量
    reward: number;               // 奖励金币数量
    unlockCondition?: string;     // 解锁条件描述
    order: number;                // 显示顺序
}

/**
 * 任务运行时数据接口
 */
export interface ITaskData {
    id: number;                   // 任务ID
    config: ITaskConfig;          // 任务配置
    status: TaskStatus;           // 任务状态
    progress: number;             // 当前进度
    isCompleted: boolean;         // 是否已完成
    canClaim: boolean;            // 是否可以领取奖励
}

/**
 * 任务事件接口
 */
export interface ITaskEvent {
    type: TaskType;               // 事件类型
    value: number;                // 事件数值
    data?: any;                   // 额外数据
}

/**
 * 任务管理器接口
 */
export interface ITaskManager {
    // 初始化任务系统
    init(): void;
    
    // 获取所有任务
    getAllTasks(): ITaskData[];
    
    // 根据ID获取任务
    getTaskById(id: number): ITaskData | null;
    
    // 更新任务进度
    updateTaskProgress(event: ITaskEvent): void;
    
    // 领取任务奖励
    claimTaskReward(taskId: number): boolean;
    
    // 检查任务完成状态
    checkTaskCompletion(taskId: number): void;
    
    // 保存任务数据
    saveTaskData(): void;
    
    // 加载任务数据
    loadTaskData(): void;
}

/**
 * 任务UI回调接口
 */
export interface ITaskUICallback {
    // 任务状态更新回调
    onTaskStatusChanged(taskData: ITaskData): void;
    
    // 任务进度更新回调
    onTaskProgressChanged(taskData: ITaskData): void;
    
    // 任务奖励领取回调
    onTaskRewardClaimed(taskData: ITaskData): void;
}