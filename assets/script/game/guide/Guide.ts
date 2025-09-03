
/*
 * @Author: dgflash
 * @Date: 2021-11-18 17:47:56
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 10:15:10
 */
import { ecs } from "db://oops-framework/libs/ecs/ECS";
import { GuideModelComp } from "./model/GuideModelComp";
import { GuideViewComp } from "./view/GuideViewComp";
import { oops } from "db://oops-framework/core/Oops";

/** 
 * 新手引导
 * 1、组件方式绑定到引导 Node 上自动注册引导数据
 * 2、通过设置引导步骤可回复到上次引导点
 * 3、触发引导分为穿透模式与事件模拟模式（模拟模式不会导致不规则图形在引导区域中导致误点）
 */
@ecs.register('Guide')
export class Guide extends ecs.Entity {
    GuideModel!: GuideModelComp;
    GuideView!: GuideViewComp;

    protected init() {
        this.addComponents<ecs.Comp>(
            GuideModelComp);
    }

    /** 加载引导资源 */
    load(callback: Function) {
        oops.res.loadDir(this.GuideModel.res_dir, (err: Error | null) => {
            if (err) {
                console.error("引手引导资源加载失败");
            }

            // 注册显示对象到 ECS 实体中
            var gv = oops.gui.guide.addComponent(GuideViewComp);
            this.add(gv);

            callback();
        });
    }

    /** 检查指定引导是否触发 */
    check(step: number) {
        if (this.GuideModel) {
            this.GuideModel.step = step;
            this.GuideView.check();
        }
    }

    destroy(): void {
        oops.res.releaseDir(this.GuideModel.res_dir);
        this.remove(GuideViewComp);
        this.remove(GuideModelComp);
        super.destroy();
    }
}