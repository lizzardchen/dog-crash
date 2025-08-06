import { ADInterface } from "../interface/ADInterface";
import * as PlatformFacebook from '../PlatformFacebook';

export class FBAdSDK extends ADInterface {
    private facebook_ad_inter: any = null;
    private facebook_ad_reward: any = null;
    private facebook_ad_banner: any = null;

    public initAd() {
        try {
            this.facebook_ad_inter = new PlatformFacebook.FacebookAD('TYPE_Interstitial_AD', '959350989607979_959465279596550');
            this.facebook_ad_reward = new PlatformFacebook.FacebookAD('TYPE_Reward_AD', '959350989607979_959464919596586');
            // this.facebook_ad_banner = new PlatformFacebook.FacebookAD('TYPE_Banner_AD','959350989607979_959465382929873');
            this.facebook_ad_inter.load();
            this.facebook_ad_reward.load();
            // this.facebook_ad_banner.load();
        } catch (error) {
            console.log('初始化广告失败:', error);
        }
    }
    public showInsert() {
        try {
            this.facebook_ad_inter.show();
        } catch (error) {
            console.log(error);
        }
    }
    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        console.log("FBAdSDK showVideo");
        try {
            this.facebook_ad_reward.show().then(() => {
                if (ADCallback) {
                    ADCallback();
                }
            }).catch(() => {
                if (failBack) {
                    failBack();
                }
                this.facebook_ad_reward.load();
            });
        } catch (error) {
            console.log(error);
            if (errBack) {
                errBack();
            }
        }
    }

    public showBanner() {}; //显示banner
    public hideBanner(){};

}

