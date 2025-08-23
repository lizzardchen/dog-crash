import { ADInterface } from "../interface/ADInterface";
import { sys } from "cc";

// 扩展jsb类型定义以支持reflection
declare global {
    namespace jsb {
        namespace reflection {
            function callStaticMethod(className: string, methodName: string, signature: string, ...args: any[]): any;
            function callStaticMethod(className: string, methodName: string, ...args: any[]): any;
        }
    }
}

export class Unity3DAdSDK extends ADInterface {
    private gameId: string = "5927937"; // Android Game ID, will be overridden for iOS
    private testMode: boolean = true;
    
    // 广告位ID
    private rewardedPlacement: string = "Rewarded_Android";
    private interstitialPlacement: string = "Interstitial_Android";
    private bannerPlacement: string = "Banner_Android";

    public initAd(): void {
        console.log("Unity3DAdSDK: Initializing Unity Ads");
        
        // 更可靠的平台检测方法
        let isIOS = false;
        
        // 方法1: 使用编译时常量（推荐）
        if (typeof cc !== 'undefined') {
            // @ts-ignore - 编译时常量可能不在类型定义中
            isIOS = cc.IOS === true;
        }
        
        // 方法2: 如果编译时常量不可用，使用字符串比较和OS检测
         if (!isIOS) {
             isIOS = sys.platform.toString() === 'IOS' || sys.os === sys.OS.IOS;
         }
        
        console.log('Unity3DAdSDK - iOS platform detected:', isIOS);
        
        // 根据平台设置GameID和广告位ID
        if (isIOS) {
            this.gameId = "5927936"; // iOS Game ID
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
            // 检查jsb和reflection是否可用
            if (typeof jsb !== 'undefined' && jsb.reflection) {
                // 使用改进的平台检测
                let isAndroid = false;
                let isIOS = false;
                
                if (typeof cc !== 'undefined') {
                    // @ts-ignore
                    isAndroid = cc.ANDROID === true;
                    // @ts-ignore
                    isIOS = cc.IOS === true;
                }
                
                if (!isAndroid && !isIOS) {
                    isAndroid = sys.platform.toString() === 'ANDROID' || sys.os === sys.OS.ANDROID;
                    isIOS = sys.platform.toString() === 'IOS' || sys.os === sys.OS.IOS;
                }
                
                if (isAndroid) {
                    jsb.reflection.callStaticMethod("com/unity3d/ads/UnityAds", "initialize", 
                        "(Ljava/lang/String;Z)V", this.gameId, this.testMode);
                } else if (isIOS) {
                    jsb.reflection.callStaticMethod("UnityAds", "initialize:testMode:", 
                        this.gameId, this.testMode);
                }
            } else {
                console.log("Unity3DAdSDK: jsb.reflection not available, using mock mode");
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
                if (typeof jsb !== 'undefined' && jsb.reflection) {
                    // 使用改进的平台检测
                    let isAndroid = false;
                    
                    if (typeof cc !== 'undefined') {
                        // @ts-ignore
                        isAndroid = cc.ANDROID === true;
                    }
                    
                    if (!isAndroid) {
                        isAndroid = sys.platform.toString() === 'ANDROID' || sys.os === sys.OS.ANDROID;
                    }
                    
                    if (isAndroid) {
                        jsb.reflection.callStaticMethod("com/unity3d/ads/UnityAds", "show", 
                            "(Ljava/lang/String;)V", this.interstitialPlacement);
                    }
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