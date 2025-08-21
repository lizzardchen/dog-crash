import { _decorator, Component, Node, Animation, Tween, tween, CCString, CCFloat, CCBoolean, UITransform, sp, ParticleSystem2D, Sprite, view, Vec3, Widget, UIOpacity } from 'cc';
import { SceneBackgroundComp, SceneLayer } from '../comp/SceneBackgroundComp';
import { smc } from '../common/SingletonModuleComp';
import { ScenePhysicalResult } from '../config/MultiplierConfig';
import { RocketSceneState } from '../comp/RocketViewComp';
import { ThreeSliceStretch } from '../../utils/ThreeSliceStretch';
import { GameState, GameStateComp } from '../comp/GameStateComp';

const { ccclass, property } = _decorator;

/** 子节点运动类型 */
export enum NodeMotionType {
    SCROLL = "scroll",           // 滚动运动
    FLOAT = "float",            // 浮动运动
    ROTATE = "rotate",          // 旋转运动
    SCALE_PULSE = "scale_pulse", // 缩放脉冲
    CUSTOM_PATH = "custom_path",  // 自定义路径
    STATIC = "static"              // 静止不动
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

    @property({ type: CCBoolean, tooltip: "是否是背景节点（用于滚动循环）" })
    isBackground: boolean = false;

    public scrollTween:Tween<Node> | null = null;

    private _originalY: number = 0; // 用于记录初始Y位置

    private _originalH:number = 1000;

    backNodeY() {
        this._originalY = this.targetNode.y;
    }
    restoreNodeY(){
        this.targetNode.y = this._originalY;
    }

    backParentH() {
        this._originalH = this.targetNode.parent?.h||1000;
    }

    originalY():number{
        return this._originalY;
    }

    originalH():number{
        return this._originalH;
    }
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

    @property({type:ThreeSliceStretch})
    bgStretch: ThreeSliceStretch = null!;

    @property({ type: CCString, tooltip: "全局速度倍率" })
    front_or_back:String = "back";

    // 运行时数据 - 这些信息由外部系统设置
    private sceneInfo: { type: string, layer: string } = { type: "unknown", layer: "unknown" };
    private isActive: boolean = false;
    private isNeedStartMotion:boolean = false;
    private nodeTweens: Map<Node, Tween<Node>> = new Map();
    private currentGlobalSpeed: number = 1.0;
    private scrollTween: Tween<Node> | null = null;
    private nodeDataMap: Map<Node, {originalY: number}> = new Map();
    private lastGameState: GameState | null = null;

    start() {
        // 初始化场景状态 - 默认不激活
        // this.setActive(false);
        // console.log(`SceneScriptComp started: ${this.node.name}, nodes: ${this.nodeConfigs.length}`);
    }

    protected update(dt: number): void {
        if (smc.crashGame) {
            const gameStateComp = smc.crashGame.get(GameStateComp);
            if (gameStateComp) {
                const currentState = gameStateComp.state;
                // 检测状态变化
                if (currentState !== this.lastGameState) {
                    this.onGameStateChanged(this.lastGameState, currentState);
                    this.lastGameState = currentState;
                }
                if(currentState === GameState.FLYING&&this.isNeedStartMotion){
                    this.startSceneEffects();
                    this.isNeedStartMotion = false;
                }
            }
        }
    }

    /**
     * 游戏状态变化处理
     */
    private onGameStateChanged(oldState: GameState | null, newState: GameState): void {
        if (newState === GameState.WAITING || newState === GameState.INIT) {
            // 停止场景效果（包括非背景节点动画）
            this.stopSceneEffects();
        } else if (newState === GameState.FLYING) {
            // 启动场景效果（包括非背景节点动画）
            this.startSceneEffects();
            this.isNeedStartMotion = false;
        }
    }

    /**
     * 设置场景信息（由外部系统调用）
     * @param sceneType 场景类型 (ground/sky/atmosphere/space)
     * @param sceneLayer 场景层级 (back/front)
     */
    setSceneInfo(sceneType: string, sceneLayer: string): void {
        this.sceneInfo = { type: sceneType, layer: sceneLayer };
        console.log(`Scene info set for ${this.node.name}: ${sceneType}_${sceneLayer}`);
    }

    /** 初始化所有子节点 */
    public initializeNodes(): void {
        this.nodeConfigs.forEach(config => {
            if (!config.targetNode) return;

            config.backNodeY();
            config.backParentH();
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
            if(!config.targetNode.getComponent(UIOpacity)){
              const uiopacity =  config.targetNode.addComponent(UIOpacity);
              if( this.node.name.includes("ground") ){
                uiopacity.opacity = 255;
              }else{
                uiopacity.opacity = 0;
              }
            }
        }
    }

    /** 初始化Spine节点 */
    private initSpineNode(config: SceneNodeConfig): void {
        const skeleton = config.targetNode.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, "animation", true);
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
        const gameStateComp = smc.crashGame.get(GameStateComp);
        if (gameStateComp) {
            this.lastGameState = gameStateComp.state;
        }
        if (active) {
            if( this.lastGameState === GameState.FLYING ){
                this.startSceneEffects();
                this.isNeedStartMotion = false;
            }
            else{
                this.isNeedStartMotion = true;
            }
            console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} activated`);
        } else {
            this.stopSceneEffects();
            console.log(`Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} deactivated`);
        }
        
    }

    ResetScenePhysicInfo(physicInfo: ScenePhysicalResult): void {
        const uitransform = this.getComponent(UITransform);
        if (!uitransform) {
            console.warn("UITransform component not found on scene node");
            return;
        }

        // 记录旧的高度
        const oldHeight = uitransform.contentSize.height;
        let newHeight = physicInfo.sceneHeight;
        if (physicInfo.rocketState == RocketSceneState.GROUND && this.node.parent) {
            const parent_uitransform = this.node.parent.getComponent(UITransform);
            newHeight = (parent_uitransform?.contentSize.height || 0) + (newHeight < 0 ? 0 : newHeight);
            if(this.front_or_back == "back"){
                physicInfo.sceneHeight = newHeight;
            }
        }

        // 如果高度没有变化，直接返回
        if (Math.abs(oldHeight - newHeight) < 1) {
            return;
        }

        // 设置新的高度和宽度（宽度等于高度）
        uitransform.setContentSize(view.getVisibleSize().width, newHeight);

        // 计算位置缩放比例：y2/(newHeight/2) = y1/(oldHeight/2) => y2 = y1 * newHeight / oldHeight
        const scaleRatio = newHeight / oldHeight;

        console.log(`Scene ${physicInfo.sceneName} physics info reset: ${oldHeight.toFixed(2)}px -> ${newHeight.toFixed(2)}px (ratio: ${scaleRatio.toFixed(3)})`);

        // 立即生效：强制刷新UI布局
        uitransform.node.updateWorldTransform();

        // 如果有滚动内容，也需要立即刷新
        if (this.scrollContent) {
            this.scrollContent.updateWorldTransform();
            const widget = this.scrollContent.getComponent(Widget);
            if(widget){
                widget.updateAlignment();
            }
        }
         if( this.bgStretch ){
            this.bgStretch.updateLayout();
        }

        // 调整所有非背景节点的位置
        this.nodeConfigs.forEach(config => {
            if (!config.isBackground && config.targetNode) {
                // 按比例调整Y位置（相对于场景中心）
                const newY = config.originalY() * scaleRatio;
                config.targetNode.y = newY;
            }
        });
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

        console.log(`11111111111 ${this.node.name} Scene ${this.sceneInfo.type}_${this.sceneInfo.layer} activated. 1111111111111111`);
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
    }

    /** 启动所有子节点的运动 */
    private startAllNodeMotions(): void {
        this.nodeConfigs.forEach(config => {
            this.startNodeMotion(config);
        });
    }

    /** 停止所有子节点的运动 */
    private stopAllNodeMotions(): void {
        this.nodeConfigs.forEach(config => {
            this.StopNodeMotion(config);
        });
        this.nodeTweens.forEach(tween => {
            tween.stop();
        });
        this.nodeTweens.clear();

        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }
    }

    /** 停止单个节点的运动 */
    private StopNodeMotion(config: SceneNodeConfig): void {
        if (!config.targetNode || config.isBackground) return;

        config.restoreNodeY(); // 恢复初始Y位置

        switch(config.nodeType){
            case "sprite":
                // 处理精灵节点的特殊逻辑
                const uiopacity = config.targetNode.getComponent(UIOpacity);
                if(uiopacity){
                    if( !this.node.name.includes("ground") ){
                        uiopacity.opacity = 0;
                    }
                }
                break;
            case "spine":{
                // if( config.motionType == "static" ){
                //     config.targetNode.active = false;
                // }
                break;
            }
        }
    }

    /** 启动单个节点的运动 */
    private startNodeMotion(config: SceneNodeConfig): void {
        if (!config.targetNode || config.isBackground) return;

        if(this.scrollContent) {
            this.scrollContent.updateWorldTransform();
            const widget = this.scrollContent.getComponent(Widget);
            if(widget){
                widget.updateAlignment();
            }
            const newH = this.scrollContent.h;
            const scaleRatio = newH / config.originalH();
            const newY = config.originalY() * scaleRatio;
            config.targetNode.y = newY;
        }

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
            case NodeMotionType.STATIC:
                this.startStaticMotion(config, finalSpeed);
                break;
            default:
                break; // 静止不动，不需要任何运动
        }

        // 根据节点类型更新特定属性
        this.updateNodeByType(config, finalSpeed);
    }

    /** 滚动运动 */
    private startScrollMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        
        // 使用SceneScriptComp节点的高度作为滚动范围
        const sceneHeight = this.node.getComponent(UITransform)?.contentSize.height || 0;
        if (sceneHeight <= 0) return;

        // 获取节点自身的高度，用于计算完全移出屏幕的距离
        const nodeHeight = node.getComponent(UITransform)?.contentSize.height || 0;
        const totalScrollDistance = sceneHeight + nodeHeight; // 从顶部完全进入到底部完全移出的距离
        
        const startY = config.originalY();
        const scrollSpeed = speed * 500; // 基础滚动速度

        const scrollTime1 = (startY +sceneHeight/2)/ scrollSpeed;
        const scrollTime2 = (nodeHeight/2+sceneHeight/2-startY) / scrollSpeed;
        
        // 设置初始位置到场景顶部之上（节点高度的距离）
        
        const endY = -sceneHeight / 2 - nodeHeight / 2;
        
        // 设置初始位置
        node.y = startY;

        // 创建相对位移的无缝循环滚动（在整个场景高度范围内滚动）
        config.scrollTween = tween(node)
            .repeatForever(
                tween(node)
                    .by(scrollTime1, { y: -sceneHeight/2-startY })
                    .call(() => {
                        node.y = sceneHeight/2+nodeHeight*2;
                        const uiopacity = node.getComponent(UIOpacity);
                        if(uiopacity){
                            uiopacity.opacity = 255;
                        }
                    })
                    .by(scrollTime2, {y:-nodeHeight/2-sceneHeight/2+startY})
                    .call(() => {
                        node.y = startY;
                    })
            )
            .start();

        this.nodeTweens.set(node, config.scrollTween);
    }

    /** 浮动运动 */
    private startFloatMotion(config: SceneNodeConfig, speed: number): void {
        const node = config.targetNode;
        const horizontalRange = 300; // 左右浮动范围
        const verticalRange = 30; // 上下轻微起伏
        const floatTime = 3.0; // 更慢的浮动时间，不受speed影响

        const floatTween = tween(node)
            .repeatForever(
                tween(node)
                    // 向右上浮动
                    .to(floatTime, { 
                        position: node.position.clone().add3f(horizontalRange, verticalRange, 0) 
                    }, { easing: 'sineInOut' })
                    // 向左下浮动  
                    .to(floatTime, { 
                        position: node.position.clone().add3f(-horizontalRange, -verticalRange, 0) 
                    }, { easing: 'sineInOut' })
                    // 回到右下
                    .to(floatTime, { 
                        position: node.position.clone().add3f(horizontalRange, -verticalRange, 0) 
                    }, { easing: 'sineInOut' })
                    // 回到左上
                    .to(floatTime, { 
                        position: node.position.clone().add3f(-horizontalRange, verticalRange, 0) 
                    }, { easing: 'sineInOut' })
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
        if(config.targetNode){
            config.targetNode.active = true; // 确保节点可见
            config.targetNode.updateWorldTransform();
            const widget = config.targetNode.getComponent(Widget);
            if(widget){
                widget.updateAlignment();
            }
        }
    }

    private startStaticMotion(config: SceneNodeConfig, speed: number): void {
        if(config.targetNode){
            config.targetNode.active = true; // 确保节点可见
            config.targetNode.updateWorldTransform();
            const widget = config.targetNode.getComponent(Widget);
            if(widget){
                widget.updateAlignment();
            }
        }
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
        // const skeleton = config.targetNode.getComponent(sp.Skeleton);
        // if (skeleton) {
        //     skeleton.timeScale = speed;

        //     if (speed > 2.0) {
        //         skeleton.setAnimation(0, "fast", true);
        //     } else if (speed > 1.0) {
        //         skeleton.setAnimation(0, "normal", true);
        //     } else {
        //         skeleton.setAnimation(0, "slow", true);
        //     }
        // }
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
     * 获取场景信息
     */
    getSceneInfo(): { type: string, layer: string } {
        return { ...this.sceneInfo };
    }

    onDestroy() {
        this.stopAllNodeMotions();
        this.nodeDataMap.clear();
    }
}