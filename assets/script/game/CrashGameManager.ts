import { ecs } from "../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "./entity/CrashGame";
import { CrashGameAudio } from "./config/CrashGameAudio";
import { CrashGameLanguage } from "./config/CrashGameLanguage";
import { UIID, UIConfigData } from "./common/config/GameUIConfig";
import { smc } from "./common/SingletonModuleComp";

export class CrashGameManager {
    private static instance: CrashGameManager;

    public static getInstance(): CrashGameManager {
        if (!CrashGameManager.instance) {
            CrashGameManager.instance = new CrashGameManager();
        }
        return CrashGameManager.instance;
    }

    /** 初始化游戏 */
    public init(): void {
        console.log("CrashGameManager initializing...");

        // 初始化音频系统
        CrashGameAudio.init();

        // 多语言系统已经在InitRes中初始化，这里测试多语言功能
        console.log(`Current language: ${oops.language.current}`);
        console.log(`Test text: ${CrashGameLanguage.getText("hold_to_fly")}`);

        console.log("CrashGameManager initialized successfully");
        console.log("CrashGame entity is available at smc.crashGame");
    }

    /** 获取游戏实体 */
    public getGameEntity(): CrashGame | null {
        return smc.crashGame;
    }
}