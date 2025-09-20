import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { SceneBackgroundComp, SceneInstance } from "../comp/SceneBackgroundComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { RocketSceneState, RocketViewComp } from "../comp/RocketViewComp";
import { SceneScriptComp } from "../scene/SceneScriptComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../common/SingletonModuleComp";
import { MultiplierConfig, ScenePhysicalResult } from "../config/MultiplierConfig";
import { UITransform, Vec3 } from "cc";
import { PhysicalSceneCalculator } from "../config/PhysicalSceneCalculator";
import { GlobalScrollOffsetCalculator } from "../config/GlobalScrollOffsetCalculator";

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
    private past_scene_offset: number = 0;
    private last_scene_time: number = 0;
    private global_offset_calculator: GlobalScrollOffsetCalculator | undefined;
    
    // 星星系统相关属性
    private totalSceneHeight: number = 0;

    filter(): ecs.IMatcher {
        return ecs.allOf(SceneBackgroundComp, MultiplierComp, GameStateComp, RocketViewComp);
    }

    entityEnter(entity: CrashGame): void {
        // 开始监听 Rocket 场景状态变化事件
        if (!this.isListeningToRocketEvents) {
            // oops.message.on("ROCKET_SCENE_CHANGED", this.onRocketSceneChanged, this);
            oops.message.on("GAME_INITIALIZED", this.onGameInitialized, this);
            this.isListeningToRocketEvents = true;
        }
    }

    entityRemove(_entity: CrashGame): void {
        // 停止监听事件
        if (this.isListeningToRocketEvents) {
            // oops.message.off("ROCKET_SCENE_CHANGED", this.onRocketSceneChanged, this);
            oops.message.off("GAME_INITIALIZED", this.onGameInitialized, this);
            this.isListeningToRocketEvents = false;
        }
        this.isInitialized = false;
    }

    public InitScenes(entity: CrashGame): void {
        const sceneComp = entity.get(SceneBackgroundComp);
        if (!sceneComp || !sceneComp.sceneConfigs || sceneComp.sceneConfigs.length === 0) {
            console.warn("SceneBackgroundComp or sceneConfigs not available for initialization");
            return;
        }

        // 确保已初始化
        if (!this.isInitialized) {
            this.initializeScenePositions(entity);
        }
        // 更新所有场景的位置
        this.updateAllScenesPosition(sceneComp, 0);
         // 更新星星场景位置
        this.updateStarScenePosition(sceneComp, 0);
        // 更新场景可见性
        this.updateSceneVisibility(sceneComp, 0);
        
        // 一次性创建所有星星（倍率1到1000区间，总共200个）
        this.createAllStarsAtInit(sceneComp);
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
            const globaloffset = this.updateAllScenesPosition(sceneComp, currentTime);

            // 更新场景可见性
            this.updateSceneVisibility(sceneComp, currentTime);

            // 更新星星场景位置
            this.updateStarScenePosition(sceneComp, globaloffset);
            
            // 检测并收集星星
            this.checkAndCollectStars(entity, sceneComp, globaloffset);

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

        //重新计算场景的高度
        const scene_calculator: PhysicalSceneCalculator = new PhysicalSceneCalculator();
        const scene_physic_infos: ScenePhysicalResult[] = scene_calculator.calculateAllSceneHeights();
        let first_scene_physic_info: ScenePhysicalResult = scene_physic_infos[0];
        for (let sidx = 0; sidx < scene_physic_infos.length; sidx++) {
            if (scene_physic_infos[sidx].rocketState === RocketSceneState.GROUND) {
                first_scene_physic_info = scene_physic_infos[sidx];
                break;
            }
        }
        // 修复：从场景容器节点获取实际的游戏区域高度
        this.screenHeight = 1920; // 先使用固定值，后续可以从Canvas获取
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
            const scenePhysicInfo = scene_physic_infos.find((info) => info.rocketState === sceneConfig.rocketState);
            if (scenePhysicInfo == null) {
                console.warn(`No physic info found for scene: ${sceneConfig.sceneName} (${sceneConfig.rocketState})`);
                continue;
            }
            const scenescriptComp = sceneInstance.backNode?.getComponent(SceneScriptComp);
            if (scenescriptComp) {
                const front_scene = sceneInstance.frontNode?.getComponent(SceneScriptComp);
                if(front_scene) {
                    front_scene.ResetScenePhysicInfo(scenePhysicInfo);
                }
                scenescriptComp.ResetScenePhysicInfo(scenePhysicInfo);
                
            }
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
            const sceneHeight = scenePhysicInfo.sceneHeight;//this.getSceneHeight(sceneInstance);

            // 注意：现在使用全局统一的滚动速度，不再为每个场景单独计算速度
            // 这里保留scrollSpeed字段是为了兼容性，但实际使用全局速度
            const scrollSpeed = 0; // 将由全局速度控制

            // 重新计算场景初始位置（锚点在中间）：
            let initialY = 0;

            if (i === 0) {
                // 第一个场景：场景底部与屏幕底部对齐
                // 屏幕底部 = -screenHeight/2，场景底部 = nodeY - sceneHeight/2
                // 要让场景底部与屏幕底部对齐：nodeY - sceneHeight/2 = -screenHeight/2
                // 解得：nodeY = sceneHeight/2 - screenHeight/2 = (sceneHeight - screenHeight) / 2
                initialY = (sceneHeight - this.screenHeight) / 2;
            } else {
                // 后续场景：依次向上排列
                // 从第一个场景的位置开始，累加前面场景的高度
                const firstSceneHeight = first_scene_physic_info.sceneHeight;//this.getSceneHeight(sceneComp.sceneInstances[0]);
                initialY = (firstSceneHeight - this.screenHeight) / 2;
                let aditive_y = firstSceneHeight / 2;
                for (let j = 1; j < i; j++) {
                    const prevSceneHeight = scene_physic_infos[j].sceneHeight;//this.getSceneHeight(sceneComp.sceneInstances[j]);
                    aditive_y += prevSceneHeight;
                }
                initialY += aditive_y + scene_physic_infos[i].sceneHeight / 2;
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

        this.past_scene_offset = 0;
        this.last_scene_time = 0;

        this.global_offset_calculator = new GlobalScrollOffsetCalculator(scene_calculator.calculateAllSceneHeights());
        
        // 传递屏幕高度和场景初始位置信息给GlobalScrollOffsetCalculator
        const sceneInitialPositions = this.scenePositions.map(pos => pos.initialY);
        this.global_offset_calculator.setScenePositionInfo(this.screenHeight, sceneInitialPositions);

        // 计算总场景高度并设置给starScene节点
        this.calculateAndSetTotalSceneHeight(sceneComp);
        
        this.isInitialized = true;
        console.log(`✅ Scene positions initialized. Total scenes: ${this.scenePositions.length}`);
        console.log(`⭐ Total scene height: ${this.totalSceneHeight}px`);
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
    private updateAllScenesPosition(sceneComp: SceneBackgroundComp, currentTime: number): number {
        // 基于时间计算全局移动速度和偏移
        // 关键：所有场景都以统一的速度同步向上移动

        // 计算全局滚动偏移：基于游戏开始时间和统一的移动速度
        const globalScrollSpeed = this.calculateGlobalScrollSpeed(currentTime);
        let past_time = currentTime - this.last_scene_time;
        let globalScrollOffset = this.past_scene_offset + globalScrollSpeed * past_time;
        this.past_scene_offset = globalScrollOffset;
        this.last_scene_time = currentTime;

        globalScrollOffset = this.global_offset_calculator?.calculateGlobalScrollOffset(currentTime) ?? 0;

        for (const posInfo of this.scenePositions) {
            const sceneInstance = sceneComp.sceneInstances[posInfo.sceneIndex];
            if (!sceneInstance) continue;

            // 所有场景都应用相同的全局滚动偏移
            const currentY = posInfo.initialY - globalScrollOffset;

            // 更新场景位置
            this.updateScenePosition(sceneInstance, currentY);
        }

        return globalScrollOffset;
    }

    /** 计算全局滚动速度 */
    private calculateGlobalScrollSpeed(curTime: number): number {
        // 基于MultiplierConfig动态计算全局滚动速度：
        // 目标：在第二个场景开始时间时，第一个场景完成移动
        // 
        // 第一个场景：
        // - 初始位置：场景底部与屏幕底部对齐
        // - 结束位置：场景上边与屏幕上边对齐  
        // - 移动距离：sceneHeight - screenHeight
        // - 移动时间：从MultiplierConfig获取的第二个场景开始时间

        if (this.scenePositions.length === 0) {
            return 2; // 默认速度
        }

        const rocket_state: RocketSceneState = MultiplierConfig.getRocketStateForTime(curTime);
        const currentScenes = this.scenePositions.filter(pos => pos.rocketState === rocket_state);
        const firstScene = this.scenePositions[0];
        let curScene = firstScene;
        let switchTime = 40; // 默认值，如果没有第二个场景
        if (currentScenes.length > 0) {
            curScene = currentScenes[0];
        }
        if (curScene) {
            switchTime = curScene.endTime + 1;
        }

        let firstSceneHeight = firstScene.sceneHeight;
        // 从MultiplierConfig动态获取第二个场景的开始时间，不硬编码

        // 第一个场景需要移动的距离：sceneHeight - screenHeight
        let requiredDistance = Math.max(firstSceneHeight - this.screenHeight, 0);

        if (curScene.rocketState != firstScene.rocketState) {
            requiredDistance = curScene.sceneHeight;
        }

        // 全局移动速度 = 移动距离 / 移动时间
        const globalSpeed = switchTime > 0 ? requiredDistance / switchTime : 2;

        // console.log(`🚀 Dynamic Global scroll speed: ${globalSpeed.toFixed(1)}px/s`);
        // console.log(`   - First scene height: ${firstSceneHeight}px`);
        // console.log(`   - Screen height: ${this.screenHeight}px`);
        // console.log(`   - Required distance: ${requiredDistance}px`);
        // console.log(`   - Switch time from config: ${switchTime}s`);
        // console.log(`   - Switch time: ${switchTime}s`);
        // console.log(`   - Switch time: ${switchTime}s`);
        // console.log(`   - First scene initial Y: ${this.scenePositions[0].initialY}px`);
        // console.log(`   - First scene final Y: ${this.scenePositions[0].initialY - requiredDistance}px`);

        return globalSpeed;
    }

    /** 更新单个场景位置 */
    private updateScenePosition(sceneInstance: SceneInstance, yPosition: number): void {
        // 更新背景层位置
        if (sceneInstance.backNode) {
            sceneInstance.backNode.setPosition(0, yPosition);
        }
        // 更新前景层位置（可以有不同的滚动速度)
        if (sceneInstance.frontNode) {
            // 前景层可以有稍微不同的滚动速度来产生视差效果
            // const frontOffset = yPosition * 1.1; // 前景层滚动稍快一点
            sceneInstance.frontNode.setPosition(0, yPosition);
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

        // 修复屏幕范围判断：
        // 在Cocos Creator中，屏幕中心通常是(0,0)，所以屏幕范围应该是：
        // 屏幕底部：-screenHeight/2
        // 屏幕顶部：+screenHeight/2
        const screenBottom = -this.screenHeight / 2;
        const screenTop = this.screenHeight / 2;

        // 使用宽松的可见性判断，添加缓冲区域
        const bufferZone = 10; // 300像素的缓冲区域，避免过早隐藏场景
        const extendedScreenBottom = screenBottom - bufferZone;
        const extendedScreenTop = screenTop + bufferZone;

        const isVisible = sceneTop > extendedScreenBottom && sceneBottom < extendedScreenTop;

        // 调试信息（每秒输出一次）
        if (Math.floor(currentTime * 2) !== Math.floor((currentTime - 1 / 60) * 2)) {
            console.log(`🔍 Scene ${posInfo.sceneName}: time=${currentTime.toFixed(2)}s, sceneY=${sceneY.toFixed(1)}, bottom=${sceneBottom.toFixed(1)}, top=${sceneTop.toFixed(1)}, screen=${screenBottom}-${screenTop}, extendedScreen=${extendedScreenBottom}-${extendedScreenTop}, visible=${isVisible}`);
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
        console.log(`Deactivating scene script for ${node.name}`);
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

    private onGameInitialized(eventData: any): void {
        this.InitScenes(smc.crashGame);
    }

    /** 计算总场景高度并设置给starScene节点 */
    private calculateAndSetTotalSceneHeight(sceneComp: SceneBackgroundComp): void {
        // 计算所有场景的总高度
        this.totalSceneHeight = 0;
        for (const posInfo of this.scenePositions) {
            this.totalSceneHeight += posInfo.sceneHeight;
        }
        
        // 设置starScene节点的高度
        if (sceneComp.starScene) {
            const uiTransform = sceneComp.starScene.getComponent(UITransform);
            if (uiTransform) {
                uiTransform.height = this.totalSceneHeight;
                console.log(`⭐ Set starScene height to: ${this.totalSceneHeight}px`);
            }
        }
    }

    /** 在初始化时一次性创建所有星星（倍率1到1000区间，总共200个） */
    private createAllStarsAtInit(sceneComp: SceneBackgroundComp): void {
        if (!this.global_offset_calculator) {
            return;
        }
        
        // 计算倍率1和1000对应的时间
        const startTime = MultiplierConfig.calculateTimeForMultiplier(2);
        const endTime = MultiplierConfig.calculateTimeForMultiplier(1000);
        
        // 计算对应的全局偏移量
        const startOffset = this.global_offset_calculator.calculateGlobalScrollOffset(startTime);
        const endOffset = this.global_offset_calculator.calculateGlobalScrollOffset(endTime);
        
        // 计算总的偏移范围
        const totalOffsetRange = Math.abs(endOffset - startOffset);
        const minOffset = Math.min(startOffset, endOffset);
        
        // 创建200个随机分布的星星
        const totalStars = 50;
        
        for (let i = 0; i < totalStars; i++) {
            // 在偏移范围内随机分布
            const randomOffsetRatio = Math.random();
            const yOffset = minOffset + totalOffsetRange * randomOffsetRatio;
            
            // 转换为starScene坐标系中的位置
            const starY = this.totalSceneHeight / 2 - yOffset;
            
            // 随机X位置（在屏幕宽度范围内）
            const starX = (Math.random() - 0.5) * 800;
            
            // 创建星星
            sceneComp.createStarAtPosition(new Vec3(starX, starY, 0));
        }
        console.log(`⭐ Created ${totalStars} stars in multiplier range 1x - 1000x`);
        console.log(`⭐ Offset range: ${startOffset.toFixed(2)} to ${endOffset.toFixed(2)}`);
    }



    /** 更新starScene的位置跟随场景偏移 */
    private updateStarScenePosition(sceneComp: SceneBackgroundComp, globalScrollOffset: number): void {
        if (sceneComp.starScene) {
            // globalScrollOffset是相对于底边的偏移，需要转换为相对于中心点的偏移
            // starScene的锚点在中心，所以需要减去总高度的一半
            const centerOffset = globalScrollOffset - this.totalSceneHeight / 2;
            sceneComp.starScene.setPosition(0, -centerOffset, 0);
        }
    }

    /** 检测并收集星星 */
    private checkAndCollectStars(entity: CrashGame, sceneComp: SceneBackgroundComp, globalScrollOffset: number): void {
        if (!sceneComp.starScene) return;
        
        // 获取火箭组件和火箭位置
        const rocketView = entity.get(RocketViewComp);
        if (!rocketView || !rocketView.rocket_view_parent) return;
        
        // 获取火箭的世界位置
        const rocketWorldPos = rocketView.rocket_view_parent.getWorldPosition();
        
        const children = sceneComp.starScene.children;
        for (let i = children.length - 1; i >= 0; i--) {
            const star = children[i];
            const starWorldPos = star.getWorldPosition();
            
            // 如果星星的世界Y位置小于火箭中心位置的Y坐标（即星星移动到火箭中心位置下面），则收集它
            if (starWorldPos.y < rocketWorldPos.y) {
                // 调用收集动画，收集到火箭位置
                sceneComp.collectStarToPosition(star, rocketWorldPos, 0.2);
            }
        }
    }

    // /** 处理 Rocket 场景状态变化事件 */
    // private onRocketSceneChanged(eventData: any): void {
    //     const { oldScene, newScene, multiplier } = eventData;
    //     const multiplierText = multiplier ? multiplier.toFixed(2) : '0.00';
    //     console.log(`🚀 Scene state changed: ${oldScene} -> ${newScene} at ${multiplierText}x (handled by continuous scroll)`);
    //     // 在新的连续滚动系统中，场景切换是自动的，不需要手动处理
    // }
}