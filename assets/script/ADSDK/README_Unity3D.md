# Unity3D 广告集成说明

## 如何启用Unity3D广告

### 1. 修改 AdUnity.ts
在 `AdUnity.ts` 文件中，将默认部分修改为：

```typescript
default: {
    SDKData.getInstance().sdkType = SDK_TYPE.Unity3D
    this.AD = new Unity3DAdSDK()
}
```

### 2. 配置广告位ID
在 `Unity3DAdSDK.ts` 中修改你的Game ID和广告位ID：

```typescript
private gameId: string = "你的Unity Game ID"; 
private rewardedPlacement: string = "你的激励视频广告位ID";
private interstitialPlacement: string = "你的插屏广告位ID";
private bannerPlacement: string = "你的Banner广告位ID";
```

### 3. 集成原生平台
- **Android**: 需要在原生Android项目中集成Unity Ads SDK
- **iOS**: 需要在原生iOS项目中集成Unity Ads SDK
- **Web**: 需要加载Unity3D的Web SDK

### 4. 测试模式
默认启用测试模式，正式发布时设置：
```typescript
private testMode: boolean = false;
```

## 当前实现的功能

### 1. 能源奖励广告
- 点击能源按钮观看广告恢复1点能源
- 只有在能源不满时才显示广告

### 2. 金币奖励广告  
- 下注金币不足时自动提示观看广告
- 根据所需金币数量动态计算奖励金币（最少100，向上取整到100的倍数）
- 观看完广告立即获得金币奖励

### 3. 广告回调处理
- 成功观看：给予相应奖励
- 用户取消：显示取消提示
- 广告错误：显示错误提示

## 使用SDKMgr的方式

所有广告调用都通过你现有的 `SDKMgr.instance.showVideo()` 方法，保持了代码的一致性。

## 注意事项

1. 需要在Unity Ads平台注册应用并获取Game ID
2. 需要配置相应的广告位ID
3. 原生平台需要额外的SDK集成工作
4. Web平台需要加载Unity Ads的JavaScript SDK