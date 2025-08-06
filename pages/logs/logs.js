// logs.js
const { getFitnessLogs } = require('../../utils/storage.js');
const util = require('../../utils/util.js');

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
      const fitnessLogs = await getFitnessLogs();
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
