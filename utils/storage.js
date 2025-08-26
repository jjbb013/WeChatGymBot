// utils/storage.js

// 初始化云数据库
const db = wx.cloud.database();
const fitnessLogsCollection = db.collection('fitness_logs');

/**
 * 获取当前用户的所有健身记录
 * @param {string} openid - 用户的 OpenID
 * @param {string} targetOpenid - 目标用户的 OpenID (教练模式下为学员 OpenID)
 * @returns {Promise<Array>} - 包含健身记录的Promise
 */
async function getFitnessLogs(openid, targetOpenid = null) {
  const queryOpenid = targetOpenid || openid;
  if (!queryOpenid) {
    return [];
  }
  try {
    const res = await fitnessLogsCollection.where({
      _openid: queryOpenid
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
 * @param {string} openid - 当前用户的 OpenID
 * @param {string} targetOpenid - 目标用户的 OpenID (教练模式下为学员 OpenID)
 * @returns {Promise<object>} - 返回包含新纪录的Promise
 */
async function addFitnessLog(log, openid, targetOpenid = null) {
  const recordOpenid = targetOpenid || openid;
  if (!recordOpenid) {
    throw new Error('无法确定记录所属用户OpenID');
  }
  try {
    const newLog = {
      ...log,
      _openid: recordOpenid, // 明确指定记录所属用户
      createdAt: db.serverDate() // 使用服务端时间，保证时间准确性
    };
    const res = await fitnessLogsCollection.add({
      data: newLog
    });
    return { ...newLog, _id: res._id };
  } catch (e) {
    console.error('Failed to add fitness log to cloud database', e);
    wx.showToast({
      title: '记录失败',
      icon: 'none'
    });
    throw e;
  }
}

/**
 * 获取指定用户在今天某个动作的组数
 * @param {string} openid - 当前用户的 OpenID
 * @param {string} action - 动作名称
 * @param {string} targetOpenid - 目标用户的 OpenID (教练模式下为学员 OpenID)
 * @returns {Promise<number>} - 返回当天该动作的组数
 */
async function getTodayActionSetCount(openid, action, targetOpenid = null) {
  const queryOpenid = targetOpenid || openid;
  const _ = db.command;

  if (!queryOpenid) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const res = await db.collection('fitness_logs').where({
      _openid: queryOpenid,
      action: action,
      createdAt: _.gte(today)
    }).count();
    
    return res.total;
  } catch (e) {
    console.error('Failed to get today set count', e);
    return 0;
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
 * @param {string} openid - 当前用户的 OpenID
 * @param {string} period - 时间段 ('today', 'week', 'month', 'quarter')
 * @param {string} targetOpenid - 目标用户的 OpenID (教练模式下为学员 OpenID)
 * @returns {Promise<Array>} - 返回指定时间段内的健身记录
 */
async function getFitnessLogsByPeriod(openid, period, targetOpenid = null) {
  const queryOpenid = targetOpenid || openid;
  const db = wx.cloud.database();
  const _ = db.command;
  const now = new Date();
  let startDate;

  if (!queryOpenid) {
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
      _openid: queryOpenid,
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
 * @param {string} openid - 当前用户的 OpenID
 * @param {string} targetOpenid - 目标用户的 OpenID (教练模式下为学员 OpenID)
 * @returns {Promise<boolean>} - 返回是否删除成功
 */
async function deleteLastFitnessLog(openid, targetOpenid = null) {
  const queryOpenid = targetOpenid || openid;
  if (!queryOpenid) {
    return false;
  }
  try {
    // 1. 找到最近的一条记录
    const lastLogRes = await fitnessLogsCollection.where({
      _openid: queryOpenid
    }).orderBy('createdAt', 'desc').limit(1).get();

    if (lastLogRes.data.length === 0) {
      console.log('No logs to delete.');
      return false; // 没有记录可删
    }

    const lastLogId = lastLogRes.data[0]._id;

    // 2. 删除该记录
    const deleteRes = await fitnessLogsCollection.doc(lastLogId).remove();

    if (deleteRes.stats.removed === 1) {
      // 3. 更新本地缓存的 "lastLog" (这里只更新当前用户的本地缓存，不影响学员的)
      const newLastLogRes = await fitnessLogsCollection.where({
        _openid: openid // 注意这里仍然是当前用户的 openid
      }).orderBy('createdAt', 'desc').limit(1).get();

      if (newLastLogRes.data.length > 0) {
        setLastFitnessLog(newLastLogRes.data[0]);
      } else {
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
