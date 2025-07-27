import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export enum GameState {
    WAITING,    // 等待下注
    FLYING,     // 火箭飞行中
    CRASHED,    // 火箭崩盘
    CASHED_OUT  // 成功提现
}

@ecs.register('GameState')
export class GameStateComp extends ecs.Comp {
    state: GameState = GameState.WAITING;
    startTime: number = 0;
    crashPoint: number = 0;  // 本局游戏预设的爆率（崩盘倍数）

    reset() {
        this.state = GameState.WAITING;
        this.startTime = 0;
        this.crashPoint = 0;
    }
}