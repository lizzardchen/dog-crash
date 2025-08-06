/// <reference path="./types/fb.d.ts" />

// 添加String.prototype.endsWith的polyfill
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (searchString, position) {
    const subjectString = this.toString()
    if (
      typeof position !== 'number' ||
      !isFinite(position) ||
      Math.floor(position) !== position ||
      position > subjectString.length
    ) {
      position = subjectString.length
    }
    position -= searchString.length
    const lastIndex = subjectString.indexOf(searchString, position)
    return lastIndex !== -1 && lastIndex === position
  }
}

export enum PlatformType {
  Facebook = 'Facebook',
  Google = 'Google',
  Apple = 'Apple',
  Huawei = 'Huawei',
}

export class PlatformFacebook {
  type: PlatformType.Facebook
  private paymentCallback?: () => void
  private isLogined: boolean = false
  private userInfo: UserInfo | null = null
  private manager: any = null
  private isPaymentReady: boolean = false
  private canCreateShortcut: boolean = false
  private findConsumeProduct: boolean = false
  private rewardAd: FacebookAD
  private rewardAd2: FacebookAD
  private interstitialAd: FacebookAD
  private interstitialAd2: FacebookAD
  private bannerAd: FacebookAD

  constructor() {
    this.type = PlatformType.Facebook
    // 初始化广告实例
    this.rewardAd = new FacebookAD(FacebookAD.TYPE_Reward_AD, '959350989607979_959464919596586')
    this.rewardAd2 = new FacebookAD(FacebookAD.TYPE_Reward_AD, '959350989607979_959466339596444')
    this.interstitialAd = new FacebookAD(
      FacebookAD.TYPE_Interstitial_AD,
      '959350989607979_959465279596550'
    )
    this.interstitialAd2 = new FacebookAD(
      FacebookAD.TYPE_Interstitial_AD,
      '959350989607979_959470759596002'
    )
    this.bannerAd = new FacebookAD(FacebookAD.TYPE_Banner_AD, '959350989607979_959465382929873')
  }

  async login(callback: () => void): Promise<UserInfo> {
    this.paymentCallback = callback
    this.isLogined = false
    this.userInfo = null
    this.manager = null
    this.isPaymentReady = false
    this.canCreateShortcut = false
    this.findConsumeProduct = false

    console.log('FB.login.')
    this.canCreateShortcutAsync().then(result => {
      this.canCreateShortcut = result
    })

    let signed: string
    let playerid: string

    await FBInstant.player.getSignedPlayerInfoAsync('my_metadata').then(result => {
      playerid = result.getPlayerID()
      signed = result.getSignature()
      // 可以添加更多日志
    })

    this.isLogined = true
    this.userInfo = {
      fbid: playerid,
      signed: signed,
      // name 和 photo 在 SDK 8.0 中已移除
      // name: '',
      // photo: ''
    }
    console.log('FBInstant.player===>Loaded')

    if (this.isPaymentSupport()) {
      this.initPayment()
    }

    return new Promise<UserInfo>(resolve => {
      resolve({
        fbid: playerid,
        signed: signed,
        // name 和 photo 在 SDK 8.0 中已移除
        // name: '',
        // photo: ''
      })
    })
  }

  isPaymentSupport(): boolean {
    const apis = FBInstant.getSupportedAPIs()
    return apis.includes('payments.purchaseAsync')
  }

  isPaymentReadyFunc(): boolean {
    return this.isPaymentReady
  }

  private initPayment(): void {
    if (this.isPaymentSupport()) {
      console.log('payments is Support')
      FBInstant.payments.onReady(() => {
        console.log('Payments Ready!')
        this.isPaymentReady = true
        if (this.paymentCallback) {
          this.paymentCallback()
        }
        this.paymentCallback = undefined
      })
    }
  }

  getPaymentCatalogAsync(): Promise<any[]> {
    console.log('--getPaymentCatalogAsync-11111 ')
    return new Promise((resolve, reject) => {
      console.log('--getPaymentCatalogAsync- ')
      FBInstant.payments
        .getCatalogAsync()
        .then(catalog => {
          console.log(catalog)
          resolve(catalog)
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  getPurchaseProducts(): Promise<any> {
    if (this.isPaymentReady) {
      console.log('payments is Support')
      return FBInstant.payments.getPurchasesAsync()
    } else {
      return Promise.reject('payment is not ready!')
    }
  }

  consumePurchaseProduct(purchaseToken: string): Promise<void> {
    if (this.isPaymentReady) {
      console.log('payments is Support')
      return FBInstant.payments.consumePurchaseAsync(purchaseToken)
    } else {
      return Promise.reject('payment is not ready!')
    }
  }

  purchaseIAP(iapID: string): Promise<FBInstant.Purchase> {
    return FBInstant.payments.purchaseAsync({
      productID: iapID,
      developerPayload: 'shop',
    })
  }

  setManager(mgr: any): void {
    this.manager = mgr
  }

  isMobile(): boolean {
    const platform = FBInstant.getPlatform()
    return platform === 'IOS' || platform === 'ANDROID'
  }

  isIOS(): boolean {
    const platform = FBInstant.getPlatform()
    return platform === 'IOS'
  }

  getEntryPointAsync(): Promise<string> {
    return FBInstant.getEntryPointAsync()
  }

  getEntryPointData(): any {
    return FBInstant.getEntryPointData()
  }

  getPlayerID(): string {
    return FBInstant.player.getID()
  }

  getName(): string {
    // SDK 8.0 已移除 getName
    console.warn('FBInstant.player.getName() is deprecated in SDK 8.0+')
    return ''
  }

  getPhoto(): string {
    // SDK 8.0 已移除 getPhoto
    console.warn('FBInstant.player.getPhoto() is deprecated in SDK 8.0+')
    return ''
  }

  getLocale(): string {
    let locale = FBInstant.getLocale()
    if (locale && locale.length >= 2) {
      locale = locale.slice(0, 2)
    } else {
      locale = 'en'
    }
    return locale
  }

  startGameAsync(): Promise<void> {
    return FBInstant.startGameAsync()
  }

  loadAd(mgr: any): void {
    if (this.isAdSupported()) {
      this.rewardAd.load()
      this.rewardAd2.load()
      this.interstitialAd.load()
      this.interstitialAd2.load()
      this.bannerAd.load()
      this.loadRewardedVideo()
      this.loadInterstitialAd()
      this.loadBannerAd()
    }
  }

  onPause(): void {
    console.log('---PlatformFacebook.prototype.onPause--')
    FBInstant.onPause(() => {})
  }

  quit(): void {
    FBInstant.quit()
  }

  setLoadingProgress(progress: number): void {
    FBInstant.setLoadingProgress(progress)
  }

  logEvent(eventName: string, valueToSum?: number, parameters?: any): void {
    FBInstant.logEvent(eventName, valueToSum, parameters)
  }

  canCreateShortcutAsync(): Promise<boolean> {
    console.log('canCreateShortcutAsync')
    const apis = FBInstant.getSupportedAPIs()
    if (!apis.includes('canCreateShortcutAsync')) {
      console.warn('canCreateShortcutAsync API not supported')
      // return Promise.resolve(false);
    }
    return FBInstant.canCreateShortcutAsync()
  }

  createShortcutAsync(): Promise<void> {
    return FBInstant.createShortcutAsync()
  }

  isContextSolo(): boolean {
    return FBInstant.context.getType() === 'SOLO'
  }

  chooseContextAsync(options: any): Promise<void> {
    return FBInstant.context.chooseAsync(options)
  }

  getContextID(): string {
    return FBInstant.context.getID()
  }

  getContextType(): string {
    try {
      const apis = FBInstant.getSupportedAPIs()
      if (!apis.includes('context.getType')) {
        console.warn('context.getType API not supported')
      }
      if (FBInstant.context) {
        return FBInstant.context.getType()
      }
      return ''
    } catch (error) {
      console.warn('getContextType API not supported')
      return ''
    }
  }

  getContextPlayersAsync(): Promise<FBInstant.ContextPlayer[]> {
    return FBInstant.context.getPlayersAsync()
  }

  public switchContextAsync(contextId: string): Promise<void> {
    return FBInstant.context.switchAsync(contextId)
  }

  public getConnectedPlayersAsync(): Promise<FBInstant.ConnectedPlayer[]> {
    const apis = FBInstant.getSupportedAPIs()
    if (!apis.includes('getConnectedPlayersAsync')) {
      console.warn('getConnectedPlayersAsync API not supported')
      // return Promise.resolve(false);
    }
    return FBInstant.player.getConnectedPlayersAsync()
  }

  updateAsync(message: UpdateMessage): Promise<void> {
    const payload = {
      action: 'CUSTOM',
      template: message.template,
      image: message.image,
      text: message.text,
      strategy: message.strategy,
      data: message.data,
    }
    return this.updateImplAsync(payload)
  }

  updateImplAsync(payload: any): Promise<void> {
    return FBInstant.updateAsync(payload)
  }

  async sendMessage(message: Message): Promise<any> {
    return this.chooseContextAsync([message.contextFilter])
      .catch(reason => {
        if (reason.code === 'SAME_CONTEXT') {
          return
        }
        throw reason
      })
      .then(async () => {
        const payload = {
          action: 'CUSTOM',
          template: message.template,
          image: message.image,
          text: message.text,
          strategy: message.strategy,
          data: message.data,
        }
        const playersPromise = FBInstant.context.getPlayersAsync()
        const updatePromise = FBInstant.updateAsync(payload)
        return Promise.all([playersPromise, updatePromise]).then(result => {
          const playerIDs = result[0].map(player => player.getID())
          const contextID = FBInstant.context.getID()
          return {
            playerIDs,
            contextID,
          }
        })
      })
  }

  sendMessageToPlayer(playerID: string, message: Message): Promise<void> {
    return FBInstant.context
      .createAsync(playerID)
      .catch(reason => {
        if (reason.code === 'SAME_CONTEXT') {
          return
        }
        throw reason
      })
      .then(() => {
        const payload = {
          action: 'CUSTOM',
          template: message.template,
          image: message.image,
          text: message.text,
          strategy: message.strategy,
          data: message.extraData,
        }
        return FBInstant.updateAsync(payload)
      })
  }

  isAdSupported(): boolean {
    return true
  }

  isVideoLoaded(): boolean {
    try {
      return this.rewardAd.isPreloaded() || this.rewardAd2.isPreloaded()
    } catch (err) {
      console.log('isVideoLoaded error=' + JSON.stringify(err))
      return false
    }
  }

  isInterstitialAdLoaded(): boolean {
    try {
      return this.interstitialAd.isPreloaded() || this.interstitialAd2.isPreloaded()
    } catch (err) {
      console.log(JSON.stringify(err))
      return false
    }
  }

  loadRewardedVideo(): Promise<string> {
    const apis = FBInstant.getSupportedAPIs()
    if (!apis.includes('getRewardedVideoAsync')) {
      console.warn('Rewarded video API not supported')
      return Promise.reject('Rewarded video API not supported')
    }
    if (this.isAdSupported()) {
      console.log('--loadRewardedVideo- ')
      try {
        if (!this.rewardAd.isPreloaded()) {
          this.rewardAd.load()
        }
        if (!this.rewardAd2.isPreloaded()) {
          this.rewardAd2.load()
        }
        return Promise.resolve('load video')
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  showRewardedVideo(): Promise<void> {
    const apis = FBInstant.getSupportedAPIs()
    if (!apis.includes('getRewardedVideoAsync')) {
      console.warn('Rewarded video API not supported')
      return Promise.reject('Rewarded video API not supported')
    }
    if (this.isAdSupported()) {
      try {
        if (this.rewardAd.isPreloaded()) {
          return this.rewardAd.show()
        }
        if (this.rewardAd2.isPreloaded()) {
          return this.rewardAd2.show()
        }
        this.loadRewardedVideo()
        return Promise.reject('no videoAd is loaded')
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  loadInterstitialAd(): Promise<string> {
    if (this.isAdSupported()) {
      try {
        if (!this.interstitialAd.isPreloaded()) {
          this.interstitialAd.load()
        }
        if (!this.interstitialAd2.isPreloaded()) {
          this.interstitialAd2.load()
        }
        return Promise.resolve('load InterstitialAd')
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  showInterstitialAd(): Promise<void> {
    if (this.isAdSupported()) {
      try {
        if (this.interstitialAd.isPreloaded()) {
          return this.interstitialAd.show()
        }
        if (this.interstitialAd2.isPreloaded()) {
          return this.interstitialAd2.show()
        }
        this.loadInterstitialAd()
        return Promise.reject('no Interstitialad is loaded')
      } catch (err) {
        return Promise.reject('ad not supported')
      }
    }
    return Promise.reject('ad not supported')
  }

  loadBannerAd(): Promise<string> {
    if (this.isAdSupported()) {
      try {
        if (!this.bannerAd.isPreloaded()) {
          this.bannerAd.load()
        }
        return Promise.resolve('load BannerAd')
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  showBannerAd(): Promise<void> {
    if (this.isAdSupported()) {
      try {
        if (this.bannerAd.isPreloaded()) {
          return this.bannerAd.show()
        }
        this.loadBannerAd()
        return Promise.reject('no BannerAd is loaded')
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  hideBannerAd(): Promise<void> {
    if (this.isAdSupported() && this.bannerAd) {
      try {
        return this.bannerAd.hide()
      } catch (err) {
        return Promise.reject('err=' + JSON.stringify(err))
      }
    }
    return Promise.reject('ad not supported')
  }

  createOverlayAsync(
    initdata: any,
    xml: string,
    style: string,
    csspath: string,
    domelement: HTMLElement,
    relativepath: string
  ): Promise<FBInstant.OverlayView> {
    return FBInstant.overlayViews.createOverlayViewAsync(xml, domelement, style, csspath, initdata)
  }

  createOverlay(
    initdata: any,
    xml: string,
    csspath: string,
    successCallback: Function,
    errorCallback: Function
  ): FBInstant.OverlayView {
    return FBInstant.overlayViews.createOverlayView(
      xml,
      csspath,
      initdata,
      overlayView => {
        successCallback(overlayView)
      },
      (overlayView, error) => {
        errorCallback(overlayView, error)
      }
    )
  }

  setGlobalLeaderboardScoreAsync(key: string, score: number): Promise<void> {
    // Use Global Leaderboard API to set score.
    const leaderboardID = key // Assuming key is the leaderboardID
    console.log(`Attempting to set score ${score} for global leaderboard: ${leaderboardID}`)
    // const apis = FBInstant.getSupportedAPIs();
    // if (!apis.includes('setScoreAsync')) {
    //     console.warn('setScoreAsync API not supported');
    //     return Promise.reject('setScoreAsync API not supported');
    // }
    return FBInstant.globalLeaderboards
      .setScoreAsync(leaderboardID, score)
      .then(() => {
        console.log(`Score set successfully for ${leaderboardID}`)
      })
      .catch(error => {
        console.error(`Failed to set score for global leaderboard ${leaderboardID}:`, error)
        // Handle specific errors if needed, e.g., score not improved
        if (error?.code === 'LEADERBOARD_SCORE_NOT_IMPROVED') {
          console.log('Score not improved, not updated.')
          // Depending on desired behavior, you might want to resolve or reject here.
          // Rejecting might be clearer that no update occurred.
          return Promise.reject(error)
        } else if (error?.code === 'INVALID_PARAM') {
          console.error(
            'Invalid parameter provided to setScoreAsync (check leaderboardID and score format).'
          )
          return Promise.reject(error)
        } else if (error?.code === 'NETWORK_FAILURE') {
          console.error('Network failure during setScoreAsync.')
          return Promise.reject(error)
        }
        // Reject with the original error for other cases
        return Promise.reject(error)
      })
  }

  getGlobalLeaderboardTopFriendEntriesAsync(
    key: string,
    count: number = 10
  ): Promise<FBInstant.GlobalLeaderboardEntry[]> {
    // Use Global Leaderboard API - retrieves top entries globally.
    // contextid and offset are not applicable here.
    console.log(`Retrieving global leaderboards top entries for: ${key}, limit: ${count}`)
    // const apis = FBInstant.getSupportedAPIs();
    // console.log(`apis: ${JSON.stringify(apis)}`);
    // if (!apis.includes('getTopFriendEntriesAsync')) {
    //     console.warn('getTopFriendEntriesAsync API not supported');
    //     return Promise.reject('getTopFriendEntriesAsync API not supported');
    // }
    return FBInstant.globalLeaderboards
      .getTopFriendEntriesAsync(key, count)
      .then(entries => {
        console.log(`Retrieved ${entries.length} global entries for ${key}`)
        return entries
      })
      .catch(error => {
        console.error(`Failed to retrieve global leaderboard ${key}:`, error)
        return Promise.reject(error)
      })
  }

  getGlobalLeaderboardPlayerScoreAsync(key: string): Promise<number | null> {
    // FBInstant SDK 8.0+ Global Leaderboard API does not provide a direct equivalent to get only the current player's entry.
    // const apis = FBInstant.getSupportedAPIs();
    // if (!apis.includes('getScoreAsync')) {
    //     console.warn('getScoreAsync API not supported');
    //     return Promise.reject('getScoreAsync API not supported');
    // }
    return FBInstant.globalLeaderboards
      .getScoreAsync(key)
      .then(score => {
        console.log(`Retrieved score ${score} for ${key}`)
        return score
      })
      .catch(error => {
        console.error(`Failed to retrieve score for global getScoreAsync ${key}:`, error)
        return Promise.reject(error)
      })
  }

  setCustomEventHandler(callback: (eventstr: string, overlayid: string) => void): void {
    FBInstant.overlayViews.setCustomEventHandler(callback)
  }

  switchGameAsync(gameID: string): Promise<void> {
    console.log('switchGameAsync gameID=' + gameID)
    return FBInstant.switchGameAsync(gameID)
      .then(() => {
        console.log('[switchGameAsync.  ok]:')
        return Promise.resolve()
      })
      .catch(error => {
        console.log('[switchGameAsync.error]:', error)
        return Promise.reject(error)
      })
  }

  getDataAsync(paras: string[]): Promise<any> {
    return FBInstant.player
      .getDataAsync(paras)
      .then(data => {
        console.log('data is loaded')
        return Promise.resolve(data)
      })
      .catch(error => {
        console.log('[getDataAsync.error]:', error)
        return Promise.reject(error)
      })
  }

  setDataAsync(paras: any): Promise<void> {
    return FBInstant.player
      .setDataAsync(paras)
      .then(() => {
        console.log('data is saved')
      })
      .catch(error => {
        console.log('[setDataAsync.error]:', error)
        return Promise.reject(error)
      })
  }

  flushDataAsync(paras?: any): Promise<void> {
    return FBInstant.player
      .flushDataAsync(paras)
      .then(() => {
        console.log('data is flush saved')
      })
      .catch(error => {
        console.log('[flushDataAsync.error]:', error)
        return Promise.reject(error)
      })
  }
  // image: base64Picture,
  // text: 'X is asking for your help!',
  // data: { myReplayData: '...' },
  // shareDestination: ['NEWSFEED', 'GROUP', 'COPY_LINK', 'MESSENGER']
  // switchContext: false,

  postTournamentScoreAsync(score: number): Promise<void> {
    return FBInstant.tournament.postScoreAsync(score)
  }

  shareTournamentAsync(score: number, data: any): Promise<void> {
    return FBInstant.tournament.shareAsync({
      score: score,
      data: {
        senderID: FBInstant.player.getID(),
        sentTimestamp: Math.floor(Date.now() / 1000),
        shareType: 'Tournament',
        contextId: data.contextId ? data.contextId : '',
      },
    })
  }

  shareAsync(
    base64Picture: string,
    text: string,
    data: any,
    callback: Function,
    errorCallback: Function
  ): void {
    FBInstant.shareAsync({
      intent: 'SHARE',
      image: base64Picture,
      text: text,
      data: data ? data : { action: 'share', shareType: 'share_verse' },
      shareDestination: ['NEWSFEED', 'GROUP', 'COPY_LINK', 'MESSENGER'],
      switchContext: FBInstant.getPlatform() === 'IOS' || FBInstant.getPlatform() === 'ANDROID',
    })
      .then(() => {
        console.log('[call facebook shareAsync.success]')
        callback()
      })
      .catch(error => {
        errorCallback(error)
        console.log('[call facebook shareAsync.error]:', error)
      })
  }

  inviteFriendAsync(base64Picture: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Revert check for enums as they seem missing in the type definition
      if (typeof FBInstant === 'undefined') {
        console.warn('FBInstant SDK not available for inviteFriendAsync')
        return reject(new Error('FBInstant SDK not available'))
      }
      // TODO: Provide image source
      // const base64Picture = "...";
      // const imageUrl = "...";

      const options = {
        image: base64Picture,
        text: {
          default: 'Come play this awesome game with me!',
        },
        cta: {
          default: 'Play Now!',
        },
        dialogTitle: {
          default: 'Invite Friends to Play',
        },
        data: { myReplayData: '...' },
      }

      console.log('Calling FBInstant.inviteAsync with options:', options)

      FBInstant.inviteAsync(options)
        .then(() => {
          console.log('FBInstant.inviteAsync dialog closed by user.')
          resolve()
        })
        .catch((error: any) => {
          console.error('FBInstant.inviteAsync failed:', error)
          reject(error)
        })
    })
  }

  //   invite(picture: string): Promise<void> {
  //     console.log('facebook invite')
  //     const base64Picture = picture
  //     return new Promise((resolve, reject) => {
  //       FBInstant.context
  //         .chooseAsync({
  //           filters: ['NEW_CONTEXT_ONLY'],
  //           minSize: 3,
  //         })
  //         .then(() => {
  //           console.log('---finish invite ------')
  //           FBInstant.updateAsync({
  //             action: 'CUSTOM',
  //             cta: 'Play',
  //             image: base64Picture,
  //             text: {
  //               default: "Let's play game together!",
  //               localizations: {
  //                 en_US: "Let's play game together!",
  //               },
  //             },
  //             template: 'VILLAGE_INVASION',
  //             data: { myReplayData: '...' },
  //             strategy: 'IMMEDIATE',
  //             notification: 'NO_PUSH',
  //           })
  //             .then(() => {
  //               console.log('---finish updateImplAsync ------')
  //               resolve()
  //             })
  //             .catch(error => {
  //               console.log('[invite.error]:', error)
  //               reject(error)
  //             })
  //         })
  //         .then(() => {
  //           console.log('---finish chooseAsync ------')
  //         })
  //         .catch(error => {
  //           console.log('[invite.error]:', error)
  //           reject(error)
  //         })
  //     })
  //   }
  //tournaments
  public getTournamentsAsync(): Promise<FBInstant.Tournament[]> {
    return FBInstant.tournament.getTournamentsAsync()
  }

  //tournament
  public getTournamentAsync(): Promise<FBInstant.Tournament> {
    return FBInstant.getTournamentAsync()
  }

  public createTournamentAsync(
    score: number,
    title: string,
    endTime: number
  ): Promise<FBInstant.Tournament> {
    return FBInstant.tournament.createAsync({
      initialScore: score,
      config: {
        title: title,
        minimumScore: 0,
        sortOrder: 'HIGHER_IS_BETTER',
        scoreFormat: 'NUMERIC',
        endTime: endTime,
      },
      data: {
        creatorID: FBInstant.player.getID(),
        createTimestamp: Math.floor(Date.now() / 1000),
      },
    })
  }

  public joinTournamentAsync(tournamentId: string): Promise<void> {
    return FBInstant.tournament.joinAsync(tournamentId)
  }

  public postSessionScoreAsync(score: number): Promise<void> {
    return FBInstant.postSessionScoreAsync(score)
  }

  public onContextChange(
    onSuccess: (context: string) => void,
    onError: (error: any) => void
  ): void {
    FBInstant.onContextChange(onSuccess, onError)
  }

  public setSessionData(data: any): void {
    FBInstant.setSessionData(data)
  }
}

export class FacebookAD {
  static TYPE_Reward_AD: string = 'TYPE_Reward_AD'
  static TYPE_Interstitial_AD: string = 'TYPE_Interstitial_AD'
  static TYPE_Banner_AD: string = 'TYPE_Banner_AD'

  private _type: string
  private _id: string
  private _isLoaded: boolean = false
  private _isLoading: boolean = false
  private _retryCount: number = 0
  private _instance: any
  private _loadingPromise?: Promise<void>

  constructor(adtype: string, adid: string) {
    this._type = adtype
    this._id = adid
    this._isLoaded = false
    this._isLoading = false
    this._retryCount = 0
  }

  get id(): string {
    return this._id
  }

  get type(): string {
    return this._type
  }

  load(): Promise<void | any> {
    if (!this._id) {
      console.log('No valid interstitial ad placement ID set')
      return Promise.reject(null)
    }
    if (this._isLoading) {
      console.log(` ad is loading== `)
      return Promise.resolve()
    }
    console.log(`[0.load]:id -->[${this._id}]. `)
    const adid = this._id
    if (this._type === FacebookAD.TYPE_Banner_AD) {
      this._isLoading = true
      const apis = FBInstant.getSupportedAPIs()
      if (!apis.includes('loadBannerAdAsync')) {
        console.warn('Banner ad API not supported')
        return Promise.reject('Banner ad API not supported')
      }
      return FBInstant.loadBannerAdAsync(this._id)
        .then(ad => {
          console.log(' load Banner ad 222')
          console.log(`[1.${this._type}.Async]:id -->[${this._id}]. `)
          this._instance = ad
          this._isLoading = false
          this._isLoaded = true
          this._retryCount = 0
          console.log(' load Banner ad success = ' + this._isLoaded)
          return Promise.resolve()
        })
        .catch(err => {
          this._isLoading = false
          console.log(` load Banner ad error, adid=${this._id}, error=${JSON.stringify(err)}`)
          this._retryCount++
          if (this._retryCount < 5) {
            setTimeout(() => {
              this.reset()
            }, 10000)
          }
          return Promise.reject(err)
        })
    } else if (this._type === FacebookAD.TYPE_Reward_AD) {
      this._isLoading = true
      const apis = FBInstant.getSupportedAPIs()
      if (!apis.includes('getRewardedVideoAsync')) {
        console.warn('Rewarded video API not supported')
        return Promise.reject('Rewarded video API not supported')
      }
      return FBInstant.getRewardedVideoAsync(this._id)
        .then(ad => {
          console.log(' load  Reward video  222')
          console.log(`[1.${this._type}.Async]:id -->[${this._id}]. `)
          this._instance = ad
          this._isLoading = false
          return ad.loadAsync()
        })
        .then(() => {
          this._isLoading = false
          this._isLoaded = true
          this._retryCount = 0
          console.log(' load  Reward video success  = ' + this._isLoaded)
        })
        .catch(err => {
          this._isLoading = false
          console.log(` load  Reward error, adid=${this._id}, error=${JSON.stringify(err)}`)
          this._retryCount++
          console.log(' load   _this._retryCount=' + this._retryCount)
          if (this._retryCount < 5) {
            setTimeout(() => {
              this.reset()
            }, 10000)
          }
        })
    } else {
      console.log(' load  InterstitialAd  111')
      this._isLoading = true
      const apis = FBInstant.getSupportedAPIs()
      if (!apis.includes('getInterstitialAdAsync')) {
        console.warn('Interstitial ad API not supported')
        return Promise.reject('Interstitial ad API not supported')
      }
      return FBInstant.getInterstitialAdAsync(this._id)
        .then(ad => {
          console.log(' load  InterstitialAd  222')
          console.log(`[1.${this._type}.Async]:id -->[${this._id}]. `)
          this._instance = ad
          this._isLoading = false
          return ad.loadAsync()
        })
        .then(() => {
          this._isLoading = false
          this._isLoaded = true
          this._retryCount = 0
          console.log(' load  InterstitialAd success  = ' + this._isLoaded)
        })
        .catch(err => {
          this._isLoading = false
          console.log(' load  InterstitialAd error' + JSON.stringify(err))
          console.log(`[ InterstitialAd .load.error]: ${err}. `)
          this._retryCount++
          if (this._retryCount < 5) {
            setTimeout(() => {
              this.reset()
            }, 10000)
          }
        })
    }
  }

  isPreloaded(): boolean {
    return this._isLoaded
  }

  show(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._isLoaded) {
        console.log(' show video error is not preloaded')
        reject('show video error is not preloaded')
      } else {
        this._instance
          .showAsync()
          .then(() => {
            console.log(`[${this._type}.show]:ad finished successfully. `)
            this.reset()
            resolve()
          })
          .catch(err => {
            console.log(`[${this._type}.show.error]: ${err}. `)
            this.reset()
            reject(err)
          })
      }
    })
  }

  hide(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._instance) {
        console.log('hide ad error: no instance available')
        reject('hide ad error: no instance available')
      } else if (this._type !== FacebookAD.TYPE_Banner_AD) {
        console.log('hide method only available for Banner ads')
        reject('hide method only available for Banner ads')
      } else {
        try {
          // Banner广告的隐藏逻辑
          if (this._instance.hideAsync) {
            this._instance
              .hideAsync()
              .then(() => {
                console.log(`[${this._type}.hide]:ad hidden successfully. `)
                resolve()
              })
              .catch(err => {
                console.log(`[${this._type}.hide.error]: ${err}. `)
                reject(err)
              })
          } else {
            reject('hideAsync method not available on this ad instance')
          }
        } catch (err) {
          console.log(`[${this._type}.hide.error]: ${err}. `)
          reject(err)
        }
      }
    })
  }

  private reset(): void {
    console.log(' load  Reward reset=')
    this._instance = null
    this._loadingPromise = undefined
    this._isLoaded = false
    this._isLoading = false
    this.load()
  }
}

interface UserInfo {
  fbid: string
  signed: string
  // name 和 photo 在 SDK 8.0 中已移除
  // name?: string;
  // photo?: string;
}

interface UpdateMessage {
  template: string
  image: string
  text: string
  strategy: string
  data: any
}

interface Message {
  contextFilter?: string
  template: string
  image: string
  text: string
  strategy: string
  data: any
  extraData?: any
}

interface SendResult {
  playerIDs: string[]
  contextID: string
}
