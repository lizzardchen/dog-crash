import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

/**
 * 下注金额项接口
 */
export interface BetAmountItem {
    display: string;    // 显示文本 (如 "free", "1K", "1M")
    value: number;      // 实际数值 (如 90, 1000, 1000000)
    isFree: boolean;    // 是否为免费模式
}

@ecs.register('Betting')
export class BettingComp extends ecs.Comp {
    private static readonly SELECTED_BET_KEY = "crash_game_selected_bet";

    betAmount: number = 0;
    balance: number = 1000;
    isHolding: boolean = false;

    // 下注金额数据
    readonly betAmountData: BetAmountItem[] = [
        { display: "free", value: 90, isFree: true },
        { display: "100", value: 100, isFree: false },
        { display: "200", value: 200, isFree: false },
        { display: "500", value: 500, isFree: false },
        { display: "1K", value: 1000, isFree: false },
        { display: "2K", value: 2000, isFree: false },
        { display: "5K", value: 5000, isFree: false },
        { display: "10K", value: 10000, isFree: false },
        { display: "20K", value: 20000, isFree: false },
        { display: "50K", value: 50000, isFree: false },
        { display: "100K", value: 100000, isFree: false },
        { display: "200K", value: 200000, isFree: false },
        { display: "500K", value: 500000, isFree: false },
        { display: "1M", value: 1000000, isFree: false }
    ];

    // 当前选择的下注项
    currentBetItem: BetAmountItem = this.betAmountData[0]; // 默认选择free

    // 自动提现设置
    autoCashOutEnabled: boolean = false;
    autoCashOutMultiplier: number = 2.0;
    autoCashOutTotalBets: number = -1; // -1表示无限
    autoCashOutCurrentBets: number = 0; // 当前已进行的下注次数

    reset() {
        this.betAmount = 0;
        this.isHolding = false;
        // 注意：不重置currentBetItem和自动提现设置，保持用户的选择
    }

    /**
     * 初始化时加载保存的下注选择
     */
    init(): void {
        this.loadSavedBetSelection();
    }

    /**
     * 设置当前下注选择
     * @param betItem 下注项
     */
    setCurrentBetItem(betItem: BetAmountItem): void {
        this.currentBetItem = betItem;
        this.betAmount = betItem.value;
        this.saveBetSelection();
        console.log(`Set current bet: ${betItem.display} (value: ${betItem.value}, free: ${betItem.isFree})`);
    }

    /**
     * 根据显示文本查找下注项
     * @param display 显示文本
     * @returns 匹配的下注项或null
     */
    findBetItemByDisplay(display: string): BetAmountItem | null {
        return this.betAmountData.find(item => item.display === display) || null;
    }

    /**
     * 将数值转换为短文本格式
     * @param value 数值
     * @returns 短文本 (如: 1000 -> "1K", 1000000 -> "1M")
     */
    formatValueToShortText(value: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + "M";
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + "K";
        } else {
            return value.toString();
        }
    }

    /**
     * 保存当前下注选择到本地存储
     */
    private saveBetSelection(): void {
        try {
            const betData = JSON.stringify({
                display: this.currentBetItem.display,
                value: this.currentBetItem.value,
                isFree: this.currentBetItem.isFree
            });
            oops.storage.set(BettingComp.SELECTED_BET_KEY, betData);
            console.log(`Saved selected bet: ${this.currentBetItem.display} (${this.currentBetItem.value}) to local storage`);
        } catch (error) {
            console.error("Failed to save selected bet:", error);
        }
    }

    /**
     * 从本地存储加载保存的下注选择
     */
    private loadSavedBetSelection(): void {
        try {
            const betData = oops.storage.get(BettingComp.SELECTED_BET_KEY);
            if (betData) {
                const savedBet = JSON.parse(betData) as { display: string; value: number; isFree: boolean };

                // 在betAmountData中查找匹配的项
                const matchedItem = this.betAmountData.find(item =>
                    item.display === savedBet.display &&
                    item.value === savedBet.value &&
                    item.isFree === savedBet.isFree
                );

                if (matchedItem) {
                    this.currentBetItem = matchedItem;
                    this.betAmount = matchedItem.value;
                    console.log(`Loaded selected bet: ${matchedItem.display} (${matchedItem.value}) from local storage`);
                } else {
                    console.warn("Saved bet item not found in current data, using default");
                }
            }
        } catch (error) {
            console.error("Failed to load selected bet:", error);
        }
    }

    /**
     * 清空保存的下注选择
     */
    clearSavedBetSelection(): void {
        oops.storage.remove(BettingComp.SELECTED_BET_KEY);
        console.log("Cleared saved bet selection from local storage");
    }

    /**
     * 设置自动提现
     * @param enabled 是否启用
     * @param multiplier 自动提现倍数
     * @param totalBets 总下注次数 (-1表示无限)
     */
    setAutoCashOut(enabled: boolean, multiplier: number = 2.0, totalBets: number = -1): void {
        this.autoCashOutEnabled = enabled;
        this.autoCashOutMultiplier = multiplier;
        this.autoCashOutTotalBets = totalBets;
        this.autoCashOutCurrentBets = 0; // 重置计数

        console.log(`Auto cashout ${enabled ? 'enabled' : 'disabled'}: multiplier=${multiplier}, totalBets=${totalBets}`);
    }

    /**
     * 检查是否应该自动提现
     * @param currentMultiplier 当前倍数
     * @returns 是否应该自动提现
     */
    shouldAutoCashOut(currentMultiplier: number): boolean {
        if (!this.autoCashOutEnabled) return false;

        return currentMultiplier >= this.autoCashOutMultiplier;
    }

    /**
     * 增加自动提现计数
     */
    incrementAutoCashOutBets(): void {
        if (this.autoCashOutEnabled) {
            this.autoCashOutCurrentBets++;

            // 检查是否达到总次数限制
            if (this.autoCashOutTotalBets > 0 && this.autoCashOutCurrentBets >= this.autoCashOutTotalBets) {
                this.autoCashOutEnabled = false;
                console.log(`Auto cashout disabled: reached total bets limit (${this.autoCashOutTotalBets})`);
            }
        }
    }

    /**
     * 获取自动提现状态信息
     */
    getAutoCashOutStatus(): { enabled: boolean; multiplier: number; totalBets: number; currentBets: number } {
        return {
            enabled: this.autoCashOutEnabled,
            multiplier: this.autoCashOutMultiplier,
            totalBets: this.autoCashOutTotalBets,
            currentBets: this.autoCashOutCurrentBets
        };
    }
}