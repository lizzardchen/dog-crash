const express = require('express');
const { body, query } = require('express-validator');
const GameSession = require('../models/GameSession');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 加载 MultiplierConfig
let multiplierConfig;
try {
    const configPath = path.join(__dirname, '../config/multiplierConfig.json');
    multiplierConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('MultiplierConfig loaded from file');
} catch (error) {
    console.error('Failed to load MultiplierConfig:', error);
    multiplierConfig = null;
}

/**
 * 生成崩盘倍数（使用配置文件）
 */
function generateCrashMultiplier() {
    if (!multiplierConfig || !multiplierConfig.crashConfig) {
        // 降级到简单实现
        return 1.0 + Math.random() * 9.0;
    }

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const config of multiplierConfig.crashConfig) {
        cumulativeProbability += config.probability;
        if (random <= cumulativeProbability) {
            const range = config.maxMultiplier - config.minMultiplier;
            const multiplier = config.minMultiplier + Math.random() * range;
            return Math.round(multiplier * 100) / 100; // 保留两位小数
        }
    }

    // 如果没有匹配到，返回最后一个配置的随机值
    const lastConfig = multiplierConfig.crashConfig[multiplierConfig.crashConfig.length - 1];
    const range = lastConfig.maxMultiplier - lastConfig.minMultiplier;
    const multiplier = lastConfig.minMultiplier + Math.random() * range;
    return Math.round(multiplier * 100) / 100;
}

/**
 * @route   GET /api/game/multiplier-config
 * @desc    获取倍率配置（客户端初始化时调用）
 * @access  Public
 */
router.get('/multiplier-config', (req, res) => {
    try {
        if (!multiplierConfig) {
            return res.status(500).json({
                error: 'Configuration Error',
                message: 'Multiplier configuration not available',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: multiplierConfig,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting multiplier config:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get multiplier configuration',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route   GET /api/game/crash-multiplier
 * @desc    获取新游戏的崩盘倍数
 * @access  Public
 */
router.get('/crash-multiplier', (req, res) => {
    try {
        const crashMultiplier = generateCrashMultiplier();
        
        console.log(`Generated crash multiplier: ${crashMultiplier}x`);
        
        res.status(200).json({
            success: true,
            data: {
                crashMultiplier: crashMultiplier,
                timestamp: Date.now()
            }
        });
    } catch (error) {
        console.error('Error generating crash multiplier:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate crash multiplier',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route   GET /api/game/stats
 * @desc    获取游戏统计信息
 * @access  Public
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await GameSession.getGameStats();
        const recentCrashes = await GameSession.getRecentCrashes(10);
        
        res.status(200).json({
            success: true,
            data: {
                stats,
                recentCrashes: recentCrashes.map(crash => ({
                    multiplier: crash.crashMultiplier,
                    timestamp: crash.gameStartTime
                }))
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error in getGameStats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get game statistics'
        });
    }
});

/**
 * @route   GET /api/game/history
 * @desc    获取全局游戏历史
 * @access  Public
 */
router.get('/history', [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const history = await GameSession.find({})
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .select('crashMultiplier gameStartTime gameDuration isWin')
            .lean();
        
        res.status(200).json({
            success: true,
            data: {
                history: history.map(game => ({
                    multiplier: game.crashMultiplier,
                    timestamp: game.gameStartTime,
                    duration: game.gameDuration,
                    result: game.isWin ? 'win' : 'crash'
                }))
            }
        });
        
    } catch (error) {
        console.error('Error in getGameHistory:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get game history'
        });
    }
});

/**
 * @route   GET /api/game/config
 * @desc    获取游戏配置
 * @access  Public
 */
router.get('/config', (req, res) => {
    const config = require('../config/server');
    
    res.status(200).json({
        success: true,
        data: {
            game: config.game,
            version: '1.0.0',
            features: {
                autoCashOut: true,
                leaderboard: true,
                gameHistory: true,
                userStats: true
            }
        }
    });
});

module.exports = router;