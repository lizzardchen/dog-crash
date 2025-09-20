import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { Node, instantiate, Prefab, Vec3, tween } from "cc";
import { SceneData } from "../scene/SceneData";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../common/SingletonModuleComp";
import { UserDataComp } from "./UserDataComp";

/** 场景层级类型 */
export enum SceneLayer {
    BACK = "back",         // 背景层（天空、远山等）
    FRONT = "front"        // 前景层（热气球、建筑等）
}

/** 场景实例数据 */
export interface SceneInstance {
    sceneName: string;                    // 场景名称，对应 assets/bundle/game/scenes/{sceneName}/ 文件夹
    backNode: Node | null;                // 背景层节点实例 (从 {sceneName}_back.prefab 创建)
    frontNode: Node | null;               // 前景层节点实例 (从 {sceneName}_front.prefab 创建)
    backScrollSpeed: number;              // 背景层滚动速度 (像素/秒)
    frontScrollSpeed: number;             // 前景层滚动速度 (像素/秒)
}

export interface StarSceneInstance extends SceneInstance{
    starsSceneNode: Node | null;
    starPrefabName:string;
}

@ecs.register('SceneBackground')
export class SceneBackgroundComp extends ecs.Comp {
    /** 当前激活的场景索引 */
    currentSceneIndex: number = 0;

    /** 场景配置数组 */
    sceneConfigs: SceneData[] = [];

    /** 场景实例数组 */
    sceneInstances: SceneInstance[] = [];

    /** 场景节点引用 */
    backScene: Node | null = null;   // 背景场景容器节点
    frontScene: Node | null = null;  // 前景场景容器节点
    starScene: Node | null = null;   // 星星场景容器节点

    /** 当前速度倍数（基于游戏倍率动态调整） */
    currentSpeedMultiplier: number = 1.0;

    /** 星星相关属性 */
    private starPrefab: Prefab | null = null;  // 星星预制体
    private starInstances: Node[] = [];        // 当前存在的星星实例
    private starOriginalPositions: Vec3[] = []; // 星星的初始位置备份

    reset() {
        this.currentSceneIndex = 0;
        this.currentSpeedMultiplier = 1.0;
        // 清理所有星星实例
        this.clearAllStars();
        const userdata = smc.crashGame.get(UserDataComp);
        if(userdata){
            userdata.levelstars = 0;
        }
    }

    /** 设置场景配置数组 */
    setSceneConfigs(configs: SceneData[]) {
        this.sceneConfigs = [...configs];
        // 按rocket状态顺序排序（ground -> sky -> atmosphere -> space）
        const stateOrder = ['ground', 'sky', 'atmosphere', 'space'];
        this.sceneConfigs.sort((a, b) => {
            const aIndex = stateOrder.indexOf(a.rocketState);
            const bIndex = stateOrder.indexOf(b.rocketState);
            return aIndex - bIndex;
        });
    }

    /** 根据场景名称获取场景索引 */
    getSceneIndexByName(sceneName: string): number {
        return this.sceneInstances.findIndex(instance => instance.sceneName === sceneName);
    }

    /** 获取当前场景实例 */
    getCurrentSceneInstance(): SceneInstance | null {
        return this.sceneInstances[this.currentSceneIndex] || null;
    }

    /** 设置场景节点引用 */
    setSceneNodes(backScene: Node | null, frontScene: Node | null,starScene:Node|null) {
        this.backScene = backScene;
        this.frontScene = frontScene;
        this.starScene = starScene;
    }

    /** 获取指定层级的场景容器节点 */
    getSceneNode(layer: SceneLayer): Node | null {
        switch (layer) {
            case SceneLayer.BACK:
                return this.backScene;
            case SceneLayer.FRONT:
                return this.frontScene;
            default:
                return null;
        }
    }

    /** 加载星星预制体 */
    async loadStarPrefab(): Promise<void> {
        if (this.starPrefab) {
            return; // 已经加载过了
        }
        
        try {
            this.starPrefab = await oops.res.loadAsync("game/prefabs/play/star", Prefab) as Prefab;
            console.log("Star prefab loaded successfully");
        } catch (error) {
            console.error("Failed to load star prefab:", error);
        }
    }

    /** 创建星星到指定位置 */
    createStarAtPosition(position: Vec3): Node | null {
        if (!this.starPrefab || !this.starScene) {
            console.error("Star prefab or star scene not available");
            return null;
        }

        const starNode = instantiate(this.starPrefab);
        starNode.setPosition(position);
        this.starScene.addChild(starNode);
        this.starInstances.push(starNode);
        
        // 备份星星的初始位置
        this.starOriginalPositions.push(new Vec3(position.x, position.y, position.z));
        
        console.log(`Star created at position: ${position.x}, ${position.y}, ${position.z}`);
        return starNode;
    }

    /** 恢复所有星星到初始位置 */
    restoreAllStarsPosition(): void {
        let startidx:number = 0;
        this.starInstances.forEach(starNode => {
            starNode.setPosition(this.starOriginalPositions[startidx]);
            startidx++;
        });
    }

    checkToCollectStar(targetpos:Vec3){
        for (let i = this.starInstances.length-1; i >= 0; i--) {
            const star = this.starInstances[i];
            if(!star.active) continue;
            const starWorldPos = star.getWorldPosition();
            // 如果星星的世界Y位置小于火箭中心位置的Y坐标（即星星移动到火箭中心位置下面），则收集它
            if (starWorldPos.y < targetpos.y) {
                this.starInstances.splice(i,1);
                // 调用收集动画，收集到火箭位置
                this.collectStarToPosition(star, targetpos, 0.2);
                //log star world pos
                console.log(`⭐ Star collected at position: ${starWorldPos.x}, ${starWorldPos.y}, ${starWorldPos.z}`);
            }
        }
    }

    /** 收集星星到指定位置并播放动画 */
    collectStarToPosition(starNode: Node, targetPosition: Vec3, duration: number = 0.5): void {
        if (!starNode || !starNode.isValid) {
            console.error("Invalid star node for collection");
            return;
        }
        const userdata = smc.crashGame.get(UserDataComp);
        if(userdata){
            userdata.levelstars++;
        }
        // 播放收集动画：星星移动到目标位置
        tween(starNode)
            .to(duration, { worldPosition: targetPosition }, {
                easing: 'sineOut'
            })
            .call(() => {
                // 动画结束后移除星星
                this.removeStar(starNode);
                
                // 发送收集星星的消息
                oops.message.dispatchEvent("STAR_COLLECTED", { position: targetPosition });
                console.log("Star collected and removed");
            })
            .start();
    }

    /** 移除指定的星星 */
    private removeStar(starNode: Node): void {
        // const index = this.starInstances.indexOf(starNode);
        // if (index !== -1) {
        //     this.starInstances.splice(index, 1);
        // }
        if (starNode && starNode.isValid) {
            starNode.removeFromParent();
            starNode.destroy();
        }
    }

    /** 清理所有星星实例 */
    clearAllStars(): void {
        for (const starNode of this.starInstances) {
            if (starNode && starNode.isValid) {
                starNode.removeFromParent();
                starNode.destroy();
            }
        }
        this.starInstances = [];
        console.log("All stars cleared");
    }

    /** 获取当前星星数量 */
    getStarCount(): number {
        return this.starInstances.length;
    }

    /** 获取所有星星实例 */
    getAllStars(): Node[] {
        return [...this.starInstances];
    }
}