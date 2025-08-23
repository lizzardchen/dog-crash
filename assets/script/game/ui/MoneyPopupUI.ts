import { _decorator, Node, Button, Label, UIOpacity, tween, easing, Vec3 } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UIID } from "../common/config/GameUIConfig";
import { CrashGame } from '../entity/CrashGame';

const { ccclass, property } = _decorator;

@ccclass('MoneyPopupUI')
@ecs.register('MoneyPopupUI', false)
export class MoneyPopupUI extends CCComp {
    @property(Node)
    background: Node = null!; // 背景节点

    @property(Node)
    money_icon: Node = null!; // 金币图标

    @property(Label)
    balance_label: Label = null!; // 余额显示

    @property(Button)
    close_button: Button = null!; // 关闭按钮

    private currentBalance: number = 0;

    reset(): void {
        this.node.destroy();
    }

    start() {
        this.setupEvents();
        this.playShowAnimation();
    }

    /**
     * 打开金币弹窗
     */
    onOpen(params: any): void {
        if (params && params.balance !== undefined) {
            this.currentBalance = params.balance;
            this.updateBalanceDisplay();
        }
        console.log("MoneyPopupUI opened with balance:", this.currentBalance);
    }

    /**
     * 更新余额显示
     */
    private updateBalanceDisplay(): void {
        if (this.balance_label) {
            this.balance_label.string = CrashGame.formatPrizeNumber(this.currentBalance);
        }
    }

    /**
     * 设置事件监听
     */
    private setupEvents(): void {
        if (this.close_button) {
            this.close_button.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        // 点击背景外部区域关闭
        if (this.node) {
            this.node.on(Node.EventType.TOUCH_START, this.onBackgroundClick, this);
        }
    }

    /**
     * 关闭按钮点击
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closePopup();
    }

    /**
     * 背景点击（点击空白区域关闭）
     */
    private onBackgroundClick(event: any): void {
        // 如果点击的是背景本身而不是子节点，则关闭弹窗
        if (event.target === this.node) {
            this.closePopup();
        }
    }

    /**
     * 关闭弹窗
     */
    private closePopup(): void {
        this.playHideAnimation(() => {
            oops.gui.remove(UIID.MoneyPopup);
        });
    }

    /**
     * 播放显示动画
     */
    private playShowAnimation(): void {
        if (!this.background) return;

        // 初始状态：透明 + 缩小
        const backgroundOpacity = this.background.getComponent(UIOpacity);
        if (backgroundOpacity) {
            backgroundOpacity.opacity = 0;
        }
        this.background.setScale(0.8, 0.8, 1);

        // 弹出动画：淡入 + 弹性放大
        tween(this.background)
            .to(0.3, { scale: new Vec3(1.05, 1.05, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        if (backgroundOpacity) {
            tween(backgroundOpacity)
                .to(0.3, { opacity: 255 })
                .start();
        }
    }

    /**
     * 播放隐藏动画
     */
    private playHideAnimation(callback?: Function): void {
        if (!this.background) {
            if (callback) callback();
            return;
        }

        const backgroundOpacity = this.background.getComponent(UIOpacity);

        // 缩小 + 淡出动画
        tween(this.background)
            .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
            .call(() => {
                if (callback) callback();
            })
            .start();

        if (backgroundOpacity) {
            tween(backgroundOpacity)
                .to(0.2, { opacity: 0 })
                .start();
        }
    }

    /**
     * 清理事件监听
     */
    private removeEventListeners(): void {
        if (this.close_button && this.close_button.node) {
            this.close_button.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        if (this.node) {
            this.node.off(Node.EventType.TOUCH_START, this.onBackgroundClick, this);
        }
    }

    onDestroy() {
        this.removeEventListeners();
    }
}