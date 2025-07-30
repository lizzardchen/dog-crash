import { _decorator, Node, Label, Button, UIOpacity, EditBox } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

const { ccclass, property } = _decorator;

@ccclass('AutoCashOutUI')
@ecs.register('AutoCashOutUI', false)
export class AutoCashOutUI extends CCComp {
    @property(UIOpacity)
    bg_opacity: UIOpacity = null!;

    @property(Node)
    content_node: Node = null!;

    @property(Label)
    title_label: Label = null!;

    @property(EditBox)
    multiplier_input: EditBox = null!;

    @property(EditBox)
    total_bets_input: EditBox = null!;

    @property(Button)
    start_button: Button = null!;

    @property(Button)
    close_button: Button = null!;

    // 预设倍数选项按钮
    @property(Button)
    multiplier_1_25_button: Button = null!;

    @property(Button)
    multiplier_1_5_button: Button = null!;

    @property(Button)
    multiplier_2_button: Button = null!;

    @property(Button)
    multiplier_5_button: Button = null!;

    // 预设总下注选项按钮
    @property(Button)
    total_25_button: Button = null!;

    @property(Button)
    total_50_button: Button = null!;

    @property(Button)
    total_100_button: Button = null!;

    @property(Button)
    total_200_button: Button = null!;

    @property(Button)
    total_infinity_button: Button = null!;

    private _close_callback: Function | null = null;
    private _start_callback: Function | null = null;

    reset(): void {
        this.node.destroy();
    }

    start() {
        this.setupEvents();
        this.initializeValues();
    }

    /**
     * 打开自动提现设置弹窗
     * @param params 自动提现参数
     * @param onStart 开始自动提现回调
     * @param onClose 关闭回调
     */
    onOpen(params: AutoCashOutParams, onStart: (multiplier: number, totalBets: number) => void, onClose: Function): void {
        this._start_callback = onStart;
        this._close_callback = onClose;

        console.log("AutoCashOutUI opened with params:", params);

        // 设置初始值
        if (this.multiplier_input) {
            this.multiplier_input.string = params.multiplier.toString();
        }

        if (this.total_bets_input) {
            this.total_bets_input.string = params.totalBets === -1 ? "∞" : params.totalBets.toString();
        }

        // 设置标题
        if (this.title_label) {
            this.title_label.string = "AUTO CASHOUT";
        }
    }

    /**
     * 设置事件监听
     */
    private setupEvents(): void {
        // 关闭按钮
        if (this.close_button) {
            this.close_button.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        // 开始按钮
        if (this.start_button) {
            this.start_button.node.on(Button.EventType.CLICK, this.onStartButtonClick, this);
        }

        // 预设倍数按钮
        if (this.multiplier_1_25_button) {
            this.multiplier_1_25_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(1.25), this);
        }
        if (this.multiplier_1_5_button) {
            this.multiplier_1_5_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(1.5), this);
        }
        if (this.multiplier_2_button) {
            this.multiplier_2_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(2.0), this);
        }
        if (this.multiplier_5_button) {
            this.multiplier_5_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(5.0), this);
        }

        // 预设总下注按钮
        if (this.total_25_button) {
            this.total_25_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(25), this);
        }
        if (this.total_50_button) {
            this.total_50_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(50), this);
        }
        if (this.total_100_button) {
            this.total_100_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(100), this);
        }
        if (this.total_200_button) {
            this.total_200_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(200), this);
        }
        if (this.total_infinity_button) {
            this.total_infinity_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(-1), this);
        }
    }

    /**
     * 初始化默认值
     */
    private initializeValues(): void {
        if (this.multiplier_input) {
            this.multiplier_input.string = "2.00";
        }

        if (this.total_bets_input) {
            this.total_bets_input.string = "∞";
        }
    }

    /**
     * 设置倍数
     */
    private setMultiplier(multiplier: number): void {
        CrashGameAudio.playButtonClick();

        if (this.multiplier_input) {
            this.multiplier_input.string = multiplier.toFixed(2);
        }

        console.log(`Set multiplier to: ${multiplier}`);
    }

    /**
     * 设置总下注次数
     */
    private setTotalBets(totalBets: number): void {
        CrashGameAudio.playButtonClick();

        if (this.total_bets_input) {
            this.total_bets_input.string = totalBets === -1 ? "∞" : totalBets.toString();
        }

        console.log(`Set total bets to: ${totalBets === -1 ? "infinity" : totalBets}`);
    }

    /**
     * 开始按钮点击事件
     */
    private onStartButtonClick(): void {
        CrashGameAudio.playButtonClick();

        // 获取输入值
        const multiplierStr = this.multiplier_input ? this.multiplier_input.string : "2.00";
        const totalBetsStr = this.total_bets_input ? this.total_bets_input.string : "∞";

        const multiplier = parseFloat(multiplierStr) || 2.0;
        const totalBets = totalBetsStr === "∞" ? -1 : (parseInt(totalBetsStr) || -1);

        // 验证输入
        if (multiplier < 1.01) {
            console.warn("Multiplier must be at least 1.01");
            // TODO: 显示错误提示
            return;
        }

        console.log(`Starting auto cashout: multiplier=${multiplier}, totalBets=${totalBets}`);

        // 调用开始回调
        if (this._start_callback) {
            this._start_callback(multiplier, totalBets);
        }

        // 关闭弹窗
        this.closeAutoCashOut();
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeAutoCashOut();
    }

    /**
     * 关闭自动提现弹窗
     */
    private closeAutoCashOut(): void {
        if (this._close_callback) {
            this._close_callback();
        }
    }

    onDestroy() {
        // 清理事件监听
        if (this.close_button) {
            this.close_button.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }

        if (this.start_button) {
            this.start_button.node.off(Button.EventType.CLICK, this.onStartButtonClick, this);
        }

        // 清理预设按钮事件
        const buttons = [
            this.multiplier_1_25_button, this.multiplier_1_5_button,
            this.multiplier_2_button, this.multiplier_5_button,
            this.total_25_button, this.total_50_button,
            this.total_100_button, this.total_200_button, this.total_infinity_button
        ];

        buttons.forEach(button => {
            if (button) {
                button.node.off(Button.EventType.CLICK);
            }
        });
    }
}

/**
 * 自动提现参数接口
 */
export interface AutoCashOutParams {
    /** 自动提现倍数 */
    multiplier: number;
    /** 总下注次数 (-1表示无限) */
    totalBets: number;
}