import {ADInterface,ADCallBack } from "../interface/ADInterface";

export class IOSPangleSDK extends ADInterface {

    public initAd() {
        
    }
    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        ADCallback && ADCallback();
    }
    public showInsert() {

    }
   
}

