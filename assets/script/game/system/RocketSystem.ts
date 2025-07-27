import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "../entity/CrashGame";
import { RocketViewComp, RocketState } from "../comp/RocketViewComp";
import { GameStateComp, GameState } from "../comp/GameStateComp";
import { MultiplierComp } from "../comp/MultiplierComp";

@ecs.register('RocketSystem')
export class RocketSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(RocketViewComp, GameStateComp, MultiplierComp);
    }

    update(entity: CrashGame): void {
        const rocketView = entity.get(RocketViewComp);
        const gameState = entity.get(GameStateComp);
        const multiplier = entity.get(MultiplierComp);

        // 根据游戏状态更新火箭视觉表现
        switch (gameState.state) {
            case GameState.WAITING:
                this.handleWaitingState(rocketView);
                break;
            case GameState.FLYING:
                this.handleFlyingState(rocketView, multiplier);
                break;
            case GameState.CRASHED:
                this.handleCrashedState(rocketView);
                break;
            case GameState.CASHED_OUT:
                this.handleCashedOutState(rocketView);
                break;
        }
    }

    private handleWaitingState(rocketView: RocketViewComp): void {
        // 等待状态下，确保火箭处于待机状态
        if (rocketView.rocketState !== RocketState.IDLE) {
            rocketView.reset();
        }
    }

    private handleFlyingState(rocketView: RocketViewComp, multiplier: MultiplierComp): void {
        // 如果还没开始飞行动画，启动它
        if (rocketView.rocketState === RocketState.IDLE) {
            rocketView.playTakeoff();
        }

        // 更新飞行动画
        if (rocketView.rocketState === RocketState.FLYING) {
            const deltaTime = oops.timer.deltaTime;
            rocketView.updateFlying(deltaTime, multiplier.currentMultiplier);
        }
    }

    private handleCrashedState(rocketView: RocketViewComp): void {
        // 播放崩盘动画（只播放一次）
        if (rocketView.rocketState === RocketState.FLYING) {
            rocketView.playCrash();
        }
    }

    private handleCashedOutState(rocketView: RocketViewComp): void {
        // 播放成功着陆动画（只播放一次）
        if (rocketView.rocketState === RocketState.FLYING) {
            rocketView.playLanding();
        }
    }
}