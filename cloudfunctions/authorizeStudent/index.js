// cloudfunctions/authorizeStudent/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const coachStudentRelationsCollection = db.collection('coach_student_relations');
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  const { coachOpenid, studentOpenid } = event;

  if (!coachOpenid || !studentOpenid) {
    return {
      success: false,
      message: '缺少教练或学员OpenID',
    };
  }

  if (coachOpenid === studentOpenid) {
    return {
      success: false,
      message: '教练和学员不能是同一个人',
    };
  }

  try {
    // 1. 检查教练是否存在且是教练模式
    const coachUser = await usersCollection.where({
      _openid: coachOpenid,
      isCoach: true // 确保是教练
    }).get();

    if (coachUser.data.length === 0) {
      return {
        success: false,
        message: '教练不存在或未开启教练模式',
      };
    }

    // 2. 检查学员是否存在
    const studentUser = await usersCollection.where({
      _openid: studentOpenid
    }).get();

    if (studentUser.data.length === 0) {
      // 如果学员不存在，可以考虑在这里创建用户记录，或者要求学员先登录小程序
      return {
        success: false,
        message: '学员用户不存在，请先登录小程序',
      };
    }

    // 3. 检查是否已存在绑定关系
    const existingRelation = await coachStudentRelationsCollection.where({
      coachOpenid: coachOpenid,
      studentOpenid: studentOpenid,
    }).get();

    if (existingRelation.data.length > 0) {
      // 如果关系已存在，更新状态为 active
      await coachStudentRelationsCollection.doc(existingRelation.data[0]._id).update({
        data: {
          status: 'active',
          updatedAt: new Date(),
        },
      });
      return {
        success: true,
        message: '授权成功，关系已更新',
      };
    } else {
      // 如果关系不存在，创建新关系
      await coachStudentRelationsCollection.add({
        data: {
          coachOpenid: coachOpenid,
          studentOpenid: studentOpenid,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 4. 更新教练的 studentIds 列表 (可选，但方便查询)
      await usersCollection.where({ _openid: coachOpenid }).update({
        data: {
          studentIds: _.addToSet(studentOpenid)
        }
      });

      // 5. 更新学员的 coachId (可选，但方便查询)
      await usersCollection.where({ _openid: studentOpenid }).update({
        data: {
          coachId: coachOpenid
        }
      });

      return {
        success: true,
        message: '授权成功，已建立新的教练-学员关系',
      };
    }

  } catch (e) {
    console.error('授权云函数执行失败', e);
    return {
      success: false,
      message: `授权失败: ${e.message}`,
    };
  }
};
