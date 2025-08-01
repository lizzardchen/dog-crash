import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { MultiplierConfig } from "../config/MultiplierConfig";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashRecord } from "./GameHistoryComp";
import { smc } from "../common/SingletonModuleComp";

@ecs.register('LocalData')
export class LocalDataComp extends ecs.Comp {
    private static readonly CRASH_HISTORY_KEY = "crash_game_history";

    /** 当前游戏会话的崩盘倍数（本地随机生成） */
    currentCrashMultiplier: number = 0;

    reset() {
        this.currentCrashMultiplier = 0;
    }

    /** 生成本局游戏的崩盘倍数（从服务器获取） */
    async generateCrashMultiplierAsync(): Promise<number> {
        try {
            // 尝试从服务器获取崩盘倍数
            if (smc.crashGame) {
                const serverMultiplier = await smc.crashGame.fetchCrashMultiplierFromServer();
                if (serverMultiplier !== null) {
                    return serverMultiplier;
                }
            }
            
            // 服务器获取失败，使用本地生成作为备用方案
            console.log("Using local crash multiplier generation as fallback");
            return MultiplierConfig.generateCrashMultiplier();
        } catch (error) {
            console.error("Error generating crash multiplier:", error);
            // 出错时使用本地生成
            return MultiplierConfig.generateCrashMultiplier();
        }
    }

    /** 生成本局游戏的崩盘倍数（同步方法，向后兼容） */
    generateCrashMultiplier(): number {
        // 同步方法，只能使用本地生成
        return MultiplierConfig.generateCrashMultiplier();
    }

    /** 保存崩盘历史记录到本地存储 */
    saveCrashHistory(crashHistory: CrashRecord[]): void {
        try {
            const historyData = JSON.stringify(crashHistory);
            oops.storage.set(LocalDataComp.CRASH_HISTORY_KEY, historyData);
            console.log(`Saved ${crashHistory.length} crash records to local storage`);
        } catch (error) {
            console.error("Failed to save crash history:", error);
        }
    }

    /** 从本地存储加载崩盘历史记录 */
    loadCrashHistory(): CrashRecord[] {
        try {
            const historyData = oops.storage.get(LocalDataComp.CRASH_HISTORY_KEY);
            if (historyData) {
                const crashHistory = JSON.parse(historyData) as CrashRecord[];
                console.log(`Loaded ${crashHistory.length} crash records from local storage`);
                return crashHistory;
            }
        } catch (error) {
            console.error("Failed to load crash history:", error);
        }
        return [];
    }

    /** 清空崩盘历史记录 */
    clearCrashHistory(): void {
        oops.storage.remove(LocalDataComp.CRASH_HISTORY_KEY);
        console.log("Cleared crash history from local storage");
    }


}