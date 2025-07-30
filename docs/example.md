这是一个使用ecs ui 打开一个弹出窗口的例子，下面是UIID的配置
[UIID.VerseWords]: {
    layer: LayerType.Dialog,
    prefab: 'gui/game/versewords/TodayVerseWnd',
  },
  这是打开弹出窗口的代码示例，里面还包含了打开和关闭的动画效果等等。
openTodayVerse() {
    oops.audio.playEffect(AudioClipEffect.Button_Click)
    let ui_callback: UICallbacks = {
      // 节点添加动画
      onAdded: (node, params) => {
        const bg_node = node.getChildByName('bg')
        const bg_opacity: UIOpacity = bg_node.getComponent(UIOpacity)
        if (bg_opacity) {
          tween(bg_opacity).to(0.15, { opacity: 255 }).start()
        }
        const content_node = node.getChildByName('content')
        const node_opacity: UIOpacity = content_node.getComponent(UIOpacity)
        if (node_opacity) {
          node_opacity.opacity = 0
        }
        content_node.setScale(0.7, 0.7, 0.7)
        // 同时执行opacity和scale动画
        tween(content_node)
          .parallel(
            // opacity动画
            tween().to(
              0.1,
              {},
              {
                onUpdate: (target, ratio) => {
                  if (node_opacity) {
                    node_opacity.opacity = Math.floor(255 * ratio)
                  }
                },
              }
            ),
            // scale震动弹跳动画
            tween()
              .to(0.15, { scale: new Vec3(1.15, 1.15, 1.15) })
              .to(0.1, { scale: new Vec3(1, 1, 1) })
          )
          .call(() => {
            const today_verse_comp: TodayVerseComp = node.getComponent(TodayVerseComp)
            if (today_verse_comp) {
              today_verse_comp.onOpen(params, () => {
                oops.gui.remove(UIID.VerseWords)
              })
            }
          })
          .start()
      },
      // 节点删除动画
      onBeforeRemove: (node, next) => {
        const content_node = node.getChildByName('content')
        const node_opacity: UIOpacity = content_node.getComponent(UIOpacity)
        tween(content_node)
          .parallel(
            // opacity动画
            tween().to(
              0.15,
              {},
              {
                onUpdate: (target, ratio) => {
                  if (node_opacity) {
                    node_opacity.opacity = Math.floor(255 * (1 - ratio))
                  }
                },
              }
            ),
            tween().to(0.15, { scale: new Vec3(0.7, 0.7, 0.7) })
          )
          .call(() => {
            next()
          })
          .start()
      },
      onRemoved: (node: Node | null, params: any) => {
        if (params.key_item && params.claimed) {
          GamePlayerData.saveTodayVerseDate(new Date())
          oops.message.dispatchEvent(GameEvent.GAME_ITEMS_CHANGE, params.key_item)
        }
        if (!this.hasOpenDialog()) {
          this.showFriendLeaderboard()
        }
      },
    }

    const key_item: GameItem = smc.gameItemMgr.createGameItem(2, 1)
    const world_diamond_pos: Vec3 = this.diamond_node.getWorldPosition()
    const world_key_pos: Vec3 = this.key_node.getWorldPosition()
    oops.gui.open(
      UIID.VerseWords,
      {
        currentWordsNums: this.currentWordsNums,
        currentLevel: this.currentLevel,
        world_diamond_pos: world_diamond_pos,
        world_key_pos: world_key_pos,
        key_item: key_item,
        verse_words: 'Great Wisdom is plain,\nPetty wisdom is contentious.',
        wisdom_num: this.wisdom_num,
      },
      ui_callback
    )
    this.hideFriendLeaderboard()
  }


  下面的代码是TodayVerseComp组件的实现示例，仅供你选择参考：
  import {
  _decorator,
  Button,
  Canvas,
  Component,
  director,
  game,
  Label,
  Node,
  RenderTexture,
  Sprite,
  tween,
  UIOpacity,
  Vec3,
  Camera,
  Director,
  UITransform,
  ImageAsset,
  ProgressBar,
} from 'cc'
import { CCComp } from '../../../../extensions/oops-plugin-framework/assets/module/common/CCComp'
import { ecs } from '../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS'
import { DiamondAnim } from '../ui/DiamondAnim/DiamondAnim'
import { GameItem, ItemBox, ItemType } from '../items/GameItem'
import { GamePlayerData } from '../account/model/GamePlayerData'
import { smc } from '../common/SingletonModuleComp'
import { LeafLuckyComp } from './LeafLuckyComp'
import { oops } from '../../../../extensions/oops-plugin-framework/assets/core/Oops'
import { RtToModel } from '../../../../extensions/oops-plugin-framework/assets/libs/render-texture/RtToModel'
import { CaptureImage } from '../../utils/CaptureImage'
import { FBAdSDK } from '../../ADSDK/fb/FBAdSDK'
import { PlatformFacebook } from '../../ADSDK/PlatformFacebook'
import { UICallbacks } from '../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines'
import { DirectRewardComp } from '../claimreward/DirectRewardComp'
import { UIID } from '../common/config/GameUIConfig'
import { GameEvent } from '../common/config/GameEvent'
import { AudioClipEffect } from '../common/config/GameResPath'
import { SDKMgr } from '../../ADSDK/SDKMgr'
import { ShareFrom } from '../overlay/OverlayEventComp'
const { ccclass, property } = _decorator

@ccclass('TodayVerseComp')
@ecs.register('TodayVerseComp', false)
export class TodayVerseComp extends CCComp {
  @property(UIOpacity) bg_opacity: UIOpacity = null
  @property(Node) content_node: Node = null
  @property(Node) box_node: Node = null
  @property(Label) verse_words_label: Label = null
  @property(Node) claim_button_node: Node = null
  @property(Node) close_button_node: Node = null
  @property(Node) key_item_node: Node = null
  @property(Node) diamond_item_node: Node = null
  @property(Node) diamond_retain_node: Node = null
  @property(Node) keys_retain_node: Node = null
  @property(Node) share_button_node: Node = null
  @property(Node) buttons_node: Node = null
  @property(Label) key_num_label: Label = null
  @property(Node) levels_statistics_node = null
  @property(Node) words_statistics_node = null
  @property(Label) levels_label = null
  @property(Label) words_label = null
  @property(Label) wisdom_label = null
  @property({ type: [Number] }) word_line_offsets: number[] = []
  @property(LeafLuckyComp) leaf_lucky_comp: LeafLuckyComp = null
  @property(CaptureImage) capture_image: CaptureImage = null
  world_diamond_pos: Vec3 = null
  world_key_pos: Vec3 = null
  verse_words: string = ''
  _close_callback: Function = null
  _can_end: boolean = false
  diamond_num: number = 0
  keys_num: number = 0
  key_item: GameItem = null
  can_calim: boolean = false
  params: any = null
  reset(): void {
    this.node.destroy()
  }
  start() {}

  update(deltaTime: number) {
    if (this._can_end) {
      this._can_end = false
      this._close_callback()
    }
  }

  onOpen(params: any, callback: Function) {
    this._close_callback = callback
    this.world_diamond_pos = params.world_diamond_pos
    this.world_key_pos = params.world_key_pos
    this.verse_words = params.verse_words
    this.verse_words_label.string = this.verse_words
    this.key_item = params.key_item
    this.params = params
    this.params.claimed = false

    this.UpdateStatistics()

    this.verse_words_label.updateRenderData(true)
    const height: number = this.verse_words_label.node.h
    if (height != 0) {
      if (height > 300) {
        const off_h: number = this.word_line_offsets[2]
        this.verse_words_label.node.y = off_h
      } else if (height > 200) {
        const off_h: number = this.word_line_offsets[1]
        this.verse_words_label.node.y = off_h
      } else {
        const off_h: number = this.word_line_offsets[0]
        this.verse_words_label.node.y = off_h
      }
    }

    let daily_luck: number = Math.floor(Math.random() * 3) + 3
    const saved_date: Date = GamePlayerData.getDailyLuckSavedDate()
    if (saved_date) {
      const diff_days: number = GamePlayerData.getTwoDateDiffDay(saved_date, new Date())
      if (diff_days >= 1) {
        GamePlayerData.setDailyLuck(daily_luck)
        this.leaf_lucky_comp.setProgress(daily_luck)
      } else {
        daily_luck = GamePlayerData.getDailyLuck()
        this.leaf_lucky_comp.setProgress(daily_luck)
      }
    } else {
      GamePlayerData.setDailyLuck(daily_luck)
      this.leaf_lucky_comp.setProgress(daily_luck)
    }
    if (this.key_item && this.key_item.type == ItemType.key) {
      this.keys_num = this.key_item.num
      if (daily_luck >= 5) {
        this.keys_num += 1
        this.key_item.num = this.keys_num
      }
      this.key_num_label.string = this.key_item.num.toString()
    }

    let today_verse_id: number = 0
    const today_date: Date = GamePlayerData.getTodayVerseDate()
    if (today_date == null) {
      this.can_calim = true
    } else {
      const diff_days: number = GamePlayerData.getTwoDateDiffDay(today_date, new Date())
      this.can_calim = diff_days >= 1
      const create_date: Date = GamePlayerData.getSavedDate()
      if (create_date) {
        today_verse_id = GamePlayerData.getTwoDateDiffDay(create_date, today_date)
      }
    }

    this.verse_words = smc.account.getVerseSentence(today_verse_id)
    this.verse_words_label.string = this.verse_words

    if (this.can_calim) {
      this.claim_button_node.getComponent(Sprite).grayscale = false
    } else {
      this.claim_button_node.getComponent(Sprite).grayscale = true
    }

    // const share_button_sprite: Sprite = this.share_button_node.getComponent(Sprite)

    // const shared_date: Date = GamePlayerData.getDailyVerseSharedDate()
    // if (shared_date) {
    //   const diff_days: number = GamePlayerData.getTwoDateDiffDay(shared_date, new Date())
    //   if (diff_days >= 1) {
    //     // share_button_sprite.grayscale = false
    //     this.params.can_share = true
    //   } else {
    //     // share_button_sprite.grayscale = true
    //     this.params.can_share = false
    //   }
    // } else {
    //   // share_button_sprite.grayscale = false
    //   this.params.can_share = true
    // }
  }

  closeVerse() {
    oops.audio.playEffect(AudioClipEffect.Button_Click)
    this._can_end = true
  }

  UpdateStatistics() {
    const maxLevels = smc.levelMgr.MaxLevels
    const MaxLevelWordsNums = smc.levelMgr.MaxLevelWordsNums
    const currentLevel = this.params.currentLevel
    const currentWordsnums = this.params.currentWordsNums
    const wisdom_num = this.params.wisdom_num
    const level_percent = (currentLevel * 1.0) / (maxLevels * 1.0)
    const words_percent = (currentWordsnums * 1.0) / (MaxLevelWordsNums * 1.0)
    const level_progress: ProgressBar = this.levels_statistics_node.getComponent(ProgressBar)
    if (level_progress) {
      level_progress.progress = level_percent
    }
    this.levels_label.node.setPosition(
      new Vec3(
        this.levels_label.node.position.x,
        this.levels_statistics_node.position.y + this.levels_statistics_node.height + 5,
        this.levels_label.node.position.z
      )
    )
    const words_progress: ProgressBar = this.words_statistics_node.getComponent(ProgressBar)
    if (words_progress) {
      words_progress.progress = words_percent
    }
    this.levels_label.string = currentLevel.toString()
    this.words_label.node.setPosition(
      new Vec3(
        this.words_label.node.position.x,
        this.words_statistics_node.position.y + this.words_statistics_node.height + 5,
        this.words_label.node.position.z
      )
    )
    this.words_label.string = currentWordsnums.toString()
    this.wisdom_label.string = wisdom_num.toString()
  }

  retainItems() {
    // oops.audio.playEffect(AudioClipEffect.Button_Click);
    if (!this.can_calim) return
    // this.content_node.active = false;
    const uiopacity: UIOpacity = this.content_node.getComponent(UIOpacity)
    if (uiopacity) {
      tween(uiopacity)
        .to(0.4, { opacity: 0 })
        .call(() => {
          this.content_node.active = false
          if (this.bg_opacity) {
            tween(this.bg_opacity).to(0.1, { opacity: 0 }).start()
          }
        })
        .start()
    } else {
      this.content_node.active = false
      if (this.bg_opacity) {
        tween(this.bg_opacity).to(0.1, { opacity: 0 }).start()
      }
    }

    this.diamond_num = 0
    let wait_flag: number = 0
    if (this.diamond_num > 0) {
      wait_flag = 1
    }
    if (this.keys_num > 0) {
      wait_flag = 2
    }
    if (this.diamond_retain_node) {
      this.diamond_retain_node.active = true
      const diamnond_anim: DiamondAnim = this.diamond_retain_node.getComponent(DiamondAnim)
      if (diamnond_anim) {
        diamnond_anim.showDiamondAnim(0, this.diamond_num, this.world_diamond_pos, 1)
        this.scheduleOnce(() => {
          if (wait_flag == 1) {
            this._can_end = true
            this.params.claimed = true
          }
        }, 1.5)
      }
    } else {
      this._can_end = true
    }

    if (this.keys_retain_node) {
      this.keys_retain_node.active = true
      const keys_anim: DiamondAnim = this.keys_retain_node.getComponent(DiamondAnim)
      if (keys_anim) {
        keys_anim.showDiamondAnim(1, this.keys_num, this.world_key_pos, 1, 0.4)
        this.scheduleOnce(() => {
          if (wait_flag == 2) {
            this._can_end = true
            this.params.claimed = true
          }
        }, 1.5)
      }
    }
  }

  async shareVerse() {
    oops.audio.playEffect(AudioClipEffect.Button_Click)
    if (!SDKMgr.instance.CanShare()) {
      this.buttons_node.active = true
      // this.onShareSuccess()
      // GamePlayerData.setDailyVerseSharedDate()
      return
    }
    // if (!this.params.can_share) return
    this.buttons_node.active = false
    // this.params.can_share = false
    this.share_button_node.getComponent(Button).interactable = false
    this.share_button_node.getComponent(Sprite).grayscale = true
    console.log('start shareVerse...............')
    try {
      const base64 = await this.capture_image.captureAndGetBase64Async()
      if (base64) {
        this.buttons_node.active = true
        console.log('captureAndGetBase64 success...............')
        console.log('starting shareAsync...............')
        smc.overlayMgr.overlayEventComp.setShareFrom(ShareFrom.Verse)
        SDKMgr.instance.shareAsync(
          base64,
          'Join with me!',
          null,
          () => {
            smc.overlayMgr.overlayEventComp.setShareSuccess()
            this.buttons_node.active = true
            this.share_button_node.getComponent(Sprite).grayscale = false
            this.share_button_node.getComponent(Button).interactable = true
            // this.onShareSuccess()
            // GamePlayerData.setDailyVerseSharedDate()
            console.log('shareAsync success...............')
          },
          (error: any) => {
            console.error(error)
            this.buttons_node.active = true
            this.share_button_node.getComponent(Sprite).grayscale = false
            this.share_button_node.getComponent(Button).interactable = true
            console.log('shareAsync error...............')
            smc.overlayMgr.overlayEventComp.setShareFrom(ShareFrom.None)
            if (error.code == 'PENDING_REQUEST') {
              oops.gui.toast('Please wait for the previous request to complete.')
            }
          }
        )
      } else {
        console.error('capture_image.captureAndGetBase64 error')
        this.buttons_node.active = true
        this.share_button_node.getComponent(Sprite).grayscale = false
        this.share_button_node.getComponent(Button).interactable = true
      }
    } catch (error) {
      console.error(error)
      this.buttons_node.active = true
      this.share_button_node.getComponent(Sprite).grayscale = false
      this.share_button_node.getComponent(Button).interactable = true
      console.log('shareVerse catched error...............')
      smc.overlayMgr.overlayEventComp.setShareFrom(ShareFrom.None)
    }
  }

  todayClaimItem() {
    if (this.can_calim) {
      oops.audio.playEffect(AudioClipEffect.Button_Click)
      this.onShareSuccess()
    } else {
      oops.audio.playEffect(AudioClipEffect.Button_Disable)
    }
  }

  onShareSuccess() {
    const reward_item: GameItem = smc.gameItemMgr.createGameItem(6, 1)
    if (reward_item instanceof ItemBox) {
      const itembox: ItemBox = reward_item as ItemBox
      itembox.open()
    }
    let ui_callback: UICallbacks = {
      // 节点添加动画
      onAdded: (node, params) => {
        node.setScale(0.1, 0.1, 0.1)
        tween(node)
          .to(0.3, { scale: new Vec3(1, 1, 1) })
          .call(() => {
            const direct_reward_comp: DirectRewardComp = node.getComponent(DirectRewardComp)
            if (direct_reward_comp) {
              direct_reward_comp.onOpen(params, () => {
                oops.gui.remove(UIID.DirectReward)
              })
            }
            this.retainItems()
          })
          .start()
      },
      // 节点删除动画
      onBeforeRemove: (node, next) => {
        tween(node)
          .to(0.2, { scale: new Vec3(0.1, 0.1, 0.1) })
          .call(() => {
            next()
          })
          .start()
      },
      onRemoved: (node: Node | null, params: any) => {
        if (params.reward_item) {
          oops.message.dispatchEvent(GameEvent.GAME_ITEMS_CHANGE, params.reward_item)
        }
      },
    }

    oops.gui.open(
      UIID.DirectReward,
      {
        world_diamond_pos: this.params.world_diamond_pos,
        world_key_pos: this.params.world_key_pos,
        reward_item: reward_item,
      },
      ui_callback
    )
  }
}
