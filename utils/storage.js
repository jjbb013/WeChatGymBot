// utils/storage.js

// 初始化云数据库
const db = wx.cloud.database();
const fitnessLogsCollection = db.collection('fitness_logs');

/**
 * 获取当前用户的所有健身记录
 * @param {string} openid - 用户的 OpenID
 * @returns {Promise<Array>} - 包含健身记录的Promise
 */
async function getFitnessLogs(openid) {
  if (!openid) {
    return [];
  }
  try {
    const res = await fitnessLogsCollection.where({
      _openid: openid
    }).orderBy('createdAt', 'desc').get();
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
 * @param {string} openid - 用户的 OpenID
 * @param {string} action - 动作名称
 * @returns {Promise<number>} - 返回当天该动作的组数
 */
async function getTodayActionSetCount(openid, action) {
  const db = wx.cloud.database();
  const _ = db.command;

  if (!openid) {
    return 0;
  }

  // 获取今天零点的时间戳
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const res = await db.collection('fitness_logs').where({
      _openid: openid,
      action: action,
      createdAt: _.gte(today) // createdAt 大于等于今天零点
    }).count();
    
    return res.total; // 返回查询到的记录总数
  } catch (e) {
    console.error('Failed to get today set count', e);
    return 0; // 出错时返回0
  }
}

/**
 * 设置上一次健身记录到本地存储
 * @param {object} log - 要存储的健身记录
 */
function setLastFitnessLog(log) {
  try {
    wx.setStorageSync('lastFitnessLog', log);
  } catch (e) {
    console.error('Failed to set last fitness log to local storage', e);
  }
}

/**
 * 从本地存储获取上一次健身记录
 * @returns {object|null} - 上一次的健身记录，如果没有则返回 null
 */
function getLastFitnessLog() {
  try {
    const log = wx.getStorageSync('lastFitnessLog');
    return log || null;
  } catch (e) {
    console.error('Failed to get last fitness log from local storage', e);
    return null;
  }
}

/**
 * 根据时间段获取健身记录
 * @param {string} openid - 用户的 OpenID
 * @param {string} period - 时间段 ('today', 'week', 'month', 'quarter')
 * @returns {Promise<Array>} - 返回指定时间段内的健身记录
 */
async function getFitnessLogsByPeriod(openid, period) {
  const db = wx.cloud.database();
  const _ = db.command;
  const now = new Date();
  let startDate;

  if (!openid) {
    return [];
  }

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    default:
      return [];
  }

  try {
    const res = await db.collection('fitness_logs').where({
      _openid: openid,
      createdAt: _.gte(startDate)
    }).orderBy('createdAt', 'desc').get();
    return res.data;
  } catch (e) {
    console.error(`Failed to get fitness logs for period ${period}`, e);
    wx.showToast({
      title: '获取汇总数据失败',
      icon: 'none'
    });
    return [];
  }
}

/**
 * 删除最近一条健身记录
 * @param {string} openid - 用户的 OpenID
 * @returns {Promise<boolean>} - 返回是否删除成功
 */
async function deleteLastFitnessLog(openid) {
  if (!openid) {
    return false;
  }
  try {
    // 1. 找到最近的一条记录
    const lastLogRes = await fitnessLogsCollection.where({
      _openid: openid
    }).orderBy('createdAt', 'desc').limit(1).get();

    if (lastLogRes.data.length === 0) {
      console.log('No logs to delete.');
      return false; // 没有记录可删
    }

    const lastLogId = lastLogRes.data[0]._id;

    // 2. 删除该记录
    const deleteRes = await fitnessLogsCollection.doc(lastLogId).remove();

    if (deleteRes.stats.removed === 1) {
      // 3. 更新本地缓存的 "lastLog"
      const newLastLogRes = await fitnessLogsCollection.where({
        _openid: openid
      }).orderBy('createdAt', 'desc').limit(1).get();

      if (newLastLogRes.data.length > 0) {
        setLastFitnessLog(newLastLogRes.data[0]);
      } else {
        // 如果没有更多记录了，清空缓存
        wx.removeStorageSync('lastFitnessLog');
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to delete last fitness log', e);
    wx.showToast({
      title: '撤回失败',
      icon: 'none'
    });
    return false;
  }
}

module.exports = {
  getFitnessLogs,
  addFitnessLog,
  getTodayActionSetCount,
  setLastFitnessLog,
  getLastFitnessLog,
  getFitnessLogsByPeriod,
  deleteLastFitnessLog
};
