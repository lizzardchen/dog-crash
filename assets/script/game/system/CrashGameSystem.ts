import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";

@ecs.register('CrashGameSystem')
export class CrashGameSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(GameStateComp, BettingComp, MultiplierComp);
    }

    update(entity: CrashGame): void {
        const gameState = entity.get(GameStateComp);
        const betting = entity.get(BettingComp);
        const multiplier = entity.get(MultiplierComp);

        switch (gameState.state) {
            case GameState.WAITING:
                this.handleWaitingState(entity);
                break;
            case GameState.FLYING:
                this.handleFlyingState(entity);
                break;
            case GameState.CRASHED:
                this.handleCrashedState(entity);
                break;
            case GameState.CASHED_OUT:
                this.handleCashedOutState(entity);
                break;
        }
    }

    private handleWaitingState(entity: CrashGame): void {
        // 等待玩家下注和按住HOLD按钮
    }

    private handleFlyingState(entity: CrashGame): void {
        // 更新倍数，检查崩盘条件，处理提现
    }

    private handleCrashedState(entity: CrashGame): void {
        // 播放崩盘动画，结算游戏
        oops.audio.playEffect("game/audio/crash_explosion");
    }

    private handleCashedOutState(entity: CrashGame): void {
        // 播放成功提现动画，结算收益
        oops.audio.playEffect("game/audio/cash_out_success");
    }
}