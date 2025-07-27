import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGame } from "../entity/CrashGame";
import { UserDataComp, UserIdManager } from "../comp/UserDataComp";

@ecs.register('UserDataSystem')
export class UserDataSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem {
    filter(): ecs.IMatcher {
        return ecs.allOf(UserDataComp);
    }

    entityEnter(entity: CrashGame): void {
        const userComp = entity.get(UserDataComp);

        // 初始化用户数据
        userComp.userId = UserIdManager.getUserId();

        // 从本地存储加载用户数据
        const savedData = UserIdManager.loadUserData();
        if (savedData) {
            userComp.balance = savedData.balance || 1000;
            userComp.highestMultiplier = savedData.highestMultiplier || 1.0;
            userComp.totalFlights = savedData.totalFlights || 0;
            userComp.flightsWon = savedData.flightsWon || 0;
        }
    }

    /** 保存用户数据到本地存储 */
    saveUserData(entity: CrashGame): void {
        const userComp = entity.get(UserDataComp);

        const userData = {
            balance: userComp.balance,
            highestMultiplier: userComp.highestMultiplier,
            totalFlights: userComp.totalFlights,
            flightsWon: userComp.flightsWon,
            lastSaveTime: Date.now()
        };

        UserIdManager.saveUserData(userData);
    }
}