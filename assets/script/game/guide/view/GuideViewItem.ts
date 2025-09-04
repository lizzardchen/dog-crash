/*
 * @Author: dgflash
 * @Date: 2022-03-14 11:18:54
 * @LastEditors: dgflash
 * @LastEditTime: 2022-04-13 10:34:33
 */
import { CCInteger, Component, _decorator } from "cc";
import { smc } from "../../common/SingletonModuleComp";

const { ccclass, property } = _decorator;

export enum GuideTouchType {
    GUIDE_TOUCH_START = 1,
    GUIDE_TOUCH_MOVE = 2,
    GUIDE_TOUCH_END = 3,
    GUIDE_WAIT_TIME = 4,
    GUIDE_TOUCH_MOVE_END = 5
}

/** 新手引导数据（绑定到引导节点上） */
@ccclass('GuideViewItem')
export class GuideViewItem extends Component {
    @property({
        type: [CCInteger]
    })
    step: Array<number> = [];

    @property({
        type: CCInteger
    })
    guideTouchType: GuideTouchType = GuideTouchType.GUIDE_TOUCH_END;

    private _checked: boolean = false;

    EndCheckCallback: Function = null!;

    start() {
        var gm = smc.guide.GuideModel;
        if (gm) {
            this.step.forEach((step: number) => {
                var gv = smc.guide.GuideView;

                // 注册引导数据
                gv.register(step, this.node);

                // 验证当前是否触发这个引导
                if (gm.getStep() == step) {
                    gv.check();
                    this._checked = true;
                }
            });
        }
    }
    refresh() {
        this._checked = false;
    }

    canNext(): boolean {
        if (this.EndCheckCallback) {
            return this.EndCheckCallback();
        }
        return true;
    }

    update(dt: number) {
        var gm = smc.guide.GuideModel;
        if (gm) {
            this.step.forEach((step: number) => {
                var gv = smc.guide.GuideView;

                // 验证当前是否触发这个引导
                if (gm.getStep() == step) {
                    if (!this._checked) {
                        gv.check();
                        this._checked = true;
                    }
                    gv.refresh();
                }
            });
        }
    }
}
