import { native, sys } from 'cc';
import { oops } from '../../../extensions/oops-plugin-framework/assets/core/Oops';
import { Singleton } from '../utils/Singleton';

export class SDKHelper extends Singleton {
    openLog: boolean = true;

    constructor() {
        super();
        /** 将实例化的对象放到全局环境中供原生代码调用 */
        (globalThis as any).AdManager = this;
    }

    /**
     * 初始化广告ids
     */
    initAd(rewardid: string, interstitialid: string, bannerid: string, isandroid: boolean) {
        this.registerAndLoadAd(rewardid, interstitialid, bannerid, isandroid);
    }

    /**
     * 注册广告ids
     * @param rewaredVideoAdId 激励视频id
     * @param interstitialAdId 插屏id
     * @param bannerAdId banner id
     */
    private registerAndLoadAd(rewaredVideoAdId: string, interstitialAdId: string, bannerAdId: string, isAndroid: boolean) {
        let info = {
            rewaredVideoAdId: rewaredVideoAdId,
            interstitialAdId: interstitialAdId,
            bannerAdId: bannerAdId,
            openLog: this.openLog,
        };
        //cocos creator 3.x
        if (isAndroid) {
            native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'registerAndLoadAd', '(Ljava/lang/String;)V', JSON.stringify(info));
        }
        else {
            native.reflection.callStaticMethod('SDKHelper', 'registerAndLoadAd:', JSON.stringify(info));
        }

        //cocos creator 2.x
        //jsb.reflection.callStaticMethod('SDKHelper', 'registerAndLoadAd:', JSON.stringify(info));
    }

    /**
     * 暂存激励视频广告回调
     */
    _rewardedVideoAdResolveCallback: ((value: { result: "complete" | "cancel" | "fail"; }) => void) | undefined;

    /**
     * 调用原生层显示admob激励视频广告
     * @returns 
     */
    showRewardedVideoAd(isandroid: boolean): Promise<{ result: "complete" | "cancel" | "fail" }> {
        return new Promise<{ result: "complete" | "cancel" | "fail" }>((resolve, reject) => {
            this._rewardedVideoAdResolveCallback = resolve;
            console.log("set _rewardedVideoAdResolveCallback .....");
            if (isandroid) {
                //@ts-ignore
                native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'showRewardedVideoAd', '()V');
            }
            else {
                //@ts-ignore
                native.reflection.callStaticMethod('SDKHelper', 'showRewardedVideoAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'showRewardedVideoAd');
                // if (!bool) {
                //     resolve({ result: 'fail' });
                // }
            }
        });
    }

    noAdCallback() {
        console.log("no ad callback ....!");
        oops.gui.toast("No ad fill.Try again later.");
    }


    /**
     * 原生层通知js层admob激励视频返回回调
     * @param str json字符串
     */
    overRewardedVideoAd(str: string) {
        console.log("earnedVideoAdCallback.....1");
        if (this._rewardedVideoAdResolveCallback) {
            try {
                console.log("earnedVideoAdCallback.....2");
                let dataObj = JSON.parse(str);
                if (dataObj['result']) {
                    if (dataObj['result'] === "complete" || dataObj['result'] === "cancel" || dataObj['result'] === "fail") {
                        console.log("earnedVideoAdCallback.....3");
                        if (this._rewardedVideoAdResolveCallback) {
                            this._rewardedVideoAdResolveCallback(dataObj);
                            console.log("earnedVideoAdCallback.....31");
                        }
                        console.log("earnedVideoAdCallback.....4");
                    } else {
                        console.log("earnedVideoAdCallback.....5");
                        this._rewardedVideoAdResolveCallback({ result: "fail" });
                        console.log("earnedVideoAdCallback.....6");
                    }
                } else {
                    console.log("earnedVideoAdCallback.....7");
                    this._rewardedVideoAdResolveCallback({ result: "fail" });
                    console.log("earnedVideoAdCallback.....8");
                }
            } catch (error) {
                console.log("earnedVideoAdCallback.....9");
                this._rewardedVideoAdResolveCallback({ result: "fail" });
                console.log("earnedVideoAdCallback.....10");
            } finally {
                console.log("earnedVideoAdCallback.....11");
                this._rewardedVideoAdResolveCallback = undefined;
                console.log("earnedVideoAdCallback.....12");

            }
        }
    }

    /**
     * 显示admob的插屏广告
     * @returns 
     */
    showInterstitialAd(isandroid: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (isandroid) {
                //@ts-ignore
                native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'showInterstitialAd', '()V');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'showInterstitialAd');
                //resolve(bool);
            } else {
                //@ts-ignore
                native.reflection.callStaticMethod('SDKHelper', 'showInterstitialAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'showInterstitialAd');
                // resolve(bool);
            }

        });
    }


    /**
     * 显示admob的banner广告
     * @param style 
     * @param refreshInterval 
     * @returns 
     */
    showBannerAd(isandroid: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (isandroid) {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'showBannerAd', '()V');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'showBannerAd');
                resolve(bool);
            }
            else {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('SDKHelper', 'showBannerAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'showBannerAd');
                resolve(bool);
            }
        });
    }

    /**
     * 隐藏admob的banner广告
     */
    hideBannerAd(isandroid: boolean) {
        if (isandroid) {
            //@ts-ignore
            native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'hideBannerAd', '()V');
            //cocos creator 2.x
            //@ts-ignore
            // jsb.reflection.callStaticMethod('SDKHelper', 'hideBannerAd');
        }
        else {
            //@ts-ignore
            native.reflection.callStaticMethod('SDKHelper', 'hideBannerAd');
            //cocos creator 2.x
            //@ts-ignore
            // jsb.reflection.callStaticMethod('SDKHelper', 'hideBannerAd');
        }

    }

    /**
     * 加载(缓存)admob的激励视频
     * @returns true:加载成功
     */
    loadRewardedVideoAd(isandroid: boolean) {
        return new Promise<boolean>((resolve, reject) => {
            if (isandroid) {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'loadRewardedVideoAd', '()V');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadRewardedVideoAd');
                resolve(bool);
            }
            else {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('SDKHelper', 'loadRewardedVideoAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadRewardedVideoAd');
                resolve(bool);
            }

        });
    }


    /**
     * 加载(缓存)admob的插屏广告
     * @returns true:加载成功
     */
    loadInterstitialAd(isandroid: boolean) {
        return new Promise<boolean>((resolve, reject) => {
            if (isandroid) {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'loadInterstitialAd', '()V');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadInterstitialAd');
                resolve(bool);
            }
            else {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('SDKHelper', 'loadInterstitialAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadInterstitialAd');
                resolve(bool);
            }

        });
    }


    /**
     * 加载(缓存)admob的banner广告
     * @returns true:加载成功
     */
    loadBannerAd(isandroid: boolean) {
        return new Promise<boolean>((resolve, reject) => {
            if (isandroid) {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'loadBannerAd', '()V');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadBannerAd');
                resolve(bool);
            }
            else {
                //@ts-ignore
                let bool = native.reflection.callStaticMethod('SDKHelper', 'loadBannerAd');
                //cocos creator 2.x
                //@ts-ignore
                // jsb.reflection.callStaticMethod('SDKHelper', 'loadBannerAd');
                resolve(bool);
            }

        });
    }

    showHello() {
        console.log('hello');
    }
    OpenApp() {
        if (sys.isNative && sys.platform == sys.Platform.ANDROID) {
            native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'OpenApp', '()V');
        }
    }
    CompleteLevel(levelid: number) {
        if (sys.isNative && sys.platform == sys.Platform.ANDROID) {
            native.reflection.callStaticMethod('com/cocos/game/SDKHelper', 'CompleteLevel', '(I)V', levelid);
        }
    }
}

export let AdManager = SDKHelper.getInstance();
