import { _decorator, Node, Button, UIOpacity, Vec3, UITransform, tween } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { smc } from "../common/SingletonModuleComp";

const { ccclass, property } = _decorator;

@ccclass('TutorialPopupUI')
@ecs.register('TutorialPopupUI', false)
export class TutorialPopupUI extends CCComp {
    @property(Node)
    text_image: Node = null!; // 文字图片

    @property(Node)
    background_image: Node = null!; // 背景图片（包含猴子）

    @property(Node)
    finger_image: Node = null!; // 手指图片

    @property(Button)
    skip_button: Button = null!; // 跳过按钮

    private _skip_callback: Function | null = null;
    private holdButtonNode: any = null; // 保存holdButton节点引用

    reset(): void {
        this.node.destroy();
    }

    start() {
        this.setupEvents();
        this.positionFingerToHoldButton();
        this.playShowAnimation();
    }

    /**
     * 打开引导弹窗
     */
    onOpen(params: any, onNext?: Function, onSkip?: Function): void {
        this._skip_callback = onSkip || null;
        
        // 保存传入的holdButton节点引用
        if (params && params.holdButtonNode) {
            this.holdButtonNode = params.holdButtonNode;
        }

        console.log("TutorialPopupUI opened");
        this.positionFingerToHoldButton();
        this.playShowAnimation();
    }

    /**
     * 设置事件监听
     */
    private setupEvents(): void {
        if (this.skip_button) {
            this.skip_button.node.on(Button.EventType.CLICK, this.onSkipButtonClick, this);
        }
    }

    /**
     * 跳过按钮点击
     */
    private onSkipButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Tutorial: Skip button clicked");

        if (this._skip_callback) {
            this._skip_callback();
        }
    }

    /**
     * 定位手指指向HOLD按钮
     */
    private positionFingerToHoldButton(): void {
        if (!this.finger_image) {
            console.warn("Finger image not found");
            return;
        }

        // 使用传入的holdButton节点引用
        if (!this.holdButtonNode) {
            console.warn("holdButton node not provided");
            return;
        }
        
        const holdButton = this.holdButtonNode;

        // 获取HOLD按钮的世界坐标
        const worldPos = holdButton.getComponent(UITransform)?.convertToWorldSpaceAR(Vec3.ZERO);
        if (!worldPos) {
            console.warn("Cannot get HOLD button world position");
            return;
        }

        console.log("Hold button world position:", worldPos);
        console.log("Hold button size:", holdButton.getComponent(UITransform)?.contentSize);

        // 转换为手指图片父节点的本地坐标
        const fingerParent = this.finger_image.parent;
        const fingerTransform = fingerParent?.getComponent(UITransform);
        const localPos = fingerTransform?.convertToNodeSpaceAR(worldPos) || Vec3.ZERO;

        console.log("Converted local position:", localPos);
        console.log("Finger parent:", fingerParent?.name);

        // 手指应该在按钮稍微下方一点指向按钮
        const newPos = new Vec3(localPos.x+50, localPos.y + 50, localPos.z);

        console.log("Final finger position:", newPos);

        // 设置手指位置
        this.finger_image.setPosition(newPos);

        // 播放手指动画
        this.playFingerAnimation();
    }

    /**
     * 播放手指指点动画
     */
    private playFingerAnimation(): void {
        if (!this.finger_image || !this.finger_image.isValid) return;

        console.log("Starting finger animation, initial position:", this.finger_image.position);
        
        // 延迟启动动画，确保节点完全初始化
        this.scheduleOnce(() => {
            if (!this.finger_image || !this.finger_image.isValid) return;
            
            const originalScale = this.finger_image.scale.clone();
            const originalPos = this.finger_image.position.clone();
            
            // 模拟点击动画：缩放 + 向下位移
            tween(this.finger_image)
                .repeatForever(
                    tween()
                        // 按下效果：向下移动 + 稍微放大
                        .to(0.15, { 
                            scale: new Vec3(originalScale.x * 1.1, originalScale.y * 1.1, originalScale.z),
                            position: new Vec3(originalPos.x, originalPos.y - 15, originalPos.z)
                        })
                        // 抬起效果：恢复原位置和大小
                        .to(0.15, { 
                            scale: originalScale,
                            position: originalPos
                        })
                        // 暂停
                        .delay(1.2)
                )
                .start();
        }, 0.1);
    }

    /**
     * 播放显示动画
     */
    private playShowAnimation(): void {
        // 文字图片和背景图片淡入
        if (this.text_image) {
            const opacity = this.text_image.getComponent(UIOpacity);
            if (opacity) {
                opacity.opacity = 0;
                tween(opacity).to(0.5, { opacity: 255 }).start();
            }
        }

        if (this.background_image) {
            const opacity = this.background_image.getComponent(UIOpacity);
            if (opacity) {
                opacity.opacity = 0;
                tween(opacity).to(0.5, { opacity: 255 }).start();
            }
        }

        // 手指图片稍后出现
        if (this.finger_image) {
            const opacity = this.finger_image.getComponent(UIOpacity);
            if (opacity) {
                opacity.opacity = 0;
                tween(opacity).delay(0.8).to(0.3, { opacity: 255 }).start();
            }
        }
    }

    /**
     * 清理事件监听
     */
    private removeEventListeners(): void {
        if (this.skip_button && this.skip_button.node) {
            this.skip_button.node.off(Button.EventType.CLICK, this.onSkipButtonClick, this);
        }
    }

    onDestroy() {
        this.removeEventListeners();
    }
}