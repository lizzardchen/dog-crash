import { _decorator, Node, Label, Button, Sprite, SpriteFrame } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { UserDataComp } from "../comp/UserDataComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { CrashGameLanguage } from "../config/CrashGameLanguage";

const { ccclass, property } = _decorator;

/**
 * 用户资料界面参数
 */
export interface UserProfileParams {
    userDataComp: UserDataComp;
}

@ccclass('UserProfileUI')
@ecs.register('UserProfileUI', false)
export class UserProfileUI extends CCComp {
    // 头像显示
    @property(Sprite)
    avatarSprite: Sprite = null!;
    
    @property(Button)
    avatarButton: Button = null!;
    
    // 用户信息标签
    @property(Label)
    titleLabel: Label = null!;
    
    @property(Label)
    userIdLabel: Label = null!;
    
    @property(Label)
    userIdValueLabel: Label = null!;
    
    @property(Label)
    usernameLabel: Label = null!;
    
    @property(Label)
    usernameValueLabel: Label = null!;
    
    @property(Label)
    joinDateLabel: Label = null!;
    
    @property(Label)
    joinDateValueLabel: Label = null!;
    
    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;
    
    // 头像选择面板
    @property(Node)
    avatarSelectionPanel: Node = null!;
    
    @property([SpriteFrame])
    avatarFrames: SpriteFrame[] = [];
    
    @property(Node)
    avatarContainer: Node = null!;
    
    @property(Button)
    avatarSelectionCloseButton: Button = null!;
    
    // 用户数据组件引用和回调
    private userDataComp: UserDataComp | null = null;
    private closeCallback: Function | null = null;
    private currentAvatarIndex: number = 0;

    onLoad() {
        console.log("UserProfileUI loaded");
        
        // 设置UI事件监听
        this.setupUIEvents();
        
        // 初始化头像选择面板
        this.initAvatarSelection();
    }

    /**
     * 打开用户资料界面
     * @param userDataComp 用户数据组件
     * @param callback 关闭回调函数
     */
    onOpen(userDataComp: UserDataComp, callback: Function): void {
        this.userDataComp = userDataComp;
        this.closeCallback = callback;
        
        // 初始化UI显示
        this.updateUI();
        
        // 隐藏头像选择面板
        if (this.avatarSelectionPanel) {
            this.avatarSelectionPanel.active = false;
        }
        
        console.log("UserProfileUI opened");
    }

    private setupUIEvents(): void {
        // 头像按钮事件
        if (this.avatarButton) {
            this.avatarButton.node.on(Button.EventType.CLICK, this.onAvatarButtonClick, this);
        }
        
        // 关闭按钮事件
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        // 头像选择面板关闭按钮事件
        if (this.avatarSelectionCloseButton) {
            this.avatarSelectionCloseButton.node.on(Button.EventType.CLICK, this.onAvatarSelectionCloseClick, this);
        }
        
        // 监听语言切换事件
        oops.message.on("LANGUAGE_CHANGED", this.onLanguageChanged, this);
    }

    /**
     * 初始化头像选择功能
     */
    private initAvatarSelection(): void {
        if (!this.avatarContainer || this.avatarFrames.length === 0) {
            console.warn("Avatar selection not properly configured");
            return;
        }
        
        // 清空现有头像选项
        this.avatarContainer.removeAllChildren();
        
        // 创建头像选项按钮
        this.avatarFrames.forEach((frame, index) => {
            const avatarNode = new Node(`Avatar_${index}`);
            const sprite = avatarNode.addComponent(Sprite);
            const button = avatarNode.addComponent(Button);
            
            sprite.spriteFrame = frame;
            button.node.on(Button.EventType.CLICK, () => {
                this.onAvatarOptionClick(index);
            }, this);
            
            this.avatarContainer.addChild(avatarNode);
        });
        
        console.log(`Initialized ${this.avatarFrames.length} avatar options`);
    }

    /**
     * 更新UI显示
     */
    private updateUI(): void {
        if (!this.userDataComp) return;
        
        // 更新标签文本
        this.updateLabels();
        
        // 更新用户信息
        this.updateUserInfo();
        
        // 更新头像显示
        this.updateAvatarDisplay();
    }

    /**
     * 更新所有标签文本
     */
    private updateLabels(): void {
        if (this.titleLabel) {
            this.titleLabel.string = CrashGameLanguage.getText("user_profile");
        }
        
        if (this.userIdLabel) {
            this.userIdLabel.string = CrashGameLanguage.getText("user_id") + ":";
        }
        
        if (this.usernameLabel) {
            this.usernameLabel.string = CrashGameLanguage.getText("username") + ":";
        }
        
        if (this.joinDateLabel) {
            this.joinDateLabel.string = CrashGameLanguage.getText("join_date") + ":";
        }
        
    }

    /**
     * 更新用户信息
     */
    private updateUserInfo(): void {
        if (!this.userDataComp) return;
        
        // 用户ID
        if (this.userIdValueLabel) {
            this.userIdValueLabel.string = this.userDataComp.userId.substring(0, 12) + "...";
        }
        
        // 用户名
        if (this.usernameValueLabel) {
            this.usernameValueLabel.string = this.userDataComp.username;
        }
        
        // 加入时间
        if (this.joinDateValueLabel) {
            const joinDate = this.userDataComp.joinDate;
            this.joinDateValueLabel.string = `${joinDate.getFullYear()}-${(joinDate.getMonth() + 1).toString().padStart(2, '0')}-${joinDate.getDate().toString().padStart(2, '0')}`;
        }
    }


    /**
     * 更新头像显示
     */
    private updateAvatarDisplay(): void {
        if (!this.avatarSprite || this.avatarFrames.length === 0) return;
        
        // 使用当前选择的头像
        if (this.currentAvatarIndex >= 0 && this.currentAvatarIndex < this.avatarFrames.length) {
            this.avatarSprite.spriteFrame = this.avatarFrames[this.currentAvatarIndex];
        }
    }

    /**
     * 头像按钮点击事件
     */
    private onAvatarButtonClick(): void {
        CrashGameAudio.playButtonClick();
        console.log("Avatar button clicked - showing avatar selection");
        
        if (this.avatarSelectionPanel) {
            this.avatarSelectionPanel.active = true;
        }
    }

    /**
     * 头像选项点击事件
     */
    private onAvatarOptionClick(index: number): void {
        CrashGameAudio.playButtonClick();
        
        this.currentAvatarIndex = index;
        this.updateAvatarDisplay();
        
        // 隐藏头像选择面板
        if (this.avatarSelectionPanel) {
            this.avatarSelectionPanel.active = false;
        }
        
        console.log(`Avatar changed to index: ${index}`);
    }

    /**
     * 头像选择面板关闭按钮点击事件
     */
    private onAvatarSelectionCloseClick(): void {
        CrashGameAudio.playButtonClick();
        
        if (this.avatarSelectionPanel) {
            this.avatarSelectionPanel.active = false;
        }
    }

    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeProfile();
    }

    /**
     * 语言切换事件回调
     */
    private onLanguageChanged(lang: string): void {
        console.log(`UserProfileUI language changed to: ${lang}`);
        this.updateLabels();
    }

    /**
     * 关闭用户资料界面
     */
    private closeProfile(): void {
        console.log("Closing user profile UI");
        
        if (this.closeCallback) {
            this.closeCallback();
        }
    }

    onDestroy() {
        // 清理事件监听
        oops.message.off("LANGUAGE_CHANGED", this.onLanguageChanged, this);
        
        // 清理按钮事件
        if (this.avatarButton) {
            this.avatarButton.node.off(Button.EventType.CLICK, this.onAvatarButtonClick, this);
        }
        
        if (this.closeButton) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
        if (this.avatarSelectionCloseButton) {
            this.avatarSelectionCloseButton.node.off(Button.EventType.CLICK, this.onAvatarSelectionCloseClick, this);
        }
        
        // 清理头像选项按钮事件
        if (this.avatarContainer) {
            this.avatarContainer.children.forEach(child => {
                const button = child.getComponent(Button);
                if (button) {
                    button.node.off(Button.EventType.CLICK);
                }
            });
        }
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("UserProfileUI reset");
    }
}