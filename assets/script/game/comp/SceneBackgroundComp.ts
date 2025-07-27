import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { Node } from "cc";

/** 背景场景类型 */
export enum SceneType {
    GROUND = "ground",      // 地面场景
    SKY = "sky",           // 天空场景
    SPACE = "space"        // 太空场景
}

/** 场景层级类型 */
export enum SceneLayer {
    BACK = "back",         // 背景层（天空、远山等）
    FRONT = "front"        // 前景层（热气球、建筑等）
}

@ecs.register('SceneBackground')
export class SceneBackgroundComp extends ecs.Comp {
    /** 当前场景类型 */
    currentScene: SceneType = SceneType.GROUND;

    /** 背景层滚动速度 */
    backScrollSpeed: number = 30; // 像素/秒，背景层较慢

    /** 前景层滚动速度 */
    frontScrollSpeed: number = 80; // 像素/秒，前景层较快，营造视差效果

    /** 场景切换的倍数阈值 */
    sceneThresholds = {
        [SceneType.GROUND]: 1.0,  // 1.0x - 2.5x
        [SceneType.SKY]: 2.5,     // 2.5x - 6.0x
        [SceneType.SPACE]: 6.0    // 6.0x+
    };

    /** 场景节点引用 */
    backScene: Node | null = null;   // 背景场景节点
    frontScene: Node | null = null;  // 前景场景节点

    /** 各层滚动偏移 */
    backScrollOffset: number = 0;
    frontScrollOffset: number = 0;

    reset() {
        this.currentScene = SceneType.GROUND;
        this.backScrollOffset = 0;
        this.frontScrollOffset = 0;
        this.backScrollSpeed = 30;
        this.frontScrollSpeed = 80;
    }

    /** 根据倍数获取应该显示的场景类型 */
    getSceneTypeForMultiplier(multiplier: number): SceneType {
        if (multiplier >= this.sceneThresholds[SceneType.SPACE]) {
            return SceneType.SPACE;
        } else if (multiplier >= this.sceneThresholds[SceneType.SKY]) {
            return SceneType.SKY;
        } else {
            return SceneType.GROUND;
        }
    }

    /** 设置场景节点引用 */
    setSceneNodes(backScene: Node | null, frontScene: Node | null) {
        this.backScene = backScene;
        this.frontScene = frontScene;
    }

    /** 获取指定层级的场景节点 */
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

    /** 获取指定层级在当前场景下的子节点 */
    getSceneLayerNode(layer: SceneLayer, sceneType: SceneType): Node | null {
        const sceneNode = this.getSceneNode(layer);
        if (!sceneNode) return null;

        // 在场景节点下查找对应场景类型的子节点
        return sceneNode.getChildByName(sceneType) || null;
    }
}