import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

@ecs.register('LocalData')
export class LocalDataComp extends ecs.Comp {
    /** 当前游戏会话的崩盘倍数（本地随机生成） */
    currentCrashMultiplier: number = 0;

    reset() {
        this.currentCrashMultiplier = 0;
    }

    /** 生成本局游戏的崩盘倍数 */
    generateCrashMultiplier(): number {
        // 改进的随机算法，提供更合理的游戏时长分布
        const random = Math.random();

        // 30% 概率：早期崩盘 (1.1x - 2.0x) - 约1-8秒
        if (random < 0.3) {
            return 1.1 + Math.random() * 0.9; // 1.1 - 2.0
        }
        // 40% 概率：中期崩盘 (2.0x - 4.0x) - 约8-15秒
        else if (random < 0.7) {
            return 2.0 + Math.random() * 2.0; // 2.0 - 4.0
        }
        // 20% 概率：后期崩盘 (4.0x - 8.0x) - 约15-25秒
        else if (random < 0.9) {
            return 4.0 + Math.random() * 4.0; // 4.0 - 8.0
        }
        // 8% 概率：高倍数崩盘 (8.0x - 15.0x) - 约25-40秒
        else if (random < 0.98) {
            return 8.0 + Math.random() * 7.0; // 8.0 - 15.0
        }
        // 2% 概率：超高倍数崩盘 (15.0x - 30.0x) - 约40秒以上
        else {
            return 15.0 + Math.random() * 15.0; // 15.0 - 30.0
        }
    }
}