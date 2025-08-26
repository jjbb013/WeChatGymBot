// pages/scan_qr_code/scan_qr_code.js
const app = getApp();
const QRCode = require('../../utils/qrcode.js'); // 假设你有一个 qrcode.js 工具

Page({
  data: {
    mode: 'student', // 'coach' or 'student'
    coachOpenid: '', // 教练模式下生成的二维码包含的教练openid
    qrCodeUrl: '', // 生成的二维码图片链接
  },

  onLoad: async function (options) {
    const mode = options.mode || 'student';
    this.setData({ mode });

    if (mode === 'coach') {
      const openid = await app.globalData.openidPromise;
      if (openid) {
        this.setData({ coachOpenid: openid });
        this.generateQRCode(openid);
      } else {
        wx.showToast({ title: '获取教练ID失败', icon: 'none' });
      }
    }
  },

  generateQRCode: function (coachOpenid) {
    // 生成二维码的链接，包含教练的 openid
    const qrData = `https://yourdomain.com/authorize?coach=${coachOpenid}`; // 替换为你的授权页面链接
    // 或者直接使用小程序页面路径，通过参数传递
    // const qrData = `/pages/scan_qr_code/scan_qr_code?mode=student&coachOpenid=${coachOpenid}`;

    new QRCode('qrcodeCanvas', {
      text: qrData,
      width: 200,
      height: 200,
      padding: 10,
      correctLevel: QRCode.CorrectLevel.H,
      callback: (res) => {
        this.setData({
          qrCodeUrl: res.path // res.path 是生成的临时文件路径
        });
      }
    });
  },

  copyQRCodeLink: function () {
    const qrData = `https://yourdomain.com/authorize?coach=${this.data.coachOpenid}`; // 替换为你的授权页面链接
    wx.setClipboardData({
      data: qrData,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  scanQRCode: function () {
    wx.scanCode({
      success: async (res) => {
        const result = res.result;
        // 解析二维码内容，提取教练 openid
        const coachOpenidMatch = result.match(/coach=([^&]+)/);
        if (coachOpenidMatch && coachOpenidMatch[1]) {
          const coachOpenid = coachOpenidMatch[1];
          await this.authorizeCoach(coachOpenid);
        } else {
          wx.showToast({ title: '无效的二维码', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('扫描失败', err);
        wx.showToast({ title: '扫描失败', icon: 'none' });
      }
    });
  },

  authorizeCoach: async function (coachOpenid) {
    wx.showLoading({ title: '授权中...' });
    try {
      const studentOpenid = await app.globalData.openidPromise;
      if (!studentOpenid) {
        wx.showToast({ title: '获取用户ID失败', icon: 'none' });
        return;
      }

      // 调用云函数进行授权绑定
      const res = await wx.cloud.callFunction({
        name: 'authorizeStudent', // 新增的云函数
        data: {
          coachOpenid: coachOpenid,
          studentOpenid: studentOpenid,
        },
      });

      if (res.result && res.result.success) {
        wx.showToast({ title: '授权成功！', icon: 'success' });
        // 授权成功后可以返回聊天页面或个人信息页面
        wx.navigateBack({ delta: 1 });
      } else {
        wx.showToast({ title: res.result.message || '授权失败', icon: 'none' });
      }
    } catch (e) {
      console.error('授权失败', e);
      wx.showToast({ title: '授权失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
