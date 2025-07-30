import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { MultiplierConfig } from "../config/MultiplierConfig";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashRecord } from "./GameHistoryComp";

@ecs.register('LocalData')
export class LocalDataComp extends ecs.Comp {
    private static readonly CRASH_HISTORY_KEY = "crash_game_history";
    private static readonly SELECTED_BET_KEY = "crash_game_selected_bet";

    /** 当前游戏会话的崩盘倍数（本地随机生成） */
    currentCrashMultiplier: number = 0;

    /** 当前选择的下注项 */
    selectedBetItem: { display: string; value: number; isFree: boolean } | null = null;

    reset() {
        this.currentCrashMultiplier = 0;
        // 注意：不重置selectedBetItem，保持用户的选择
    }

    /** 生成本局游戏的崩盘倍数 */
    generateCrashMultiplier(): number {
        // return 251.0;
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

    /** 保存选择的下注项到本地存储 */
    saveSelectedBet(betItem: { display: string; value: number; isFree: boolean }): void {
        try {
            this.selectedBetItem = betItem;
            const betData = JSON.stringify(betItem);
            oops.storage.set(LocalDataComp.SELECTED_BET_KEY, betData);
            console.log(`Saved selected bet: ${betItem.display} (${betItem.value}) to local storage`);
        } catch (error) {
            console.error("Failed to save selected bet:", error);
        }
    }

    /** 从本地存储加载选择的下注项 */
    loadSelectedBet(): { display: string; value: number; isFree: boolean } | null {
        try {
            const betData = oops.storage.get(LocalDataComp.SELECTED_BET_KEY);
            if (betData) {
                const betItem = JSON.parse(betData) as { display: string; value: number; isFree: boolean };
                this.selectedBetItem = betItem;
                console.log(`Loaded selected bet: ${betItem.display} (${betItem.value}) from local storage`);
                return betItem;
            }
        } catch (error) {
            console.error("Failed to load selected bet:", error);
        }
        return null;
    }

    /** 清空选择的下注项 */
    clearSelectedBet(): void {
        this.selectedBetItem = null;
        oops.storage.remove(LocalDataComp.SELECTED_BET_KEY);
        console.log("Cleared selected bet from local storage");
    }
}