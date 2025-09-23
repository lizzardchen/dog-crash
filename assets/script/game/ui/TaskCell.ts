import { _decorator, Component, Node, Label, Button, Sprite, ProgressBar } from 'cc';
import { ITaskData, TaskStatus } from '../data/TaskData';
const { ccclass, property } = _decorator;

@ccclass('TaskCell')
export class TaskCell extends Component {
    @property(Label)
    public nameLabel: Label = null!;
    
    @property(Label)
    public descriptionLabel: Label = null!;
    
    @property(Label)
    public progressLabel: Label = null!;
    
    @property(Label)
    public rewardLabel: Label = null!;
    
    @property(ProgressBar)
    public progressBar: ProgressBar = null!;
    
    @property(Button)
    public claimButton: Button = null!;
    
    @property(Node)
    public completedIcon: Node = null!;
    
    @property(Node)
    public lockedIcon: Node = null!;
    
    @property(Sprite)
    public backgroundSprite: Sprite = null!;

    private _taskData: ITaskData | null = null;
    private _claimCallback: ((taskId: number) => void) | null = null;

    start() {
        // 绑定按钮事件
        if (this.claimButton) {
            this.claimButton.node.on(Button.EventType.CLICK, this.onClaimButtonClick, this);
        }
    }

    onDestroy() {
        // 清理事件监听
        if (this.claimButton) {
            this.claimButton.node.off(Button.EventType.CLICK, this.onClaimButtonClick, this);
        }
    }

    /**
     * 设置任务数据
     */
    public setTaskData(taskData: ITaskData): void {
        this._taskData = taskData;
        this.updateDisplay();
    }

    /**
     * 设置领取奖励回调
     */
    public setClaimCallback(callback: (taskId: number) => void): void {
        this._claimCallback = callback;
    }

    /**
     * 更新显示
     */
    private updateDisplay(): void {
        if (!this._taskData) {
            return;
        }

        const taskData = this._taskData;
        const config = taskData.config;

        // 更新任务名称
        if (this.nameLabel) {
            this.nameLabel.string = config.name;
        }

        // 更新任务描述
        if (this.descriptionLabel) {
            this.descriptionLabel.string = config.description;
        }

        // 更新进度显示
        this.updateProgress();

        // 更新奖励显示
        if (this.rewardLabel) {
            this.rewardLabel.string = `${config.reward}`;
        }

        // 更新状态显示
        this.updateStatus();
    }

    /**
     * 更新进度显示
     */
    private updateProgress(): void {
        if (!this._taskData) {
            return;
        }

        const taskData = this._taskData;
        const config = taskData.config;
        const progress = Math.min(taskData.progress, config.target);
        const progressRatio = config.target > 0 ? progress / config.target : 0;

        // 更新进度条
        if (this.progressBar) {
            this.progressBar.progress = progressRatio;
        }

        // 更新进度文本
        if (this.progressLabel) {
            this.progressLabel.string = `${progress}/${config.target}`;
        }
    }

    /**
     * 更新状态显示
     */
    private updateStatus(): void {
        if (!this._taskData) {
            return;
        }

        const taskData = this._taskData;

        // 显示/隐藏相关UI元素
        // if (this.claimButton) {
        //     this.claimButton.node.active = taskData.canClaim;
        //     this.claimButton.interactable = taskData.canClaim;
        // }

        if (this.completedIcon) {
            this.completedIcon.active = taskData.isCompleted && !taskData.canClaim;
        }

        if (this.lockedIcon) {
            this.lockedIcon.active = taskData.status === TaskStatus.LOCKED;
        }
    }

    /**
     * 领取按钮点击事件
     */
    private onClaimButtonClick(): void {
        if (this._taskData && this._taskData.canClaim && this._claimCallback) {
            this._claimCallback(this._taskData.id);
        }
    }

    /**
     * 刷新任务显示（外部调用）
     */
    public refresh(): void {
        this.updateDisplay();
    }

    /**
     * 播放完成动画
     */
    public playCompleteAnimation(): void {
        // TODO: 添加任务完成动画效果
        console.log(`Task ${this._taskData?.id} completed animation`);
    }

    /**
     * 播放奖励领取动画
     */
    public playClaimAnimation(): void {
        // TODO: 添加奖励领取动画效果
        console.log(`Task ${this._taskData?.id} claim animation`);
    }

    /**
     * 获取当前任务数据
     */
    public get taskData(): ITaskData | null {
        return this._taskData;
    }
}

