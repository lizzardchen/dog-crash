import { ADInterface } from "../interface/ADInterface";
import { sys } from "cc";

export class Unity3DAdSDK extends ADInterface {
    private gameId: string = "5918030"; // Android Game ID, will be overridden for iOS
    private testMode: boolean = true;
    
    // 广告位ID
    private rewardedPlacement: string = "Rewarded_Android";
    private interstitialPlacement: string = "Interstitial_Android";
    private bannerPlacement: string = "Banner_Android";

    public initAd(): void {
        console.log("Unity3DAdSDK: Initializing Unity Ads");
        
        // 根据平台设置GameID和广告位ID
        if (sys.platform === sys.Platform.IOS) {
            this.gameId = "5918031"; // iOS Game ID
            this.rewardedPlacement = "Rewarded_iOS";
            this.interstitialPlacement = "Interstitial_iOS";
            this.bannerPlacement = "Banner_iOS";
        }

        try {
            // 检查Unity Ads是否可用
            if (typeof window !== 'undefined' && (window as any).UnityAds) {
                (window as any).UnityAds.init(this.gameId, this.testMode);
                console.log("Unity3DAdSDK: Initialized with real Unity Ads SDK");
            } else if (typeof jsb !== 'undefined') {
                // 原生平台调用
                this.initNative();
            } else {
                // Web平台模拟模式
                console.log("Unity3DAdSDK: Web platform - initializing mock mode");
                this.initWebMockMode();
            }
        } catch (error) {
            console.error("Unity3DAdSDK init error:", error);
        }
    }

    private initNative(): void {
        try {
            if (sys.platform === sys.Platform.ANDROID) {
                jsb.reflection.callStaticMethod("com/unity3d/ads/UnityAds", "initialize", 
                    "(Ljava/lang/String;Z)V", this.gameId, this.testMode);
            } else if (sys.platform === sys.Platform.IOS) {
                jsb.reflection.callStaticMethod("UnityAds", "initialize:testMode:", 
                    this.gameId, this.testMode);
            }
        } catch (error) {
            console.error("Unity3DAdSDK native init error:", error);
        }
    }

    private initWebMockMode(): void {
        // 为web平台创建模拟的UnityAds对象
        if (typeof window !== 'undefined') {
            (window as any).UnityAds = {
                init: (gameId: string, testMode: boolean) => {
                    console.log(`Mock UnityAds initialized: gameId=${gameId}, testMode=${testMode}`);
                },
                show: (placement: string, options?: any) => {
                    console.log(`Mock UnityAds showing: ${placement}`);
                    // 模拟2秒后广告完成
                    setTimeout(() => {
                        if (options && options.onComplete) {
                            options.onComplete();
                        }
                    }, 2000);
                }
            };
            console.log(`Unity3DAdSDK: Mock mode initialized for web platform with GameID: ${this.gameId}`);
            // 立即调用初始化
            (window as any).UnityAds.init(this.gameId, this.testMode);
        }
    }

    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function): void {
        console.log("Unity3DAdSDK: Showing rewarded video");
        
        try {
            if (typeof window !== 'undefined' && (window as any).UnityAds) {
                // Web平台
                (window as any).UnityAds.show(this.rewardedPlacement, {
                    onComplete: () => ADCallback && ADCallback(),
                    onSkipped: () => failBack && failBack(),
                    onError: () => errBack && errBack()
                });
            } else if (typeof jsb !== 'undefined') {
                // 原生平台
                this.showNativeVideo(ADCallback, failBack, errBack);
            } else {
                // Mock模式
                setTimeout(() => ADCallback && ADCallback(), 1000);
            }
        } catch (error) {
            console.error("Unity3DAdSDK showVideo error:", error);
            errBack && errBack();
        }
    }

    private showNativeVideo(ADCallback: Function, failBack?: Function, errBack?: Function): void {
        try {
            // 模拟原生调用，实际需要配合原生代码
            setTimeout(() => {
                // 模拟观看完成
                ADCallback && ADCallback();
            }, 2000);
        } catch (error) {
            console.error("Unity3DAdSDK native video error:", error);
            errBack && errBack();
        }
    }

    public showInsert(): void {
        console.log("Unity3DAdSDK: Showing interstitial");
        
        try {
            if (typeof window !== 'undefined' && (window as any).UnityAds) {
                (window as any).UnityAds.show(this.interstitialPlacement);
            } else if (typeof jsb !== 'undefined') {
                // 原生调用
                if (sys.platform === sys.Platform.ANDROID) {
                    jsb.reflection.callStaticMethod("com/unity3d/ads/UnityAds", "show", 
                        "(Ljava/lang/String;)V", this.interstitialPlacement);
                }
            }
        } catch (error) {
            console.error("Unity3DAdSDK showInsert error:", error);
        }
    }

    public showBanner(): void {
        console.log("Unity3DAdSDK: Showing banner");
        try {
            if (typeof window !== 'undefined' && (window as any).UnityAds) {
                (window as any).UnityAds.show(this.bannerPlacement);
            }
        } catch (error) {
            console.error("Unity3DAdSDK showBanner error:", error);
        }
    }

    public hideBanner(): void {
        console.log("Unity3DAdSDK: Hiding banner");
        // Banner隐藏逻辑
    }
}