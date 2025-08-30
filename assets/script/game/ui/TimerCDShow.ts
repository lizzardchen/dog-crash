import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TimerCDShow')
export class TimerCDShow extends Component {
    @property(Label)
    minuteTenLabel: Label = null!;
    
    @property(Label)
    minuteUnitLabel: Label = null!;
    
    @property(Label)
    secondTenLabel: Label = null!;
    
    @property(Label)
    secondUnitLabel: Label = null!;

    /**
     * 设置倒计时时间
     * @param timeInSeconds 时间（秒）
     */
    setTime(timeInSeconds: number): void {
        // 确保时间不为负数
        timeInSeconds = Math.max(0, Math.floor(timeInSeconds));
        
        // 计算分钟和秒
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        
        // 分解为各个位数
        const minuteTen = Math.floor(minutes / 10) % 10;  // 分钟十位
        const minuteUnit = minutes % 10;                   // 分钟个位
        const secondTen = Math.floor(seconds / 10);        // 秒十位
        const secondUnit = seconds % 10;                   // 秒个位
        
        // 更新label显示
        if (this.minuteTenLabel) {
            this.minuteTenLabel.string = minuteTen.toString();
        }
        
        if (this.minuteUnitLabel) {
            this.minuteUnitLabel.string = minuteUnit.toString();
        }
        
        if (this.secondTenLabel) {
            this.secondTenLabel.string = secondTen.toString();
        }
        
        if (this.secondUnitLabel) {
            this.secondUnitLabel.string = secondUnit.toString();
        }
    }
}