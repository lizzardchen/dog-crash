import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UIID } from "../common/config/GameUIConfig";

/**
 * 简单新手引导 - 只引导点击HOLD按钮
 */
export class SimpleTutorial {
    private static _instance: SimpleTutorial | null = null;
    private isShowing: boolean = false;
    private onCompleteCallback: Function | null = null;
    
    private constructor() {}

    public static getInstance(): SimpleTutorial {
        if (!SimpleTutorial._instance) {
            SimpleTutorial._instance = new SimpleTutorial();
        }
        return SimpleTutorial._instance;
    }

    /**
     * 检查是否需要显示引导
     */
    shouldShowTutorial(): boolean {
        const completed = oops.storage.get("tutorial_completed");
        return completed !== "true";
    }

    /**
     * 显示新手引导弹窗
     */
    showTutorial(holdButtonNode?: any, onComplete?: Function): void {
        if (this.isShowing) {
            return;
        }

        this.isShowing = true;
        this.onCompleteCallback = onComplete || null;

        const callbacks = {
            onAdded: (node: any) => {
                const tutorialUI = node.getComponent("TutorialPopupUI" as any);
                if (tutorialUI) {
                    tutorialUI.onOpen(
                        { holdButtonNode },  // 传递holdButton节点引用
                        null, // 无下一步
                        () => this.skipTutorial(), // 跳过
                        () => this.closeTutorial() // 关闭
                    );
                }
            }
        };

        oops.gui.open(UIID.TutorialPopup, {}, callbacks);
    }

    /**
     * 跳过引导
     */
    private skipTutorial(): void {
        this.completeTutorial();
    }

    /**
     * 关闭引导
     */
    private closeTutorial(): void {
        this.isShowing = false;
        oops.gui.remove(UIID.TutorialPopup);
    }

    /**
     * 完成引导（用户点击了HOLD按钮）
     */
    completeTutorial(): void {
        oops.storage.set("tutorial_completed", "true");
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