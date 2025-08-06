import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export interface ADCallBack {
    success: Function;
  
    fail: Function;
  
    cancel: Function;
  }

export abstract class ADInterface {
  public abstract initAd(); //初始化广告
  public abstract showInsert(); //显示插屏
  public abstract showVideo(ADCallback: Function, failBack?: Function, errBack?: Function); //视频
  public showBanner() {}; //显示banner
  public hideBanner(){};
}

