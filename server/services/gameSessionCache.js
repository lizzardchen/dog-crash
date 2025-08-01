const GameSession = require('../models/GameSession');

/**
 * 游戏会话内存缓存管理器
 * 特性：
 * 1. 内存中维护游戏记录缓存
 * 2. 后台批量存储到数据库
 * 3. 定期清理过期数据（只保留1天）
 * 4. 提供实时统计查询
 */
class GameSessionCache {
    constructor() {
        // 内存缓存：按用户ID分组存储
        this.userSessions = new Map(); // userId -> Array of sessions
        this.globalSessions = []; // 全局会话列表（用于统计）
        
        // 待存储队列
        this.pendingSaves = [];
        
        // 配置
        this.config = {
            maxCacheSize: 10000,           // 最大缓存条数
            batchSaveInterval: 30000,      // 批量保存间隔（30秒）
            cleanupInterval: 300000,       // 清理间隔（5分钟）
            retentionHours: 24             // 数据保留时间（24小时）
        };
        
        // 启动后台任务
        this.startBackgroundTasks();
        
        console.log('GameSessionCache initialized with memory-first strategy');
    }
    
    /**
     * 添加游戏会话到缓存
     */
    addSession(sessionData) {
        const session = {
            ...sessionData,
            timestamp: Date.now(),
            id: `${sessionData.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // 添加到用户会话缓存
        if (!this.userSessions.has(sessionData.userId)) {
            this.userSessions.set(sessionData.userId, []);
        }
        this.userSessions.get(sessionData.userId).push(session);
        
        // 添加到全局会话缓存
        this.globalSessions.push(session);
        
        // 添加到待存储队列
        this.pendingSaves.push(session);
        
        // 如果缓存过大，立即触发清理
        if (this.globalSessions.length > this.config.maxCacheSize) {
            this.cleanup();
        }
        
        console.log(`Session cached: ${session.id}, pending saves: ${this.pendingSaves.length}`);
        return session;
    }
    
    /**
     * 获取用户会话历史
     */
    getUserSessions(userId, limit = 50) {
        const userSessions = this.userSessions.get(userId) || [];
        return userSessions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    
    /**
     * 获取全局统计
     */
    getGlobalStats() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // 过滤最近24小时的数据
        const recentSessions = this.globalSessions.filter(s => s.timestamp > oneDayAgo);
        
        const totalSessions = recentSessions.length;
        const wins = recentSessions.filter(s => s.isWin).length;
        const totalBetAmount = recentSessions.reduce((sum, s) => sum + s.betAmount, 0);
        const totalWinAmount = recentSessions.reduce((sum, s) => sum + (s.winAmount || 0), 0);
        
        const multipliers = recentSessions.map(s => s.crashMultiplier).filter(m => m > 0);
        const avgMultiplier = multipliers.length > 0 ? 
            multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length : 0;
        const maxMultiplier = multipliers.length > 0 ? Math.max(...multipliers) : 0;
        
        return {
            totalSessions,
            winRate: totalSessions > 0 ? (wins / totalSessions * 100).toFixed(2) : 0,
            totalBetAmount: totalBetAmount.toFixed(2),
            totalWinAmount: totalWinAmount.toFixed(2),
            avgMultiplier: avgMultiplier.toFixed(2),
            maxMultiplier: maxMultiplier.toFixed(2),
            cacheSize: this.globalSessions.length,
            pendingSaves: this.pendingSaves.length
        };
    }
    
    /**
     * 获取最近的崩盘记录
     */
    getRecentCrashes(limit = 10) {
        return this.globalSessions
            .filter(s => s.crashMultiplier > 0)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map(s => ({
                multiplier: s.crashMultiplier,
                timestamp: s.timestamp,
                isWin: s.isWin
            }));
    }
    
    /**
     * 启动后台任务
     */
    startBackgroundTasks() {
        // 批量保存任务
        setInterval(() => {
            this.batchSaveToDB();
        }, this.config.batchSaveInterval);
        
        // 清理任务
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        console.log('Background tasks started for GameSessionCache');
    }
    
    /**
     * 批量保存到数据库
     */
    async batchSaveToDB() {
        if (this.pendingSaves.length === 0) {
            return;
        }
        
        const sessionsToSave = [...this.pendingSaves];
        this.pendingSaves = []; // 清空待保存队列
        
        try {
            console.log(`Batch saving ${sessionsToSave.length} sessions to database...`);
            
            // 转换为数据库格式
            const dbSessions = sessionsToSave.map(session => ({
                sessionId: session.sessionId || session.id,
                userId: session.userId,
                betAmount: session.betAmount,
                crashMultiplier: session.crashMultiplier || session.multiplier,
                cashOutMultiplier: session.isWin ? (session.crashMultiplier || session.multiplier) : 0,
                isWin: session.isWin,
                profit: session.isWin ? (session.winAmount - session.betAmount) : -session.betAmount,
                gameStartTime: new Date(session.timestamp),
                gameEndTime: new Date(session.timestamp + (session.gameDuration || 0)),
                gameDuration: session.gameDuration || 0,
                isFreeMode: session.isFreeMode || false
            }));
            
            // 批量插入
            await GameSession.insertMany(dbSessions, { ordered: false });
            console.log(`Successfully saved ${dbSessions.length} sessions to database`);
            
        } catch (error) {
            console.error('Error batch saving sessions:', error);
            // 如果保存失败，将会话重新加入队列（但限制重试次数）
            const retriableSessions = sessionsToSave.filter(s => !s.retryCount || s.retryCount < 3);
            retriableSessions.forEach(s => {
                s.retryCount = (s.retryCount || 0) + 1;
                this.pendingSaves.push(s);
            });
        }
    }
    
    /**
     * 清理过期数据
     */
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - (this.config.retentionHours * 60 * 60 * 1000);
        
        let removedCount = 0;
        
        // 清理全局会话缓存
        this.globalSessions = this.globalSessions.filter(session => {
            const keep = session.timestamp > cutoffTime;
            if (!keep) removedCount++;
            return keep;
        });
        
        // 清理用户会话缓存
        for (const [userId, sessions] of this.userSessions.entries()) {
            const filteredSessions = sessions.filter(session => session.timestamp > cutoffTime);
            if (filteredSessions.length === 0) {
                this.userSessions.delete(userId);
            } else {
                this.userSessions.set(userId, filteredSessions);
            }
        }
        
        if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} expired sessions from cache`);
        }
        
        // 数据库清理（异步执行，不阻塞）
        this.cleanupDatabase().catch(error => {
            console.error('Error cleaning up database:', error);
        });
    }
    
    /**
     * 清理数据库中的过期数据
     */
    async cleanupDatabase() {
        try {
            const cutoffDate = new Date(Date.now() - (this.config.retentionHours * 60 * 60 * 1000));
            const result = await GameSession.deleteMany({
                gameStartTime: { $lt: cutoffDate }
            });
            
            if (result.deletedCount > 0) {
                console.log(`Cleaned up ${result.deletedCount} expired sessions from database`);
            }
        } catch (error) {
            console.error('Error cleaning up database:', error);
        }
    }
    
    /**
     * 获取缓存状态信息
     */
    getCacheStatus() {
        return {
            globalSessions: this.globalSessions.length,
            userCaches: this.userSessions.size,
            pendingSaves: this.pendingSaves.length,
            config: this.config
        };
    }
}

// 单例模式
const gameSessionCache = new GameSessionCache();

module.exports = gameSessionCache;