import { _decorator, Component, Node } from 'cc';
// import GameAnalytics from 'gameanalytics';
import { AdUnity } from '../../ADSDK/AdUnity';
import { SDKData } from '../../ADSDK/SDKData';


export class SDKMgr {
  private static _instance: SDKMgr | null = null;
  public static get instance() {
    if (!this._instance) {
      this._instance = new SDKMgr();
    }
    return this._instance;
  }

  /**是否为测试模式 */
  public isTest: boolean = false;
  public adCB: Function | null = null;

  /**广告初始化进游戏前调用 */
  public init(_isTest?: boolean, _enableConsoleLogs?: boolean) {
    console.info("SDKMgr.int! isTest:", _isTest, "output console logs:", _enableConsoleLogs);
    this.isTest = _isTest ?? false;

    // 重新设置console输出
    // this._resetConsole(_enableConsoleLogs);

    console.info("ADUnity init");
    AdUnity.init();

    console.info("ADUnity creatAD");
    AdUnity.creatAD();

    console.info("client type:", SDKData.getInstance().sdkType, "version:", SDKData.getInstance().version);
  }

  /**
   * 播放视频
   * @param back 视频成功回调
   * @param failBack 视频取消回调d
   * @param errBack 视频失败回调
   * @returns
   */
  public showVideo(back?: Function, failBack?: Function, errBack?: Function): void {
    if (this.isTest) {
      console.log("showVideo");
      back && back();
      return;
    }
    this.adCB = back as Function|null;
    // GameAnalytics.GameAnalytics.addAdEvent(GameAnalytics.EGAAdAction.Show, GameAnalytics.EGAAdType.RewardedVideo, 'wx', '1');
    AdUnity.showVideo(() => {
      back?.();
    //   GameAnalytics.GameAnalytics.addAdEvent(GameAnalytics.EGAAdAction.RewardReceived, GameAnalytics.EGAAdType.RewardedVideo, 'wx', '1');
    }, failBack, errBack);
  }

  adCallBack(): void {
    setTimeout(() => {
      this.adCB && this.adCB();
      this.adCB = null;
    }, 200);
  }

  /**隐藏banenr */
  public hideBanner(): void {
    if (this.isTest) {
      return;
    }
    AdUnity.hideBanner();
  }

  /**显示banner */
  public showBanner(): void {
    if (this.isTest) {
      return;
    }
    AdUnity.showBanner();
  }

  /**插屏 */
  public showInsert(): void {
    console.log("插屏===");
    if (this.isTest) {
      return;
    }
    // GameAnalytics.GameAnalytics.addAdEvent(GameAnalytics.EGAAdAction.Show, GameAnalytics.EGAAdType.Interstitial, 'wx', '2');
    AdUnity.showInsert();
  }

}
