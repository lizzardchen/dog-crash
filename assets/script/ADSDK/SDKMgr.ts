import { _decorator, Component, Node } from 'cc'
import { AdUnity } from './AdUnity'
import { SDK_TYPE, SDKData } from './SDKData'
import { PlatformFacebook } from './PlatformFacebook'

export class SDKMgr {
  private static _instance: SDKMgr = null
  public static get instance() {
    if (!this._instance) {
      this._instance = new SDKMgr()
    }
    return this._instance
  }

  /**是否为测试模式 */
  public isTest: boolean = false
  public adCB: Function = null

  // 持有当前平台的实例
  private platformInstance: PlatformFacebook | null = null // 暂时只支持 Facebook, 后续可扩展为接口类型

  /**广告初始化进游戏前调用 */
  public init(_isTest?: boolean, _enableConsoleLogs?: boolean) {
    console.info('SDKMgr.int! isTest:', _isTest, 'output console logs:', _enableConsoleLogs)
    this.isTest = _isTest ?? false

    // 重新设置console输出
    // this._resetConsole(_enableConsoleLogs);

    console.info('ADUnity init')
    AdUnity.init()

    console.info('ADUnity creatAD')
    AdUnity.creatAD()

    console.info(
      'client type:',
      SDKData.getInstance().sdkType,
      'version:',
      SDKData.getInstance().version
    )

    // 根据 SDK 类型实例化平台
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      console.info('Initializing PlatformFacebook...')
      this.platformInstance = new PlatformFacebook()
      // 这里可以考虑调用 platformInstance 的初始化或登录方法，如果需要的话
      // 例如: this.platformInstance.login(() => { console.log("PlatformFacebook logged in"); });
    } else {
      // 处理其他平台或默认情况
      console.info(
        'No specific platform instance created for SDK type:',
        SDKData.getInstance().sdkType
      )
    }
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
      console.log('showVideo')
      back && back()
      return
    }
    this.adCB = back
    AdUnity.showVideo(back, failBack, errBack)
  }

  adCallBack(): void {
    setTimeout(() => {
      this.adCB && this.adCB()
      this.adCB = null
    }, 200)
  }

  /**隐藏banenr */
  public hideBanner(): void {
    if (this.isTest) {
      return
    }
    AdUnity.hideBanner()
  }

  /**显示banner */
  public showBanner(): void {
    if (this.isTest) {
      return
    }
    AdUnity.showBanner()
  }

  /**插屏 */
  public showInsert(): void {
    console.log('插屏===')
    if (this.isTest) {
      return
    }
    AdUnity.showInsert()
  }

  public setLoadingProgress(load_percent: number) {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      FBInstant.setLoadingProgress(load_percent)
    }
  }

  public FBStartGameAsync(): Promise<void> | null {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      return FBInstant.startGameAsync()
    }
    return null
  }

  public CanShare(): boolean {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      return true
    }
    return false
  }

  public isFB(): boolean {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      return true
    }
    return false
  }

  public shareAsync(
    base64Picture: string,
    text: string,
    data: any,
    callback: Function,
    errorCallback: Function
  ): void {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      this.platformInstance.shareAsync(base64Picture, text, data, callback, errorCallback)
    }
  }

  public InviteFriend(base64Picture: string): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      return this.platformInstance.inviteFriendAsync(base64Picture)
    }
    return Promise.resolve()
  }

  // public InviteFriend2(base64Picture: string): Promise<void> {
  //   if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
  //     return this.platformInstance.invite(base64Picture)
  //   }
  //   return Promise.resolve()
  // }

  public updateAsync(payload: any, base64Picture: string): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      const match_text: string = 'I just completed a Match, play now!'
      const playload = {
        action: 'CUSTOM',
        cta: 'Join The Match',
        image: base64Picture,
        text: {
          default: match_text,
        },
        notificationText: {
          default: match_text,
        },
        template: 'VILLAGE_INVASION',
        data: payload,
        strategy: 'IMMEDIATE',
        notification: 'NO_PUSH',
      }
      return this.platformInstance.updateImplAsync(playload)
    }
    return Promise.resolve()
  }

  public canFollowOfficialPageAsync(): Promise<boolean> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      const apis = FBInstant.getSupportedAPIs()
      // if (!apis.includes('canFollowOfficialPageAsync')) {
      //   console.warn('canFollowOfficialPageAsync API not supported');
      //   return Promise.reject('canFollowOfficialPageAsync API not supported');
      // }
      return FBInstant.community.canFollowOfficialPageAsync()
    }
    return Promise.resolve(false)
  }

  public followOfficialPageAsync(): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      const apis = FBInstant.getSupportedAPIs()
      // if (!apis.includes('followOfficialPageAsync')) {
      //   console.warn('followOfficialPageAsync API not supported');
      //   return Promise.reject('followOfficialPageAsync API not supported');
      // }
      return FBInstant.community.followOfficialPageAsync()
    }
    return Promise.resolve()
  }

  public subscribeFBInstantOnPause(callback: () => void) {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      const apis = FBInstant.getSupportedAPIs()
      if (!apis.includes('onPause')) {
        console.warn('onPause API not supported')
      }
      console.log('subscribeFBInstantOnPause')
      FBInstant.onPause(callback)
    }
  }

  // --- 新增平台接口封装 ---

  public getPlayerID(): string | null {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      try {
        return this.platformInstance.getPlayerID()
      } catch (e) {
        console.error('Error getting Player ID from PlatformFacebook:', e)
        return null
      }
    } else {
      console.warn('getPlayerID called but not on Facebook platform or platform not initialized.')
      return null
    }
  }

  public getEntryPointData(): any {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getEntryPointData()
    }
    return null
  }

  public getEntryPointAsync(): Promise<string> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getEntryPointAsync()
    }
    return Promise.resolve('')
  }

  public chooseContextAsync(options: any): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.chooseContextAsync(options)
    }
    return Promise.resolve()
  }

  public switchContextAsync(contextId: string): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.switchContextAsync(contextId)
    }
    return Promise.resolve()
  }

  public getContextId(): string {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getContextID()
    }
    return ''
  }

  public getContext(): any {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      const context = FBInstant.context
      return context
    }
    return null
  }

  public getContextType(): string {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getContextType()
    }
    return ''
  }

  public getContextPlayersAsync(): Promise<FBInstant.ContextPlayer[]> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getContextPlayersAsync()
    }
    return Promise.resolve([])
  }

  public getConnectedPlayersAsync(): Promise<FBInstant.ConnectedPlayer[]> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getConnectedPlayersAsync()
    }
    return Promise.resolve([])
  }

  public async setGlobalLeaderboardScoreAsync(key: string, score: number): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      try {
        // 注意：PlatformFacebook 中的方法已经返回 Promise<FBInstant.GlobalLeaderboardEntry>
        return this.platformInstance.setGlobalLeaderboardScoreAsync(key, score)
      } catch (error) {
        console.error(`SDKMgr: Failed to setGlobalLeaderboardScoreAsync for ${key}:`, error)
        return Promise.reject(error) // 将底层的 rejection 传递上去
      }
    } else {
      console.warn(
        'setGlobalLeaderboardScoreAsync called but not on Facebook platform or platform not initialized.'
      )
      return Promise.resolve()
    }
  }

  public async getGlobalLeaderboardTopFriendEntriesAsync(
    key: string,
    count: number = 10
  ): Promise<FBInstant.GlobalLeaderboardEntry[] | null> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      try {
        // 注意：PlatformFacebook 中的方法已经返回 Promise<FBInstant.GlobalLeaderboardEntry[]>
        return await this.platformInstance.getGlobalLeaderboardTopFriendEntriesAsync(key, count)
      } catch (error) {
        console.error(
          `SDKMgr: Failed to getGlobalLeaderboardTopFriendEntriesAsync for ${key}:`,
          error
        )
        return Promise.reject(error) // 将底层的 rejection 传递上去
      }
    } else {
      console.warn(
        'getGlobalLeaderboardTopFriendEntriesAsync called but not on Facebook platform or platform not initialized.'
      )
      // 返回空数组或 null 可能更合适，取决于调用者如何处理
      return Promise.resolve(null)
    }
  }

  //[{sessionID:string,score:number}]
  public async createOverlayAsync(
    initdata: any,
    xml: string,
    style: string,
    csspath: string,
    domelement: HTMLElement,
    relativepath: string
  ): Promise<FBInstant.OverlayView> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.createOverlayAsync(
        initdata,
        xml,
        style,
        csspath,
        domelement,
        relativepath
      )
    }
    return Promise.resolve(null)
  }

  public createOverlay(
    initdata: any,
    xml: string,
    csspath: string,
    successCallback: Function,
    errorCallback: Function
  ): FBInstant.OverlayView {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.createOverlay(
        initdata,
        xml,
        csspath,
        successCallback,
        errorCallback
      )
    }
    return null
  }

  public canCreateShortcutAsync(): Promise<boolean> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.canCreateShortcutAsync()
    }
    return Promise.resolve(false)
  }

  public createShortcutAsync(): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.createShortcutAsync()
    }
    return Promise.resolve()
  }

  public async getGlobalLeaderboardPlayerScoreAsync(key: string): Promise<number | null> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      try {
        return await this.platformInstance.getGlobalLeaderboardPlayerScoreAsync(key)
      } catch (error) {
        console.error(`SDKMgr: Failed to getGlobalLeaderboardPlayerScoreAsync for ${key}:`, error)
        return Promise.reject(error) // 将底层的 rejection 传递上去
      }
    } else {
      console.warn(
        'getGlobalLeaderboardPlayerScoreAsync called but not on Facebook platform or platform not initialized.'
      )
      return Promise.resolve(null)
    }
  }

  public switchGameAsync(gameID: string): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.switchGameAsync(gameID)
    }
    return Promise.resolve()
  }

  public setCustomEventHandler(callback: (eventstr: string, overlayid: string) => void): void {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.setCustomEventHandler(callback)
    }
  }
  public getTournamentsAsync(): Promise<FBInstant.Tournament[]> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getTournamentsAsync()
    }
    return Promise.resolve([])
  }

  //tournament
  public getTournamentAsync(): Promise<FBInstant.Tournament> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.getTournamentAsync()
    }
    return Promise.resolve(null)
  }

  public createTournamentAsync(
    score: number,
    title: string,
    endTime: number
  ): Promise<FBInstant.Tournament> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.createTournamentAsync(score, title, endTime)
    }
    return Promise.resolve(null)
  }

  public joinTournamentAsync(tournamentId: string): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.joinTournamentAsync(tournamentId)
    }
    return Promise.resolve()
  }

  public setSessionData(data: any): void {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      this.platformInstance.setSessionData(data)
    }
  }
  /**
   * 提交锦标赛分数
   * @param score 要提交的分数
   * @returns 提交结果
   */
  public async postTournamentScoreAsync(score: number): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      try {
        return await this.platformInstance.postTournamentScoreAsync(score)
      } catch (error) {
        console.error(`SDKMgr: Failed to post tournament score:`, error)
        return Promise.reject(error)
      }
    } else {
      console.warn(
        'postTournamentScoreAsync called but not on Facebook platform or platform not initialized.'
      )
      return Promise.resolve()
    }
  }

  public shareTournamentAsync(score: number, data: any): Promise<void> {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB) {
      return this.platformInstance.shareTournamentAsync(score, data)
    }
    return Promise.resolve()
  }

  public onContextChange(
    onSuccess: (context: string) => void,
    onError: (error: any) => void
  ): void {
    if (SDKData.getInstance().sdkType == SDK_TYPE.FB && this.platformInstance) {
      return this.platformInstance.onContextChange(onSuccess, onError)
    }
  }

  // --- 结束新增平台接口封装 ---
}
