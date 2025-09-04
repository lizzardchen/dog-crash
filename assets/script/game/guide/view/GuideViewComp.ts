/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 10:16:57
 */
import { Button, EventTouch, Label, Node, RichText, _decorator } from "cc";
import { GuideModelComp } from "../model/GuideModelComp";
import { GuideViewMask } from "./GuideViewMask";
import { GuideViewPrompt } from "./GuideViewPrompt";
import { CCComp } from "db://oops-framework/module/common/CCComp";
import { ecs } from "db://oops-framework/libs/ecs/ECS";
import { oops } from "db://oops-framework/core/Oops";
import { GuideTouchType, GuideViewItem } from "./GuideViewItem";

const { ccclass, property } = _decorator;

/** 
 * 新手引导界面管理
 */
@ccclass('GuideViewComp')
@ecs.register('GuideView', false)
export class GuideViewComp extends CCComp {
    /** 引导数据 */
    private model: GuideModelComp = null!;
    /** 引导遮罩 */
    private mask: GuideViewMask = null!;
    /** 引导提示动画 */
    private prompt: GuideViewPrompt = null!;

    private _guideTouchType: GuideTouchType = GuideTouchType.GUIDE_TOUCH_END

    public hideHelpText(){
        const mask_panel = this.node.getChildByName("mask");
        if(!mask_panel) return;
        const help_node = mask_panel.getChildByName("help");
        if(help_node){
            help_node.active = false;
        }
    }
    /** 显示引导文本 */
    public showHelpText(guide:string,tip:string):void{
        const mask_panel = this.node.getChildByName("mask");
        if(!mask_panel) return;
        const help_node = mask_panel.getChildByName("help");
        if(help_node){
            help_node.active = true;
            const help_richText = help_node.getChildByName("helpRichText");
            if(help_richText){
                const richtxt = help_richText.getComponent(RichText);
                if(richtxt){
                    richtxt.string = guide;
                }
                const tip_txt = help_richText.getChildByName("tip");
                if(tip_txt){
                    const txt = tip_txt.getComponent(Label);
                    if(txt){
                        txt.string = tip;
                    }
                }
            }
            
        }
    }

    start() {
        this.model = this.ent.get(GuideModelComp);
        this.prompt = this.node.addComponent(GuideViewPrompt);
        this.prompt.model = this.model;
        this.mask = this.node.addComponent(GuideViewMask);
        this.mask.model = this.model;
    }

    /** 注册引导项 */
    register(step: number, Node: Node) {
        this.model.guides.set(step, Node);
    }

    /** 下一个引导 */
    next() {
        this.model.incStep();
        oops.log.logView(`验证下一个引擎【${this.model.getStep()}】`);

        if (this.model.getStep() >= this.model.last) {
            this.mask.hide();
            this.prompt.hide();
            this.ent.destroy();
            oops.log.logView(`全部结束`);
        }
        else {
            this.check();
        }
    }

    /** 验证引导 */
    check() {
        // 延时处理是为了避免与cc.Widget组件冲突，引导遮罩出现后，组件位置变了
        this.scheduleOnce(() => {
            let btn = this.model.guides.get(this.model.getStep());
            if (btn == null) {
                this.mask.hide();
                this.prompt.hide();

                oops.log.logView(`暂无引导`)
            }
            else {
                this.mask.draw(btn);
                this.prompt.show(btn);
                this.prompt.showPrompt();

                const guideview_item = btn.getComponent(GuideViewItem);
                if(guideview_item){
                   this._guideTouchType = guideview_item.guideTouchType;
                }else{
                    this._guideTouchType = GuideTouchType.GUIDE_TOUCH_END
                }
                switch (this._guideTouchType) {
                    case GuideTouchType.GUIDE_TOUCH_START:
                        btn.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true)
                        break;
                    case GuideTouchType.GUIDE_TOUCH_END:
                        // 引导节点加触摸事件，跳到下一步
                        btn.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
                        break;
                }
                btn.on(Node.EventType.TRANSFORM_CHANGED, this.onTransformChanged, this);
            }
        });
    }

    private onTransformChanged() {
        this.refresh();
    }

    private onTouchStart(event: EventTouch) {
        var btn = event.target as Node
        btn.off(Node.EventType.TOUCH_START, this.onTouchStart, this, true)
        btn.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true)
        btn.off(Node.EventType.TRANSFORM_CHANGED, this.onTransformChanged, this)
        
        // 触发按钮组件
        var button = btn.getComponent(Button)
        if (button) {
            button.clickEvents.forEach(e => {
                e.emit([event])
            })
        } else {
            if (btn.hasEventListener(Node.EventType.TOUCH_START)) {
                btn.emit(Node.EventType.TOUCH_START, event)
            } else if (btn.parent && btn.parent.hasEventListener(Node.EventType.TOUCH_START)) {
                btn.parent.emit(Node.EventType.TOUCH_START, event)
            }
        }
        this.next()
    }

    private onTouchEnd(event: EventTouch) {
        var btn = event.target as Node;
        btn.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        btn.off(Node.EventType.TRANSFORM_CHANGED, this.onTransformChanged, this);

        // 触发按钮组件
        var button = btn.getComponent(Button);
        if (button) {
            button.clickEvents.forEach(e => {
                e.emit([event]);
            });
        }
        this.next();
    }

    /** 刷新引导位置 */
    refresh() {
        let btn = this.model.guides.get(this.model.getStep());
        if (btn) {
            this.mask.draw(btn);
            this.prompt.show(btn);
        }
    }

    reset(): void {
        this.model = null!;
        this.mask.destroy();
        this.prompt.destroy();
        this.destroy();
    }
}