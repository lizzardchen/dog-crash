import { _decorator, Node, Label, Button, RichText, EditBox } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";

const { ccclass, property } = _decorator;

@ccclass('ContactUsUI')
@ecs.register('ContactUsUI', false)
export class ContactUsUI extends CCComp {
    // 标题标签
    @property(Label)
    titleLabel: Label = null!;
    
    // 联系信息富文本
    @property(RichText)
    contactInfoRichText: RichText = null!;
    
    // 反馈表单
    @property(Node)
    feedbackPanel: Node = null!;
    
    @property(Label)
    feedbackTitleLabel: Label = null!;
    
    @property(EditBox)
    emailEditBox: EditBox = null!;
    
    @property(EditBox)
    messageEditBox: EditBox = null!;
    
    @property(Button)
    submitButton: Button = null!;
    
    @property(Label)
    submitButtonLabel: Label = null!;
    
    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;
    
    // 显示/隐藏反馈表单按钮
    @property(Button)
    showFeedbackButton: Button = null!;
    
    @property(Label)
    showFeedbackButtonLabel: Label = null!;
    
    // 回调函数
    private closeCallback: Function | null = null;
    private isFeedbackVisible: boolean = false;

    onLoad() {
        console.log("ContactUsUI loaded");
        
        // 设置UI事件监听
        this.setupUIEvents();
        
        // 初始化UI显示
        this.updateUI();
        
        // 初始状态：隐藏反馈表单
        this.toggleFeedbackPanel(false);
    }

    /**
     * 打开联系我们界面
     * @param callback 关闭回调函数
     */
    onOpen(callback: Function): void {
        this.closeCallback = callback;
        
        // 更新UI显示
        this.updateUI();
        
        console.log("ContactUsUI opened");
    }

    private setupUIEvents(): void {
        // 关闭按钮事件
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        // 显示/隐藏反馈表单按钮事件
        if (this.showFeedbackButton) {
            this.showFeedbackButton.node.on(Button.EventType.CLICK, this.onShowFeedbackButtonClick, this);
        }
        
        // 提交按钮事件
        if (this.submitButton) {
            this.submitButton.node.on(Button.EventType.CLICK, this.onSubmitButtonClick, this);
        }
        
        // 监听语言切换事件
        oops.message.on("LANGUAGE_CHANGED", this.onLanguageChanged, this);
    }

    /**
     * 更新UI显示
     */
    private updateUI(): void {
        // 更新标题
        this.updateTitle();
        
        // 更新联系信息
        this.updateContactInfo();
        
        // 更新表单标签
        this.updateFormLabels();
    }

    /**
     * 更新标题
     */
    private updateTitle(): void {
        if (this.titleLabel) {
            this.titleLabel.string = CrashGameLanguage.getText("contact_title");
        }
    }

    /**
     * 更新联系信息
     */
    private updateContactInfo(): void {
        if (!this.contactInfoRichText) return;
        
        // 获取当前语言
        const currentLang = oops.language.current || "zh";
        
        let content = "";
        if (currentLang === "zh") {
            content = this.getChineseContactInfo();
        } else {
            content = this.getEnglishContactInfo();
        }
        
        this.contactInfoRichText.string = content;
    }

    /**
     * 更新表单标签
     */
    private updateFormLabels(): void {
        if (this.feedbackTitleLabel) {
            const currentLang = oops.language.current || "zh";
            this.feedbackTitleLabel.string = currentLang === "zh" ? "意见反馈" : "Feedback";
        }
        
        if (this.emailEditBox) {
            const currentLang = oops.language.current || "zh";
            this.emailEditBox.placeholder = currentLang === "zh" ? "请输入您的邮箱地址" : "Enter your email address";
        }
        
        if (this.messageEditBox) {
            const currentLang = oops.language.current || "zh";
            this.messageEditBox.placeholder = currentLang === "zh" ? "请输入您的意见或建议" : "Enter your feedback or suggestions";
        }
        
        if (this.submitButtonLabel) {
            const currentLang = oops.language.current || "zh";
            this.submitButtonLabel.string = currentLang === "zh" ? "提交" : "Submit";
        }
        
        if (this.showFeedbackButtonLabel) {
            const currentLang = oops.language.current || "zh";
            if (this.isFeedbackVisible) {
                this.showFeedbackButtonLabel.string = currentLang === "zh" ? "隐藏反馈表单" : "Hide Feedback Form";
            } else {
                this.showFeedbackButtonLabel.string = currentLang === "zh" ? "意见反馈" : "Send Feedback";
            }
        }
    }

    /**
     * 获取中文联系信息
     */
    private getChineseContactInfo(): string {
        return `<color=#FFD700><size=24><b>联系我们</b></size></color>

<color=#00FF00><size=18><b>客服邮箱</b></size></color>
<color=#87CEEB>support@dogcrash.game</color>

<color=#00FF00><size=18><b>官方网站</b></size></color>
<color=#87CEEB>www.dogcrash.game</color>

<color=#00FF00><size=18><b>客服时间</b></size></color>
<color=#FFFFFF>周一至周日 9:00 - 21:00</color>

<color=#00FF00><size=18><b>常见问题</b></size></color>
<b>Q: 如何重置游戏数据？</b>
A: 请联系客服，我们会协助您处理。

<b>Q: 游戏出现bug怎么办？</b>
A: 请详细描述bug情况并发送邮件至客服邮箱。

<b>Q: 如何反馈意见或建议？</b>
A: 点击下方"意见反馈"按钮填写表单。

<color=#00FF00><size=18><b>联系须知</b></size></color>
• 我们会在24小时内回复您的邮件
• 请详细描述您遇到的问题
• 如有截图请一并发送
• 感谢您的支持与理解

<color=#FFD700><size=16><b>Dog Crash 团队敬上</b></size></color>`;
    }

    /**
     * 获取英文联系信息
     */
    private getEnglishContactInfo(): string {
        return `<color=#FFD700><size=24><b>Contact Us</b></size></color>

<color=#00FF00><size=18><b>Customer Service Email</b></size></color>
<color=#87CEEB>support@dogcrash.game</color>

<color=#00FF00><size=18><b>Official Website</b></size></color>
<color=#87CEEB>www.dogcrash.game</color>

<color=#00FF00><size=18><b>Service Hours</b></size></color>
<color=#FFFFFF>Monday - Sunday 9:00 - 21:00</color>

<color=#00FF00><size=18><b>Frequently Asked Questions</b></size></color>
<b>Q: How to reset game data?</b>
A: Please contact customer service and we will assist you.

<b>Q: What to do if I encounter a bug?</b>
A: Please describe the bug in detail and send an email to our service address.

<b>Q: How to provide feedback or suggestions?</b>
A: Click the "Send Feedback" button below to fill out the form.

<color=#00FF00><size=18><b>Contact Information</b></size></color>
• We will reply to your email within 24 hours
• Please describe your issue in detail
• Please include screenshots if available
• Thank you for your support and understanding

<color=#FFD700><size=16><b>Dog Crash Team</b></size></color>`;
    }

    /**
     * 切换反馈表单显示/隐藏
     */
    private toggleFeedbackPanel(visible: boolean): void {
        this.isFeedbackVisible = visible;
        
        if (this.feedbackPanel) {
            this.feedbackPanel.active = visible;
        }
        
        // 更新按钮文本
        this.updateFormLabels();
    }

    /**
     * 显示/隐藏反馈表单按钮点击事件
     */
    private onShowFeedbackButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.toggleFeedbackPanel(!this.isFeedbackVisible);
    }

    /**
     * 提交按钮点击事件
     */
    private onSubmitButtonClick(): void {
        CrashGameAudio.playButtonClick();
        
        const email = this.emailEditBox?.string || "";
        const message = this.messageEditBox?.string || "";
        
        if (!email.trim()) {
            const currentLang = oops.language.current || "zh";
            const errorMsg = currentLang === "zh" ? "请输入邮箱地址" : "Please enter email address";
            oops.gui.toast(errorMsg);
            return;
        }
        
        if (!message.trim()) {
            const currentLang = oops.language.current || "zh";
            const errorMsg = currentLang === "zh" ? "请输入反馈内容" : "Please enter feedback content";
            oops.gui.toast(errorMsg);
            return;
        }
        
        // 这里可以添加实际的提交逻辑，比如发送到服务器
        this.submitFeedback(email, message);
    }

    /**
     * 提交反馈
     */
    private submitFeedback(email: string, message: string): void {
        console.log("Submitting feedback:", { email, message });
        
        // TODO: 实际的提交逻辑，比如发送到服务器
        // 这里暂时只是模拟成功
        const currentLang = oops.language.current || "zh";
        const successMsg = currentLang === "zh" ? "反馈提交成功，感谢您的宝贵意见！" : "Feedback submitted successfully, thank you!";
        
        oops.gui.toast(successMsg);
        
        // 清空表单
        if (this.emailEditBox) {
            this.emailEditBox.string = "";
        }
        if (this.messageEditBox) {
            this.messageEditBox.string = "";
        }
        
        // 隐藏反馈表单
        this.toggleFeedbackPanel(false);
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeContact();
    }

    /**
     * 语言切换事件回调
     */
    private onLanguageChanged(lang: string): void {
        console.log(`ContactUsUI language changed to: ${lang}`);
        this.updateUI();
    }

    /**
     * 关闭联系我们界面
     */
    private closeContact(): void {
        console.log("Closing contact us UI");
        
        if (this.closeCallback) {
            this.closeCallback();
        }
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("LANGUAGE_CHANGED", this.onLanguageChanged, this);
        
        // 清理按钮事件
        if (this.closeButton) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        if (this.showFeedbackButton) {
            this.showFeedbackButton.node.off(Button.EventType.CLICK, this.onShowFeedbackButtonClick, this);
        }
        
        if (this.submitButton) {
            this.submitButton.node.off(Button.EventType.CLICK, this.onSubmitButtonClick, this);
        }
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("ContactUsUI reset");
    }
}