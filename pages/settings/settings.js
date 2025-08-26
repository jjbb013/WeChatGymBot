// pages/settings/settings.js
const app = getApp();

Page({
  data: {
    isCoachMode: false,
  },

  onShow: function () {
    // 从全局数据或本地存储获取教练模式状态
    this.setData({
      isCoachMode: app.globalData.isCoachMode || wx.getStorageSync('isCoachMode') || false
    });
  },

  navigateToProfile: function () {
    wx.navigateTo({
      url: '/pages/profile/profile',
    });
  },

  onCoachModeChange: function (e) {
    const isCoachMode = e.detail.value;
    this.setData({
      isCoachMode: isCoachMode
    });
    // 更新全局数据和本地存储
    app.globalData.isCoachMode = isCoachMode;
    wx.setStorageSync('isCoachMode', isCoachMode);

    if (isCoachMode) {
      wx.showToast({
        title: '已进入教练模式',
        icon: 'success',
        duration: 1500
      });
    } else {
      wx.showToast({
        title: '已退出教练模式',
        icon: 'success',
        duration: 1500
      });
    }
  },
});
