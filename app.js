// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入您的云环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-9gfgzt2767905c1a', // 重要：需要用户替换
        traceUser: true,
      });
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    });

    // 异步获取 openid
    this.globalData.openidPromise = new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: async res => { // 将 success 回调函数标记为 async
          console.log('[云函数] [login] user openid: ', res.result.openid);
          this.globalData.openid = res.result.openid;
          wx.setStorageSync('openid', res.result.openid);

          // 查询用户角色
          const db = wx.cloud.database();
          const usersCollection = db.collection('users');
          const userRes = await usersCollection.where({
            _openid: res.result.openid
          }).get();

          if (userRes.data.length > 0 && userRes.data[0].isCoach) {
            this.globalData.isCoachMode = true;
            wx.setStorageSync('isCoachMode', true);
            console.log('用户是教练模式');
          } else {
            this.globalData.isCoachMode = false;
            wx.setStorageSync('isCoachMode', false);
            console.log('用户是普通模式');
          }

          resolve(res.result.openid);
        },
        fail: err => {
          console.error('[云函数] [login] 调用失败', err);
          reject(err);
        }
      });
    });
  },
  globalData: {
    userInfo: null,
    openid: null,
    openidPromise: null,
    useNorthflank: false, // true: 使用 Northflank, false: 使用微信云开发
    isCoachMode: false, // 新增：是否为教练模式
    currentStudent: null, // 新增：教练模式下当前选中的学员信息
  }
})
