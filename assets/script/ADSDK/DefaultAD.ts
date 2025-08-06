import { ADInterface,ADCallBack } from "./interface/ADInterface";

export default class DefaultAD extends ADInterface {
    public initAd() {}
    public showVideo(ADCallback: Function, failBack?: Function, errBack?: Function) {
        ADCallback && ADCallback();
    }
    public showInsert() {
    }
}