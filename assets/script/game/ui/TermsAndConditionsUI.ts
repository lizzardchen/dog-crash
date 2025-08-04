import { _decorator, Label, Button, ScrollView, RichText } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";

const { ccclass, property } = _decorator;

@ccclass('TermsAndConditionsUI')
@ecs.register('TermsAndConditionsUI', false)
export class TermsAndConditionsUI extends CCComp {
    // 标题标签
    @property(Label)
    titleLabel: Label = null!;
    
    // 内容滚动视图
    @property(ScrollView)
    contentScrollView: ScrollView = null!;
    
    // 内容富文本
    @property(RichText)
    contentRichText: RichText = null!;
    
    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;
    
    // 同意按钮
    @property(Button)
    agreeButton: Button = null!;
    
    @property(Label)
    agreeButtonLabel: Label = null!;
    
    // 回调函数
    private closeCallback: Function | null = null;

    onLoad() {
        console.log("TermsAndConditionsUI loaded");
        
        // 设置UI事件监听
        this.setupUIEvents();
        
        // 初始化UI显示
        this.updateUI();
    }

    /**
     * 打开条款说明界面
     * @param callback 关闭回调函数
     */
    onOpen(callback: Function): void {
        this.closeCallback = callback;
        
        // 更新UI显示
        this.updateUI();
        
        console.log("TermsAndConditionsUI opened");
    }

    private setupUIEvents(): void {
        // 关闭按钮事件
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        // 同意按钮事件
        if (this.agreeButton) {
            this.agreeButton.node.on(Button.EventType.CLICK, this.onAgreeButtonClick, this);
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
        
        // 更新内容
        this.updateContent();
        
        // 更新按钮标签
        this.updateButtonLabels();
    }

    /**
     * 更新标题
     */
    private updateTitle(): void {
        if (this.titleLabel) {
            this.titleLabel.string = CrashGameLanguage.getText("terms_title");
        }
    }

    /**
     * 更新按钮标签
     */
    private updateButtonLabels(): void {
        if (this.agreeButtonLabel) {
            const currentLang = oops.language.current || "zh";
            this.agreeButtonLabel.string = currentLang === "zh" ? "我已阅读并同意" : "I have read and agree";
        }
    }

    /**
     * 更新内容
     */
    private updateContent(): void {
        if (!this.contentRichText) return;
        
        // 获取当前语言
        const currentLang = oops.language.current || "zh";
        
        let content = "";
        if (currentLang === "zh") {
            content = this.getChineseTermsContent();
        } else {
            content = this.getEnglishTermsContent();
        }
        
        this.contentRichText.string = content;
        
        // 滚动到顶部
        if (this.contentScrollView) {
            this.contentScrollView.scrollToTop(0.1);
        }
    }

    /**
     * 获取中文条款内容
     */
    private getChineseTermsContent(): string {
        return `<color=#FFD700><size=24><b>用户协议和隐私条款</b></size></color>

<color=#00FF00><size=20><b>1. 服务条款</b></size></color>

<color=#87CEEB><size=18><b>1.1 接受条款</b></size></color>
欢迎使用Dog Crash游戏！通过下载、安装或使用本应用程序，您表示同意遵守本用户协议的所有条款和条件。

<color=#87CEEB><size=18><b>1.2 服务描述</b></size></color>
Dog Crash是一款娱乐性崩盘游戏，玩家需要在虚拟火箭崩盘前及时提现以获得游戏内收益。本游戏仅供娱乐目的。

<color=#87CEEB><size=18><b>1.3 用户责任</b></size></color>
• 您必须年满18岁才能使用本服务
• 您同意以负责任的方式使用本服务
• 您不得使用外挂、作弊软件或其他不正当手段
• 您不得恶意攻击或破坏游戏系统

<color=#00FF00><size=20><b>2. 隐私政策</b></size></color>

<color=#87CEEB><size=18><b>2.1 信息收集</b></size></color>
我们可能收集以下信息：
• 设备信息（设备型号、操作系统版本）
• 游戏数据（游戏记录、统计信息）
• 使用情况数据（游戏时长、功能使用）

<color=#87CEEB><size=18><b>2.2 信息使用</b></size></color>
收集的信息用于：
• 提供和改进游戏服务
• 个性化用户体验
• 技术支持和客户服务
• 游戏数据分析和优化

<color=#87CEEB><size=18><b>2.3 信息保护</b></size></color>
• 我们采用行业标准的安全措施保护您的信息
• 不会将您的个人信息出售给第三方
• 仅在法律要求或获得您同意的情况下共享信息

<color=#00FF00><size=20><b>3. 游戏规则</b></size></color>

<color=#87CEEB><size=18><b>3.1 游戏机制</b></size></color>
• 游戏结果基于随机算法生成
• 服务器预先确定每局游戏的崩盘点
• 玩家无法预测或影响游戏结果

<color=#87CEEB><size=18><b>3.2 虚拟货币</b></size></color>
• 游戏内的货币和积分纯属虚拟，无现实价值
• 不可兑换真实货币或其他有价物品
• 我们保留修改游戏内经济系统的权利

<color=#00FF00><size=20><b>4. 免责声明</b></size></color>

<color=#87CEEB><size=18><b>4.1 服务现状</b></size></color>
本服务按"现状"提供，我们不保证：
• 服务的连续性和稳定性
• 游戏数据的永久保存
• 服务不会中断或出现错误

<color=#87CEEB><size=18><b>4.2 责任限制</b></size></color>
• 我们不对因使用本服务而产生的任何损失承担责任
• 包括但不限于直接损失、间接损失或后果性损失
• 您使用本服务的风险由您自行承担

<color=#00FF00><size=20><b>5. 条款修改</b></size></color>

我们保留随时修改本协议的权利。修改后的协议将在游戏内或官方网站公布，继续使用服务即表示您接受修改后的条款。

<color=#00FF00><size=20><b>6. 联系我们</b></size></color>

如果您对本协议有任何疑问，请通过以下方式联系我们：
• 邮箱：support@dogcrash.game
• 网站：www.dogcrash.game

<color=#FFD700><size=16><b>最后更新：2024年1月</b></size></color>`;
    }

    /**
     * 获取英文条款内容
     */
    private getEnglishTermsContent(): string {
        return `<color=#FFD700><size=24><b>Terms of Service and Privacy Policy</b></size></color>

<color=#00FF00><size=20><b>1. Terms of Service</b></size></color>

<color=#87CEEB><size=18><b>1.1 Acceptance of Terms</b></size></color>
Welcome to Dog Crash! By downloading, installing, or using this application, you agree to be bound by all terms and conditions of this User Agreement.

<color=#87CEEB><size=18><b>1.2 Service Description</b></size></color>
Dog Crash is an entertainment crash game where players need to cash out before a virtual rocket crashes to earn in-game rewards. This game is for entertainment purposes only.

<color=#87CEEB><size=18><b>1.3 User Responsibilities</b></size></color>
• You must be at least 18 years old to use this service
• You agree to use this service responsibly
• You must not use cheats, hacks, or other unfair means
• You must not maliciously attack or damage the game system

<color=#00FF00><size=20><b>2. Privacy Policy</b></size></color>

<color=#87CEEB><size=18><b>2.1 Information Collection</b></size></color>
We may collect the following information:
• Device information (device model, OS version)
• Game data (game records, statistics)
• Usage data (playtime, feature usage)

<color=#87CEEB><size=18><b>2.2 Information Use</b></size></color>
Collected information is used for:
• Providing and improving game services
• Personalizing user experience
• Technical support and customer service
• Game data analysis and optimization

<color=#87CEEB><size=18><b>2.3 Information Protection</b></size></color>
• We use industry-standard security measures to protect your information
• We will not sell your personal information to third parties
• Information is shared only when legally required or with your consent

<color=#00FF00><size=20><b>3. Game Rules</b></size></color>

<color=#87CEEB><size=18><b>3.1 Game Mechanics</b></size></color>
• Game results are generated based on random algorithms
• Server predetermines crash point for each game session
• Players cannot predict or influence game outcomes

<color=#87CEEB><size=18><b>3.2 Virtual Currency</b></size></color>
• In-game currency and points are purely virtual with no real-world value
• Cannot be exchanged for real money or other valuable items
• We reserve the right to modify the in-game economic system

<color=#00FF00><size=20><b>4. Disclaimers</b></size></color>

<color=#87CEEB><size=18><b>4.1 Service As-Is</b></size></color>
This service is provided "as is" and we do not guarantee:
• Continuity and stability of service
• Permanent storage of game data
• Service will not be interrupted or error-free

<color=#87CEEB><size=18><b>4.2 Limitation of Liability</b></size></color>
• We are not liable for any losses arising from using this service
• Including but not limited to direct, indirect, or consequential damages
• You use this service at your own risk

<color=#00FF00><size=20><b>5. Terms Modification</b></size></color>

We reserve the right to modify this agreement at any time. Modified agreements will be published in-game or on our official website. Continued use of the service indicates your acceptance of the modified terms.

<color=#00FF00><size=20><b>6. Contact Us</b></size></color>

If you have any questions about this agreement, please contact us:
• Email: support@dogcrash.game
• Website: www.dogcrash.game

<color=#FFD700><size=16><b>Last Updated: January 2024</b></size></color>`;
    }

    /**
     * 同意按钮点击事件
     */
    private onAgreeButtonClick(): void {
        CrashGameAudio.playButtonClick();
        
        const currentLang = oops.language.current || "zh";
        const message = currentLang === "zh" ? "感谢您同意我们的条款！" : "Thank you for agreeing to our terms!";
        
        oops.gui.toast(message);
        
        // 可以在这里保存用户已同意条款的状态
        this.saveAgreementStatus();
        
        // 关闭界面
        this.closeTerms();
    }

    /**
     * 保存用户同意状态
     */
    private saveAgreementStatus(): void {
        // 保存到本地存储
        oops.storage.set("terms_agreed", true);
        oops.storage.set("terms_agreed_time", Date.now());
        
        console.log("User agreement status saved");
    }

    /**
     * 检查用户是否已同意条款
     */
    static hasUserAgreed(): boolean {
        return oops.storage.get("terms_agreed") === "true";
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeTerms();
    }

    /**
     * 语言切换事件回调
     */
    private onLanguageChanged(lang: string): void {
        console.log(`TermsAndConditionsUI language changed to: ${lang}`);
        this.updateUI();
    }

    /**
     * 关闭条款说明界面
     */
    private closeTerms(): void {
        console.log("Closing terms and conditions UI");
        
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
        
        if (this.agreeButton) {
            this.agreeButton.node.off(Button.EventType.CLICK, this.onAgreeButtonClick, this);
        }
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("TermsAndConditionsUI reset");
    }
}