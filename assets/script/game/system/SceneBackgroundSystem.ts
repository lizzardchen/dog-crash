import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { SceneBackgroundComp, SceneType } from "../comp/SceneBackgroundComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
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
            // 检查是否需要切换场景
            const targetScene = sceneComp.getSceneTypeForMultiplier(multiplierComp.currentMultiplier);
            if (targetScene !== sceneComp.currentScene) {
                this.switchScene(sceneComp, targetScene, multiplierComp.currentMultiplier);
            }
        }
    }

    /** 切换场景 */
    private switchScene(sceneComp: SceneBackgroundComp, newScene: SceneType, currentMultiplier: number): void {
        const oldScene = sceneComp.currentScene;
        sceneComp.currentScene = newScene;

        console.log(`Scene switched from ${oldScene} to ${newScene} at ${currentMultiplier.toFixed(2)}x`);

        // 发送场景切换事件，由MainGameUI处理具体的场景切换逻辑
        oops.message.dispatchEvent("SCENE_CHANGED", {
            oldScene,
            newScene,
            multiplier: currentMultiplier
        });
    }
}