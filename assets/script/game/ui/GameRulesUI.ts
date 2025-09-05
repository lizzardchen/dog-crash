import { _decorator, Node, Label, Button, ScrollView, RichText } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";

const { ccclass, property } = _decorator;

@ccclass('GameRulesUI')
@ecs.register('GameRulesUI', false)
export class GameRulesUI extends CCComp {
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
    
    // 回调函数
    private closeCallback: Function | null = null;

    onLoad() {
        console.log("GameRulesUI loaded");
        
        // 设置UI事件监听
        this.setupUIEvents();
        
        // 初始化UI显示
        this.updateUI();
    }

    /**
     * 打开游戏规则界面
     * @param callback 关闭回调函数
     */
    onOpen(callback: Function): void {
        this.closeCallback = callback;
        
        // 更新UI显示
        this.updateUI();
        
        console.log("GameRulesUI opened");
    }

    private setupUIEvents(): void {
        // 关闭按钮事件
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
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
    }

    /**
     * 更新标题
     */
    private updateTitle(): void {
        if (this.titleLabel) {
            this.titleLabel.string = CrashGameLanguage.getText("game_rules_title");
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
            content = this.getChineseRulesContent();
        } else {
            content = this.getEnglishRulesContent();
        }
        
        this.contentRichText.string = content;
        
        // 滚动到顶部
        if (this.contentScrollView) {
            this.contentScrollView.scrollToTop(0.1);
        }
    }

    /**
     * 获取中文规则内容
     */
    private getChineseRulesContent(): string {
        return `<color=#FFD700><size=24><b>游戏规则</b></size></color>

<color=#00FF00><size=20><b>游戏目标</b></size></color>
这是一个崩盘类游戏，玩家需要在火箭崩盘前及时提现以获得收益。

<color=#00FF00><size=20><b>游戏玩法</b></size></color>
1. <b>选择下注金额</b>：点击BET按钮选择下注金额
2. <b>开始游戏</b>：按住HOLD按钮开始游戏，火箭开始起飞
3. <b>实时倍数</b>：火箭飞行过程中倍数会不断增长
4. <b>提现操作</b>：松开HOLD按钮进行提现，获得 下注金额 × 当前倍数 的收益
5. <b>崩盘风险</b>：如果没有及时提现，火箭可能会崩盘，导致损失下注金额

<color=#00FF00><size=20><b>倍数系统</b></size></color>
• 倍数从1.00x开始，随时间不断增长
• 倍数越高，潜在收益越大，但崩盘风险也越高
• 火箭会在随机的倍数点崩盘，这个崩盘点是服务器预先确定的

<color=#00FF00><size=20><b>自动模式</b></size></color>
• 点击AUTO按钮可以设置自动提现
• 设置目标倍数和下注次数
• 达到目标倍数时自动提现
• 可以随时关闭自动模式

<color=#00FF00><size=20><b>免费模式</b></size></color>
• 部分下注选项为免费模式（显示为"free"）
• 免费模式不消耗余额，但可以获得真实收益
• 适合新手练习和熟悉游戏

<color=#00FF00><size=20><b>能源系统</b></size></color>
• 每局游戏需要消耗1点能源
• 游戏成功（提现）会退还消耗的能源
• 游戏失败（崩盘）不退还能源
• 可以通过观看广告恢复能源

<color=#FF6B6B><size=20><b>风险提示</b></size></color>
• 本游戏存在风险，请理性游戏
• 不要下注超过承受能力的金额
• 游戏结果具有随机性，过往表现不代表未来结果
• 如有游戏成瘾倾向，请及时寻求帮助

<color=#00FF00><size=20><b>技巧建议</b></size></color>
• 建议新手从小额开始，熟悉游戏节奏
• 设置合理的目标倍数，不要过度贪心
• 利用历史记录分析游戏趋势
• 合理分配资金，不要孤注一掷`;
    }

    /**
     * 获取英文规则内容
     */
    private getEnglishRulesContent(): string {
        return `<color=#FFD700><size=24><b>Game Rules</b></size></color>

<color=#00FF00><size=20><b>Game Objective</b></size></color>
This is a crash game where players need to cash out before the rocket crashes to earn profits.

<color=#00FF00><size=20><b>How to Play</b></size></color>
1. <b>Choose Bid Amount</b>: Click the BID button to select your bid amount
2. <b>Start Game</b>: Hold the HOLD button to start the game and launch the rocket
3. <b>Live Multiplier</b>: The multiplier increases continuously as the rocket flies
4. <b>Cash Out</b>: Release the HOLD button to cash out and earn Bid Amount × Current Multiplier
5. <b>Crash Risk</b>: If you don't cash out in time, the rocket may crash and you lose your bid amount

<color=#00FF00><size=20><b>Multiplier System</b></size></color>
• Multiplier starts at 1.00x and increases over time
• Higher multipliers mean greater potential rewards but also higher crash risk
• The rocket will crash at a random multiplier point predetermined by the server

<color=#00FF00><size=20><b>Auto Mode</b></size></color>
• Click the AUTO button to set automatic cash out
• Set target multiplier and number of bets
• Automatically cash out when target multiplier is reached
• Auto mode can be disabled at any time

<color=#00FF00><size=20><b>Free Mode</b></size></color>
• Some bid options are in free mode (displayed as "free")
• Free mode doesn't consume your balance but you can earn real profits
• Perfect for beginners to practice and learn the game

<color=#00FF00><size=20><b>Energy System</b></size></color>
• Each game consumes 1 energy point
• Successful games (cash out) refund the consumed energy
• Failed games (crash) don't refund energy
• You can recover energy by watching ads

<color=#FF6B6B><size=20><b>Risk Warning</b></size></color>
• This game involves risks, please play responsibly
• Don't bid more than you can afford to lose
• Game results are random, past performance doesn't guarantee future results
• If you have gambling addiction tendencies, please seek help immediately

<color=#00FF00><size=20><b>Tips & Strategies</b></size></color>
• Beginners should start with small amounts to learn the game rhythm
• Set reasonable target multipliers, don't be too greedy
• Use game history to analyze trends
• Manage your funds wisely, don't put all eggs in one basket`;
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeRules();
    }

    /**
     * 语言切换事件回调
     */
    private onLanguageChanged(lang: string): void {
        console.log(`GameRulesUI language changed to: ${lang}`);
        this.updateUI();
    }

    /**
     * 关闭游戏规则界面
     */
    private closeRules(): void {
        console.log("Closing game rules UI");
        
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
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("GameRulesUI reset");
    }
}