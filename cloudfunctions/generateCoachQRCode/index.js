// cloudfunctions/generateCoachQRCode/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const coachOpenid = wxContext.OPENID; // 获取调用者的 openid，即教练的 openid

  if (!coachOpenid) {
    return {
      success: false,
      message: '无法获取教练OpenID',
    };
  }

  // 这里可以生成一个包含教练openid的链接或数据
  // 例如：小程序页面路径 + 参数
  const qrData = `pages/scan_qr_code/scan_qr_code?mode=student&coachOpenid=${coachOpenid}`;

  return {
    success: true,
    qrData: qrData,
    coachOpenid: coachOpenid,
  };
};
