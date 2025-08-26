// cloudfunctions/getCoachStudents/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const coachStudentRelationsCollection = db.collection('coach_student_relations');
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const coachOpenid = wxContext.OPENID;

  if (!coachOpenid) {
    return {
      success: false,
      message: '无法获取教练OpenID',
    };
  }

  try {
    // 1. 获取教练的所有学员关系
    const relationsRes = await coachStudentRelationsCollection.where({
      coachOpenid: coachOpenid,
      status: 'active' // 只获取已激活的关系
    }).get();

    const studentOpenids = relationsRes.data.map(relation => relation.studentOpenid);

    if (studentOpenids.length === 0) {
      return {
        success: true,
        students: [],
        message: '该教练暂无学员',
      };
    }

    // 2. 根据学员OpenID获取学员的详细信息
    const studentsRes = await usersCollection.where({
      _openid: _.in(studentOpenids)
    }).get();

    const studentsMap = new Map();
    studentsRes.data.forEach(user => {
      studentsMap.set(user._openid, user);
    });

    // 3. 组合学员信息和关系状态
    const studentsWithStatus = relationsRes.data.map(relation => {
      const studentInfo = studentsMap.get(relation.studentOpenid);
      return {
        openid: relation.studentOpenid,
        nickName: studentInfo ? studentInfo.nickName : '未知学员',
        avatarUrl: studentInfo ? studentInfo.avatarUrl : '/images/default-avatar.png',
        status: relation.status,
        relationId: relation._id, // 方便后续操作，如解除绑定
      };
    });

    return {
      success: true,
      students: studentsWithStatus,
      message: '学员列表获取成功',
    };

  } catch (e) {
    console.error('获取学员列表云函数执行失败', e);
    return {
      success: false,
      message: `获取学员列表失败: ${e.message}`,
    };
  }
};
