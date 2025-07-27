import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { Node } from "cc";
import { SceneData } from "../scene/SceneData";

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
    minMultiplier: number;                // 触发该场景的最小倍数
    backScrollSpeedMultiplier: number;    // 背景层滚动速度倍数
    frontScrollSpeedMultiplier: number;   // 前景层滚动速度倍数
}

@ecs.register('SceneBackground')
export class SceneBackgroundComp extends ecs.Comp {
    /** 当前激活的场景索引 */
    currentSceneIndex: number = 0;

    /** 基础背景层滚动速度 */
    baseBackScrollSpeed: number = 30; // 像素/秒

    /** 基础前景层滚动速度 */
    baseFrontScrollSpeed: number = 80; // 像素/秒

    /** 场景配置数组 */
    sceneConfigs: SceneData[] = [];

    /** 场景实例数组 */
    sceneInstances: SceneInstance[] = [];

    /** 场景节点引用 */
    backScene: Node | null = null;   // 背景场景容器节点
    frontScene: Node | null = null;  // 前景场景容器节点

    /** 各层滚动偏移 */
    backScrollOffset: number = 0;
    frontScrollOffset: number = 0;

    reset() {
        this.currentSceneIndex = 0;
        this.backScrollOffset = 0;
        this.frontScrollOffset = 0;
    }

    /** 设置场景配置数组 */
    setSceneConfigs(configs: SceneData[]) {
        this.sceneConfigs = [...configs];
        // 按倍数阈值排序
        this.sceneConfigs.sort((a, b) => a.minMultiplier - b.minMultiplier);
    }

    /** 根据倍数获取应该显示的场景索引 */
    getSceneIndexForMultiplier(multiplier: number): number {
        for (let i = this.sceneConfigs.length - 1; i >= 0; i--) {
            if (multiplier >= this.sceneConfigs[i].minMultiplier) {
                return i;
            }
        }
        return 0; // 默认返回第一个场景
    }

    /** 获取当前场景实例 */
    getCurrentSceneInstance(): SceneInstance | null {
        return this.sceneInstances[this.currentSceneIndex] || null;
    }

    /** 设置场景节点引用 */
    setSceneNodes(backScene: Node | null, frontScene: Node | null) {
        this.backScene = backScene;
        this.frontScene = frontScene;
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

    /** 获取当前滚动速度 */
    getCurrentScrollSpeed(layer: SceneLayer): number {
        const currentScene = this.getCurrentSceneInstance();
        if (!currentScene) {
            return layer === SceneLayer.BACK ? this.baseBackScrollSpeed : this.baseFrontScrollSpeed;
        }

        const baseSpeed = layer === SceneLayer.BACK ? this.baseBackScrollSpeed : this.baseFrontScrollSpeed;
        const multiplier = layer === SceneLayer.BACK ?
            currentScene.backScrollSpeedMultiplier :
            currentScene.frontScrollSpeedMultiplier;

        return baseSpeed * multiplier;
    }
}