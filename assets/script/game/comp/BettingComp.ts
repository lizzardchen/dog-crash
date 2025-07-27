import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

@ecs.register('Betting')
export class BettingComp extends ecs.Comp {
    betAmount: number = 0;
    balance: number = 1000;
    isHolding: boolean = false;

    reset() {
        this.betAmount = 0;
        this.isHolding = false;
    }
}