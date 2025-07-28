import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { SceneBackgroundComp } from "../comp/SceneBackgroundComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { SceneScriptComp } from "../scene/SceneScriptComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../common/SingletonModuleComp";

@ecs.register('SceneBackgroundSystem')
export class SceneBackgroundSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    private isListeningToRocketEvents: boolean = false;

    filter(): ecs.IMatcher {
        return ecs.allOf(SceneBackgroundComp, MultiplierComp, GameStateComp, RocketViewComp);
    }

    onEntityEnter(_entity: CrashGame): void {
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
    }

    update(entity: CrashGame): void {
        const sceneComp = entity.get(SceneBackgroundComp);
        const gameStateComp = entity.get(GameStateComp);

        if (gameStateComp.state === GameState.FLYING) {
            // 更新当前场景的滚动效果
            this.updateCurrentSceneScroll(sceneComp, 1 / 60); // 假设60FPS，实际应该使用真实的deltaTime
        }
    }

    /** 处理 Rocket 场景状态变化事件 */
    private onRocketSceneChanged(eventData: any): void {
        const { newScene, multiplier } = eventData;

        // 通过smc获取CrashGame实体
        if (!smc.crashGame) return;

        const sceneComp = smc.crashGame.get(SceneBackgroundComp);
        if (!sceneComp) return;

        // 根据 Rocket 场景状态切换背景场景
        this.switchToSceneByName(sceneComp, newScene, multiplier);
    }

    /** 根据Rocket状态切换到对应场景 */
    private switchToSceneByName(sceneComp: SceneBackgroundComp, rocketState: string, multiplier: number): void {
        // 根据rocketState查找对应的场景配置索引
        const targetIndex = sceneComp.sceneConfigs.findIndex(config => config.rocketState === rocketState);

        if (targetIndex === -1) {
            console.warn(`Scene not found for rocket state: ${rocketState}`);
            return;
        }

        if (targetIndex === sceneComp.currentSceneIndex) {
            // 相同场景，执行场景内循环切换
            const sceneName = sceneComp.sceneConfigs[targetIndex].sceneName;
            this.performSameSceneTransition(sceneComp, sceneName);
            return;
        }

        // 不同场景，执行场景间切换
        this.performSceneTransition(sceneComp, targetIndex, multiplier);
    }

    /** 执行场景间切换 */
    private performSceneTransition(sceneComp: SceneBackgroundComp, newSceneIndex: number, multiplier: number): void {
        const oldSceneIndex = sceneComp.currentSceneIndex;
        const oldScene = sceneComp.sceneInstances[oldSceneIndex];
        const newScene = sceneComp.sceneInstances[newSceneIndex];

        if (!newScene) return;

        console.log(`Switching scene from ${oldScene?.sceneName || 'none'} to ${newScene.sceneName} at ${multiplier.toFixed(2)}x`);

        // 停用旧场景
        if (oldScene) {
            this.deactivateScene(oldScene);
        }

        // 激活新场景
        this.activateScene(newScene);

        // 更新当前场景索引
        sceneComp.currentSceneIndex = newSceneIndex;

        // 重置滚动偏移以实现无缝切换
        sceneComp.backScrollOffset = 0;
        sceneComp.frontScrollOffset = 0;

        // 发送场景切换完成事件
        oops.message.dispatchEvent("SCENE_TRANSITION_COMPLETED", {
            oldScene: oldScene?.sceneName || 'none',
            newScene: newScene.sceneName,
            multiplier: multiplier
        });
    }

    /** 执行相同场景内的循环切换 */
    private performSameSceneTransition(sceneComp: SceneBackgroundComp, sceneName: string): void {
        console.log(`Performing same scene transition for: ${sceneName}`);

        const currentScene = sceneComp.getCurrentSceneInstance();
        if (!currentScene) return;

        // 重置滚动偏移，创建循环效果
        sceneComp.backScrollOffset = 0;
        sceneComp.frontScrollOffset = 0;

        // 通知场景脚本执行循环动画
        this.triggerSceneLoopAnimation(currentScene);

        // 发送相同场景循环事件
        oops.message.dispatchEvent("SCENE_LOOP_TRANSITION", {
            sceneName: sceneName
        });
    }

    /** 激活场景 */
    private activateScene(sceneInstance: any): void {
        // 显示场景节点
        if (sceneInstance.backNode) {
            sceneInstance.backNode.active = true;
        }
        if (sceneInstance.frontNode) {
            sceneInstance.frontNode.active = true;
        }

        // 通知场景脚本激活
        this.notifySceneScripts(sceneInstance, 'activate');
    }

    /** 停用场景 */
    private deactivateScene(sceneInstance: any): void {
        // 隐藏场景节点
        if (sceneInstance.backNode) {
            sceneInstance.backNode.active = false;
        }
        if (sceneInstance.frontNode) {
            sceneInstance.frontNode.active = false;
        }

        // 通知场景脚本停用
        this.notifySceneScripts(sceneInstance, 'deactivate');
    }

    /** 通知场景脚本 */
    private notifySceneScripts(sceneInstance: any, action: 'activate' | 'deactivate'): void {
        // 通知背景层脚本
        if (sceneInstance.backNode) {
            const backScript = sceneInstance.backNode.getComponent(SceneScriptComp);
            if (backScript) {
                if (action === 'activate') {
                    backScript.setActive(true);
                } else {
                    backScript.setActive(false);
                }
            }
        }

        // 通知前景层脚本
        if (sceneInstance.frontNode) {
            const frontScript = sceneInstance.frontNode.getComponent(SceneScriptComp);
            if (frontScript) {
                if (action === 'activate') {
                    frontScript.setActive(true);
                } else {
                    frontScript.setActive(false);
                }
            }
        }
    }

    /** 触发场景循环动画 */
    private triggerSceneLoopAnimation(sceneInstance: any): void {
        // 通知背景层执行循环动画
        if (sceneInstance.backNode) {
            const backScript = sceneInstance.backNode.getComponent(SceneScriptComp);
            if (backScript) {
                backScript.playSceneEffect('loop_transition');
            }
        }

        // 通知前景层执行循环动画
        if (sceneInstance.frontNode) {
            const frontScript = sceneInstance.frontNode.getComponent(SceneScriptComp);
            if (frontScript) {
                frontScript.playSceneEffect('loop_transition');
            }
        }
    }

    /** 更新当前场景的滚动效果 */
    private updateCurrentSceneScroll(sceneComp: SceneBackgroundComp, deltaTime: number): void {
        const currentScene = sceneComp.getCurrentSceneInstance();
        if (!currentScene) return;

        // 获取当前场景的基础滚动速度
        const baseBackSpeed = currentScene.backScrollSpeed || sceneComp.baseBackScrollSpeed;
        const baseFrontSpeed = currentScene.frontScrollSpeed || sceneComp.baseFrontScrollSpeed;

        // 应用速度倍数（基于游戏倍率动态调整）
        const actualBackSpeed = baseBackSpeed * sceneComp.currentSpeedMultiplier;
        const actualFrontSpeed = baseFrontSpeed * sceneComp.currentSpeedMultiplier;

        // 更新滚动偏移
        sceneComp.backScrollOffset += actualBackSpeed * deltaTime;
        sceneComp.frontScrollOffset += actualFrontSpeed * deltaTime;

        // 通知场景脚本更新滚动
        this.updateSceneScriptsScroll(currentScene, sceneComp.backScrollOffset, sceneComp.frontScrollOffset);
    }

    /** 更新场景脚本的滚动效果 */
    private updateSceneScriptsScroll(sceneInstance: any, backOffset: number, frontOffset: number): void {
        // 更新背景层滚动
        if (sceneInstance.backNode) {
            const backScript = sceneInstance.backNode.getComponent(SceneScriptComp);
            if (backScript) {
                backScript.updateScrollOffset(backOffset);
            }
        }

        // 更新前景层滚动
        if (sceneInstance.frontNode) {
            const frontScript = sceneInstance.frontNode.getComponent(SceneScriptComp);
            if (frontScript) {
                frontScript.updateScrollOffset(frontOffset);
            }
        }
    }
}