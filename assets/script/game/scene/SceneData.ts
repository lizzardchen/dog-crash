import { Node, Prefab } from 'cc';
import { SceneScriptComp } from './SceneScriptComp';

/**
 * 单个场景数据
 */
export interface SceneData {
    /** 场景类型 */
    sceneType: string;
    /** 背景层预制体 */
    backPrefab: Prefab | null;
    /** 前景层预制体 */
    frontPrefab: Prefab | null;
    /** 背景层实例节点 */
    backNode: Node | null;
    /** 前景层实例节点 */
    frontNode: Node | null;
    /** 背景层脚本组件 */
    backScript: SceneScriptComp | null;
    /** 前景层脚本组件 */
    frontScript: SceneScriptComp | null;
    /** 是否已加载 */
    isLoaded: boolean;
    /** 是否激活 */
    isActive: boolean;
}

/**
 * 场景管理器数据
 */
export interface SceneManagerData {
    /** 所有场景数据 */
    scenes: Map<string, SceneData>;
    /** 当前激活的场景 */
    currentScene: string;
    /** 场景容器节点 */
    sceneContainer: Node | null;
}

/**
 * 创建空的场景数据
 */
export function createEmptySceneData(sceneType: string): SceneData {
    return {
        sceneType,
        backPrefab: null,
        frontPrefab: null,
        backNode: null,
        frontNode: null,
        backScript: null,
        frontScript: null,
        isLoaded: false,
        isActive: false
    };
}