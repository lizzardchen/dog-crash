import { _decorator, Label, Button, Toggle, Sprite } from 'cc';
import { CCComp } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCComp";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { smc } from "../common/SingletonModuleComp";
import { UserDataComp } from "../comp/UserDataComp";
import { CrashGameAudio } from "../config/CrashGameAudio";
import { UIID } from "../common/config/GameUIConfig";

const { ccclass, property } = _decorator;

/**
 * 设置界面参数
 */
export interface SettingsParams {
    // 可以添加参数，目前不需要
}

@ccclass('SettingsUI')
@ecs.register('SettingsUI', false)
export class SettingsUI extends CCComp {
    // 标题标签
    @property(Label)
    titleLabel: Label = null!;
    
    // 用户头像
    @property(Sprite)
    avatarSprite: Sprite = null!;
    
    
    // 用户名标签
    @property(Label)
    usernameLabel: Label = null!;
    
    // 音效开关
    @property(Label)
    soundLabel: Label = null!;
    
    @property(Toggle)
    soundToggle: Toggle = null!;
    
    // 音乐开关
    @property(Label)
    musicLabel: Label = null!;
    
    @property(Toggle)
    musicToggle: Toggle = null!;
    
    // 关闭按钮
    @property(Button)
    closeButton: Button = null!;
    
    
    // 用户数据组件引用和回调
    private userDataComp: UserDataComp | null = null;
    private closeCallback: Function | null = null;

    onLoad() {
        console.log("SettingsUI loaded");
        
        // 获取用户数据组件
        if (smc.crashGame) {
            this.userDataComp = smc.crashGame.get(UserDataComp);
        }
        
        // 设置UI事件监听
        this.setupUIEvents();
        
        // 初始化UI显示
        this.updateUI();
    }

    /**
     * 打开设置界面
     * @param params 设置参数
     * @param callback 关闭回调函数
     */
    onOpen(params: SettingsParams | null, callback: Function): void {
        this.closeCallback = callback;
        
        // 更新UI显示
        this.updateUI();
        
        console.log("SettingsUI opened");
    }

    private setupUIEvents(): void {
        // 音效开关事件
        if (this.soundToggle) {
            this.soundToggle.node.on(Toggle.EventType.TOGGLE, this.onSoundToggleChanged, this);
        }
        
        // 音乐开关事件
        if (this.musicToggle) {
            this.musicToggle.node.on(Toggle.EventType.TOGGLE, this.onMusicToggleChanged, this);
        }
        
        
        // 关闭按钮事件
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
    }


    /**
     * 更新UI显示
     */
    private updateUI(): void {
        if (!this.userDataComp) return;
        
        const settings = this.userDataComp.settings;
        
        // 更新标题
        if (this.titleLabel) {
            this.titleLabel.string = "SETTINGS";
        }
        
        // 更新用户名
        if (this.usernameLabel) {
            this.usernameLabel.string = this.userDataComp.username || this.userDataComp.getUserId().substring(0, 12);
        }
        
        // 更新音效标签和开关状态
        if (this.soundLabel) {
            this.soundLabel.string = "SOUND";
        }
        if (this.soundToggle) {
            this.soundToggle.isChecked = settings.soundEnabled;
        }
        
        // 更新音乐标签和开关状态
        if (this.musicLabel) {
            this.musicLabel.string = "MUSIC";
        }
        if (this.musicToggle) {
            this.musicToggle.isChecked = settings.musicEnabled;
        }
        
        // 更新头像显示
        this.updateAvatarDisplay();
    }

    /**
     * 更新头像显示
     */
    private updateAvatarDisplay(): void {
        // 头像显示已简化，不需要切换功能
        console.log("Avatar display updated (static display only)");
    }

    /**
     * 音效开关变化事件
     */
    private onSoundToggleChanged(toggle: Toggle): void {
        if (!this.userDataComp) return;
        
        this.userDataComp.settings.soundEnabled = toggle.isChecked;
        CrashGameAudio.setEffectEnabled(toggle.isChecked);
        
        // 播放音效（如果音效已启用）
        if (toggle.isChecked) {
            CrashGameAudio.playButtonClick();
        }
        
        // 保存设置到本地
        this.userDataComp.saveToLocal();
        
        console.log(`Sound effects ${toggle.isChecked ? 'enabled' : 'disabled'}`);
    }

    /**
     * 音乐开关变化事件
     */
    private onMusicToggleChanged(toggle: Toggle): void {
        if (!this.userDataComp) return;
        
        CrashGameAudio.playButtonClick();
        
        this.userDataComp.settings.musicEnabled = toggle.isChecked;
        CrashGameAudio.setMusicEnabled(toggle.isChecked);
        
        // 保存设置到本地
        this.userDataComp.saveToLocal();
        
        console.log(`Music ${toggle.isChecked ? 'enabled' : 'disabled'}`);
    }



    /**
     * 关闭按钮点击事件
     */
    private onCloseButtonClick(): void {
        CrashGameAudio.playButtonClick();
        this.closeSettings();
    }

    /**
     * 关闭设置界面
     */
    private closeSettings(): void {
        console.log("Closing settings UI");
        
        if (this.closeCallback) {
            this.closeCallback();
        } else {
            // 如果没有回调，直接关闭界面
            oops.gui.remove(UIID.Settings);
        }
    }

    onDestroy() {
        // 清理按钮事件
        if (this.soundToggle && this.soundToggle.node) {
            this.soundToggle.node.off(Toggle.EventType.TOGGLE, this.onSoundToggleChanged, this);
        }
        
        if (this.musicToggle && this.musicToggle.node) {
            this.musicToggle.node.off(Toggle.EventType.TOGGLE, this.onMusicToggleChanged, this);
        }
        
        
        if (this.closeButton && this.closeButton.node) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseButtonClick, this);
        }
        
    }

    // CCComp要求实现的reset方法
    reset(): void {
        console.log("SettingsUI reset");
    }
}