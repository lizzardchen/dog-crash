import { _decorator, Component, Node, Animation, Tween, tween, CCString, CCFloat, CCBoolean, UITransform, sp, ParticleSystem2D, Sprite } from 'cc';
import { SceneBackgroundComp, SceneLayer } from '../comp/SceneBackgroundComp';
import { smc } from '../common/SingletonModuleComp';

const { ccclass, property } = _decorator;

/** 子节点运动类型 */
export enum NodeMotionType {
    SCROLL = "scroll",           // 滚动运动
    FLOAT = "float",            // 浮动运动
    ROTATE = "rotate",          // 旋转运动
    SCALE_PULSE = "scale_pulse", // 缩放脉冲
    CUSTOM_PATH = "custom_path"  // 自定义路径
}

/** 子节点配置 */
@ccclass('SceneNodeConfig')
export class SceneNodeConfig {
    @property({ type: Node, tooltip: "目标节点" })
    targetNode: Node = null!;

    @property({ type: CCString, tooltip: "节点类型 (image/spine/particle)" })
    nodeType: string = "image";

    @property({ type: CCString, tooltip: "运动类型" })
    motionType: string = NodeMotionType.SCROLL;

    @property({ type: CCFloat, tooltip: "速度倍数" })
    speedMultiplier: number = 1.0;

    @property({ type: CCBoolean, tooltip: "是否受全局速度影响" })
    affectedByGlobalSpeed: boolean = true;
}

/**
 * 场景脚本组件 - 挂载在场景预制体上
 * 根据SceneBackgroundComp的数值控制场景内各种子节点的运动和动画
 */
@ccclass('SceneScriptComp')
export class SceneScriptComp extends Component {
    @property({ type: [SceneNodeConfig], tooltip: "子节点配置数组" })
    nodeConfigs: SceneNodeConfig[] = [];

    @property({ type: Animation, tooltip: "场景动画组件" })
    sceneAnimation: Animation = null!;

    @property({ type: Node, tooltip: "可滚动的内容节点" })
    scrollContent: Node = null!;

    // 运行时数据 - 这些信息由外部系统设置
    private sceneInfo: { type: string, layer: string } = { type: "unknown", layer: "unknown" };
    private isActive: boolean = false;
    private nodeTweens: Map<Node, Tween<Node>> = new Map();
    private currentGlobalSpeed: number = 1.0;
    private scrollTween: Tween<Node> | null = null;

    onLoad() {
        console.log(`SceneScriptComp loaded: ${this.node.name}`);
        this.initializeNodes();
    }

    start() {
        // 初始化场景状态 - 默认不激活
        this.setActive(false);
        console.log(`SceneScriptComp started: ${this.node.name}, nodes: ${this.nodeConfigs.length}`);
    }

    /**
     * 设置场景信息（由外部系统调用）
     * @param sceneType 场景类型 (ground/sky/atmosphere/space)
     * @param sceneLayer 场景层级 (back/front)
     */
    setSceneInfo(sceneType: string, sceneLayer: string): void {
        this.sceneInfo = { type: sceneType, layer: sceneLayer };
        console.log(`Scene info set for ${this.node.name}: ${sceneType}_${sceneLayer}`);

        // 如果场景已经激活，重新启动效果以应用新的场景信息
        if (this.isActive) {
            this.stopSceneEffects();
            this.startSceneEffects();
        }
    }

    /** 初始化所有子节点 */
    private initializeNodes(): void {
        this.nodeConfigs.forEach(config => {
            if (!config.targetNode) return;

            // 根据节点类型进行初始化
            switch (config.nodeType) {
                case "spine":
                    this.initSpineNode(config);
                    break;
                case "particle":
                    this.initParticleNode(config);
                    break;
                case "image":
                default:
                    this.initImageNode(config);
                    break;
            }
        });
    }

    /** 初始化Image节点 */
    private initImageNode(config: SceneNodeConfig): void {
        const sprite = config.targetNode.getComponent(Sprite);
        if (sprite) {
            console.log(`Initialized image node: ${config.targetNode.name}`);
        }
    }

    /** 初始化Spine节点 */
    private initSpineNode(config: SceneNodeConfig): void {
        const skeleton = config.targetNode.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, "idle", true);
            console.log(`Initialized spine node: ${config.targetNode.name}`);
        }
    }

    /** 初始化粒子节点 */
    private initParticleNode(config: SceneNodeConfig): void {
        const particle = config.targetNode.getComponent(ParticleSystem2D);
        if (particle) {
            particle.emissionRate = 10;
            console.log(`Initialized particle node: ${config.targetNode.name}`);
        }
    }

    /**
     * 设置场景激活状态
     */
    setActive(active: boolean): void {
        this.isActive = active;
        // 注意：不要设置node.active，因为这会影响整个场景节点的显示
        // this.node.active = active;

        if (active) {
            this.startSceneEffects();
            console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} activated`);
        } else {
            this.stopSceneEffects();
            console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} deactivated`);
        }
    }

    /**
     * 更新场景速度 - 根据SceneBackgroundComp的数值
     */
    updateFromSceneComp(): void {
        if (!smc.crashGame) return;

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (!sceneComp) return;

        // 获取当前层级的速度
        const layer = this.sceneInfo.layer === "back" ? SceneLayer.BACK : SceneLayer.FRONT;
        const currentSpeed = sceneComp.getCurrentScrollSpeed(layer);

        // 计算速度倍数
        const baseSpeed = this.sceneInfo.layer === "back" ? sceneComp.baseBackScrollSpeed : sceneComp.baseFrontScrollSpeed;
        this.currentGlobalSpeed = baseSpeed > 0 ? currentSpeed / baseSpeed : 1.0;

        // 更新所有子节点的运动
        if (this.isActive) {
            this.updateAllNodeMotions();
        }
    }

    /**
     * 启动场景效果
     */
    private startSceneEffects(): void {
        // 播放场景进入动画
        if (this.sceneAnimation) {
            this.sceneAnimation.play(`${this.sceneInfo.type}_enter`);
        }

        // 启动所有子节点的运动
        this.startAllNodeMotions();

        console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} activated`);
    }

    /**
     * 停止场景效果
     */
    private stopSceneEffects(): void {
        // 停止所有子节点的运动
        this.stopAllNodeMotions();

        // 播放场景退出动画
        if (this.sceneAnimation) {
            this.sceneAnimation.play(`${this.sceneInfo.type}_exit`);
        }

        console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} deactivated`);
    }

    /** 启动所有子节点的运动 */
    private startAllNodeMotions(): void {
        this.nodeConfigs.forEach(config => {
            this.startNodeMotion(config);
        });
    }

    /** 停止所有子节点的运动 */
    private stopAllNodeMotions(): void {
        this.nodeTweens.forEach(tween => {
            tween.stop();
        });
        this.nodeTweens.clear();

        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }
    }

    /** 更新所有子节点的运动 */
    private updateAllNodeMotions(): void {
        this.nodeConfigs.forEach(config => {
            this.updateNodeMotion(config);
        });
    }

    /** 启动单个节点的运动 */
    private startNodeMotion(config: SceneNodeConfig): void {
        if (!config.targetNode) return;

        const finalSpeed = config.affectedByGlobalSpeed ?
            config.speedMultiplier * this.currentGlobalSpeed :
            config.speedMultiplier;

        switch (config.motionType) {
            case NodeMotionType.SCROLL:
                this.startScrollMotion(config, finalSpeed);
                break;
            case NodeMotionType.FLOAT:
                this.startFloatMotion(config, finalSpeed);
                break;
            case NodeMotionType.ROTATE:
                this.startRotateMotion(config, finalSpeed);
                break;
            case NodeMotionType.SCALE_PULSE:
                this.startScalePulseMotion(config, finalSpeed);
                break;
            case NodeMotionType.CUSTOM_PATH:
                this.startCustomPathMotion(config, finalSpeed);
                break;
        }

        // 根据节点类型更新特定属性
        this.updateNodeByType(config, finalSpeed);
    }

    /** 更新单个节点的运动 */
    private updateNodeMotion(config: SceneNodeConfig): void {
        // 停止当前运动
        const existingTween = this.nodeTweens.get(config.targetNode);
        if (existingTween) {
            existingTween.stop();
            this.nodeTweens.delete(config.targetNode);
        }

        // 重新启动运动
        this.startNodeMotion(config);
    }

    /** 滚动运动 */
    private startScrollMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        const uiTransform = node.getComponent(UITransform);
        if (!uiTransform) return;

        const contentHeight = uiTransform.contentSize.height;
        if (contentHeight <= 0) return;

        const scrollSpeed = speed * 50; // 基础滚动速度
        const scrollTime = contentHeight / scrollSpeed;

        // 创建无缝循环滚动
        const initialY = node.position.y;
        const scrollTween = tween(node)
            .repeatForever(
                tween(node)
                    .to(scrollTime, { position: node.position.clone().add3f(0, -contentHeight, 0) })
                    .call(() => {
                        // 重置到起始位置，创建无缝循环
                        node.setPosition(node.position.x, initialY);
                    })
            )
            .start();

        this.nodeTweens.set(node, scrollTween);
    }

    /** 浮动运动 */
    private startFloatMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        const floatRange = 20 * speed;
        const floatTime = 2.0 / speed;

        const floatTween = tween(node)
            .repeatForever(
                tween(node)
                    .to(floatTime, { position: node.position.clone().add3f(0, floatRange, 0) })
                    .to(floatTime, { position: node.position.clone().add3f(0, -floatRange, 0) })
            )
            .start();

        this.nodeTweens.set(node, floatTween);
    }

    /** 旋转运动 */
    private startRotateMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        const rotateTime = 5.0 / speed;

        const rotateTween = tween(node)
            .repeatForever(
                tween(node)
                    .to(rotateTime, { angle: 360 })
                    .call(() => { node.angle = 0; })
            )
            .start();

        this.nodeTweens.set(node, rotateTween);
    }

    /** 缩放脉冲运动 */
    private startScalePulseMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        const pulseScale = 0.1 * speed;
        const pulseTime = 1.0 / speed;

        const pulseTween = tween(node)
            .repeatForever(
                tween(node)
                    .to(pulseTime, { scale: node.scale.clone().multiplyScalar(1 + pulseScale) })
                    .to(pulseTime, { scale: node.scale.clone().multiplyScalar(1 - pulseScale) })
            )
            .start();

        this.nodeTweens.set(node, pulseTween);
    }

    /** 自定义路径运动 */
    private startCustomPathMotion(config: SceneNodeConfig, speed: number): void {
        console.log(`Custom path motion for ${config.targetNode.name} with speed ${speed}`);
    }

    /** 根据节点类型更新特定属性 */
    private updateNodeByType(config: SceneNodeConfig, speed: number): void {
        switch (config.nodeType) {
            case "spine":
                this.updateSpineNode(config, speed);
                break;
            case "particle":
                this.updateParticleNode(config, speed);
                break;
            case "image":
            default:
                this.updateImageNode(config, speed);
                break;
        }
    }

    /** 更新Image节点 */
    private updateImageNode(config: SceneNodeConfig, speed: number): void {
        const sprite = config.targetNode.getComponent(Sprite);
        if (sprite) {
            const alpha = Math.min(255, 100 + speed * 50);
            sprite.color = sprite.color.clone().set(sprite.color.r, sprite.color.g, sprite.color.b, alpha);
        }
    }

    /** 更新Spine节点 */
    private updateSpineNode(config: SceneNodeConfig, speed: number): void {
        const skeleton = config.targetNode.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.timeScale = speed;

            if (speed > 2.0) {
                skeleton.setAnimation(0, "fast", true);
            } else if (speed > 1.0) {
                skeleton.setAnimation(0, "normal", true);
            } else {
                skeleton.setAnimation(0, "slow", true);
            }
        }
    }

    /** 更新粒子节点 */
    private updateParticleNode(config: SceneNodeConfig, speed: number): void {
        const particle = config.targetNode.getComponent(ParticleSystem2D);
        if (particle) {
            particle.emissionRate = 10 * speed;
            // 注意：ParticleSystem2D的属性名可能不同，需要根据实际API调整
            // particle.startSpeed = 100 * speed;
            // particle.startSpeedVar = 50 * speed;
        }
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
     * 更新滚动偏移（由 SceneBackgroundSystem 调用）
     * 实现无缝循环滚动
     */
    updateScrollOffset(offset: number): void {
        // 确保场景已激活
        if (!this.isActive) {
            this.setActive(true);
        }

        // 使用scrollContent或整个节点作为滚动内容
        const scrollNode = this.scrollContent || this.node;
        const uiTransform = scrollNode.getComponent(UITransform);

        if (!uiTransform) {
            console.warn(`No UITransform found on scroll node: ${scrollNode.name}`);
            return;
        }

        // 获取内容高度，如果没有设置则使用屏幕高度
        let contentHeight = uiTransform.contentSize.height;
        if (contentHeight <= 0) {
            contentHeight = 1334; // 默认屏幕高度
        }

        // 实现无缝循环滚动
        // 使用双倍内容高度来确保无缝循环
        const loopHeight = contentHeight * 2;
        const normalizedOffset = offset % loopHeight;

        // 计算滚动位置
        let scrollY = -normalizedOffset;

        // 当滚动超过一个内容高度时，重置位置实现循环
        if (normalizedOffset > contentHeight) {
            scrollY = -(normalizedOffset - contentHeight);
        }

        // 设置滚动位置
        scrollNode.setPosition(0, scrollY);

        // 调试信息（减少输出频率）
        if (Math.floor(offset / 200) !== Math.floor((offset - 10) / 200)) {
            console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} scroll: offset=${offset.toFixed(1)}, y=${scrollY.toFixed(1)}, height=${contentHeight}`);
        }
    }

    /**
     * 获取场景信息
     */
    getSceneInfo(): { type: string, layer: string } {
        return { ...this.sceneInfo };
    }

    onDestroy() {
        this.stopAllNodeMotions();
    }
}