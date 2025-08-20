// utils/storage_northflank.js

const API_BASE_URL = 'https://site--gymcode--p4sgnvykm6ty.code.run';

/**
 * 封装 wx.request 为 Promise
 * @param {object} options - wx.request 的参数
 * @returns {Promise<object>}
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('API Error:', res);
          reject(new Error(res.data.error || `请求失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('Network Error:', err);
        reject(new Error(`网络请求失败: ${err.errMsg}`));
      }
    });
  });
}

/**
 * 添加一条新的健身记录
 * @param {object} log - 要添加的记录 { action, reps, weight }
 * @returns {Promise<object>} - 返回包含新纪录的Promise
 */
async function addFitnessLog(log) {
  const openid = await getApp().globalData.openidPromise;
  return request({
    url: `${API_BASE_URL}/log`,
    method: 'POST',
    data: {
      user_id: openid,
      ...log
    }
  });
}

/**
 * 根据时间段获取健身记录
 * @param {string} openid - 用户的 OpenID
 * @param {string} period - 时间段 ('today', 'week', 'month', 'quarter')
 * @returns {Promise<Array>} - 返回指定时间段内的健身记录
 */
async function getFitnessLogsByPeriod(openid, period) {
  return request({
    url: `${API_BASE_URL}/logs/period`,
    method: 'POST',
    data: {
      user_id: openid,
      period: period
    }
  });
}

/**
 * 删除最近一条健身记录
 * @param {string} openid - 用户的 OpenID
 * @returns {Promise<object>} - 返回操作结果
 */
async function deleteLastFitnessLog(openid) {
    const response = await request({
        url: `${API_BASE_URL}/log/delete-last`,
        method: 'POST',
        data: {
            user_id: openid
        }
    });
    return response.success; // 返回布尔值以保持兼容性
}


// --- 以下函数保持与原 storage.js 的接口一致，但部分功能可能需要调整 ---

/**
 * 获取指定用户在今天某个动作的组数 (此功能已合并到 addFitnessLog 的后端逻辑中)
 * @returns {Promise<number>} - 返回 0 (前端不再计算)
 */
async function getTodayActionSetCount(openid, action) {
  // 后端会自动计算组数，前端无需再关心
  return Promise.resolve(0);
}

/**
 * 设置上一次健身记录到本地存储 (本地缓存逻辑保持不变)
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
 * 从本地存储获取上一次健身记录 (本地缓存逻辑保持不变)
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

// getFitnessLogs 函数在当前版本中未被直接使用，但为了接口完整性，暂时保留
async function getFitnessLogs(openid) {
    return getFitnessLogsByPeriod(openid, 'all'); // 假设后端支持 'all'
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
