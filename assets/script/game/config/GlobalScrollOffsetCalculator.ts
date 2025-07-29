import { ScenePhysicalResult } from "./MultiplierConfig";

/**
 * 全局滚动偏移计算器
 * 基于物理场景计算结果，计算任意时间点的globalScrollOffset和瞬时速度
 */
export class GlobalScrollOffsetCalculator {
    private sceneResults: ScenePhysicalResult[];
    
    constructor(sceneResults: ScenePhysicalResult[]) {
        this.sceneResults = sceneResults;
        console.log(`GlobalScrollOffsetCalculator初始化完成，包含${sceneResults.length}个场景`);
    }
    
    /**
     * 计算任意时间点的全局滚动偏移
     * @param currentTime 当前游戏时间（秒）
     * @returns 全局滚动偏移量（像素）
     */
    calculateGlobalScrollOffset(currentTime: number): number {
        let globalOffset = 0;
        
        for (const scene of this.sceneResults) {
            const [startTime, endTime] = scene.timeRange;
            
            if (currentTime >= endTime) {
                // 场景已完成，添加完整高度
                globalOffset += scene.sceneHeight;
            } else if (currentTime >= startTime) {
                // 当前场景进行中，计算部分偏移
                const timeInScene = currentTime - startTime;
                const partialOffset = this.calculatePartialSceneOffset(scene, timeInScene);
                globalOffset += partialOffset;
                break; // 只计算到当前场景
            }
            // currentTime < startTime 的场景还未开始，不计算
        }
        
        return globalOffset;
    }
    
    /**
     * 计算当前场景的部分偏移量
     * @param scene 场景物理结果
     * @param timeInScene 在该场景中经过的时间
     * @returns 部分偏移量（像素）
     */
    private calculatePartialSceneOffset(scene: ScenePhysicalResult, timeInScene: number): number {
        const dt = 0.01; // 10ms步长
        let v = scene.initialVelocity;
        let offset = 0;
        
        // 从场景开始积分到当前时间
        for (let t = 0; t < timeInScene; t += dt) {
            const a = scene.accelerationFormula(t);
            
            v += a * dt;       // 更新速度  
            offset += v * dt;  // 累积位移
        }
        
        return offset;
    }
    
    /**
     * 获取当前时间的瞬时速度（用于视觉效果）
     * @param currentTime 当前游戏时间（秒）
     * @returns 瞬时速度（像素/秒）
     */
    getCurrentVelocity(currentTime: number): number {
        for (const scene of this.sceneResults) {
            const [startTime, endTime] = scene.timeRange;
            
            if (currentTime >= startTime && currentTime < endTime) {
                const timeInScene = currentTime - startTime;
                return this.calculateVelocityAtTime(scene, timeInScene);
            }
        }
        
        // 如果超出所有场景时间范围，返回最后一个场景的最终速度
        if (this.sceneResults.length > 0) {
            return this.sceneResults[this.sceneResults.length - 1].finalVelocity;
        }
        
        return 0;
    }
    
    /**
     * 计算指定场景中指定时间的瞬时速度
     */
    private calculateVelocityAtTime(scene: ScenePhysicalResult, timeInScene: number): number {
        const dt = 0.01;
        let v = scene.initialVelocity;
        
        for (let t = 0; t < timeInScene; t += dt) {
            const a = scene.accelerationFormula(t);
            v += a * dt;
        }
        
        return v;
    }
    
    /**
     * 获取当前时间的瞬时加速度
     * @param currentTime 当前游戏时间（秒）
     * @returns 瞬时加速度（像素/秒²）
     */
    getCurrentAcceleration(currentTime: number): number {
        for (const scene of this.sceneResults) {
            const [startTime, endTime] = scene.timeRange;
            
            if (currentTime >= startTime && currentTime < endTime) {
                const timeInScene = currentTime - startTime;
                return this.calculateAccelerationAtTime(scene, timeInScene);
            }
        }
        
        return 0;
    }
    
    /**
     * 计算指定场景中指定时间的瞬时加速度
     */
    private calculateAccelerationAtTime(scene: ScenePhysicalResult, timeInScene: number): number {
        return scene.accelerationFormula(timeInScene);
    }
    
    /**
     * 获取当前所在的场景信息
     * @param currentTime 当前游戏时间（秒）
     * @returns 当前场景结果，如果不在任何场景中则返回null
     */
    getCurrentScene(currentTime: number): ScenePhysicalResult | null {
        for (const scene of this.sceneResults) {
            const [startTime, endTime] = scene.timeRange;
            
            if (currentTime >= startTime && currentTime < endTime) {
                return scene;
            }
        }
        
        return null;
    }
    
    /**
     * 获取完整的运动状态信息
     * @param currentTime 当前游戏时间（秒）
     * @returns 完整的运动状态
     */
    getCompleteMotionState(currentTime: number): MotionState {
        return {
            time: currentTime,
            globalOffset: this.calculateGlobalScrollOffset(currentTime),
            velocity: this.getCurrentVelocity(currentTime),
            acceleration: this.getCurrentAcceleration(currentTime),
            currentScene: this.getCurrentScene(currentTime)
        };
    }
    
    /**
     * 测试和验证功能
     * @param testTimes 要测试的时间点数组
     */
    testCalculation(testTimes: number[]): void {
        console.log("\n=== GlobalScrollOffsetCalculator 测试 ===");
        
        testTimes.forEach(time => {
            const state = this.getCompleteMotionState(time);
            
            console.log(`\n⏰ 时间: ${time.toFixed(1)}s`);
            console.log(`   场景: ${state.currentScene?.sceneName || '无'}`);
            console.log(`   全局偏移: ${state.globalOffset.toFixed(2)}px`);
            console.log(`   瞬时速度: ${state.velocity.toFixed(2)}px/s`);
            console.log(`   瞬时加速度: ${state.acceleration.toFixed(2)}px/s²`);
        });
        
        console.log("=== 测试完成 ===\n");
    }
    
    /**
     * 验证偏移计算的连续性
     * @param step 测试步长（秒）
     */
    validateContinuity(step: number = 0.1): boolean {
        console.log(`\n🔍 验证全局偏移连续性（步长${step}s）...`);
        
        if (this.sceneResults.length === 0) {
            console.warn("无场景数据，跳过连续性验证");
            return false;
        }
        
        const maxTime = this.sceneResults[this.sceneResults.length - 1].timeRange[1];
        let previousOffset = 0;
        let previousVelocity = this.sceneResults[0].initialVelocity;
        
        for (let t = 0; t <= maxTime; t += step) {
            const currentOffset = this.calculateGlobalScrollOffset(t);
            const currentVelocity = this.getCurrentVelocity(t);
            
            // 检查偏移单调性（应该一直增加）
            if (currentOffset < previousOffset) {
                console.error(`⚠️ 偏移不连续: 时间${t}s, 当前偏移${currentOffset}px < 前一偏移${previousOffset}px`);
                return false;
            }
            
            // 检查速度合理性（不应该有突变）
            const velocityChange = Math.abs(currentVelocity - previousVelocity);
            const maxExpectedChange = 100 * step; // 允许的最大速度变化
            if (velocityChange > maxExpectedChange) {
                console.warn(`⚠️ 速度变化过大: 时间${t}s, 速度变化${velocityChange.toFixed(2)}px/s`);
            }
            
            previousOffset = currentOffset;
            previousVelocity = currentVelocity;
        }
        
        console.log("✅ 全局偏移连续性验证通过");
        return true;
    }
}

/**
 * 完整的运动状态接口
 */
export interface MotionState {
    time: number;                           // 当前时间（秒）
    globalOffset: number;                   // 全局滚动偏移（像素）
    velocity: number;                       // 瞬时速度（像素/秒）
    acceleration: number;                   // 瞬时加速度（像素/秒²）
    currentScene: ScenePhysicalResult | null; // 当前场景
}