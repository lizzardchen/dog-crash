import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

export enum GameState {
    INIT,       // 初始化状态
    WAITING,    // 等待下注
    FLYING,     // 火箭飞行中
    CRASHED,    // 火箭崩盘
    CASHED_OUT  // 成功提现
}

@ecs.register('GameState')
export class GameStateComp extends ecs.Comp {
    private _state: GameState = GameState.INIT;
    startTime: number = Date.now();
    crashPoint: number = 0;  // 本局游戏预设的爆率（崩盘倍数）

    public get state():GameState{
        return this._state;
    }
    public set state(tstate:GameState){
        this._state = tstate;
    }

    reset() {
        this.state = GameState.INIT;
        this.startTime = Date.now();
        this.crashPoint = 0;
    }
}