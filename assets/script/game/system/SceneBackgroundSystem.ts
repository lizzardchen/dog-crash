import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { SceneBackgroundComp, SceneLayer } from "../comp/SceneBackgroundComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { SceneScriptComp } from "../scene/SceneScriptComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

@ecs.register('SceneBackgroundSystem')
export class SceneBackgroundSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(SceneBackgroundComp, MultiplierComp, GameStateComp);
    }

    update(entity: CrashGame): void {
        const sceneComp = entity.get(SceneBackgroundComp);
        const multiplierComp = entity.get(MultiplierComp);
        const gameStateComp = entity.get(GameStateComp);

        if (gameStateComp.state === GameState.FLYING) {
            // 更新分层背景滚动
            this.updateLayeredScroll(sceneComp, oops.timer.deltaTime);

            // 检查是否需要切换场景
            const targetSceneIndex = sceneComp.getSceneIndexForMultiplier(multiplierComp.currentMultiplier);
            if (targetSceneIndex !== sceneComp.currentSceneIndex) {
                this.switchScene(sceneComp, targetSceneIndex, multiplierComp.currentMultiplier);
            }

            // 根据倍数调整滚动速度
            this.updateScrollSpeed(sceneComp, multiplierComp.currentMultiplier);
        }
    }

    /** 更新分层滚动效果 */
    private updateLayeredScroll(sceneComp: SceneBackgroundComp, deltaTime: number): void {
        // 获取当前场景的滚动速度
        const backSpeed = sceneComp.getCurrentScrollSpeed(SceneLayer.BACK);
        const frontSpeed = sceneComp.getCurrentScrollSpeed(SceneLayer.FRONT);

        // 更新滚动偏移
        sceneComp.backScrollOffset += backSpeed * deltaTime;
        sceneComp.frontScrollOffset += frontSpeed * deltaTime;

        // 通知当前场景的SceneScriptComp更新
        this.updateCurrentSceneScripts(sceneComp);
    }

    /** 应用滚动效果到当前场景的指定层级 */
    private applyScrollToCurrentScene(sceneComp: SceneBackgroundComp, layer: SceneLayer, scrollOffset: number): void {
        const currentScene = sceneComp.getCurrentSceneInstance();
        if (!currentScene) return;

        const node = layer === SceneLayer.BACK ? currentScene.backNode : currentScene.frontNode;
        if (!node) return;

        // 实现向下滚动效果（模拟火箭向上飞行）
        const nodeHeight = node.getContentSize().height;
        if (nodeHeight > 0) {
            const scrollY = scrollOffset % nodeHeight;
            node.setPosition(node.position.x, -scrollY);
        }
    }

    /** 切换场景 */
    private switchScene(sceneComp: SceneBackgroundComp, newSceneIndex: number, currentMultiplier: number): void {
        const oldSceneIndex = sceneComp.currentSceneIndex;
        const oldScene = sceneComp.sceneInstances[oldSceneIndex];
        const newScene = sceneComp.sceneInstances[newSceneIndex];

        if (!newScene) return;

        sceneComp.currentSceneIndex = newSceneIndex;

        console.log(`Scene switched from ${oldScene?.sceneName || 'none'} to ${newScene.sceneName} at ${currentMultiplier.toFixed(2)}x`);

        // 隐藏旧场景
        if (oldScene) {
            if (oldScene.backNode) oldScene.backNode.active = false;
            if (oldScene.frontNode) oldScene.frontNode.active = false;
        }

        // 显示新场景
        if (newScene.backNode) newScene.backNode.active = true;
        if (newScene.frontNode) newScene.frontNode.active = true;

        // 重置滚动偏移以避免跳跃
        sceneComp.backScrollOffset = 0;
        sceneComp.frontScrollOffset = 0;

        // 发送场景切换事件
        oops.message.dispatchEvent("SCENE_CHANGED", {
            oldScene: oldScene?.sceneName || 'none',
            newScene: newScene.sceneName,
            multiplier: currentMultiplier
        });
    }

    /** 根据倍数更新滚动速度 */
    private updateScrollSpeed(sceneComp: SceneBackgroundComp, multiplier: number): void {
        // 基础速度随倍数增加而加快，营造加速感
        const speedMultiplier = Math.min(1 + (multiplier - 1) * 0.3, 5); // 最大5倍速度

        // 更新基础速度
        sceneComp.baseBackScrollSpeed = 30 * speedMultiplier;
        sceneComp.baseFrontScrollSpeed = 80 * speedMultiplier;
    }
}    /*
* 更新当前场景的SceneScriptComp */
    private updateCurrentSceneScripts(sceneComp: SceneBackgroundComp): void {
    const currentScene = sceneComp.getCurrentSceneInstance();
    if(!currentScene) return;

    // 更新背景层的SceneScriptComp
    if(currentScene.backNode) {
    const backScript = currentScene.backNode.getComponent(SceneScriptComp);
    if (backScript) {
        backScript.updateFromSceneComp();
    }
}

// 更新前景层的SceneScriptComp
if (currentScene.frontNode) {
    const frontScript = currentScene.frontNode.getComponent(SceneScriptComp);
    if (frontScript) {
        frontScript.updateFromSceneComp();
    }
}
    }