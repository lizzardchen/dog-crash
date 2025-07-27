import { ecs } from "../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CrashGame } from "./entity/CrashGame";
import { CrashGameAudio } from "./config/CrashGameAudio";
import { CrashGameLanguage } from "./config/CrashGameLanguage";
import { UIID, UIConfigData } from "./common/config/GameUIConfig";

export class CrashGameManager {
    private static instance: CrashGameManager;
    private gameEntity: CrashGame | null = null;

    public static getInstance(): CrashGameManager {
        if (!CrashGameManager.instance) {
            CrashGameManager.instance = new CrashGameManager();
        }
        return CrashGameManager.instance;
    }

    /** 初始化游戏 */
    public init(): void {
        console.log("CrashGameManager initializing...");

        // 初始化UI配置
        oops.gui.init(UIConfigData);

        // 初始化音频系统
        CrashGameAudio.init();

        // 初始化多语言系统
        CrashGameLanguage.init();

        // 创建游戏实体
        this.createGameEntity();

        // 打开主游戏界面
        this.openMainGameUI();

        console.log("CrashGameManager initialized successfully");
    }

    /** 创建游戏实体 */
    private createGameEntity(): void {
        this.gameEntity = ecs.getEntity(CrashGame);
        if (this.gameEntity) {
            console.log("CrashGame entity created successfully");
        } else {
            console.error("Failed to create CrashGame entity");
        }
    }

    /** 打开主游戏界面 */
    private openMainGameUI(): void {
        oops.gui.open(UIID.CrashGame);
    }

    /** 获取游戏实体 */
    public getGameEntity(): CrashGame | null {
        return this.gameEntity;
    }
}