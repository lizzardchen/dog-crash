import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { MultiplierConfig } from "../config/MultiplierConfig";

@ecs.register('LocalData')
export class LocalDataComp extends ecs.Comp {
    /** 当前游戏会话的崩盘倍数（本地随机生成） */
    currentCrashMultiplier: number = 0;

    reset() {
        this.currentCrashMultiplier = 0;
    }

    /** 生成本局游戏的崩盘倍数 */
    generateCrashMultiplier(): number {
        // return 251.0;
        return MultiplierConfig.generateCrashMultiplier();
    }
}