import { _decorator, Node, Label, Button, EditBox, EventTouch, instantiate, Component, ScrollView, Prefab, tween, Vec3, Vec2, UITransform, Sprite, Color, view, Widget, sp, UIOpacity } from 'cc';
import { CCComp } from "db://oops-framework/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { smc } from '../common/SingletonModuleComp';
import { CrashGameAudio } from '../config/CrashGameAudio';
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

    @property(Node)
    rocket_view_parent :Node = null!; // 火箭父节点

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

    private MAX_START_SOUND_TIME: number = 4; // 最大起飞声音时间

    private _rocket_start_sound_date: number = 0; // 火箭起飞时间

    private MAX_FLY_SOUND_TIME: number = 9; // 最大飞行声音时间

    private _rocket_fly_sound_date: number = 0; // 火箭开始飞行时间

    private _is_fly_sound_playing: boolean = false; // 是否已经播放飞行声效

    reset() {
        this.rocketState = RocketState.IDLE;
        this.sceneState = RocketSceneState.GROUND;
        this._backSceneState = RocketSceneState.GROUND;
        this.currentHeight = 0;
        this.isAnimationPlaying = false;
        this._is_fly_sound_playing = false; // 重置飞行声效播放标志
        this._rocket_start_sound_date = 0; // 重置起飞时间
        this._rocket_fly_sound_date = 0; // 重置飞行声效时间

        if(this.rocketSkeleton){
            const uiopacity = this.rocketSkeleton.node.getComponent(UIOpacity);
            if (uiopacity) {
                uiopacity.opacity = 255;
            }
            this.rocketSkeleton.node.active = true;
            this.rocketSkeleton.setAnimation(0, RocketAnimation.IDLE, true);
        }
        if(this.rocket_view_parent){
            this.rocket_view_parent.setScale(1,1,1);
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
        CrashGameAudio.playDogRocketLaunch();
        this._rocket_start_sound_date = Date.now() / 1000; // 记录起飞时间
    }

    /** 更新飞行高度 */
    updateFlying(multiplier: number): void {
    
        if (this.rocketState !== RocketState.FLYING){
            return;
        } 

        // 检测起飞声音是否播放完成，如果完成则播放飞行声效
        const currentTime = Date.now() / 1000;
        if (!this._is_fly_sound_playing && 
            currentTime - this._rocket_start_sound_date >= this.MAX_START_SOUND_TIME) {
            CrashGameAudio.playDogRocketFlyLoop();
            this._rocket_fly_sound_date = currentTime;
            this._is_fly_sound_playing = true;
        }
        if(this._is_fly_sound_playing &&
            currentTime - this._rocket_fly_sound_date >= this.MAX_FLY_SOUND_TIME){
            CrashGameAudio.playDogRocketFlyLoop();
            this._rocket_fly_sound_date = currentTime;
            this._is_fly_sound_playing = true;
        }

        // 根据倍数计算高度（倍数越高，飞得越高）
        this.currentHeight = (multiplier - 1.0) * this.flySpeed;

         if( this.sceneState !== this._backSceneState ) {
            if( this.sceneState === RocketSceneState.SKY ) {
                if(this.rocket_view_parent){
                    tween(this.rocket_view_parent).to(2.0, { scale: new Vec3(0.8,0.8,1) }, { easing: 'quadOut' }).start();
                }
            }
            if( this.sceneState === RocketSceneState.ATMOSPHERE ) {
                if(this.rocket_view_parent){
                    tween(this.rocket_view_parent).to(3.0, { scale: new Vec3(0.65,0.65,1) }, { easing: 'quadOut' }).start();
                }
                if(this.rocketSkeleton) {
                    this.rocketSkeleton.setAnimation(0, RocketAnimation.FLY2, true);
                }
            }
            if( this.sceneState === RocketSceneState.SPACE ) {
                if(this.rocket_view_parent){
                    tween(this.rocket_view_parent).to(3.0, { scale: new Vec3(0.58,0.58,1) }, { easing: 'quadOut' }).start();
                }
            }
            this._backSceneState = this.sceneState;
        }
    }

    stopFly():void{
        CrashGameAudio.stopDogRocketLaunch();
        CrashGameAudio.stopPlayDogRocketFlyLoop();
        this._is_fly_sound_playing = false;
        this._is_fly_sound_playing = false; // 重置飞行声效播放标志
        this._rocket_start_sound_date = 0; // 重置起飞时间
        this._rocket_fly_sound_date = 0; // 重置飞行声效时间
        if(this.rocket_view_parent){
            tween(this.rocket_view_parent).to(1.0, { scale: new Vec3(1,1,1) }, { easing: 'quadOut' }).start();
        }
    }

    /** 设置为崩盘状态 */
    setCrashState(): void {
        this.stopFly();
        this.rocketState = RocketState.CRASHED;
        this.isAnimationPlaying = true;
        if(this.rocketSkeleton){
            if(this.endBomb){
                this.endBomb.node.active = true;
                this.endBomb.setAnimation(0, this.defalut_anim, false);
                CrashGameAudio.playCrashExplosion();
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
        this.stopFly();
        this.rocketState = RocketState.LANDED;
        this.isAnimationPlaying = true;
        if(this.rocketSkeleton){
            this.rocketSkeleton.setAnimation(0, RocketAnimation.IDLE, true);
        }
    }
}