import {ADInterface,ADCallBack } from "../interface/ADInterface";

export class AndroidPangleSDK extends ADInterface {

    public initAd() {
    }
    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        ADCallback && ADCallback();
    }
    public showInsert() {
        
    }
    
}

