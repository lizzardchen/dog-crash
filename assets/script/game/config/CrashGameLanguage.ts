import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

// 多语言管理器
export class CrashGameLanguage {
    /** 初始化多语言系统 */
    static init(): void {
        // 设置支持的语言
        oops.language.languages = ["zh", "en"];

        // 根据系统语言自动选择
        const systemLang = oops.language.current || "zh";
        oops.language.setLanguage(systemLang);

        // 加载语言包
        this.loadLanguagePack();
    }

    /** 加载语言包 */
    private static loadLanguagePack(): void {
        const langData = {
            "zh": {
                "hold_to_fly": "按住起飞",
                "balance": "余额",
                "bet_amount": "下注金额",
                "multiplier": "倍数",
                "potential_win": "潜在收益",
                "crashed": "崩盘了！",
                "cash_out": "成功提现",
                "insufficient_balance": "余额不足",
                "game_history": "游戏历史",
                "leaderboard": "排行榜",
                "settings": "设置"
            },
            "en": {
                "hold_to_fly": "HOLD TO FLY",
                "balance": "Balance",
                "bet_amount": "Bet Amount",
                "multiplier": "Multiplier",
                "potential_win": "Potential Win",
                "crashed": "CRASHED!",
                "cash_out": "CASH OUT",
                "insufficient_balance": "Insufficient Balance",
                "game_history": "Game History",
                "leaderboard": "Leaderboard",
                "settings": "Settings"
            }
        };

        // 设置语言数据
        oops.language.setLanguageData(langData);
    }

    /** 获取本地化文本 */
    static getText(key: string): string {
        return oops.language.getLangByID(key) || key;
    }

    /** 切换语言 */
    static switchLanguage(lang: string): void {
        oops.language.setLanguage(lang);
        // 发送语言切换消息，通知UI更新
        oops.message.dispatchEvent("LANGUAGE_CHANGED", lang);
    }
}