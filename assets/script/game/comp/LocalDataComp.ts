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
        // 简单的随机算法，后期可替换为服务器端算法
        const random = Math.random();
        if (random < 0.5) return 1.0 + Math.random() * 2.0; // 1.0 - 3.0
        if (random < 0.8) return 3.0 + Math.random() * 2.0; // 3.0 - 5.0
        if (random < 0.95) return 5.0 + Math.random() * 5.0; // 5.0 - 10.0
        return 10.0 + Math.random() * 10.0; // 10.0 - 20.0
    }
}