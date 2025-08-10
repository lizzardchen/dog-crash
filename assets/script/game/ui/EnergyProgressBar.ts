import { _decorator, Component, Node, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('EnergyProgressBar')
export class EnergyProgressBar extends Component {
    @property({
        type: [Sprite],
        displayName: "Energy Sprites",
        tooltip: "能量进度条精灵数组，从energy2_01到energy2_10"
    })
    energySprites: Sprite[] = [];

    private _maxEnergy: number = 10;
    private _currentEnergy: number = 10;

    start() {
        this.validateSprites();
        this.updateDisplay();
    }

    /**
     * 验证精灵数组是否正确设置
     */
    private validateSprites(): void {
        if (this.energySprites.length !== 10) {
            console.warn(`EnergyProgressBar: Expected 10 sprites, but got ${this.energySprites.length}`);
        }

        // 检查是否有空的精灵引用
        for (let i = 0; i < this.energySprites.length; i++) {
            if (!this.energySprites[i]) {
                console.warn(`EnergyProgressBar: Sprite at index ${i} is null`);
            }
        }
    }

    /**
     * 设置最大能量值
     * @param maxEnergy 最大能量值
     */
    setMaxEnergy(maxEnergy: number): void {
        if (maxEnergy < 0) {
            console.warn("EnergyProgressBar: Max energy cannot be negative");
            return;
        }

        this._maxEnergy = maxEnergy;
        // 确保当前能量不超过最大值
        if (this._currentEnergy > this._maxEnergy) {
            this._currentEnergy = this._maxEnergy;
        }
        this.updateDisplay();
    }

    /**
     * 设置当前能量值
     * @param currentEnergy 当前能量值
     */
    setCurrentEnergy(currentEnergy: number): void {
        // 限制在0到最大值之间
        currentEnergy = Math.max(0, Math.min(currentEnergy, this._maxEnergy));
        
        if (this._currentEnergy !== currentEnergy) {
            this._currentEnergy = currentEnergy;
            this.updateDisplay();
        }
    }

    /**
     * 获取当前能量值
     */
    getCurrentEnergy(): number {
        return this._currentEnergy;
    }

    /**
     * 获取最大能量值
     */
    getMaxEnergy(): number {
        return this._maxEnergy;
    }

    /**
     * 增加能量
     * @param amount 增加的数量
     */
    addEnergy(amount: number): void {
        this.setCurrentEnergy(this._currentEnergy + amount);
    }

    /**
     * 减少能量
     * @param amount 减少的数量
     */
    removeEnergy(amount: number): void {
        this.setCurrentEnergy(this._currentEnergy - amount);
    }

    /**
     * 设置进度（0-1之间）
     * @param progress 进度值，0为空，1为满
     */
    setProgress(progress: number): void {
        progress = Math.max(0, Math.min(1, progress));
        const targetEnergy = Math.floor(progress * this._maxEnergy);
        this.setCurrentEnergy(targetEnergy);
    }

    /**
     * 获取当前进度（0-1之间）
     */
    getProgress(): number {
        if (this._maxEnergy === 0) return 0;
        return this._currentEnergy / this._maxEnergy;
    }

    /**
     * 更新显示
     */
    private updateDisplay(): void {
        if (!this.energySprites || this.energySprites.length === 0) {
            return;
        }

        // 计算应该显示多少个能量块
        const visibleCount = Math.ceil((this._currentEnergy / this._maxEnergy) * this.energySprites.length);

        // 更新每个精灵的显示状态
        for (let i = 0; i < this.energySprites.length; i++) {
            if (this.energySprites[i] && this.energySprites[i].node) {
                // 如果索引小于可见数量，则显示；否则隐藏
                this.energySprites[i].node.active = i < visibleCount;
            }
        }

        console.log(`EnergyProgressBar: Updated display - ${this._currentEnergy}/${this._maxEnergy} (${visibleCount}/10 sprites visible)`);
    }

    /**
     * 重置为满能量状态
     */
    reset(): void {
        this.setCurrentEnergy(this._maxEnergy);
    }

    /**
     * 清空能量
     */
    clear(): void {
        this.setCurrentEnergy(0);
    }

    /**
     * 检查是否为满能量
     */
    isFull(): boolean {
        return this._currentEnergy >= this._maxEnergy;
    }

    /**
     * 检查是否为空能量
     */
    isEmpty(): boolean {
        return this._currentEnergy <= 0;
    }
}