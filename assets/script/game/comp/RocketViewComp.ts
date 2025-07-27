import { _decorator, Component, Node, ParticleSystem, Animation, Vec3 } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

const { ccclass, property } = _decorator;

export enum RocketState {
    IDLE,       // 待机
    FLYING,     // 飞行中
    CRASHED,    // 崩盘
    LANDED      // 成功着陆
}

@ccclass('RocketViewComp')
@ecs.register('RocketView', false)
export class RocketViewComp extends CCComp {
    @property(Node)
    rocketNode: Node = null!;

    @property(Node)
    dogNode: Node = null!;

    @property(ParticleSystem)
    thrustParticle: ParticleSystem = null!;

    @property(ParticleSystem)
    explosionParticle: ParticleSystem = null!;

    @property(Animation)
    dogAnimation: Animation = null!;

    /** 火箭状态 */
    rocketState: RocketState = RocketState.IDLE;

    /** 当前高度 */
    currentHeight: number = 0;

    /** 初始位置 */
    private initialPosition: Vec3 = new Vec3();

    /** 飞行速度 */
    private flySpeed: number = 100; // 像素/秒

    onLoad() {
        // 记录初始位置
        if (this.rocketNode) {
            this.initialPosition.set(this.rocketNode.position);
        }
    }

    /** 起飞动画播放 */
    playTakeoff(): void {
        this.rocketState = RocketState.FLYING;
        this.currentHeight = 0;

        // 重置到初始位置
        if (this.rocketNode) {
            this.rocketNode.setPosition(this.initialPosition);
        }

        // 播放推进器粒子效果
        if (this.thrustParticle) {
            this.thrustParticle.play();
        }

        // 播放小狗动画
        if (this.dogAnimation) {
            this.dogAnimation.play("flying");
        }

        // 使用oops.pool管理特效
        oops.pool.show("effects/rocket_takeoff", this.node);

        console.log("Rocket takeoff animation started");
    }

    /** 更新飞行状态 */
    updateFlying(deltaTime: number, multiplier: number): void {
        if (this.rocketState !== RocketState.FLYING) return;

        // 根据倍数计算高度（倍数越高，飞得越高）
        const targetHeight = (multiplier - 1.0) * this.flySpeed;
        this.currentHeight = targetHeight;

        // 更新火箭位置
        if (this.rocketNode) {
            const newPos = new Vec3(
                this.initialPosition.x,
                this.initialPosition.y + this.currentHeight,
                this.initialPosition.z
            );
            this.rocketNode.setPosition(newPos);
        }

        // 根据高度调整小狗动画速度
        if (this.dogAnimation && this.dogAnimation.getState("flying")) {
            const animSpeed = Math.min(1.0 + multiplier * 0.1, 2.0);
            this.dogAnimation.getState("flying").speed = animSpeed;
        }
    }

    /** 崩盘动画播放 */
    playCrash(): void {
        this.rocketState = RocketState.CRASHED;

        // 停止推进器效果
        if (this.thrustParticle) {
            this.thrustParticle.stop();
        }

        // 播放爆炸效果
        if (this.explosionParticle) {
            this.explosionParticle.play();
        }

        // 播放小狗崩盘动画
        if (this.dogAnimation) {
            this.dogAnimation.play("crashed");
        }

        // 使用oops.pool管理爆炸特效
        oops.pool.show("effects/explosion", this.node);

        console.log("Rocket crash animation started");
    }

    /** 成功着陆动画播放 */
    playLanding(): void {
        this.rocketState = RocketState.LANDED;

        // 停止推进器效果
        if (this.thrustParticle) {
            this.thrustParticle.stop();
        }

        // 播放小狗成功动画
        if (this.dogAnimation) {
            this.dogAnimation.play("success");
        }

        // 使用oops.pool管理成功特效
        oops.pool.show("effects/success", this.node);

        console.log("Rocket landing animation started");
    }

    /** 重置状态 */
    reset(): void {
        this.rocketState = RocketState.IDLE;
        this.currentHeight = 0;

        // 重置位置
        if (this.rocketNode) {
            this.rocketNode.setPosition(this.initialPosition);
        }

        // 停止所有粒子效果
        if (this.thrustParticle) {
            this.thrustParticle.stop();
        }
        if (this.explosionParticle) {
            this.explosionParticle.stop();
        }

        // 停止动画
        if (this.dogAnimation) {
            this.dogAnimation.stop();
        }

        console.log("Rocket view reset");
    }
}