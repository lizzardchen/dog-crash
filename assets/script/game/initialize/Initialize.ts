/*
 * @Author: dgflash
 * @Date: 2021-11-11 17:45:23
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-03 10:07:14
 */
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { InitResComp } from "./bll/InitRes";
import { CrashGameManager } from "../CrashGameManager";

/**
 * 游戏进入初始化模块
 * 1、热更新
 * 2、加载默认资源
 * 3、初始化崩盘游戏
 */
@ecs.register('Initialize')
export class Initialize extends ecs.Entity {
    protected init() {
        // 初始化游戏公共资源
        this.add(InitResComp);

        // 初始化崩盘游戏
        this.initCrashGame();
    }

    private initCrashGame(): void {
        // 延迟初始化，等待资源加载完成
        setTimeout(() => {
            const crashGameManager = CrashGameManager.getInstance();
            crashGameManager.init();
        }, 1000);
    }
}

// export class EcsInitializeSystem extends ecs.System {
//     constructor() {
//         super();

//         this.add(new InitResSystem());
//     }
// }