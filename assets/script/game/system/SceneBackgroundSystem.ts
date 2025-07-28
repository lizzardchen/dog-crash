import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { SceneScriptComp } from "../scene/SceneScriptComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../common/SingletonModuleComp";
import { MultiplierConfig } from "../config/MultiplierConfig";
import { UITransform } from "cc";

/** 场景位置信息 */
interface ScenePositionInfo {
    sceneIndex: number;
    sceneName: string;
    rocketState: string;
    startTime: number;      // 该场景开始显示的时间
    endTime: number;        // 该场景结束显示的时间
    duration: number;       // 该场景持续时间
    sceneHeight: number;    // 场景高度
    initialY: number;       // 初始Y位置
    scrollSpeed: number;    // 滚动速度 (像素/秒)
}

@ecs.register('SceneBackgroundSystem')
export class SceneBackgroundSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    private isListeningToRocketEvents: boolean = false;
    private scenePositions: ScenePositionInfo[] = [];
    private screenHeight: number = 0;
    private isInitialized: boolean = false;

    filter(): ecs.IMatcher {
        return ecs.allOf(SceneBackgroundComp, MultiplierComp, GameStateComp, RocketViewComp);
    }

    onEntityEnter(entity: CrashGame): void {
        // 初始化场景位置信息
        this.initializeScenePositions(entity);

        // 开始监听 Rocket 场景状态变化事件
        if (!this.isListeningToRocketEvents) {
            oops.message.on("ROCKET_SCENE_CHANGED", this.onRocketSceneChanged, this);
            this.isListeningToRocketEvents = true;
        }
    }

    onEntityRemove(_entity: CrashGame): void {
        // 停止监听事件
        if (this.isListeningToRocketEvents) {
            oops.message.off("ROCKET_SCENE_CHANGED", this.onRocketSceneChanged, this);
            this.isListeningToRocketEvents = false;
        }
        this.isInitialized = false;
    }

    update(entity: CrashGame): void {
        const sceneComp = entity.get(SceneBackgroundComp);
        const gameStateComp = entity.get(GameStateComp);
        const multiplierComp = entity.get(MultiplierComp);

        if (gameStateComp.state === GameState.FLYING) {
            // 确保已初始化
            if (!this.isInitialized) {
                this.initializeScenePositions(entity);
            }

            // 计算当前游戏时间
            const currentTime = (Date.now() - gameStateComp.startTime) / 1000;

            // 更新所有场景的位置
            this.updateAllScenesPosition(sceneComp, currentTime);

            // 更新场景可见性
            this.updateSceneVisibility(sceneComp, currentTime);

            // 调试信息（每2秒输出一次）
            if (Math.floor(currentTime * 2) !== Math.floor((currentTime - 1 / 60) * 2)) {
                console.log(`🎬 Scene update: time=${currentTime.toFixed(2)}s, multiplier=${multiplierComp.currentMultiplier.toFixed(2)}x`);
                this.logVisibleScenes(sceneComp);
            }
        }
    }

    /** 初始化场景位置信息 */
    private initializeScenePositions(entity: CrashGame): void {
        const sceneComp = entity.get(SceneBackgroundComp);
        if (!sceneComp || sceneComp.sceneConfigs.length === 0) {
            console.warn("SceneBackgroundComp or sceneConfigs not available for initialization");
            return;
        }

        // 修复：从场景容器节点获取实际的游戏区域高度
        this.screenHeight = 1334; // 先使用固定值，后续可以从Canvas获取
        if (sceneComp.backScene) {
            const parentUITransform = sceneComp.backScene.parent?.getComponent(UITransform);
            if (parentUITransform) {
                this.screenHeight = parentUITransform.height;
            }
        }
        this.scenePositions = [];

        console.log(`🏗️ Initializing scene positions with screen height: ${this.screenHeight}`);

        // 从MultiplierConfig获取时间点配置
        const curveConfig = MultiplierConfig.getCurrentCurveConfig();
        const timePoints = curveConfig.timePoints;

        // 计算每个场景的时间段和初始位置
        for (let i = 0; i < sceneComp.sceneConfigs.length; i++) {
            const sceneConfig = sceneComp.sceneConfigs[i];
            const sceneInstance = sceneComp.sceneInstances[i];

            // 查找该场景对应的时间段
            const sceneTimePoints = timePoints.filter(tp => tp.rocketState === sceneConfig.rocketState);
            if (sceneTimePoints.length === 0) {
                console.warn(`No time point found for scene: ${sceneConfig.sceneName} (${sceneConfig.rocketState})`);
                continue;
            }

            // 获取该场景的开始时间（第一个匹配的时间点）
            const startTime = sceneTimePoints[0].time;

            // 查找下一个不同状态的时间点作为结束时间
            let endTime = curveConfig.maxTime; // 默认为最大时间
            for (let j = 0; j < timePoints.length; j++) {
                if (timePoints[j].time > startTime && timePoints[j].rocketState !== sceneConfig.rocketState) {
                    endTime = timePoints[j].time;
                    break;
                }
            }

            const duration = endTime - startTime;

            // 获取场景高度
            const sceneHeight = this.getSceneHeight(sceneInstance);

            // 注意：现在使用全局统一的滚动速度，不再为每个场景单独计算速度
            // 这里保留scrollSpeed字段是为了兼容性，但实际使用全局速度
            const scrollSpeed = 0; // 将由全局速度控制

            // 重新计算场景初始位置（锚点在中间）：
            let initialY = 0;

            if (i === 0) {
                // 第一个场景：场景底部与屏幕底部对齐
                // 当锚点在中间时，节点Y位置 = (sceneHeight - screenHeight) / 2
                initialY = (sceneHeight - this.screenHeight) / 2;
            } else {
                // 后续场景：依次向上排列
                // 从第一个场景的位置开始，累加前面场景的高度
                const firstSceneHeight = this.getSceneHeight(sceneComp.sceneInstances[0]);
                initialY = (firstSceneHeight - this.screenHeight) / 2;

                for (let j = 0; j < i; j++) {
                    const prevSceneHeight = this.getSceneHeight(sceneComp.sceneInstances[j]);
                    initialY += prevSceneHeight;
                }
            }

            const positionInfo: ScenePositionInfo = {
                sceneIndex: i,
                sceneName: sceneConfig.sceneName,
                rocketState: sceneConfig.rocketState,
                startTime,
                endTime,
                duration,
                sceneHeight,
                initialY,
                scrollSpeed
            };

            this.scenePositions.push(positionInfo);

            // 设置场景初始位置
            this.setSceneInitialPosition(sceneInstance, initialY);

            // 计算场景的实际边界位置（用于调试）
            const sceneBottom = initialY - sceneHeight / 2;
            const sceneTop = initialY + sceneHeight / 2;

            console.log(`📍 Scene ${sceneConfig.sceneName}: time=${startTime}-${endTime}s, height=${sceneHeight}, nodeY=${initialY}, bottom=${sceneBottom}, top=${sceneTop}`);
        }

        this.isInitialized = true;
        console.log(`✅ Scene positions initialized. Total scenes: ${this.scenePositions.length}`);
    }

    /** 获取场景高度 */
    private getSceneHeight(sceneInstance: SceneInstance): number {
        // 优先从背景节点获取高度
        if (sceneInstance.backNode) {
            const uiTransform = sceneInstance.backNode.getComponent(UITransform);
            if (uiTransform) {
                // 添加详细的调试信息
                console.log(`🔍 Scene ${sceneInstance.sceneName} backNode: height=${uiTransform.height}, width=${uiTransform.width}, anchorX=${uiTransform.anchorX}, anchorY=${uiTransform.anchorY}`);
                console.log(`🔍 Scene ${sceneInstance.sceneName} backNode position: x=${sceneInstance.backNode.position.x}, y=${sceneInstance.backNode.position.y}`);
                console.log(`🔍 Scene ${sceneInstance.sceneName} backNode scale: x=${sceneInstance.backNode.scale.x}, y=${sceneInstance.backNode.scale.y}`);
                return uiTransform.height;
            }
        }

        // 如果背景节点没有，尝试前景节点
        if (sceneInstance.frontNode) {
            const uiTransform = sceneInstance.frontNode.getComponent(UITransform);
            if (uiTransform) {
                console.log(`🔍 Scene ${sceneInstance.sceneName} frontNode: height=${uiTransform.height}, width=${uiTransform.width}, anchorX=${uiTransform.anchorX}, anchorY=${uiTransform.anchorY}`);
                return uiTransform.height;
            }
        }

        // 默认使用屏幕高度的1.5倍
        return this.screenHeight * 1.5;
    }

    /** 设置场景初始位置 */
    private setSceneInitialPosition(sceneInstance: SceneInstance, initialY: number): void {
        // 设置背景层位置
        if (sceneInstance.backNode) {
            sceneInstance.backNode.setPosition(0, initialY);
        }

        // 设置前景层位置
        if (sceneInstance.frontNode) {
            sceneInstance.frontNode.setPosition(0, initialY);
        }
    }

    /** 更新所有场景的位置 */
    private updateAllScenesPosition(sceneComp: SceneBackgroundComp, currentTime: number): void {
        // 基于时间计算全局移动速度和偏移
        // 关键：所有场景都以统一的速度同步向上移动

        // 计算全局滚动偏移：基于游戏开始时间和统一的移动速度
        const globalScrollSpeed = this.calculateGlobalScrollSpeed();
        const globalScrollOffset = currentTime * globalScrollSpeed * sceneComp.currentSpeedMultiplier;

        for (const posInfo of this.scenePositions) {
            const sceneInstance = sceneComp.sceneInstances[posInfo.sceneIndex];
            if (!sceneInstance) continue;

            // 所有场景都应用相同的全局滚动偏移
            const currentY = posInfo.initialY - globalScrollOffset;

            // 更新场景位置
            this.updateScenePosition(sceneInstance, currentY);
        }
    }

    /** 计算全局滚动速度 */
    private calculateGlobalScrollSpeed(): number {
        // 重新理解需求：
        // 目标：在第5秒时，第二个场景刚好开始进入屏幕
        // 这意味着在5秒内，所有场景需要向上移动一定距离，使第二个场景的底部到达屏幕顶部

        if (this.scenePositions.length < 2) {
            return 20; // 默认较慢的速度
        }

        const secondScene = this.scenePositions[1];
        const switchTime = secondScene.startTime; // 通常是5秒

        // 重新计算所需移动距离：
        // 目标：在第5秒时，第二个场景的底部刚好到达屏幕顶部
        // 第二个场景初始节点Y位置：firstSceneHeight + secondSceneHeight/2
        // 第二个场景底部初始位置：(firstSceneHeight + secondSceneHeight/2) - secondSceneHeight/2 = firstSceneHeight
        // 目标位置：第二个场景底部在屏幕顶部 = screenHeight
        // 所需移动距离：firstSceneHeight - screenHeight
        const firstSceneHeight = this.scenePositions[0].sceneHeight;
        const requiredDistance = Math.max(firstSceneHeight - this.screenHeight, 0);

        // 全局移动速度 = 所需距离 / 切换时间
        const globalSpeed = switchTime > 0 ? requiredDistance / switchTime : 20;

        console.log(`🚀 Global scroll speed: ${globalSpeed.toFixed(1)}px/s`);
        console.log(`   - First scene height: ${firstSceneHeight}px`);
        console.log(`   - Screen height: ${this.screenHeight}px`);
        console.log(`   - Required distance: ${requiredDistance}px`);
        console.log(`   - Switch time: ${switchTime}s`);
        console.log(`   - First scene initial Y: ${this.scenePositions[0].initialY}px`);
        console.log(`   - First scene final Y: ${this.scenePositions[0].initialY - requiredDistance}px`);

        return globalSpeed;
    }

    /** 更新单个场景位置 */
    private updateScenePosition(sceneInstance: SceneInstance, yPosition: number): void {
        // 更新背景层位置
        if (sceneInstance.backNode) {
            sceneInstance.backNode.setPosition(0, yPosition);
        }

        // 更新前景层位置（可以有不同的滚动速度）
        if (sceneInstance.frontNode) {
            // 前景层可以有稍微不同的滚动速度来产生视差效果
            const frontOffset = yPosition * 1.1; // 前景层滚动稍快一点
            sceneInstance.frontNode.setPosition(0, frontOffset);
        }
    }

    /** 更新场景可见性 */
    private updateSceneVisibility(sceneComp: SceneBackgroundComp, currentTime: number): void {
        for (const posInfo of this.scenePositions) {
            const sceneInstance = sceneComp.sceneInstances[posInfo.sceneIndex];
            if (!sceneInstance) continue;

            // 检查场景是否应该显示（基于时间和位置）
            const isVisible = this.shouldSceneBeVisible(posInfo, currentTime);

            // 更新场景可见性
            this.setSceneVisibility(sceneInstance, isVisible);
        }
    }

    /** 判断场景是否应该显示 */
    private shouldSceneBeVisible(posInfo: ScenePositionInfo, currentTime: number): boolean {
        // 获取场景实例
        const sceneInstance = smc.crashGame?.get(SceneBackgroundComp)?.sceneInstances[posInfo.sceneIndex];
        if (!sceneInstance) return false;

        // 获取场景当前位置（考虑锚点在中间）
        const sceneY = sceneInstance.backNode ? sceneInstance.backNode.position.y : 0;
        const sceneBottom = sceneY - posInfo.sceneHeight / 2; // 锚点在中间，底部 = Y - 高度/2
        const sceneTop = sceneY + posInfo.sceneHeight / 2;    // 顶部 = Y + 高度/2

        // 屏幕范围
        const screenBottom = 0;
        const screenTop = this.screenHeight;

        // 关键修复：只要场景与屏幕有任何重叠就显示
        // 场景完全在屏幕下方时才隐藏（场景顶部 < 屏幕底部）
        // 场景完全在屏幕上方时也隐藏（场景底部 > 屏幕顶部）
        const isVisible = sceneTop > screenBottom && sceneBottom < screenTop;

        // 调试信息（每秒输出一次）
        if (Math.floor(currentTime * 4) !== Math.floor((currentTime - 1 / 60) * 4)) {
            console.log(`🔍 Scene ${posInfo.sceneName}: time=${currentTime.toFixed(2)}s, sceneY=${sceneY.toFixed(1)}, sceneBottom=${sceneBottom.toFixed(1)}, sceneTop=${sceneTop.toFixed(1)}, screenRange=${screenBottom}-${screenTop}, visible=${isVisible}`);
        }

        return isVisible;
    }

    /** 设置场景可见性 */
    private setSceneVisibility(sceneInstance: SceneInstance, visible: boolean): void {
        // 更新背景层可见性
        if (sceneInstance.backNode && sceneInstance.backNode.active !== visible) {
            sceneInstance.backNode.active = visible;
            if (visible) {
                this.activateSceneScript(sceneInstance.backNode, 'back');
            } else {
                this.deactivateSceneScript(sceneInstance.backNode);
            }
        }

        // 更新前景层可见性
        if (sceneInstance.frontNode && sceneInstance.frontNode.active !== visible) {
            sceneInstance.frontNode.active = visible;
            if (visible) {
                this.activateSceneScript(sceneInstance.frontNode, 'front');
            } else {
                this.deactivateSceneScript(sceneInstance.frontNode);
            }
        }
    }

    /** 激活场景脚本 */
    private activateSceneScript(node: any, layer: 'back' | 'front'): void {
        const script = node.getComponent(SceneScriptComp);
        if (script) {
            // 从场景名称推断场景类型
            const sceneName = node.name;
            const sceneConfig = smc.crashGame?.get(SceneBackgroundComp)?.sceneConfigs.find(c => c.sceneName === sceneName);
            const sceneType = sceneConfig ? sceneConfig.rocketState : 'ground';

            script.setSceneInfo(sceneType, layer);
            script.setActive(true);
        }
    }

    /** 停用场景脚本 */
    private deactivateSceneScript(node: any): void {
        const script = node.getComponent(SceneScriptComp);
        if (script) {
            script.setActive(false);
        }
    }

    /** 记录当前可见场景 */
    private logVisibleScenes(sceneComp: SceneBackgroundComp): void {
        const visibleScenes: string[] = [];
        for (const instance of sceneComp.sceneInstances) {
            if ((instance.backNode && instance.backNode.active) || (instance.frontNode && instance.frontNode.active)) {
                visibleScenes.push(instance.sceneName);
            }
        }
        console.log(`👁️ Visible scenes: [${visibleScenes.join(', ')}]`);
    }

    /** 处理 Rocket 场景状态变化事件 */
    private onRocketSceneChanged(eventData: any): void {
        const { oldScene, newScene, multiplier } = eventData;
        console.log(`🚀 Scene state changed: ${oldScene} -> ${newScene} at ${multiplier.toFixed(2)}x (handled by continuous scroll)`);
        // 在新的连续滚动系统中，场景切换是自动的，不需要手动处理
    }
}