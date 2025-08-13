// logs.js
const { getFitnessLogs } = require('../../utils/storage.js');
const util = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    logs: [],
    isLoading: true
  },
  onShow() { // 使用 onShow 是为了每次进入页面都刷新数据
    this.loadLogs();
  },
  async loadLogs() {
    this.setData({ isLoading: true });
    try {
      const openid = await app.globalData.openidPromise;
      const fitnessLogs = await getFitnessLogs(openid);
      this.setData({
        logs: fitnessLogs.map(log => {
          return {
            ...log,
            // 将ISO字符串转为可读格式
            formattedDate: util.formatTime(new Date(log.createdAt))
          };
        }),
        isLoading: false
      });
    } catch (e) {
      this.setData({ isLoading: false });
    }
  },
  // 下拉刷新
  onPullDownRefresh() {
    this.loadLogs().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
