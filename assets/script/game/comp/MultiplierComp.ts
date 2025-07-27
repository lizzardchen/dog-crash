import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export interface MultiplierTableEntry {
    time: number;        // 时间点（秒）
    multiplier: number;  // 对应的倍数
}

@ecs.register('Multiplier')
export class MultiplierComp extends ecs.Comp {
    currentMultiplier: number = 1.0;
    cashOutMultiplier: number = 0;
    multiplierTable: MultiplierTableEntry[] = [];
    startTime: number = 0;

    reset() {
        this.currentMultiplier = 1.0;
        this.cashOutMultiplier = 0;
        this.startTime = 0;
    }
}