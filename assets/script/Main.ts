/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-05 18:25:56
 */
import { _decorator, profiler } from 'cc';
import { DEBUG } from 'cc/env';
import { oops } from '../../extensions/oops-plugin-framework/assets/core/Oops';
import { Root } from '../../extensions/oops-plugin-framework/assets/core/Root';
import { ecs } from '../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { Account } from './game/account/Account';
import { smc } from './game/common/SingletonModuleComp';
import { UIConfigData } from './game/common/config/GameUIConfig';
import { Initialize } from './game/initialize/Initialize';
import { CrashGame } from './game/entity/CrashGame';
import { CrashGameManager } from './game/CrashGameManager';
import { CrashGameSystem } from './game/system/CrashGameSystem';
import { MultiplierSystem } from './game/system/MultiplierSystem';
import { UserDataSystem } from './game/system/UserDataSystem';
import { RocketSystem } from './game/system/RocketSystem';
import { SceneBackgroundSystem } from './game/system/SceneBackgroundSystem';

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Root {
    start() {
        // if (DEBUG) profiler.showStats();
    }

    protected run() {
        smc.initialize = ecs.getEntity<Initialize>(Initialize)
        smc.account = ecs.getEntity<Account>(Account)
        smc.crashGame = ecs.getEntity<CrashGame>(CrashGame)

        // 崩盘游戏将在Initialize模块中初始化
    }



    protected initGui() {
        oops.gui.init(UIConfigData);
    }

    protected initEcsSystem() {
        // ECS系统将通过@ecs.register装饰器自动注册
        console.log("ECS Systems will be auto-registered");
    }
}
