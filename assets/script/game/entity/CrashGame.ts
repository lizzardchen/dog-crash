import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { GameStateComp } from "../comp/GameStateComp";
import { BettingComp } from "../comp/BettingComp";
import { MultiplierComp } from "../comp/MultiplierComp";
import { UserDataComp } from "../comp/UserDataComp";
import { LocalDataComp } from "../comp/LocalDataComp";
import { GameHistoryComp } from "../comp/GameHistoryComp";
import { SceneBackgroundComp } from "../comp/SceneBackgroundComp";
import { RocketViewComp } from "../comp/RocketViewComp";
import { EnergyComp } from "../comp/EnergyComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { MultiplierConfig } from "../config/MultiplierConfig";

@ecs.register('CrashGame')
export class CrashGame extends ecs.Entity {
    init() {
        this.add(GameStateComp);
        this.add(BettingComp);
        this.add(MultiplierComp);
        this.add(UserDataComp);
        this.add(LocalDataComp);
        this.add(GameHistoryComp);
        this.add(RocketViewComp);
        this.add(SceneBackgroundComp);
        this.add(EnergyComp);
        // 初始化音频系统
        CrashGameAudio.init();
    }
    public async InitServer(): Promise<void> {
        // 初始化倍率配置系统
        await MultiplierConfig.initialize();
    }
}