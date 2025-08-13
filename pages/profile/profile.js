// pages/profile/profile.js
Page({
  data: {
    avatarUrl: '/images/default-avatar.png', // 默认头像
    nickname: '',
    goal: ''
  },

  onLoad: function () {
    // 加载时，从本地存储获取已保存的用户信息
    const userProfile = wx.getStorageSync('userProfile');
    if (userProfile) {
      this.setData({
        avatarUrl: userProfile.avatarUrl || this.data.avatarUrl,
        nickname: userProfile.nickname || '',
        goal: userProfile.goal || ''
      });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
    });
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  onGoalInput(e) {
    this.setData({
      goal: e.detail.value
    });
  },

  saveProfile() {
    const { avatarUrl, nickname, goal } = this.data;
    if (!nickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      });
      return;
    }

    const userProfile = {
      avatarUrl,
      nickname,
      goal
    };

    wx.setStorageSync('userProfile', userProfile);

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  }
});
