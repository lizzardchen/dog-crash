import { _decorator, Component, Node, Animation, Tween, tween } from 'cc';
import { SceneBackgroundComp, SceneType, SceneLayer } from '../comp/SceneBackgroundComp';

const { ccclass, property } = _decorator;

/**
 * 场景脚本组件 - 挂载在场景预制体上
 * 负责处理单个场景的视觉效果、动画等
 */
@ccclass('SceneScriptComp')
export class SceneScriptComp extends Component {
    @property({ type: String, tooltip: "场景类型 (ground/sky/space)" })
    sceneType: string = "ground";

    @property({ type: String, tooltip: "场景层级 (back/front)" })
    sceneLayer: string = "back";

    @property({ type: Number, tooltip: "基础移动速度" })
    baseSpeed: number = 50;

    @property({ type: Boolean, tooltip: "是否启用循环滚动" })
    enableLoopScroll: boolean = true;

    @property({ type: Node, tooltip: "可滚动的内容节点" })
    scrollContent: Node = null!;

    @property({ type: Animation, tooltip: "场景动画组件" })
    sceneAnimation: Animation = null!;

    // 运行时数据
    private currentSpeed: number = 0;
    private scrollOffset: number = 0;
    private isActive: boolean = false;
    private scrollTween: Tween<Node> | null = null;

    onLoad() {
        this.currentSpeed = this.baseSpeed;
        console.log(`SceneScriptComp loaded: ${this.sceneType}_${this.sceneLayer}`);
    }

    start() {
        // 初始化场景状态
        this.setActive(false);
    }

    /**
     * 设置场景激活状态
     */
    setActive(active: boolean): void {
        this.isActive = active;
        this.node.active = active;

        if (active) {
            this.startSceneEffects();
        } else {
            this.stopSceneEffects();
        }
    }

    /**
     * 更新滚动速度
     */
    updateScrollSpeed(speedMultiplier: number): void {
        this.currentSpeed = this.baseSpeed * speedMultiplier;

        // 如果正在滚动，重新启动滚动动画
        if (this.isActive && this.enableLoopScroll) {
            this.startScrollAnimation();
        }
    }

    /**
     * 启动场景效果
     */
    private startSceneEffects(): void {
        // 播放场景进入动画
        if (this.sceneAnimation) {
            this.sceneAnimation.play(`${this.sceneType}_enter`);
        }

        // 启动滚动动画
        if (this.enableLoopScroll) {
            this.startScrollAnimation();
        }

        console.log(`Scene ${this.sceneType}_${this.sceneLayer} activated`);
    }

    /**
     * 停止场景效果
     */
    private stopSceneEffects(): void {
        // 停止滚动动画
        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }

        // 播放场景退出动画
        if (this.sceneAnimation) {
            this.sceneAnimation.play(`${this.sceneType}_exit`);
        }

        console.log(`Scene ${this.sceneType}_${this.sceneLayer} deactivated`);
    }

    /**
     * 启动滚动动画
     */
    private startScrollAnimation(): void {
        if (!this.scrollContent || this.currentSpeed <= 0) return;

        // 停止之前的动画
        if (this.scrollTween) {
            this.scrollTween.stop();
        }

        // 计算滚动距离和时间
        const contentHeight = this.scrollContent.getContentSize().height;
        const scrollTime = contentHeight / this.currentSpeed;

        // 重置位置
        this.scrollContent.setPosition(0, 0);

        // 创建循环滚动动画
        this.scrollTween = tween(this.scrollContent)
            .to(scrollTime, { position: this.scrollContent.position.clone().add3f(0, -contentHeight, 0) })
            .call(() => {
                // 动画完成后重置位置并重新开始
                this.scrollContent.setPosition(0, 0);
                if (this.isActive && this.enableLoopScroll) {
                    this.startScrollAnimation();
                }
            })
            .start();
    }

    /**
     * 播放场景特效
     */
    playSceneEffect(effectName: string): void {
        if (this.sceneAnimation) {
            this.sceneAnimation.play(effectName);
        }
    }

    /**
     * 获取场景信息
     */
    getSceneInfo(): { type: string, layer: string } {
        return {
            type: this.sceneType,
            layer: this.sceneLayer
        };
    }

    onDestroy() {
        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }
    }
}