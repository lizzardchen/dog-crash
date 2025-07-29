import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export interface CrashRecord {
    id: number;
    timestamp: number;
    crashMultiplier: number;
}

@ecs.register('GameHistory')
export class GameHistoryComp extends ecs.Comp {
    crashHistory: CrashRecord[] = [];
    maxHistoryCount: number = 20;

    /** 初始化历史记录（从LocalDataComp加载） */
    initializeHistory(localData: any): void {
        if (localData && localData.loadCrashHistory) {
            this.crashHistory = localData.loadCrashHistory();
            console.log(`Initialized with ${this.crashHistory.length} crash records`);
        }
    }

    /** 添加崩盘记录 */
    addCrashRecord(crashMultiplier: number, localData?: any): void {
        console.log(`🔥 addCrashRecord called with multiplier: ${crashMultiplier.toFixed(2)}x`);
        
        const record: CrashRecord = {
            id: Date.now(),
            timestamp: Date.now(),
            crashMultiplier: crashMultiplier
        };
        
        this.crashHistory.unshift(record);
        console.log(`🔥 crashHistory length after adding: ${this.crashHistory.length}`);
        
        if (this.crashHistory.length > this.maxHistoryCount) {
            this.crashHistory.pop();
        }
        
        // 保存到本地存储
        if (localData && localData.saveCrashHistory) {
            localData.saveCrashHistory(this.crashHistory);
            console.log(`🔥 Saved crash history to local storage`);
        } else {
            console.warn(`🔥 Failed to save crash history - localData or saveCrashHistory method missing`);
        }
        
        console.log(`🔥 Added crash record: ${crashMultiplier.toFixed(2)}x, total records: ${this.crashHistory.length}`);
        console.log(`🔥 Latest crash multiplier is now: ${this.getLatestCrashMultiplier().toFixed(2)}x`);
    }

    /** 获取最新的崩盘倍数（用于按钮显示） */
    getLatestCrashMultiplier(): number {
        if (this.crashHistory.length > 0) {
            return this.crashHistory[0].crashMultiplier;
        }
        return 0;
    }

    /** 获取最近N条崩盘记录 */
    getRecentCrashRecords(count: number = 20): CrashRecord[] {
        return this.crashHistory.slice(0, count);
    }

    reset() {
        this.crashHistory = [];
    }
}