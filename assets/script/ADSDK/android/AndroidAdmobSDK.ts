import { ADInterface, ADCallBack } from "../interface/ADInterface";
import { SDKHelper } from "../SDKHelper";

export class AndroidAdmobSDK extends ADInterface {

    isUseTestAd: boolean = false;
    appID: string = "ca-app-pub-9901822872000997~7797827796";
    rewaredVideoAdId: string = "ca-app-pub-9901822872000997/7144858157";
    interstitialAdId: string = "ca-app-pub-9901822872000997/9398275613";
    bannerAdId: string = "ca-app-pub-9901822872000997/5431110449";

    public initAd() {
        /**激励视频广告id */
        this.rewaredVideoAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/5224354917" : "ca-app-pub-9901822872000997/7144858157";
        /**插屏广告id */
        this.interstitialAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/1033173712" : "ca-app-pub-9901822872000997/9398275613";
        /**banner(横幅)广告id */
        this.bannerAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/9214589741" : "ca-app-pub-9901822872000997/5431110449";

        SDKHelper.getInstance().initAd(this.rewaredVideoAdId, this.interstitialAdId, this.bannerAdId, true);
    }
    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        SDKHelper.getInstance().showRewardedVideoAd(true)
            .then((result) => {
                console.log("android rewarded video ad show success..." + result);
                switch (result.result) {
                    case 'complete':
                        console.log('Rewarded video ad completed!');
                        ADCallback && ADCallback();
                        // 给用户奖励
                        break;
                    case 'cancel':
                        console.log('Rewarded video ad cancelled.');
                        failBack && failBack();
                        break;
                    case 'fail':
                        console.error('Failed to show rewarded video ad.');
                        failBack && failBack();
                        // 处理错误情况
                        break;
                }
            })
            .catch((error) => {
                console.error('An error occurred:', error);
                errBack && errBack();
            });
    }

    public showInsert() {
        SDKHelper.getInstance().showInterstitialAd(true);
    }

}

