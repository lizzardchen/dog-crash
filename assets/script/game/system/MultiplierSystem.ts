import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { MultiplierConfig } from "../config/MultiplierConfig";

@ecs.register('MultiplierSystem')
export class MultiplierSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(MultiplierComp, GameStateComp, LocalDataComp, RocketViewComp);
    }

    update(entity: CrashGame): void {
        const multiplierComp = entity.get(MultiplierComp);
        const gameStateComp = entity.get(GameStateComp);
        const localDataComp = entity.get(LocalDataComp);
        const rocketComp = entity.get(RocketViewComp);

        if (gameStateComp.state === GameState.FLYING) {
            const currentTime = Date.now() - multiplierComp.startTime;
            const timeInSeconds = currentTime / 1000;
            const newMultiplier = MultiplierConfig.calculateMultiplierForTime(timeInSeconds);

            // 检查 Rocket 状态变化（基于倍率表格）
            const previousTime = (currentTime - 100) / 1000; // 上一帧的时间
            const rocketStateChange = MultiplierConfig.checkRocketStateChange(previousTime, timeInSeconds);
            if (rocketStateChange.changed) {
                // 更新 Rocket 的场景状态
                rocketComp.setSceneState(rocketStateChange.newState);
                console.log(`Rocket state changed from ${rocketStateChange.oldState} to ${rocketStateChange.newState} at ${timeInSeconds.toFixed(1)}s (${newMultiplier.toFixed(2)}x)`);

                // 发送 Rocket 场景状态变化事件
                oops.message.dispatchEvent("ROCKET_SCENE_CHANGED", {
                    oldScene: rocketStateChange.oldState,
                    newScene: rocketStateChange.newState,
                    timeInSeconds: timeInSeconds,
                    multiplier: newMultiplier
                });
            }

            // // 添加调试日志
            // if (Math.floor(timeInSeconds * 10) % 10 === 0) { // 每0.1秒输出一次
            //     console.log(`Time: ${timeInSeconds.toFixed(1)}s, Current: ${newMultiplier.toFixed(2)}x, Scene: ${rocketComp.sceneState}, Target: ${localDataComp.currentCrashMultiplier.toFixed(2)}x`);
            // }

            // // 倍数变化时播放音效
            // if (newMultiplier > multiplierComp.currentMultiplier) {
            //     // console.log("Multiplier tick");
            //     // TODO: 添加实际的音频资源后启用
            //     // oops.audio.playEffect("game/audio/multiplier_tick");
            // }

            multiplierComp.currentMultiplier = newMultiplier;

            // 检查是否达到预设的崩盘倍数
            if (multiplierComp.currentMultiplier > localDataComp.currentCrashMultiplier) {
                gameStateComp.state = GameState.CRASHED;
                multiplierComp.currentMultiplier = localDataComp.currentCrashMultiplier; // 确保崩盘倍数准确

                console.log(`GAME CRASHED at ${multiplierComp.currentMultiplier.toFixed(2)}x after ${timeInSeconds.toFixed(1)} seconds`);

                // 发送崩盘消息
                oops.message.dispatchEvent("GAME_CRASHED", {
                    crashMultiplier: multiplierComp.currentMultiplier
                });
            }
        }
    }


}