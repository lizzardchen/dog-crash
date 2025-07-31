const express = require('express');
const { body, query } = require('express-validator');
const GameSession = require('../models/GameSession');

const router = express.Router();

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