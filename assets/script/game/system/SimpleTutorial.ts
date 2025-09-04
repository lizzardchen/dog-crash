import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UIID } from "../common/config/GameUIConfig";
import { smc } from "../common/SingletonModuleComp";

/**
 * 简单新手引导 - 只引导点击HOLD按钮
 */
enum GuideStep{
    /** 引导步骤1：点击HOLD按钮 */
    Click_Bet_step1 = 1,
    Click_Bet_step2 = 2,
    Press_Hold_step3 = 3,
    Press_Hold_End_step4 = 4,
    Press_Mode_step5 = 5,
    Press_Mode_Onlie_step6 = 6,
    Press_Mode_Onlie_step7 = 7,
    End_Guide = 8
}

export class SimpleTutorial {
    private static _instance: SimpleTutorial | null = null;
    private isShowing: boolean = false;
    private onCompleteCallback: Function | null = null;
    private currentStep: GuideStep = GuideStep.Click_Bet_step1;
    private guideText1: string = 'INTRODUCTION TO BET\n\n\n THE <color=#FF0000>HIGHER</color> THE BET BASE SOCRE,THE HIGHER THE REWARD  YOU WILL RECEIVE.';
    private guideTipTxt1:string = "CLICK THE BUTTON BELOW TO SELECT";
    private guideText2:string = 'GAME PLAY INTRODUCTION\n\n\n <color=#FF0000>PRESS AND HOLD</color> THE RED HOLD BUTTON WHEN YOU ARE READY TO LAUNCH.';
    private guideText3: string = 'GAME MODE INTRODUCTION\n\n\n SWITING TO <color=#FF0000>ONLINE GAMING MODE</color> ALLOWS YOU TO OBTAIN MORE ACCURATE <color=#FF0000>\"EXPLOSION POINT\"</color> INFORMATION AND ACHIEVE HIGHER PROFITS.';
    private guideTipTxt3:string = "CLICK THE BUTTON BELOW TO SWITCH";
    private constructor() {}

    public static getInstance(): SimpleTutorial {
        if (!SimpleTutorial._instance) {
            SimpleTutorial._instance = new SimpleTutorial();
            SimpleTutorial._instance.setUpEvent();
        }
        return SimpleTutorial._instance;
    }

    setUpEvent(){
        oops.message.on("GUIDE_STEP_CHANGE",this.onGuideStepChange,this);
    }

    IncrStep(){
        if(this.currentStep >= GuideStep.End_Guide){
            return;
        }
        if(this.currentStep == GuideStep.Press_Hold_End_step4){
            smc.guide.GuideModel.incStep();
        }
    }

    endGuide(){
        if(smc.guide.GuideModel){
            smc.guide.GuideModel.setStep(GuideStep.End_Guide);
        }
    }

    private onGuideStepChange(event:string,data:any){
        const step = data as GuideStep;
        this.currentStep = step;
        if(step == GuideStep.End_Guide){
            if(smc.guide.GuideView){
                smc.guide.GuideView.hideHelpText();
            }
            this.completeTutorial();
        }
        else if(step == GuideStep.Click_Bet_step2){
            smc.guide.GuideView.hideHelpText();
            oops.message.dispatchEvent("GUIDE_SHOW_BETPANEL");
        }
        else if(step == GuideStep.Press_Hold_step3){
            smc.guide.GuideView.showHelpText(this.guideText2,this.guideTipTxt1);
            oops.message.dispatchEvent("GUIDE_SHOW_HOLD");
        }
        else if(step == GuideStep.Press_Hold_End_step4){
            smc.guide.GuideView.hideHelpText();
            oops.message.dispatchEvent("GUIDE_ON_HOLDED");
        }
        else if(step == GuideStep.Press_Mode_step5){
            smc.guide.GuideView.showHelpText(this.guideText3,this.guideTipTxt3);
            oops.message.dispatchEvent("GUIDE_SHOW_MODE");
        }
        else if(step == GuideStep.Press_Mode_Onlie_step6){
            smc.guide.GuideView.hideHelpText();
            oops.message.dispatchEvent("GUIDE_SHOW_MODE_ONLINE");
        }
        else if(step == GuideStep.Press_Mode_Onlie_step7){
            smc.guide.GuideView.hideHelpText();
            oops.message.dispatchEvent("GUIDE_AFTER_CLICK_ONLINE");
        }
    }

    public async checkGuideLoading(): Promise<void> {
        const guide_step_str = oops.storage.get("tutorial_completed");
        if(!guide_step_str || guide_step_str == ''){
            this.currentStep = GuideStep.Click_Bet_step1;
        }
        else if(guide_step_str == "true"){
            this.currentStep = GuideStep.Click_Bet_step1;
        }
        else if(guide_step_str == "false"){
            this.currentStep = GuideStep.Click_Bet_step1;
        }
        else{
            this.currentStep = parseInt(guide_step_str);
        }
        // this.currentStep = GuideStep.Click_Bet_step1;
        smc.guide.GuideModel.setStep(this.currentStep);
        smc.guide.GuideModel.last = GuideStep.End_Guide;
        return new Promise<void>((resolve) => {
            smc.guide.load(() => {
                resolve();
            });
        });
    }

    /**
     * 检查是否需要显示引导
     */
    shouldShowTutorial(): boolean {
        return this.currentStep < GuideStep.End_Guide;
    }

    /**
     * 显示新手引导弹窗
     */
    showTutorial(holdButtonNode?: any, onComplete?: Function): void {
        // if (this.isShowing) {
        //     return;
        // }
        // this.isShowing = true;
        // this.onCompleteCallback = onComplete || null;

        // const callbacks = {
        //     onAdded: (node: any) => {
        //         const tutorialUI = node.getComponent("TutorialPopupUI" as any);
        //         if (tutorialUI) {
        //             tutorialUI.onOpen(
        //                 { holdButtonNode },  // 传递holdButton节点引用
        //                 null, // 无下一步
        //                 () => this.skipTutorial(), // 跳过
        //                 () => this.closeTutorial() // 关闭
        //             );
        //         }
        //     }
        // };

        // oops.gui.open(UIID.TutorialPopup, {}, callbacks);
    }

    /**
     * 关闭引导
     */
    private closeTutorial(): void {
        this.isShowing = false;
        // oops.gui.remove(UIID.TutorialPopup);
    }

    /**
     * 完成引导（用户点击了HOLD按钮）
     */
    completeTutorial(): void {

        oops.storage.set("tutorial_completed", GuideStep.End_Guide);
        this.closeTutorial();
        console.log("Tutorial completed!");
        
        // 调用完成回调
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
            this.onCompleteCallback = null;
        }
    }

    /**
     * 重置引导状态（调试用）
     */
    resetTutorial(): void {
        oops.storage.remove("tutorial_completed");
        console.log("Tutorial reset!");
    }
}