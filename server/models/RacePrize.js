const mongoose = require('mongoose');

// 比赛奖励发放记录模式
const racePrizeSchema = new mongoose.Schema({
    raceId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    rank: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    prizeAmount: {
        type: Number,
        required: true,
        min: 0
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    // 奖励状态
    status: {
        type: String,
        enum: ['pending', 'claimed', 'expired'],
        default: 'pending',
        index: true
    },
    // 领奖相关时间
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    claimedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    // 比赛相关信息（便于查询和展示）
    raceStartTime: {
        type: Date,
        required: true
    },
    raceEndTime: {
        type: Date,
        required: true
    },
    // 用户在比赛中的表现数据（快照）
    userNetProfit: {
        type: Number,
        required: true
    },
    userSessionCount: {
        type: Number,
        required: true,
        min: 0
    },
    userTotalBetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    userTotalWinAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // 系统信息
    createdBy: {
        type: String,
        default: 'system'
    }
}, {
    timestamps: true,
    versionKey: false
});

// 复合索引 - 确保每个比赛中每个用户只有一条奖励记录
racePrizeSchema.index({ raceId: 1, userId: 1 }, { unique: true });

// 索引 - 按用户查询待领取奖励
racePrizeSchema.index({ userId: 1, status: 1 });

// 索引 - 按比赛查询所有奖励
racePrizeSchema.index({ raceId: 1, rank: 1 });

// 索引 - 清理过期奖励
racePrizeSchema.index({ expiresAt: 1, status: 1 });

// 虚拟字段 - 是否已过期
racePrizeSchema.virtual('isExpired').get(function() {
    return this.status === 'pending' && Date.now() > this.expiresAt;
});

// 虚拟字段 - 剩余有效时间
racePrizeSchema.virtual('remainingTime').get(function() {
    if (this.status !== 'pending') return 0;
    const remaining = this.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
});

// 实例方法 - 领取奖励
racePrizeSchema.methods.claim = function() {
    if (this.status !== 'pending') {
        throw new Error('Prize already claimed or expired');
    }
    
    if (Date.now() > this.expiresAt) {
        this.status = 'expired';
        throw new Error('Prize has expired');
    }
    
    this.status = 'claimed';
    this.claimedAt = new Date();
    
    return this.save();
};

// 实例方法 - 标记为过期
racePrizeSchema.methods.expire = function() {
    if (this.status === 'pending') {
        this.status = 'expired';
        return this.save();
    }
    return Promise.resolve(this);
};

// 静态方法 - 获取用户的待领取奖励
racePrizeSchema.statics.getUserPendingPrizes = async function(userId, limit = 50) {
    return this.find({ 
        userId: userId, 
        status: 'pending',
        expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// 静态方法 - 获取用户的奖励历史
racePrizeSchema.statics.getUserPrizeHistory = async function(userId, limit = 20) {
    return this.find({ userId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// 静态方法 - 获取比赛的所有奖励记录
racePrizeSchema.statics.getRacePrizes = async function(raceId) {
    return this.find({ raceId: raceId })
    .sort({ rank: 1 })
    .lean();
};

// 静态方法 - 批量创建奖励记录
racePrizeSchema.statics.batchCreatePrizes = async function(prizes) {
    if (!prizes || prizes.length === 0) return [];
    
    const operations = prizes.map(prize => ({
        insertOne: {
            document: prize
        }
    }));
    
    const result = await this.bulkWrite(operations, { ordered: false });
    return result.insertedCount;
};

// 静态方法 - 清理过期奖励
racePrizeSchema.statics.expirePendingPrizes = async function() {
    const result = await this.updateMany(
        { 
            status: 'pending', 
            expiresAt: { $lt: new Date() } 
        },
        { 
            $set: { 
                status: 'expired' 
            } 
        }
    );
    
    return result.modifiedCount;
};

// 静态方法 - 获取奖励统计信息
racePrizeSchema.statics.getPrizeStats = async function(raceId = null) {
    const matchCondition = raceId ? { raceId: raceId } : {};
    
    const stats = await this.aggregate([
        { $match: matchCondition },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$prizeAmount' }
            }
        }
    ]);
    
    return stats.reduce((acc, stat) => {
        acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
        };
        return acc;
    }, { pending: { count: 0, totalAmount: 0 }, claimed: { count: 0, totalAmount: 0 }, expired: { count: 0, totalAmount: 0 } });
};

// 预处理中间件 - 设置过期时间
racePrizeSchema.pre('save', function(next) {
    // 如果是新创建的记录且没有设置过期时间，设置为7天后过期
    if (this.isNew && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    }
    
    // 确保数值不为负数
    if (this.prizeAmount < 0) {
        this.prizeAmount = 0;
    }
    if (this.percentage < 0) {
        this.percentage = 0;
    }
    if (this.percentage > 1) {
        this.percentage = 1;
    }
    
    next();
});

// 确保返回的JSON格式正确
racePrizeSchema.methods.toJSON = function() {
    const prizeObject = this.toObject();
    
    // 添加虚拟字段
    prizeObject.isExpired = this.isExpired;
    prizeObject.remainingTime = this.remainingTime;
    
    return prizeObject;
};

const RacePrize = mongoose.model('RacePrize', racePrizeSchema);

module.exports = RacePrize;