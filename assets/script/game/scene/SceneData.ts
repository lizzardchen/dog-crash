import { _decorator, Prefab, CCString, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

/** 场景配置数据 */
@ccclass('SceneData')
export class SceneData {
    @property({ type: CCString, tooltip: "场景名称 (对应 assets/bundle/game/scenes/{sceneName}/ 文件夹)" })
    sceneName: string = "";

    @property({ type: Prefab, tooltip: "背景层预制体 ({sceneName}_back.prefab)" })
    backPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: "前景层预制体 ({sceneName}_front.prefab)" })
    frontPrefab: Prefab | null = null;

    @property({ type: CCFloat, tooltip: "背景层基础滚动速度 (像素/秒)" })
    backScrollSpeed: number = 30;

    @property({ type: CCFloat, tooltip: "前景层基础滚动速度 (像素/秒)" })
    frontScrollSpeed: number = 80;

    /** 
     * 获取预制体路径 
     * @param layer "back" 或 "front"
     */
    getPrefabPath(layer: "back" | "front"): string {
        return `game/scenes/${this.sceneName}/${this.sceneName}_${layer}`;
    }
}