import { ADInterface } from "../interface/ADInterface";
import { game } from "cc";
import { showPrerollAd, showInterstitialAd, requestRewardedAd, showRewardedAd } from "./adsense-h5g-api/h5_games_ads";
import { RewardedVideoAdEvent, InterstitialAdEvent, PrerollAdEvent } from "./adsense-h5g-api/ad_event";
import { InterstitialType } from "./adsense-h5g-api/interstitial_type";

// 扩展 Window 接口以支持 AdSense
declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

export class AdSenseSDK extends ADInterface {
    
    private isInitialized: boolean = false;
    private rewardedAdName: string = "reward_energy"; // 默认激励视频广告名称
    private interstitialAdName: string = "interstitial_pause"; // 默认插屏广告名称
    
    // 广告回调函数存储
    private currentRewardedCallback: Function | null = null;
    private currentRewardedFailCallback: Function | null = null;
    private currentRewardedErrorCallback: Function | null = null;

    public initAd(): void {
        console.log("AdSenseSDK: Initializing AdSense Ads");
        
        try {
            // 按照官方文档，检查 adsbygoogle 数组是否存在
            if (typeof window !== 'undefined' && window.adsbygoogle) {
                console.log("AdSenseSDK: AdSense adsbygoogle detected, initializing...");
                // 确保 adsbygoogle 是数组
                if (!Array.isArray(window.adsbygoogle)) {
                    window.adsbygoogle = [];
                }
                this.setupEventListeners();
                this.isInitialized = true;
                console.log("AdSenseSDK: Initialization successful");
            } else {
                console.warn("AdSenseSDK: AdSense not available (adsbygoogle not found), using mock mode");
                this.initMockMode();
            }
        } catch (error) {
            console.error("AdSenseSDK init error:", error);
            this.initMockMode();
        }
    }

    private initMockMode(): void {
        // 为没有 AdSense 的环境创建模拟模式
        console.log("AdSenseSDK: Running in mock mode");
        this.isInitialized = true;
    }

    private setupEventListeners(): void {
        // 设置激励视频广告事件监听器
        game.on(RewardedVideoAdEvent.BEFORE_AD, () => {
            console.log("AdSenseSDK: Rewarded video - before ad");
        });

        game.on(RewardedVideoAdEvent.AFTER_AD, () => {
            console.log("AdSenseSDK: Rewarded video - after ad");
        });

        game.on(RewardedVideoAdEvent.AD_BREAK_DONE, () => {
            console.log("AdSenseSDK: Rewarded video - ad break done");
        });

        game.on(RewardedVideoAdEvent.BEFORE_REWARD, () => {
            console.log("AdSenseSDK: Rewarded video - before reward (showing ad)");
            // 自动显示激励广告
            showRewardedAd();
        });

        game.on(RewardedVideoAdEvent.AD_DISMISSED, () => {
            console.log("AdSenseSDK: Rewarded video - ad dismissed");
            // 广告被关闭，但可能没有观看完成
            if (this.currentRewardedFailCallback) {
                this.currentRewardedFailCallback();
                this.clearRewardedCallbacks();
            }
        });

        game.on(RewardedVideoAdEvent.AD_VIEWED, () => {
            console.log("AdSenseSDK: Rewarded video - ad viewed (reward earned)");
            // 广告观看完成，给予奖励
            if (this.currentRewardedCallback) {
                this.currentRewardedCallback();
                this.clearRewardedCallbacks();
            }
        });

        // 设置插屏广告事件监听器
        game.on(InterstitialAdEvent.BEFORE_AD, () => {
            console.log("AdSenseSDK: Interstitial - before ad");
        });

        game.on(InterstitialAdEvent.AFTER_AD, () => {
            console.log("AdSenseSDK: Interstitial - after ad");
        });

        game.on(InterstitialAdEvent.AD_BREAK_DONE, () => {
            console.log("AdSenseSDK: Interstitial - ad break done");
        });
    }

    private clearRewardedCallbacks(): void {
        this.currentRewardedCallback = null;
        this.currentRewardedFailCallback = null;
        this.currentRewardedErrorCallback = null;
    }

    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function): void {
        console.log("AdSenseSDK: Showing rewarded video");
        
        if (!this.isInitialized) {
            console.error("AdSenseSDK: Not initialized");
            if (errBack) errBack();
            return;
        }

        // 存储回调函数
        this.currentRewardedCallback = ADCallback;
        this.currentRewardedFailCallback = failBack;
        this.currentRewardedErrorCallback = errBack;

        try {
            if (typeof window !== 'undefined' && window.adsbygoogle && this.isAdSenseAvailable()) {
                // 真实 AdSense 环境
                console.log("AdSenseSDK: Requesting rewarded ad...");
                requestRewardedAd(this.rewardedAdName);
            } else {
                // Mock 模式
                console.log("AdSenseSDK: Mock rewarded video - simulating ad view");
                setTimeout(() => {
                    console.log("AdSenseSDK: Mock ad completed");
                    if (ADCallback) ADCallback();
                    this.clearRewardedCallbacks();
                }, 2000);
            }
        } catch (error) {
            console.error("AdSenseSDK showVideo error:", error);
            if (errBack) errBack();
            this.clearRewardedCallbacks();
        }
    }

    public showInsert(): void {
        console.log("AdSenseSDK: Showing interstitial ad");
        
        if (!this.isInitialized) {
            console.error("AdSenseSDK: Not initialized");
            return;
        }

        try {
            if (typeof window !== 'undefined' && window.adsbygoogle && this.isAdSenseAvailable()) {
                // 真实 AdSense 环境
                showInterstitialAd(InterstitialType.PAUSE, this.interstitialAdName);
            } else {
                // Mock 模式
                console.log("AdSenseSDK: Mock interstitial ad shown");
            }
        } catch (error) {
            console.error("AdSenseSDK showInsert error:", error);
        }
    }

    public showBanner(): void {
        console.log("AdSenseSDK: Banner ads not implemented for AdSense H5 Games");
        // AdSense H5 Games 通常不支持 Banner 广告
        // 如果需要，可以在这里实现相关逻辑
    }

    public hideBanner(): void {
        console.log("AdSenseSDK: Banner ads not implemented for AdSense H5 Games");
        // AdSense H5 Games 通常不支持 Banner 广告
    }

    /**
     * 显示预加载广告（游戏开始时）
     */
    public showPrerollAd(): void {
        console.log("AdSenseSDK: Showing preroll ad");
        
        if (!this.isInitialized) {
            console.error("AdSenseSDK: Not initialized");
            return;
        }

        try {
            if (typeof window !== 'undefined' && window.adsbygoogle && this.isAdSenseAvailable()) {
                showPrerollAd();
            } else {
                console.log("AdSenseSDK: Mock preroll ad shown");
            }
        } catch (error) {
            console.error("AdSenseSDK showPrerollAd error:", error);
        }
    }

    /**
     * 设置广告名称
     */
    public setAdNames(rewardedName?: string, interstitialName?: string): void {
        if (rewardedName) {
            this.rewardedAdName = rewardedName;
        }
        if (interstitialName) {
            this.interstitialAdName = interstitialName;
        }
        console.log(`AdSenseSDK: Ad names set - Rewarded: ${this.rewardedAdName}, Interstitial: ${this.interstitialAdName}`);
    }

    /**
     * 检查 AdSense 是否可用
     */
    public isAdSenseAvailable(): boolean {
        return typeof window !== 'undefined' && 
               window.adsbygoogle && 
               Array.isArray(window.adsbygoogle);
    }
}