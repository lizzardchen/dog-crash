import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export enum RocketState {
    IDLE,       // 待机
    FLYING,     // 飞行中
    CRASHED,    // 崩盘
    LANDED      // 成功着陆
}

@ecs.register('RocketView')
export class RocketViewComp extends ecs.Comp {
    /** 火箭状态 */
    rocketState: RocketState = RocketState.IDLE;

    /** 当前高度 */
    currentHeight: number = 0;

    /** 飞行速度 */
    flySpeed: number = 100; // 像素/秒

    /** 动画播放状态 */
    isAnimationPlaying: boolean = false;

    reset() {
        this.rocketState = RocketState.IDLE;
        this.currentHeight = 0;
        this.isAnimationPlaying = false;
    }

    /** 设置为起飞状态 */
    setTakeoffState(): void {
        this.rocketState = RocketState.FLYING;
        this.currentHeight = 0;
        this.isAnimationPlaying = true;
    }

    /** 更新飞行高度 */
    updateFlying(multiplier: number): void {
        if (this.rocketState !== RocketState.FLYING) return;

        // 根据倍数计算高度（倍数越高，飞得越高）
        this.currentHeight = (multiplier - 1.0) * this.flySpeed;
    }

    /** 设置为崩盘状态 */
    setCrashState(): void {
        this.rocketState = RocketState.CRASHED;
        this.isAnimationPlaying = true;
    }

    /** 设置为着陆状态 */
    setLandingState(): void {
        this.rocketState = RocketState.LANDED;
        this.isAnimationPlaying = true;
    }
}