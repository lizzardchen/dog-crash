import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { RocketViewComp } from "../comp/RocketViewComp";

@ecs.register('DogRocket')
export class DogRocket extends ecs.Entity {
    init() {
        this.add(RocketViewComp);
    }
}