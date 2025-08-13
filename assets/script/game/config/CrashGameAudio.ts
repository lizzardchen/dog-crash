import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

export class CrashGameAudio {
    /** 初始化音频系统 */
    static init(): void {
        // 设置默认音量
        oops.audio.volumeMusic = 0.7;
        oops.audio.volumeEffect = 0.8;

        console.log("CrashGameAudio initialized");
        // 注意：背景音乐需要在资源准备好后再播放
        oops.audio.playMusicLoop("game/sound/background_music");
    }

    /** 播放小狗火箭起飞音效 */
    static playDogRocketLaunch(): void {
        console.log("Playing dog rocket launch sound");
        // TODO: 添加实际的音频资源后启用
        oops.audio.playEffect("game/sound/rocket flight");
    }

    static playDogRocketFlyLoop(): void {
        console.log("Playing dog rocket fly loop sound");
        oops.audio.playEffect("game/sound/rocket flight");
    }

    /** 播放倍数变化音效 */
    static playMultiplierTick(): void {
        // console.log("Playing multiplier tick sound");
        // TODO: 添加实际的音频资源后启用
        // oops.audio.playEffect("game/sound/multiplier_tick");
    }

    /** 播放崩盘爆炸音效 */
    static playCrashExplosion(): void {
        console.log("Playing crash explosion sound");
        // TODO: 添加实际的音频资源后启用
        // oops.audio.playEffect("game/audio/crash_explosion");
    }

    /** 播放小狗叫声 */
    static playDogBark(): void {
        console.log("Playing dog bark sound");
        // TODO: 添加实际的音频资源后启用
        oops.audio.playEffect("game/sound/monkey applause");
    }

    /** 播放提现成功音效 */
    static playCashOutSuccess(): void {
        console.log("Playing cash out success sound");
        // TODO: 添加实际的音频资源后启用
        oops.audio.playEffect("game/sound/game success");
    }

    /** 播放按钮点击音效 */
    static playButtonClick(): void {
        console.log("Playing button click sound");
        // TODO: 添加实际的音频资源后启用
        // oops.audio.playEffect("game/audio/button_click");
    }

    static playCoinCollect(): void {
        console.log("Playing coin collect sound");
        // TODO: 添加实际的音频资源后启用
        oops.audio.playEffect("game/sound/collect points");
    }

    /** 设置音乐开关 */
    static setMusicEnabled(enabled: boolean): void {
        oops.audio.switchMusic = enabled;
    }

    /** 设置音效开关 */
    static setEffectEnabled(enabled: boolean): void {
        oops.audio.switchEffect = enabled;
    }

    /** 暂停所有音频 */
    static pauseAll(): void {
        oops.audio.pauseAll();
    }

    /** 恢复所有音频 */
    static resumeAll(): void {
        oops.audio.resumeAll();
    }
}