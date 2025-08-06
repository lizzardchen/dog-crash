
export enum SDK_TYPE {
    Byte = "byte",
    WeChat = "wx",
    Android = "android",
    Google = "google",
    IOS = "ios",
    Taptap = "taptap",
    IPad = "ipad",
    default = "default",
    T233 = "t233", // 233渠道,
    steam = "steam",
    XiaoMi = "xiaomi",
    FB = "fb",
    Unity3D = "unity3d",
    AdSense = "adsense",
  }

export class SDKData {
  private static _instance: SDKData | null = null;
  public static getInstance(){
    if (!this._instance) {
      this._instance = new SDKData();
    }
    return this._instance;
  }
    /** 版本号 */
  private _version: string = "1.0.0";
  public get version() {
    return this._version;
  }
  public set version(_ver) {
    this._version = _ver;
  }

  /** 渠道号 */
  private _sdkType: SDK_TYPE = SDK_TYPE.default;
  public get sdkType() {
    return this._sdkType;
  }

  public set sdkType(_type) {
    this._sdkType = _type;
  }

  /** 用户id */
  private _userID: string = "test1";
  public get userID() {
    return this._userID;
  }

  public set userID(_uid) {
    this._userID = _uid;
  }
}

