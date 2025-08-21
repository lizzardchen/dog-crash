import { ADInterface, ADCallBack } from "../interface/ADInterface";
import { SDKHelper } from "../SDKHelper";

export class IOSAdmobSDK extends ADInterface {
    /** 是否启用测试广告id( google广告id 测试时候用google的测试广告不然可能有封号风险)  */
    isUseTestAd: boolean = false;
    appID: string = "ca-app-pub-9901822872000997~6157443064";
    rewaredVideoAdId: string = "ca-app-pub-9901822872000997/8366989227";
    interstitialAdId: string = "ca-app-pub-9901822872000997/6772112271";
    bannerAdId: string = "ca-app-pub-8376171902158678/8416366430";

    public initAd() {
        /**激励视频广告id */
        this.rewaredVideoAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/1712485313" : "ca-app-pub-9901822872000997/8366989227";
        /**插屏广告id */
        this.interstitialAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/4411468910" : "ca-app-pub-8376171902158678/6772112271";
        /**banner(横幅)广告id */
        this.bannerAdId = this.isUseTestAd ? "ca-app-pub-3940256099942544/2934735716" : "ca-app-pub-8376171902158678/8416366430";

        SDKHelper.getInstance().initAd(this.rewaredVideoAdId, this.interstitialAdId, this.bannerAdId, false);
    }

    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        SDKHelper.getInstance().showRewardedVideoAd(false)
            .then((result) => {
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
        SDKHelper.getInstance().showInterstitialAd(false);
    }
}

