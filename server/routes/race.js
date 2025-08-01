const express = require('express');
const { param, query } = require('express-validator');
const raceManager = require('../services/raceManager');
const gameSessionCache = require('../services/gameSessionCache');

const router = express.Router();

/**
 * @route   GET /api/race/current
 * @desc    获取当前比赛信息
 * @access  Public
 */
router.get('/current', (req, res) => {
    try {
        const currentRace = raceManager.getCurrentRace();
        
        if (!currentRace) {
            return res.status(200).json({
                success: true,
                data: {
                    hasActiveRace: false,
                    message: 'No active race at the moment'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // 获取奖池信息
        const prizePool = gameSessionCache.calculateRacePrizePool(currentRace.raceId);
        
        res.status(200).json({
            success: true,
            data: {
                hasActiveRace: true,
                race: {
                    raceId: currentRace.raceId,
                    startTime: currentRace.startTime,
                    endTime: currentRace.endTime,
                    remainingTime: currentRace.remainingTime,
                    status: currentRace.status,
                    prizePool: prizePool
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting current race:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get current race information'
        });
    }
});

/**
 * @route   GET /api/race/:raceId/leaderboard
 * @desc    获取比赛排行榜
 * @access  Public
 */
router.get('/:raceId/leaderboard', [
    param('raceId')
        .notEmpty()
        .withMessage('Race ID is required'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('userId')
        .optional()
        .notEmpty()
        .withMessage('User ID cannot be empty')
], (req, res) => {
    try {
        const { raceId } = req.params;
        const { limit = 10, userId } = req.query;
        
        if (userId) {
            // 获取包含用户信息的排行榜
            const leaderboardData = gameSessionCache.getRaceLeaderboardWithUser(
                raceId, 
                userId, 
                parseInt(limit)
            );
            
            res.status(200).json({
                success: true,
                data: {
                    raceId: raceId,
                    topLeaderboard: leaderboardData.topLeaderboard,
                    userInfo: {
                        rank: leaderboardData.userRank,
                        displayRank: leaderboardData.userDisplayRank,
                        netProfit: leaderboardData.userNetProfit,
                        sessionCount: leaderboardData.userSessionCount,
                        contribution: leaderboardData.userContribution
                    },
                    totalParticipants: leaderboardData.totalParticipants
                },
                timestamp: new Date().toISOString()
            });
        } else {
            // 只获取排行榜
            const leaderboard = gameSessionCache.getRaceLeaderboard(raceId, parseInt(limit));
            
            res.status(200).json({
                success: true,
                data: {
                    raceId: raceId,
                    leaderboard: leaderboard,
                    totalShown: leaderboard.length
                },
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error getting race leaderboard:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get race leaderboard'
        });
    }
});

/**
 * @route   GET /api/race/:raceId/user/:userId
 * @desc    获取用户在比赛中的详细信息
 * @access  Public
 */
router.get('/:raceId/user/:userId', [
    param('raceId')
        .notEmpty()
        .withMessage('Race ID is required'),
    param('userId')
        .notEmpty()
        .withMessage('User ID is required')
], (req, res) => {
    try {
        const { raceId, userId } = req.params;
        
        const userData = gameSessionCache.getUserRaceData(raceId, userId);
        
        res.status(200).json({
            success: true,
            data: {
                raceId: raceId,
                userId: userId,
                ...userData
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting user race data:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user race data'
        });
    }
});

/**
 * @route   GET /api/race/history
 * @desc    获取比赛历史
 * @access  Public
 */
router.get('/history', [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Limit must be between 1 and 20')
], async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const history = await raceManager.getRaceHistory(parseInt(limit));
        
        res.status(200).json({
            success: true,
            data: {
                history: history,
                count: history.length
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting race history:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get race history'
        });
    }
});

/**
 * @route   GET /api/race/stats
 * @desc    获取比赛系统统计信息
 * @access  Public
 */
router.get('/stats', (req, res) => {
    try {
        const stats = raceManager.getRaceStats();
        
        res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting race stats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get race statistics'
        });
    }
});

module.exports = router;