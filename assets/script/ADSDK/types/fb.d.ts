declare namespace FBInstant {
  interface SignedPlayerInfo {
    getPlayerID(): string
    getSignature(): string
  }

  interface SignedASID {
    getASID(): string
    getSignature(): string
  }

  interface GlobalLeaderboardEntry {
    getScore(): number
    getPlayer(): ContextPlayer
    rank: number
  }

  namespace globalLeaderboards {
    function getTopEntriesAsync(
      leaderboardID: string,
      limit: number
    ): Promise<GlobalLeaderboardEntry[]>
    function getTopFriendEntriesAsync(
      leaderboardID: string,
      limit: number
    ): Promise<GlobalLeaderboardEntry[]>
    function setScoreAsync(leaderboardID: string, score: number): Promise<void>
    function getScoreAsync(leaderboardID: string): Promise<number | null>
  }

  interface ConnectedPlayer {
    playerID: string
    getID(): string
    getName(): string
    getPhoto(): string
  }

  interface Player {
    getID(): string
    getDataAsync(keys: string[]): Promise<any>
    setDataAsync(data: any): Promise<void>
    flushDataAsync(data?: any): Promise<void>
    getSignedPlayerInfoAsync(requestPayload?: string): Promise<SignedPlayerInfo>
    getASIDAsync(): Promise<string>
    getSignedASIDAsync(): Promise<SignedASID>
    getConnectedPlayersAsync(): Promise<ConnectedPlayer[]>
    getSessionID?(): string
    canSubscribeBotAsync?(): Promise<boolean>
    subscribeBotAsync?(): Promise<void>
  }

  interface ContextPlayer {
    getID(): string
    getName(): string
    getSessionID?(): string
  }

  type ContextType = 'SOLO' | 'THREAD' | 'GROUP' | 'POST' | 'STORY'
  type ContextFilter = { minSize?: number; maxSize?: number }
  type ContextSizeResponse = { answer: boolean; minSize: number; maxSize: number }

  interface Context {
    getID(): string
    getType(): ContextType
    isSizeBetween(minSize: number, maxSize: number): boolean
    switchAsync(contextID: string): Promise<void>
    chooseAsync(options?: { filters?: string[]; minSize?: number; maxSize?: number }): Promise<void>
    createAsync(playerIDs: string | string[]): Promise<void>
    getPlayersAsync(): Promise<ContextPlayer[]>
    getContextSizeAsync?(): Promise<ContextSizeResponse>
    isRealtimeContext?(): boolean
  }

  interface Purchase {
    productID: string
    purchaseToken: string
    developerPayload?: string
    signedRequest: string
  }

  interface PurchaseConfig {
    productID: string
    developerPayload?: string
  }

  interface Product {
    title: string
    productID: string
    description?: string
    imageURI?: string
    price: string
    priceCurrencyCode: string
  }

  interface Payments {
    getCatalogAsync(): Promise<Product[]>
    purchaseAsync(purchase: PurchaseConfig): Promise<Purchase>
    getPurchasesAsync(): Promise<Purchase[]>
    getPurchaseHistoryAsync(): Promise<Purchase[]>
    consumePurchaseAsync(purchaseToken: string): Promise<void>
    onReady(callback: () => void): void
  }

  interface RewardedVideo {
    loadAsync(): Promise<void>
    showAsync(): Promise<void>
  }

  interface InterstitialAd {
    loadAsync(): Promise<void>
    showAsync(): Promise<void>
  }

  interface BannerAd {
    loadAsync(): Promise<void>
    showAsync(): Promise<void>
    hideAsync(): Promise<void>
  }

  namespace community {
    function canFollowOfficialPageAsync(): Promise<boolean>
    function canJoinOfficialGroupAsync(): Promise<boolean>
    function followOfficialPageAsync(): Promise<void>
    function joinOfficialGroupAsync(): Promise<void>
  }

  interface CreateTournamentPayload {
    initialScore?: number
    config?: any
    data?: any
  }

  interface ShareTournamentPayload {
    score: number
    data?: any
  }

  namespace tournament {
    function postScoreAsync(score: number): Promise<void>
    function createAsync(payload: CreateTournamentPayload): Promise<Tournament>
    function shareAsync(payload: ShareTournamentPayload): Promise<void>
    function joinAsync(tournamentID: string): Promise<void>
    function getTournamentsAsync(): Promise<Tournament[]>
  }

  interface Tournament {
    args: any
    getID(): string
    getContextID(): string
    getEndTime(): number
    getTournamentType?(): 'COLLABORATIVE' | 'DEEP'
    getTitle(): string
    getPayload(): string
  }

  interface OverlayView {
    id: string
    iframeElement: HTMLIFrameElement
    initialData: any
    onInitializedCallback: (overlayView: OverlayView) => void
    onErrorCallback(overlayView: OverlayView, APIError: any): void
    getID(): string
    getIFrameElement(): HTMLIFrameElement
    getStatus(): any
    getInitialData(): any
    getErrors(): any[]
    showAsync(): Promise<void>
    updateAsync(updateData: any): Promise<void>
    dismissAsync(): Promise<void>
  }

  interface OverlayViewOptions {
    x?: number
    y?: number
    width?: number
    height?: number
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right'
    borderRadius?: number
    opacity?: number
    data?: any
  }

  namespace overlayViews {
    function createOverlayViewWithXMLStringAsync(
      xml: string,
      dom: HTMLElement,
      style: string,
      csspath: string,
      initdata: any,
      relativepath: string
    ): Promise<OverlayView>
    function createOverlayViewAsync(
      xmlpath: string,
      dom: HTMLElement,
      style: string,
      csspath: string,
      initdata: any
    ): Promise<OverlayView>
    function createOverlayView(
      xmlpath: string,
      csspath: string,
      initdata: any,
      initsucesscallback: (OverlayView) => void,
      errorcallback: (OverlayView, APIError: any) => void
    ): OverlayView
    function setCustomEventHandler(callback: (eventstr: string, overlayid: string) => void): void
  }

  interface LocalizableContent {
    default: string
    localizations?: { [locale: string]: string }
  }

  type InviteFilter =
    | 'NEW_CONTEXT_ONLY'
    | 'NEW_PLAYERS_ONLY'
    | 'EXISTING_CONTEXT_ONLY'
    | 'EXISTING_PLAYERS_ONLY'

  type InviteSectionType = 'GROUPS' | 'USERS'

  interface InviteSection {
    sectionType: InviteSectionType
    maxResults?: number
  }

  interface InvitePayload {
    text?: string | LocalizableContent
    notificationText?: string | LocalizableContent
    dialogTitle?: string | LocalizableContent
    cta?: string | LocalizableContent
    data?: any
    filters?: InviteFilter[]
    sections?: InviteSection[]
  }

  interface CustomUpdatePayload {
    action?: string
    cta?: string | LocalizableContent
    image?: string
    text?: string | LocalizableContent
    template?: string
    data?: any
    strategy?: string
    notification?: string
  }

  interface SharePayload {
    intent?: string
    image?: string
    text?: string | LocalizableContent
    data?: any
    shareDestination?: string[]
    switchContext?: boolean
  }

  type Platform = 'IOS' | 'ANDROID' | 'WEB' | 'MOBILE_WEB'

  interface InitializationOptions {
    enableLoginInsecureAuthTest?: boolean
    logLevel?: 'none' | 'error' | 'warning' | 'info' | 'debug'
  }

  interface ShareWithOverlayPayload {
    intent?: string
    image?: string
    imageOverlayPath?: string
    pathToCSS?: string
    initialData?: any
    media?: any
    text: string
    notificationText?: string
    data?: any
    shareDestination?: any[]
    surface?: string
    switchContext?: boolean
  }

  const player: Player
  const context: Context
  const payments: Payments

  function getRewardedVideoAsync(placementID: string): Promise<RewardedVideo>
  function getInterstitialAdAsync(placementID: string): Promise<InterstitialAd>
  function loadBannerAdAsync(placementID: string, position?: 'TOP' | 'BOTTOM'): Promise<BannerAd>
  function getPlatform(): Platform
  function getLocale(): string
  function getEntryPointData(): any
  function getEntryPointAsync(): Promise<string>
  function setLoadingProgress(progress: number): void
  function startGameAsync(): Promise<void>
  function updateAsync(payload: CustomUpdatePayload): Promise<void>
  function shareAsync(payload: ShareWithOverlayPayload): Promise<void>
  function logEvent(eventName: string, valueToSum?: number, parameters?: any): void
  function onPause(callback: () => void): void
  function quit(): void
  function canCreateShortcutAsync(): Promise<boolean>
  function createShortcutAsync(): Promise<void>
  function switchGameAsync(gameID: string, data?: any): Promise<void>
  function getSupportedAPIs(): string[]
  function initializeAsync(options?: InitializationOptions): Promise<void>
  function setSessionData(data: any): void
  function getTournamentAsync(): Promise<Tournament | null>
  function postSessionScoreAsync(score: number): Promise<void>
  function inviteAsync(payload?: InvitePayload): Promise<void>
  function getSystemInfo(): {
    language: string
    platform: Platform
    [key: string]: any
  }
  function matchPlayerAsync(matchTag?: string, switchImmediately?: boolean): Promise<void>
  function checkCanPlayerMatchAsync(): Promise<boolean>
  function getLocationAsync(): Promise<{
    latitude: number
    longitude: number
    altitude: number | null
    accuracy: number | null
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }>
  function isExternallyHostedAsync(): Promise<boolean>
  function onContextChange(
    onSuccess: (context: string) => void,
    onError: (error: any) => void
  ): void
}
