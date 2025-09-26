import { _decorator, Component, Node, ScrollView, Prefab, instantiate, Button } from 'cc';
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { CCComp } from '../../../../extensions/oops-plugin-framework/assets/module/common/CCComp';
import { oops } from '../../../../extensions/oops-plugin-framework/assets/core/Oops';
import { ITaskData, ITaskUICallback, TaskType, TaskStatus } from '../data/TaskData';
import { TaskComp } from '../comp/TaskComp';
import { TaskCell } from './TaskCell';
import { smc } from '../common/SingletonModuleComp';
import { UIID } from '../common/config/GameUIConfig';
const { ccclass, property } = _decorator;

@ccclass('TaskUI')
@ecs.register('TaskUI', false)
export class TaskUI extends CCComp implements ITaskUICallback {
    @property(ScrollView)
    public scrollView: ScrollView = null!;
    
    @property(Node)
    public content: Node = null!;
    
    @property(Prefab)
    public taskCellPrefab: Prefab = null!;
    
    @property(Button)
    public closeButton: Button = null!;
    
    @property(Button)
    public refreshButton: Button = null!;

    private _taskComp: TaskComp | null = null;
    private _taskCells: Map<number, TaskCell> = new Map();

    reset(): void {
        // 重置组件状态
        this._taskComp = null;
        this._taskCells.clear();
        
        // 清理UI
        if (this.scrollView && this.scrollView.content) {
            this.scrollView.content.removeAllChildren();
        }
    }
    private _isInitialized: boolean = false;

    start() {
        this.initializeUI();
        this.bindEvents();
        this.loadTaskSystem();
    }

    destroyProcess() {
        this.unbindEvents();
        if (this._taskComp) {
            this._taskComp.unregisterUICallback(this);
        }
    }

    /**
      * 初始化UI
      */
    private initializeUI(): void {
        // 确保content节点存在
        if (!this.content && this.scrollView && this.scrollView.content) {
            this.content = this.scrollView.content;
        }
    }

    /**
     * 绑定事件
     */
    private bindEvents(): void {
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        if (this.refreshButton) {
            this.refreshButton.node.on(Button.EventType.CLICK, this.onRefreshButtonClick, this);
        }
    }

    /**
     * 解绑事件
     */
    private unbindEvents(): void {
        if (this.closeButton && this.closeButton.node) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        if (this.refreshButton) {
            this.refreshButton.node.off(Button.EventType.CLICK, this.onRefreshButtonClick, this);
        }
    }

    /**
      * 加载任务系统
      */
    private loadTaskSystem(): void {
        // 获取任务组件 - 这里需要根据实际的ECS系统API调整
        // 暂时使用简单的方式获取TaskComp实例
        // TODO: 根据实际的ECS实体管理方式调整获取方法
        this._taskComp = smc.crashGame.get(TaskComp);
        // 创建或获取任务组件实例
        if (!this._taskComp) {
            // 这里应该根据实际的ECS系统来获取TaskComp实例
            console.warn("TaskComp instance should be injected or created properly");
            return;
        }

        // 注册UI回调
        this._taskComp.registerUICallback(this);
        
        // 如果任务系统已初始化，直接刷新显示
        if (this._taskComp.isInitialized) {
            this.refreshTaskList();
        } else {
            // 等待任务系统初始化完成
            setTimeout(() => {
                this.refreshTaskList();
            }, 100);
        }
    }

    /**
     * 刷新任务列表
     */
    public refreshTaskList(): void {
        if (!this._taskComp || !this._taskComp.isInitialized) {
            return;
        }

        // 清空现有任务单元格
        this.clearTaskCells();

        // 获取所有任务数据
        const tasks = this._taskComp.getAllTasks();
        
        // 创建任务单元格
        for (const taskData of tasks) {
            this.createTaskCell(taskData);
        }

        this._isInitialized = true;
    }

    /**
     * 清空任务单元格
     */
    private clearTaskCells(): void {
        for (const cell of this._taskCells.values()) {
            if (cell && cell.node) {
                cell.node.destroy();
            }
        }
        this._taskCells.clear();
    }

    /**
     * 创建任务单元格
     */
    private createTaskCell(taskData: ITaskData): void {
        if (!this.taskCellPrefab || !this.content) {
            console.error("TaskCellPrefab or content is null!");
            return;
        }

        // 实例化任务单元格
        const cellNode = instantiate(this.taskCellPrefab);
        const taskCell = cellNode.getComponent(TaskCell);
        
        if (!taskCell) {
            console.error("TaskCell component not found on prefab!");
            cellNode.destroy();
            return;
        }

        // 设置任务数据和回调
        taskCell.setTaskData(taskData);
        taskCell.setClaimCallback(this.onTaskClaimReward.bind(this));

        // 添加到内容节点
        cellNode.setParent(this.content);
        
        // 保存引用
        this._taskCells.set(taskData.id, taskCell);
    }

    /**
     * 任务奖励领取回调
     */
    private onTaskClaimReward(taskId: number): void {
        if (this._taskComp) {
            const success = this._taskComp.claimTaskReward(taskId);
            if (success) {
                const taskCell = this._taskCells.get(taskId);
                if (taskCell) {
                    taskCell.playClaimAnimation();
                }
            }
        }
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        this.destroyProcess();
        oops.gui.remove(UIID.TaskUI);
    }

    /**
     * 刷新按钮点击事件
     */
    private onRefreshButtonClick(): void {
        this.refreshTaskList();
    }

    /**
     * 显示任务界面
     */
    public show(): void {
        if (this._isInitialized) {
            this.refreshTaskList();
        }
    }

    /**
     * 更新任务进度（外部调用）
     */
    public updateTaskProgress(type: TaskType, value: number, data?: any): void {
        if (this._taskComp) {
            this._taskComp.updateTaskProgress({ type, value, data });
        }
    }

    // ITaskUICallback 接口实现
    
    /**
     * 任务状态变化回调
     */
    public onTaskStatusChanged(taskData: ITaskData): void {
        const taskCell = this._taskCells.get(taskData.id);
        if (taskCell) {
            taskCell.setTaskData(taskData);
            if (taskData.status === TaskStatus.COMPLETED) {
                taskCell.playCompleteAnimation();
            }
        }
    }

    /**
     * 任务进度变化回调
     */
    public onTaskProgressChanged(taskData: ITaskData): void {
        const taskCell = this._taskCells.get(taskData.id);
        if (taskCell) {
            taskCell.setTaskData(taskData);
        }
    }

    /**
     * 任务奖励领取回调
     */
    public onTaskRewardClaimed(taskData: ITaskData): void {
        // 任务奖励被领取后，刷新整个任务列表
        // 这样可以移除已领取的任务并显示新解锁的任务
        this.refreshTaskList();
    }

    /**
     * 获取任务系统是否已初始化
     */
    public get isInitialized(): boolean {
        return this._isInitialized;
    }
}

