const gameSessionCache = require('./gameSessionCache');
const Race = require('../models/Race');

/**
 * 比赛管理器 - 负责自动创建和管理比赛周期
 * 特性：
 * 1. 每4小时自动开始新比赛
 * 2. 自动结算上一轮比赛
 * 3. 管理比赛状态和奖励分发
 */
class RaceManager {
    constructor() {
        this.currentRace = null;
        this.raceHistory = [];
        this.raceTimer = null;
        
        // 比赛配置
        this.config = {
            raceDuration: 4 * 60 * 60 * 1000,    // 4小时（毫秒）
            raceInterval: 4 * 60 * 60 * 1000,    // 4小时间隔
            autoStartDelay: 5000                  // 服务器启动后5秒开始第一场比赛
        };
        
        console.log('RaceManager initialized');
        
        // 服务器启动后延迟恢复数据并启动比赛
        setTimeout(() => {
            this.initializeFromDatabase();
        }, this.config.autoStartDelay);
    }
    
    /**
     * 从数据库初始化/恢复比赛数据
     */
    async initializeFromDatabase() {
        try {
            console.log('🔄 Initializing race manager from database...');
            
            // 查找当前活跃的比赛
            const activeRace = await Race.getCurrentRace();
            
            if (activeRace) {
                const now = Date.now();
                const raceEndTime = new Date(activeRace.endTime).getTime();
                
                // 检查比赛是否还在进行中
                if (now < raceEndTime) {
                    console.log(`📥 Found active race: ${activeRace.raceId}`);
                    
                    // 恢复当前比赛状态
                    this.currentRace = {
                        raceId: activeRace.raceId,
                        startTime: new Date(activeRace.startTime).getTime(),
                        endTime: raceEndTime,
                        status: 'active',
                        dbId: activeRace._id
                    };
                    
                    // 恢复缓存管理器的数据
                    await gameSessionCache.restoreFromDatabase(activeRace.raceId);
                    
                    // 计算剩余时间并设置结束定时器
                    const remainingTime = raceEndTime - now;
                    setTimeout(() => {
                        this.endRaceById(activeRace.raceId);
                    }, remainingTime);
                    
                    console.log(`✅ Restored active race: ${activeRace.raceId}`);
                    console.log(`⏰ Remaining time: ${Math.round(remainingTime / 1000 / 60)} minutes`);
                    
                    // 启动定时器系统
                    this.startRaceTimer();
                } else {
                    console.log(`⏰ Active race ${activeRace.raceId} has expired, ending it...`);
                    // 比赛已过期，立即结束
                    await this.endRaceById(activeRace.raceId);
                    // 然后开始新比赛
                    this.startFirstRace();
                }
            } else {
                console.log('🆕 No active race found, starting first race...');
                this.startFirstRace();
            }
            
        } catch (error) {
            console.error('❌ Error initializing from database:', error);
            // 如果数据库恢复失败，直接开始新比赛
            console.log('🔄 Fallback: Starting first race...');
            this.startFirstRace();
        }
    }
    
    /**
     * 启动第一场比赛
     */
    startFirstRace() {
        console.log('Starting first race...');
        this.startNewRace();
        this.startRaceTimer();
    }
    
    /**
     * 启动比赛定时器系统
     */
    startRaceTimer() {
        // 防止重复设置定时器
        if (this.raceTimer) {
            clearInterval(this.raceTimer);
        }
        
        // 设置定时器，每4小时启动新比赛
        this.raceTimer = setInterval(() => {
            this.startNewRace();
        }, this.config.raceInterval);
        
        console.log(`🔄 Race timer started - new race every ${this.config.raceInterval / 1000 / 60 / 60} hours`);
    }
    
    /**
     * 开始新比赛
     */
    async startNewRace() {
        try {
            const now = new Date();
            const raceId = this.generateRaceId(now.getTime());
            
            console.log(`\n🏁 Starting new race: ${raceId}`);
            
            // 如果有当前比赛，先结束它
            if (this.currentRace) {
                await this.endCurrentRace();
            }
            
            // 在数据库中创建新比赛记录
            const raceDoc = new Race({
                raceId: raceId,
                startTime: now,
                endTime: new Date(now.getTime() + this.config.raceDuration),
                status: 'active',
                createdBy: 'system'
            });
            
            await raceDoc.save();
            
            // 更新内存中的当前比赛引用
            this.currentRace = {
                raceId: raceId,
                startTime: now.getTime(),
                endTime: now.getTime() + this.config.raceDuration,
                status: 'active',
                dbId: raceDoc._id
            };
            
            // 设置当前比赛到缓存管理器
            gameSessionCache.setCurrentRace(raceId);
            
            // 设置这轮比赛的结束定时器
            setTimeout(() => {
                this.endRaceById(raceId);
            }, this.config.raceDuration);
            
            console.log(`✅ Race ${raceId} started successfully`);
            console.log(`📅 Duration: ${this.config.raceDuration / 1000 / 60 / 60} hours`);
            console.log(`⏰ Will end at: ${new Date(this.currentRace.endTime).toLocaleString()}`);
            
        } catch (error) {
            console.error('Error starting new race:', error);
        }
    }
    
    /**
     * 结束当前比赛
     */
    async endCurrentRace() {
        if (!this.currentRace) {
            console.log('No current race to end');
            return;
        }
        
        await this.endRaceById(this.currentRace.raceId);
    }
    
    /**
     * 结束指定比赛
     */
    async endRaceById(raceId) {
        try {
            console.log(`\n🏆 Ending race: ${raceId}`);
            
            // 获取比赛最终数据
            const finalData = await gameSessionCache.finalizeRace(raceId);
            
            if (finalData) {
                const { leaderboard, prizePool } = finalData;
                
                console.log(`📊 Race ${raceId} Results:`);
                console.log(`   Participants: ${leaderboard.length}`);
                console.log(`   Prize Pool: ${prizePool.totalPool} coins`);
                console.log(`   Contributed: ${prizePool.contributedAmount} coins`);
                
                // 计算奖励分配
                const prizeDistribution = gameSessionCache.calculatePrizeDistribution(raceId);
                
                if (prizeDistribution.distributions.length > 0) {
                    console.log(`💰 Prize Distribution:`);
                    prizeDistribution.distributions.forEach(prize => {
                        console.log(`   Rank ${prize.rank}: ${prize.userId} - ${prize.prizeAmount} coins`);
                    });
                    
                    // 实际发放奖励到用户账户
                    await this.distributePrizes(prizeDistribution.distributions);
                } else {
                    console.log(`❌ No prizes distributed (no contributions)`);
                }
                
                // 更新数据库中的比赛记录
                const raceDoc = await Race.findOne({ raceId: raceId });
                if (raceDoc) {
                    await raceDoc.complete({
                        leaderboard: leaderboard,
                        prizePool: prizePool,
                        prizeDistribution: prizeDistribution.distributions
                    });
                    
                    console.log(`💾 Race ${raceId} data saved to database`);
                }
                
                console.log(`✅ Race ${raceId} ended successfully`);
            }
            
            // 清理当前比赛引用
            if (this.currentRace && this.currentRace.raceId === raceId) {
                this.currentRace = null;
            }
            
        } catch (error) {
            console.error(`Error ending race ${raceId}:`, error);
        }
    }
    
    /**
     * 分发奖励到用户账户
     */
    async distributePrizes(distributions) {
        for (const prize of distributions) {
            try {
                // TODO: 调用用户服务更新用户余额
                console.log(`💸 Distributing ${prize.prizeAmount} coins to user ${prize.userId} (Rank ${prize.rank})`);
                
                // 这里应该调用用户服务的API来增加用户余额
                // await userService.addBalance(prize.userId, prize.prizeAmount, 'race_prize');
                
            } catch (error) {
                console.error(`Failed to distribute prize to ${prize.userId}:`, error);
            }
        }
    }
    
    /**
     * 生成比赛ID
     */
    generateRaceId(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        
        return `race_${year}${month}${day}${hour}${minute}${second}`;
    }
    
    /**
     * 获取当前比赛信息
     */
    getCurrentRace() {
        if (!this.currentRace) {
            return null;
        }
        
        const now = Date.now();
        const remainingTime = Math.max(0, this.currentRace.endTime - now);
        
        return {
            ...this.currentRace,
            remainingTime: remainingTime,
            isActive: remainingTime > 0
        };
    }
    
    /**
     * 获取比赛历史
     */
    async getRaceHistory(limit = 5) {
        try {
            return await Race.getRaceHistory(limit);
        } catch (error) {
            console.error('Error getting race history from database:', error);
            return [];
        }
    }
    
    /**
     * 获取比赛状态统计
     */
    getRaceStats() {
        const currentRace = this.getCurrentRace();
        
        return {
            currentRace: currentRace,
            raceHistory: this.raceHistory.length,
            nextRaceIn: currentRace ? currentRace.remainingTime : 0,
            systemStatus: 'running'
        };
    }
}

// 单例模式
const raceManager = new RaceManager();

module.exports = raceManager;