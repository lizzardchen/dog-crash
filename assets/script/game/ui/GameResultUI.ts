import { _decorator, Node, Label, Button, Sprite, UIOpacity, sp } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { CrashGameAudio } from "../config/CrashGameAudio";


const { ccclass, property } = _decorator;

@ccclass('GameResultUI')
@ecs.register('GameResultUI', false)
export class GameResultUI extends CCComp {
    @property(UIOpacity)
    bg_opacity: UIOpacity = null!;

    @property(Node)
    content_node: Node = null!;

    @property(Label)
    result_title_label: Label = null!;

    @property(Label)
    coin_amount_label: Label = null!;

    @property(Label)
    dollar_amount_label: Label = null!;

    @property(Button)
    close_button: Button = null!;

    @property(Node)
    monkeys_win_node: Node = null!;

    @property(Node)
    monkeys_lose_node: Node = null!;

    @property(Label)
    countdown_label: Label = null!;

    @property(sp.Skeleton)
    win_spine: sp.Skeleton = null!;

    @property(sp.Skeleton)
    lose_spine: sp.Skeleton = null!;

    private _close_callback: Function | null = null;
    private _can_close: boolean = false;
    private _countdown_timer: number = 30; // 3秒倒计时

    reset(): void {
        this.node.destroy();
    }

    start() { }

    update(_deltaTime: number) {

         if (this._can_close) {
            this._can_close = false;
            if (this._close_callback) {
                console.log("game result close 1");
                this.removeEvent();
                console.log("game result close 2");
                this._close_callback();
                console.log("game result close 3");
            }
            return;
        }
        
        // 更新倒计时
        if (this._countdown_timer > 0) {
            this._countdown_timer -= _deltaTime;

            // 更新倒计时显示
            if (this.countdown_label) {
                const remainingTime = Math.ceil(this._countdown_timer);
                this.countdown_label.string = Math.max(0, remainingTime).toString();
            }

            // 倒计时结束，延迟一小段时间让用户看到"0"，然后关闭弹窗
            if (this._countdown_timer <= 0) {
                this._countdown_timer = 0; // 确保不会继续减少
                // 延迟0.3秒让用户看到"0"的显示
                this.scheduleOnce(() => {
                    this.closeResult();
                }, 0.3);
            }
        }

       
    }

    /**
     * 打开游戏结果弹窗
     * @param params 游戏结果参数
     * @param callback 关闭回调
     */
    onOpen(params: GameResultParams, callback: Function) {
        this._close_callback = callback;

        console.log("GameResultUI opened with params:", params);

        // 设置结果数据
        this.updateResultDisplay(params);

        // 播放相应音效
        if (params.isWin) {
            CrashGameAudio.playCashOutSuccess();
            if(this.monkeys_win_node){
                this.monkeys_win_node.active = true; // 显示猴子动画
            }
            if(this.monkeys_lose_node){
                this.monkeys_lose_node.active = false; // 显示猴子动画
            }
            
            // 播放win_spine动画
            if (this.win_spine) {
                // 先播放chuxian动画
                this.win_spine.setAnimation(0, "chuxian", false);
                
                // 0.1秒后播放daiji动画并循环
                this.scheduleOnce(() => {
                    if (this.win_spine) {
                        this.win_spine.setAnimation(0, "xuanzhuan", true);
                    }
                }, 0.1);
            }
        } else {
            CrashGameAudio.playCrashExplosion();
            if(this.monkeys_win_node){
                this.monkeys_win_node.active = false; // 显示猴子动画
            }
            if(this.monkeys_lose_node){
                this.monkeys_lose_node.active = true; // 显示猴子动画
            }
            // 播放lose_spine动画
            if (this.lose_spine) {
                // 先播放chuxian动画
                this.lose_spine.setAnimation(0, "chuxian", false);
                
                // 0.1秒后播放daiji动画并循环
                this.scheduleOnce(() => {
                    if (this.lose_spine) {
                        this.lose_spine.setAnimation(0, "daiji", true);
                    }
                }, 0.1);
            }
        }

        // 绑定关闭按钮事件
        if (this.close_button) {
            this.close_button.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        // 开始倒计时
        this.startCountdown();
    }

    /**
     * 更新结果显示
     */
    private updateResultDisplay(params: GameResultParams): void {
        // 设置结果标题
        if (this.result_title_label) {
            const titleKey = params.isWin ? "cash_out_success" : "game_crashed";
            this.result_title_label.string = CrashGameLanguage.getText(titleKey);
        }

        // 设置关闭按钮文本
        if (this.close_button) {
            const buttonLabel = this.close_button.node.getComponentInChildren(Label);
            if (buttonLabel) {
                const buttonTextKey = params.isWin ? "continue" : "try_again";
                buttonLabel.string = CrashGameLanguage.getText(buttonTextKey);
            }
        }

        // 计算coin和dollar奖励数量
        const rewardAmount = params.profit; // 取绝对值作为奖励数量

        // 设置coin数量 - 显示实际的奖励数值
        if (this.coin_amount_label) {
            this.coin_amount_label.string = rewardAmount.toFixed(0);
        }

        // 设置dollar数量 - 可以是相同值或者按比例换算
        if (this.dollar_amount_label) {
            this.dollar_amount_label.string = (rewardAmount/10).toFixed(0);
        }
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeResult();
        console.log("game result onCloseButtonClick");
    }

    /**
     * 开始倒计时
     */
    private startCountdown(): void {
        this._countdown_timer = 3; // 重置为3秒

        // 初始化倒计时显示
        if (this.countdown_label) {
            this.countdown_label.string = "3";
        }
    }

    /**
     * 关闭游戏结果弹窗
     */
    closeResult(): void {
        this._can_close = true;
    }

    removeEvent() {
        // 清理按钮事件监听
        if (this.close_button && this.close_button.node) {
            this.close_button.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
    }
}

/**
 * 游戏结果参数接口
 */
export interface GameResultParams {
    /** 是否获胜 */
    isWin: boolean;
    /** 收益（正数为盈利，负数为亏损） */
    profit: number;
}