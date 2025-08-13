import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component, ScrollView, Prefab, tween, Vec3, Vec2, UITransform, Sprite, Color, view, Widget, sp, UIOpacity } from 'cc';
import { CCComp } from "db://oops-framework/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { smc } from '../common/SingletonModuleComp';
const { ccclass, property } = _decorator;

export enum RocketAnimation {
    IDLE = "daiji",
    FLY1 = "fei01",
    FLY2 = "fei02"
}

export enum RocketState {
    IDLE,       // 待机
    FLYING,     // 飞行中
    CRASHED,    // 崩盘
    LANDED      // 成功着陆
}

export enum RocketSceneState {
    GROUND = "ground",      // 地面场景
    SKY = "sky",           // 天空场景
    SPACE = "space",       // 太空场景
    ATMOSPHERE = "atmosphere" // 大气层场景
}

@ccclass("RocketViewComp")
@ecs.register('RocketView',false)
export class RocketViewComp extends CCComp {

    @property(sp.Skeleton)
    rocketSkeleton: sp.Skeleton = null!; // 火箭骨骼动画组件

     @property(sp.Skeleton)
    endBomb: sp.Skeleton = null!; // 崩盘结束动画

    /** 火箭状态 */
    rocketState: RocketState = RocketState.IDLE;

    /** 火箭场景状态 */
    sceneState: RocketSceneState = RocketSceneState.GROUND;

    /** 当前高度 */
    currentHeight: number = 0;

    /** 飞行速度 */
    flySpeed: number = 100; // 像素/秒

    /** 动画播放状态 */
    isAnimationPlaying: boolean = false;

    private defalut_anim:string = "animation";

    private _backSceneState: RocketSceneState = RocketSceneState.GROUND;

    reset() {
        this.rocketState = RocketState.IDLE;
        this.sceneState = RocketSceneState.GROUND;
        this._backSceneState = RocketSceneState.GROUND;
        this.currentHeight = 0;
        this.isAnimationPlaying = false;
        if(this.rocketSkeleton){
            const uiopacity = this.rocketSkeleton.node.getComponent(UIOpacity);
            if (uiopacity) {
                uiopacity.opacity = 255;
            }
            this.rocketSkeleton.node.active = true;
            this.rocketSkeleton.setAnimation(0, RocketAnimation.IDLE, true);
        }
    }

    protected onLoad(): void {
        // 初始化火箭状态   
        smc.crashGame.add(this as ecs.Comp); 
    }

    protected start(): void {
        
    }

    /** 设置为起飞状态 */
    setTakeoffState(): void {
        this.rocketState = RocketState.FLYING;
        this.currentHeight = 0;
        this.isAnimationPlaying = true;
        if(this.rocketSkeleton) {
            this.rocketSkeleton.setAnimation(0, RocketAnimation.FLY1, true);
        }
    }

    /** 更新飞行高度 */
    updateFlying(multiplier: number): void {
    
        if (this.rocketState !== RocketState.FLYING) return;

        // 根据倍数计算高度（倍数越高，飞得越高）
        this.currentHeight = (multiplier - 1.0) * this.flySpeed;

         if( this.sceneState !== this._backSceneState ) {
            if( this.sceneState === RocketSceneState.ATMOSPHERE ) {
                if(this.rocketSkeleton) {
                    this.rocketSkeleton.setAnimation(0, RocketAnimation.FLY2, true);
                }
            }
            this._backSceneState = this.sceneState;
        }
    }

    /** 设置为崩盘状态 */
    setCrashState(): void {
        this.rocketState = RocketState.CRASHED;
        this.isAnimationPlaying = true;
        if(this.rocketSkeleton){
            if(this.endBomb){
                this.endBomb.node.active = true;
                this.endBomb.setAnimation(0, this.defalut_anim, false);
            }
            const uiopacity = this.rocketSkeleton.node.getComponent(UIOpacity);
            if(uiopacity){
                tween(uiopacity).to(0.1, { opacity: 0 }, { easing: 'quadIn' })
                    .call(() => {
                        this.rocketSkeleton.node.active = false;
                    })
                    .start();
            }
            
        }
        
    }

    /** 设置为着陆状态 */
    setLandingState(): void {
        this.rocketState = RocketState.LANDED;
        this.isAnimationPlaying = true;
        if(this.rocketSkeleton){
            this.rocketSkeleton.setAnimation(0, RocketAnimation.IDLE, true);
        }
    }
}