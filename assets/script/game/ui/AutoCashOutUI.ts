import { _decorator, Node, Label, Button, UIOpacity, EditBox, Color, Sprite } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGameLanguage } from "../config/CrashGameLanguage";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { EnergyComp } from '../comp/EnergyComp';
import { smc } from '../common/SingletonModuleComp';
import { tips } from '../common/tips/TipsManager';

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

    @property(Label)
    multiplier_input: Label = null!;

    @property(Label)
    total_bets_input: Label = null!;

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

    private _params:any = null;
    
    // 当前选中的总下注按钮
    private selectedTotalBetsButton: Button | null = null;

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

        this._params = params;

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
        
        // 根据默认总下注数高亮对应按钮
        this.highlightDefaultTotalBetsButton(params.totalBets);
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
            this.multiplier_1_25_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(this._params.multiplier*0.5), this);
        }
        if (this.multiplier_1_5_button) {
            this.multiplier_1_5_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(this._params.multiplier-0.01), this);
        }
        if (this.multiplier_2_button) {
            this.multiplier_2_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(this._params.multiplier+0.01), this);
        }
        if (this.multiplier_5_button) {
            this.multiplier_5_button.node.on(Button.EventType.CLICK, () => this.setMultiplier(this._params.multiplier*2), this);
        }

        // 预设总下注按钮
        if (this.total_25_button) {
            this.total_25_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(25, this.total_25_button), this);
        }
        if (this.total_50_button) {
            this.total_50_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(50, this.total_50_button), this);
        }
        if (this.total_100_button) {
            this.total_100_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(100, this.total_100_button), this);
        }
        if (this.total_200_button) {
            this.total_200_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(200, this.total_200_button), this);
        }
        if (this.total_infinity_button) {
            this.total_infinity_button.node.on(Button.EventType.CLICK, () => this.setTotalBets(-1, this.total_infinity_button), this);
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
        if( multiplier < 1.01 ){
            this._params.multiplier = 1.00; 
            if (this.multiplier_input) {
                this.multiplier_input.string = "DISABLE";
            }
            this.start_button.interactable = false;
            const sprite = this.start_button.getComponent(Sprite);
            if(sprite){
                sprite.grayscale = true;
            }
            return;
        }
        this._params.multiplier = multiplier;
        if( multiplier >= 1000 ){
            this._params.multiplier = 1000;
        }
        if (this.multiplier_input) {
            this.multiplier_input.string = this._params.multiplier.toFixed(2);
        }
        this.start_button.interactable = true;
        const sprite = this.start_button.getComponent(Sprite);
        if(sprite){
            sprite.grayscale = false;
        }

        console.log(`Set multiplier to: ${multiplier}`);
    }

    /**
     * 设置总下注次数
     */
    private setTotalBets(totalBets: number, selectedButton: Button): void {
        CrashGameAudio.playButtonClick();

        if (this.total_bets_input) {
            this.total_bets_input.string = totalBets === -1 ? "∞" : totalBets.toString();
        }

        // 更新按钮高亮状态
        this.updateTotalBetsButtonHighlight(selectedButton);

        console.log(`Set total bets to: ${totalBets === -1 ? "infinity" : totalBets}`);
    }

    /**
     * 开始按钮点击事件
     */
    private onStartButtonClick(): void {
        CrashGameAudio.playButtonClick();

        // 获取输入值
        const totalBetsStr = this.total_bets_input ? this.total_bets_input.string : "∞";

        const multiplier = (this._params.multiplier) as number;
        const totalBets = totalBetsStr === "∞" ? -1 : (parseInt(totalBetsStr) || -1);

        // 验证输入
        if (multiplier < 1.01) {
            console.warn("Multiplier must be at least 1.01");
            // TODO: 显示错误提示
            return;
        }

        const energycomp = smc.crashGame.get(EnergyComp);
        if(energycomp.currentEnergy <= 0){
            oops.gui.toast("Not enough energy!")
            return;
        }

        console.log(`AutoCashOutUI: Starting auto cashout with multiplier=${multiplier}, totalBets=${totalBets}`);

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
        this.removeEventListeners();
        if (this._close_callback) {
            this._close_callback();
        }
    }

    private removeEventListeners(): void {
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
    
    /**
     * 根据默认总下注数高亮对应按钮
     */
    private highlightDefaultTotalBetsButton(totalBets: number): void {
        let defaultButton: Button | null = null;
        
        switch (totalBets) {
            case 25:
                defaultButton = this.total_25_button;
                break;
            case 50:
                defaultButton = this.total_50_button;
                break;
            case 100:
                defaultButton = this.total_100_button;
                break;
            case 200:
                defaultButton = this.total_200_button;
                break;
            case -1:
                defaultButton = this.total_infinity_button;
                break;
        }
        
        if (defaultButton) {
            this.updateTotalBetsButtonHighlight(defaultButton);
        }
    }
    
    /**
     * 更新总下注按钮高亮状态
     */
    private updateTotalBetsButtonHighlight(selectedButton: Button): void {
        // 清除之前选中按钮的高亮
        if (this.selectedTotalBetsButton) {
            this.setButtonHighlight(this.selectedTotalBetsButton, false);
        }
        
        // 设置新选中按钮的高亮
        this.setButtonHighlight(selectedButton, true);
        this.selectedTotalBetsButton = selectedButton;
    }
    
    /**
     * 设置按钮高亮状态
     */
    private setButtonHighlight(button: Button, highlighted: boolean): void {
        if (!button || !button.node) return;
        
        const label = button.node.getComponentInChildren(Label);
        if (label) {
            // 高亮时使用黄色，普通状态使用白色
            label.color = highlighted ? new Color(214, 19, 22, 255) : new Color(250, 250, 157, 255);
        }
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