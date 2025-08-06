// utils/storage.js

// 初始化云数据库
const db = wx.cloud.database();
const fitnessLogsCollection = db.collection('fitness_logs');

/**
 * 获取所有健身记录
 * @returns {Promise<Array>} - 包含健身记录的Promise
 */
async function getFitnessLogs() {
  try {
    const res = await fitnessLogsCollection.orderBy('createdAt', 'desc').get();
    return res.data;
  } catch (e) {
    console.error('Failed to get fitness logs from cloud database', e);
    wx.showToast({
      title: '获取记录失败',
      icon: 'none'
    });
    return []; // 出错时返回空数组
  }
}

/**
 * 添加一条新的健身记录到云数据库
 * @param {object} log - 要添加的记录
 * @returns {Promise<object>} - 返回包含新纪录的Promise
 */
async function addFitnessLog(log) {
  try {
    const newLog = {
      ...log,
      // _id 和 _openid 会由云开发自动添加
      createdAt: db.serverDate() // 使用服务端时间，保证时间准确性
    };
    const res = await fitnessLogsCollection.add({
      data: newLog
    });
    // add 方法返回的是 { _id: '...' }
    // 为了保持函数返回值的统一性，我们将添加的数据与返回的_id合并
    return { ...newLog, _id: res._id };
  } catch (e) {
    console.error('Failed to add fitness log to cloud database', e);
    wx.showToast({
      title: '记录失败',
      icon: 'none'
    });
    throw e; // 抛出错误，让调用方处理
  }
}

/**
 * 获取指定用户在今天某个动作的组数
 * @param {string} action - 动作名称
 * @returns {Promise<number>} - 返回当天该动作的组数
 */
async function getTodayActionSetCount(action) {
  const db = wx.cloud.database();
  const _ = db.command;

  // 获取今天零点的时间戳
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const res = await db.collection('fitness_logs').where({
      // _openid 会由云函数自动加上，代表当前用户
      action: action,
      createdAt: _.gte(today) // createdAt 大于等于今天零点
    }).count();
    
    return res.total; // 返回查询到的记录总数
  } catch (e) {
    console.error('Failed to get today set count', e);
    return 0; // 出错时返回0
  }
}

module.exports = {
  getFitnessLogs,
  addFitnessLog,
  getTodayActionSetCount
};
