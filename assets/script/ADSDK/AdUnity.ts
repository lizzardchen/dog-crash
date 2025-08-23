import { _decorator, Component, Node } from 'cc'
import { ADInterface } from './interface/ADInterface'
import { sys } from 'cc'
import { AndroidPangleSDK } from './android/AndroidPangleSDK'
import { AndroidAdmobSDK } from './android/AndroidAdmobSDK'
import { IOSPangleSDK } from './ios/IOSPangleSDK'
import { IOSAdmobSDK } from './ios/IOSAdmobSDK'
import { SDK_TYPE, SDKData } from './SDKData'
import DefaultAD from './DefaultAD'
import { FBAdSDK } from './fb/FBAdSDK'
import { Unity3DAdSDK } from './unity/Unity3DAdSDK'
import { AdSenseSDK } from './adsense/AdSenseSDK'

export class AdUnity {
  public static AD: ADInterface
  public static init() {
    //根据ADManager.instance.sdkType 利用工程模式生成adInterface
    let platform = sys.os;
    let type: string
    let className: string
    const languageCode: string = sys.languageCode
    console.log('platform:', platform)
    console.log('language : ', languageCode)
    let is_cn: boolean = false
    if (languageCode.includes('CN')) {
      is_cn = true
    }

    switch (platform) {
      case sys.OS.ANDROID:{
          SDKData.getInstance().sdkType = SDK_TYPE.Android;
          // if(is_cn){
          //     this.AD = new AndroidPangleSDK();
          // }else
          // {
              this.AD = new AndroidAdmobSDK();
          // }
          console.log(".............android platform..........");
          break;
      }
      case sys.OS.IOS:{
          SDKData.getInstance().sdkType = SDK_TYPE.IOS;
          // if(is_cn){
          //     this.AD = new IOSPangleSDK();
          // }
          // else{
              this.AD = new IOSAdmobSDK();
          // }
          break;
      }
      default: {
        // 可以根据需要切换默认广告平台
        // SDKData.getInstance().sdkType = SDK_TYPE.Android
        // this.AD = new AndroidAdmobSDK();

        // SDKData.getInstance().sdkType = SDK_TYPE.IOS;
        // this.AD = new IOSAdmobSDK();

        // SDKData.getInstance().sdkType = SDK_TYPE.Unity3D
        // this.AD = new Unity3DAdSDK()
        
        // SDKData.getInstance().sdkType = SDK_TYPE.default
        // this.AD = new DefaultAD()

        SDKData.getInstance().sdkType = SDK_TYPE.default
        this.AD = new DefaultAD()
        break;
      }
    }
  }

  public static creatAD(): void {
    this.AD.initAd()
  }

  public static showVideo(ADCallback: Function, failBack?: Function, errBack?: Function): void {
    this.AD.showVideo(ADCallback, failBack, errBack)
  }

  /**banner */
  public static showBanner(): void {
    this.AD.showBanner()
  }

  /**banner */
  public static hideBanner(): void {
    this.AD.hideBanner()
  }

  /**插屏 */
  public static showInsert(): void {
    this.AD.showInsert()
  }
}
