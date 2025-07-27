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
            const timeInSeconds = currentTime / 1000;
            const newMultiplier = this.calculateMultiplierFromTime(timeInSeconds);

            // 添加调试日志
            if (Math.floor(timeInSeconds * 10) % 10 === 0) { // 每0.1秒输出一次
                console.log(`Time: ${timeInSeconds.toFixed(1)}s, Current: ${newMultiplier.toFixed(2)}x, Target: ${localDataComp.currentCrashMultiplier.toFixed(2)}x`);
            }

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
                multiplierComp.currentMultiplier = localDataComp.currentCrashMultiplier; // 确保崩盘倍数准确

                console.log(`GAME CRASHED at ${multiplierComp.currentMultiplier.toFixed(2)}x after ${timeInSeconds.toFixed(1)} seconds`);

                // 发送崩盘消息
                oops.message.dispatchEvent("GAME_CRASHED", {
                    crashMultiplier: multiplierComp.currentMultiplier
                });
            }
        }
    }

    /** 基于时间计算倍数的改进算法 */
    private calculateMultiplierFromTime(timeInSeconds: number): number {
        // 改进的增长算法，前期增长较慢，后期加速
        // 前5秒：1.0 -> 2.0 (线性增长)
        // 5秒后：指数增长但速度更合理
        if (timeInSeconds <= 5.0) {
            return 1.0 + (timeInSeconds * 0.2); // 每秒增长0.2倍
        } else {
            const baseMultiplier = 2.0; // 5秒时的倍数
            const extraTime = timeInSeconds - 5.0;
            // 使用更温和的指数增长：base + 0.05 * extraTime^1.3
            return baseMultiplier + 0.05 * Math.pow(extraTime, 1.3);
        }
    }
}