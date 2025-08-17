// 使用示例：如何调用fetchHistoryRacePrizes函数获取历史比赛发奖信息

import { RaceComp, HistoryRacePrizesInfo } from './assets/script/game/comp/RaceComp';

/**
 * 获取历史比赛发奖信息的示例函数
 * @param raceComp RaceComp实例
 * @param raceId 历史比赛ID
 */
async function getHistoryRacePrizes(raceComp: RaceComp, raceId: string) {
    try {
        console.log(`正在获取比赛 ${raceId} 的发奖信息...`);
        
        // 调用新实现的函数
        const prizesInfo: HistoryRacePrizesInfo = await raceComp.fetchHistoryRacePrizes(raceId);
        
        console.log('获取成功！比赛发奖信息：');
        console.log('比赛ID:', prizesInfo.raceId);
        console.log('奖励统计:', prizesInfo.stats);
        console.log('- 总奖励数量:', prizesInfo.stats.totalPrizes);
        console.log('- 总奖励金额:', prizesInfo.stats.totalAmount);
        console.log('- 已领取金额:', prizesInfo.stats.claimedAmount);
        console.log('- 待领取金额:', prizesInfo.stats.pendingAmount);
        
        console.log('奖励详情:');
        prizesInfo.prizes.forEach((prize, index) => {
            console.log(`  ${index + 1}. 排名: ${prize.rank}, 金额: ${prize.prizeAmount}, 状态: ${prize.status}`);
        });
        
        return prizesInfo;
        
    } catch (error: any) {
        console.error('获取历史比赛发奖信息失败:', error.message);
        throw error;
    }
}

/**
 * 使用示例
 */
// const raceComp = new RaceComp();
// getHistoryRacePrizes(raceComp, 'race_20250817125421')
//     .then(prizesInfo => {
//         console.log('处理获取到的奖励信息:', prizesInfo);
//     })
//     .catch(error => {
//         console.error('处理失败:', error);
//     });

export { getHistoryRacePrizes };