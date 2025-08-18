import { MultiplierConfig, AccelerationStageConfig, ScenePhysicalResult } from "./MultiplierConfig";

/**
 * 物理场景计算器
 * 基于加速度公式和配置的时间点，计算每个场景的物理高度和运动参数
 */
export class PhysicalSceneCalculator {
    private readonly initialVelocity = 3000;        // 初始速度（像素/秒）

    /**
     * 计算所有场景的物理参数和高度
     */
    calculateAllSceneHeights(): ScenePhysicalResult[] {
        // 从MultiplierConfig获取加速度阶段配置
        const accelerationConfigs = MultiplierConfig.getCurrentAccelerationStageConfigs();
        const results: ScenePhysicalResult[] = [];

        let currentVelocity = this.initialVelocity;

        console.log("=== 开始物理场景计算 ===");
        console.log(`初始条件: 速度=${currentVelocity}px/s`);

        for (const config of accelerationConfigs) {
            const sceneResult = this.calculateSingleSceneHeight(
                config,
                currentVelocity
            );

            results.push(sceneResult);

            // 更新下一阶段的初始条件
            currentVelocity = sceneResult.finalVelocity;

            console.log(`${config.name}场景计算完成:`);
            console.log(`  时间: ${config.timeRange[0]}s - ${config.timeRange[1]}s (${config.duration}s)`);
            console.log(`  高度: ${sceneResult.sceneHeight.toFixed(2)}px`);
            console.log(`  速度: ${sceneResult.initialVelocity.toFixed(2)} -> ${sceneResult.finalVelocity.toFixed(2)} px/s`);
            console.log(`  加速度: ${sceneResult.initialAcceleration.toFixed(2)} -> ${sceneResult.finalAcceleration.toFixed(2)} px/s²`);
        }

        console.log("=== 物理场景计算完成 ===");
        return results;
    }

    /**
     * 计算单个场景的高度和物理参数
     */
    private calculateSingleSceneHeight(
        config: AccelerationStageConfig,
        initialV: number
    ): ScenePhysicalResult {

        // 使用数值积分计算场景高度
        const dt = 0.01; // 10ms步长，保证精度
        let v = initialV;
        let height = 0;

        // 记录初始和最终加速度
        const initialA = config.accelerationFormula(0);
        const finalA = config.accelerationFormula(config.duration);

        // 从0积分到duration
        for (let t = 0; t < config.duration; t += dt) {
            const a = config.accelerationFormula(t);

            // 物理积分：
            // Acceleration = dv/dt  =>  v(t) = v₀ + ∫a(τ)dτ  
            // Velocity = ds/dt  =>  s(t) = s₀ + ∫v(τ)dτ

            v += a * dt;              // 速度积分
            height += v * dt;         // 位移积分
        }

        return {
            sceneName: config.name,
            rocketState: config.rocketState,
            timeRange: config.timeRange,
            duration: config.duration,
            sceneHeight: height,
            initialVelocity: initialV,
            finalVelocity: v,
            initialAcceleration: initialA,
            finalAcceleration: finalA,
            accelerationFormula: config.accelerationFormula
        };
    }

    /**
     * 验证计算结果的连续性
     */
    validateResults(results: ScenePhysicalResult[]): boolean {
        for (let i = 0; i < results.length - 1; i++) {
            const current = results[i];
            const next = results[i + 1];

            // 检查时间连续性
            if (Math.abs(current.timeRange[1] - next.timeRange[0]) > 0.01) {
                console.warn(`时间不连续: ${current.sceneName}结束时间${current.timeRange[1]} != ${next.sceneName}开始时间${next.timeRange[0]}`);
                return false;
            }

            // 检查速度连续性
            if (Math.abs(current.finalVelocity - next.initialVelocity) > 0.1) {
                console.warn(`速度不连续: ${current.sceneName}最终速度${current.finalVelocity} != ${next.sceneName}初始速度${next.initialVelocity}`);
                return false;
            }

            // 检查加速度连续性
            if (Math.abs(current.finalAcceleration - next.initialAcceleration) > 0.1) {
                console.warn(`加速度不连续: ${current.sceneName}最终加速度${current.finalAcceleration} != ${next.sceneName}初始加速度${next.initialAcceleration}`);
                return false;
            }
        }

        console.log("✅ 物理计算结果连续性验证通过");
        return true;
    }

    /**
     * 打印详细的计算报告
     */
    printDetailedReport(results: ScenePhysicalResult[]): void {
        console.log("\n=== 详细物理计算报告 ===");

        let totalHeight = 0;
        let totalTime = 0;

        for (const result of results) {
            totalHeight += result.sceneHeight;
            totalTime = result.timeRange[1]; // 累积时间

            console.log(`\n📍 ${result.sceneName.toUpperCase()}场景 (${result.rocketState})`);
            console.log(`   时间范围: ${result.timeRange[0].toFixed(1)}s - ${result.timeRange[1].toFixed(1)}s`);
            console.log(`   持续时间: ${result.duration.toFixed(1)}s`);
            console.log(`   场景高度: ${result.sceneHeight.toFixed(0)}px`);
            console.log(`   速度变化: ${result.initialVelocity.toFixed(1)} → ${result.finalVelocity.toFixed(1)} px/s`);
            console.log(`   加速度变化: ${result.initialAcceleration.toFixed(1)} → ${result.finalAcceleration.toFixed(1)} px/s²`);
            console.log(`   平均速度: ${(result.sceneHeight / result.duration).toFixed(1)} px/s`);

            // 计算加速度特征  
            const startAcceleration = result.accelerationFormula(0);
            const endAcceleration = result.accelerationFormula(result.duration);
            console.log(`   加速度变化: ${startAcceleration.toFixed(2)} → ${endAcceleration.toFixed(2)} px/s²`);
        }

        console.log(`\n📊 总计统计:`);
        console.log(`   总飞行时间: ${totalTime.toFixed(1)}s`);
        console.log(`   总飞行高度: ${totalHeight.toFixed(0)}px`);
        console.log(`   平均速度: ${(totalHeight / totalTime).toFixed(1)} px/s`);

        if (results.length > 0) {
            const finalVelocity = results[results.length - 1].finalVelocity;
            console.log(`   最终速度: ${finalVelocity.toFixed(1)} px/s`);
        }

        console.log("=== 报告结束 ===\n");
    }
}