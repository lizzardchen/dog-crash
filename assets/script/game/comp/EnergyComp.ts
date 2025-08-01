import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

@ecs.register('Energy')
export class EnergyComp extends ecs.Comp {
    private static readonly ENERGY_STORAGE_KEY = "crash_game_energy";
    private static readonly ENERGY_LAST_UPDATE_KEY = "crash_game_energy_last_update";
    
    // 能源配置
    readonly maxEnergy: number = 10;          // 最大能源数量
    readonly initialEnergy: number = 5;       // 初始能源数量
    readonly autoRecoveryInterval: number = 10 * 60 * 1000; // 10分钟自动恢复间隔（毫秒）
    readonly energyPerRecovery: number = 1;   // 每次恢复的能源数量
    
    // 当前状态
    currentEnergy: number = 5;
    lastUpdateTime: number = 0;
    
    reset() {
        // 重置时不清空能源，保持用户的能源状态
    }
    
    /**
     * 初始化能源系统
     */
    init(): void {
        this.loadEnergyData();
        this.checkAutoRecovery();
        console.log(`EnergyComp: Initialized with ${this.currentEnergy}/${this.maxEnergy} energy`);
    }
    
    /**
     * 消耗能源
     * @param amount 消耗的能源数量，默认为1
     * @returns 是否成功消耗
     */
    consumeEnergy(amount: number = 1): boolean {
        if (this.currentEnergy >= amount) {
            this.currentEnergy -= amount;
            this.saveEnergyData();
            console.log(`EnergyComp: Consumed ${amount} energy, remaining: ${this.currentEnergy}/${this.maxEnergy}`);
            oops.message.dispatchEvent("ENERGY_CHANGED", { current: this.currentEnergy, max: this.maxEnergy });
            return true;
        } else {
            console.warn(`EnergyComp: Not enough energy. Required: ${amount}, Current: ${this.currentEnergy}`);
            return false;
        }
    }
    
    /**
     * 恢复能源
     * @param amount 恢复的能源数量，默认为1
     * @param source 恢复来源："auto" | "ad" | "manual"
     */
    recoverEnergy(amount: number = 1, source: string = "manual"): void {
        const previousEnergy = this.currentEnergy;
        this.currentEnergy = Math.min(this.currentEnergy + amount, this.maxEnergy);
        
        if (this.currentEnergy > previousEnergy) {
            this.saveEnergyData();
            console.log(`EnergyComp: Recovered ${this.currentEnergy - previousEnergy} energy from ${source}, current: ${this.currentEnergy}/${this.maxEnergy}`);
            oops.message.dispatchEvent("ENERGY_CHANGED", { current: this.currentEnergy, max: this.maxEnergy });
        }
    }
    
    /**
     * 检查是否有足够的能源
     * @param amount 需要的能源数量，默认为1
     * @returns 是否有足够能源
     */
    hasEnoughEnergy(amount: number = 1): boolean {
        return this.currentEnergy >= amount;
    }
    
    /**
     * 检查自动恢复
     */
    checkAutoRecovery(): void {
        if (this.currentEnergy >= this.maxEnergy) {
            // 已满能源，更新最后更新时间但不恢复
            this.lastUpdateTime = Date.now();
            this.saveEnergyData();
            return;
        }
        
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        
        if (timeSinceLastUpdate >= this.autoRecoveryInterval) {
            // 计算应该恢复多少能源
            const recoveryCount = Math.floor(timeSinceLastUpdate / this.autoRecoveryInterval);
            const energyToRecover = recoveryCount * this.energyPerRecovery;
            
            if (energyToRecover > 0) {
                this.recoverEnergy(energyToRecover, "auto");
                // 更新最后更新时间，考虑剩余时间
                this.lastUpdateTime = currentTime - (timeSinceLastUpdate % this.autoRecoveryInterval);
                this.saveEnergyData();
            }
        }
    }
    
    /**
     * 获取下次自动恢复的剩余时间（毫秒）
     * @returns 剩余时间，如果能源已满返回0
     */
    getTimeUntilNextRecovery(): number {
        if (this.currentEnergy >= this.maxEnergy) {
            return 0;
        }
        
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        const remainingTime = this.autoRecoveryInterval - timeSinceLastUpdate;
        
        return Math.max(0, remainingTime);
    }
    
    /**
     * 获取能源状态信息
     */
    getEnergyStatus(): { current: number; max: number; timeUntilNext: number; canRecover: boolean } {
        return {
            current: this.currentEnergy,
            max: this.maxEnergy,
            timeUntilNext: this.getTimeUntilNextRecovery(),
            canRecover: this.currentEnergy < this.maxEnergy
        };
    }
    
    /**
     * 通过观看广告恢复能源
     */
    recoverEnergyByAd(): void {
        if (this.currentEnergy < this.maxEnergy) {
            this.recoverEnergy(this.energyPerRecovery, "ad");
            console.log("EnergyComp: Energy recovered by watching ad");
        } else {
            console.log("EnergyComp: Energy is already full, ad not needed");
        }
    }
    
    /**
     * 保存能源数据到本地存储
     */
    private saveEnergyData(): void {
        try {
            const energyData = {
                currentEnergy: this.currentEnergy,
                lastUpdateTime: this.lastUpdateTime
            };
            oops.storage.set(EnergyComp.ENERGY_STORAGE_KEY, JSON.stringify(energyData));
        } catch (error) {
            console.error("EnergyComp: Failed to save energy data:", error);
        }
    }
    
    /**
     * 从本地存储加载能源数据
     */
    private loadEnergyData(): void {
        try {
            const energyDataStr = oops.storage.get(EnergyComp.ENERGY_STORAGE_KEY);
            if (energyDataStr) {
                const energyData = JSON.parse(energyDataStr);
                this.currentEnergy = Math.min(energyData.currentEnergy || this.initialEnergy, this.maxEnergy);
                this.lastUpdateTime = energyData.lastUpdateTime || Date.now();
            } else {
                // 首次运行，设置初始值
                this.currentEnergy = this.initialEnergy;
                this.lastUpdateTime = Date.now();
                this.saveEnergyData();
            }
        } catch (error) {
            console.error("EnergyComp: Failed to load energy data, using defaults:", error);
            this.currentEnergy = this.initialEnergy;
            this.lastUpdateTime = Date.now();
            this.saveEnergyData();
        }
    }
    
    /**
     * 清空保存的能源数据（用于测试或重置）
     */
    clearEnergyData(): void {
        oops.storage.remove(EnergyComp.ENERGY_STORAGE_KEY);
        this.currentEnergy = this.initialEnergy;
        this.lastUpdateTime = Date.now();
        console.log("EnergyComp: Energy data cleared and reset to initial values");
    }
}