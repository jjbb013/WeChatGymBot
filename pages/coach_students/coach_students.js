// pages/coach_students/coach_students.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    students: [],
    selectedStudentOpenid: null, // 当前选中的学员openid
  },

  onShow: async function () {
    await this.loadStudents();
  },

  loadStudents: async function () {
    wx.showLoading({
      title: '加载学员中...',
    });
    try {
      const openid = await app.globalData.openidPromise;
      if (!openid) {
        wx.showToast({ title: '获取用户ID失败', icon: 'none' });
        return;
      }

      // 获取教练的学员列表
      const res = await db.collection('coach_student_relations').where({
        coachOpenid: openid,
        status: 'active' // 只显示已授权的学员
      }).get();

      const studentOpenids = res.data.map(item => item.studentOpenid);

      if (studentOpenids.length > 0) {
        // 根据 openid 获取学员的详细信息 (如昵称、头像)
        const usersRes = await db.collection('users').where({
          _openid: _.in(studentOpenids)
        }).get();

        const studentsWithInfo = res.data.map(relation => {
          const studentInfo = usersRes.data.find(user => user._openid === relation.studentOpenid);
          return {
            ...relation,
            nickName: studentInfo ? studentInfo.nickName : '未知学员',
            avatarUrl: studentInfo ? studentInfo.avatarUrl : '/images/default-avatar.png'
          };
        });
        this.setData({
          students: studentsWithInfo
        });
      } else {
        this.setData({
          students: []
        });
      }

    } catch (e) {
      console.error('加载学员失败', e);
      wx.showToast({ title: '加载学员失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  createStudent: function () {
    wx.navigateTo({
      url: '/pages/scan_qr_code/scan_qr_code?mode=coach',
    });
  },

  selectStudent: function (e) {
    const openid = e.currentTarget.dataset.openid;
    const student = this.data.students.find(s => s.openid === openid);
    if (student) {
      // 将选中学员的信息存储到全局或本地，以便在聊天页面使用
      app.globalData.currentStudent = student;
      wx.setStorageSync('currentStudent', student);
      wx.showToast({
        title: `已选择学员: ${student.nickName}`,
        icon: 'none',
        duration: 1500
      });
      // 返回聊天页面
      wx.navigateBack({
        delta: 1
      });
    }
  },
});
