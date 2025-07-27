import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

export class CrashGameAudio {
    /** 初始化音频系统 */
    static init(): void {
        // 设置默认音量
        oops.audio.volumeMusic = 0.7;
        oops.audio.volumeEffect = 0.8;

        // 播放背景音乐
        oops.audio.playMusicLoop("game/audio/background_music");
    }

    /** 播放小狗火箭起飞音效 */
    static playDogRocketLaunch(): void {
        oops.audio.playEffect("game/audio/dog_rocket_launch");
    }

    /** 播放倍数变化音效 */
    static playMultiplierTick(): void {
        oops.audio.playEffect("game/audio/multiplier_tick");
    }

    /** 播放崩盘爆炸音效 */
    static playCrashExplosion(): void {
        oops.audio.playEffect("game/audio/crash_explosion");
    }

    /** 播放小狗叫声 */
    static playDogBark(): void {
        oops.audio.playEffect("game/audio/dog_bark");
    }

    /** 播放提现成功音效 */
    static playCashOutSuccess(): void {
        oops.audio.playEffect("game/audio/cash_out_success");
    }

    /** 播放按钮点击音效 */
    static playButtonClick(): void {
        oops.audio.playEffect("game/audio/button_click");
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