import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { MultiplierComp } from "../comp/MultiplierComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { LocalDataComp } from "../comp/LocalDataComp";

@ecs.register('MultiplierSystem')
export class MultiplierSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(MultiplierComp, GameStateComp, LocalDataComp);
    }

    update(entity: CrashGame): void {
        const multiplierComp = entity.get(MultiplierComp);
        const gameStateComp = entity.get(GameStateComp);
        const localDataComp = entity.get(LocalDataComp);

        if (gameStateComp.state === GameState.FLYING) {
            const currentTime = Date.now() - multiplierComp.startTime;
            const newMultiplier = this.calculateMultiplierFromTime(currentTime / 1000);

            // 倍数变化时播放音效
            if (newMultiplier > multiplierComp.currentMultiplier) {
                // console.log("Multiplier tick");
                // TODO: 添加实际的音频资源后启用
                // oops.audio.playEffect("game/audio/multiplier_tick");
            }

            multiplierComp.currentMultiplier = newMultiplier;

            // 检查是否达到预设的崩盘倍数
            if (multiplierComp.currentMultiplier >= localDataComp.currentCrashMultiplier) {
                gameStateComp.state = GameState.CRASHED;

                // 发送崩盘消息
                oops.message.dispatchEvent("GAME_CRASHED", {
                    crashMultiplier: multiplierComp.currentMultiplier
                });
            }
        }
    }

    /** 基于时间计算倍数的简单算法 */
    private calculateMultiplierFromTime(timeInSeconds: number): number {
        // 简单的指数增长算法：multiplier = 1 + 0.1 * time^1.1
        return 1.0 + 0.1 * Math.pow(timeInSeconds, 1.1);
    }
}