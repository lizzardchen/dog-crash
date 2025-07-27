import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

// 多语言管理器
export class CrashGameLanguage {
    /** 初始化多语言系统 */
    static init(): void {
        // 设置支持的语言
        oops.language.languages = ["zh", "en"];

        // 根据系统语言自动选择，如果没有则使用中文
        const systemLang = oops.language.current || "zh";
        const supportedLang = oops.language.isExist(systemLang) ? systemLang : "zh";

        // 使用oops框架的标准语言设置方法
        oops.language.setLanguage(supportedLang, (success: boolean) => {
            if (success) {
                console.log(`CrashGameLanguage initialized with language: ${supportedLang}`);
            } else {
                console.log(`CrashGameLanguage using cached language: ${supportedLang}`);
            }
        });
    }

    /** 获取本地化文本 */
    static getText(key: string): string {
        return oops.language.getLangByID(key) || key;
    }

    /** 切换语言 */
    static switchLanguage(lang: string): void {
        if (oops.language.isExist(lang)) {
            oops.language.setLanguage(lang, (success: boolean) => {
                if (success) {
                    // 发送语言切换消息，通知UI更新
                    oops.message.dispatchEvent("LANGUAGE_CHANGED", lang);
                    console.log(`Language switched to: ${lang}`);
                }
            });
        } else {
            console.warn(`Language ${lang} is not supported`);
        }
    }
}