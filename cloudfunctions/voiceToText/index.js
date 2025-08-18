const cloud = require('wx-server-sdk');
const tencentcloud = require("tencentcloud-sdk-nodejs");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const AsrClient = tencentcloud.asr.v20190614.Client;

// 您的腾讯云凭证
// !! 重要提示 !!
// 为了安全，请不要将 Secret ID 和 Secret Key 直接硬编码在此文件中。
// 推荐使用云函数的环境变量功能来配置这些敏感信息。
const SECRET_ID = process.env.TENCENT_SECRET_ID || "YOUR_SECRET_ID"; 
const SECRET_KEY = process.env.TENCENT_SECRET_KEY || "YOUR_SECRET_KEY";

const clientConfig = {
  credential: {
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  },
  region: "ap-shanghai", // 语音识别服务地域
  profile: {
    httpProfile: {
      endpoint: "asr.tencentcloudapi.com",
    },
  },
};

const client = new AsrClient(clientConfig);

// 云函数入口函数
exports.main = async (event, context) => {
  const { audioBase64 } = event;

  if (!audioBase64) {
    return {
      errCode: 1,
      errMsg: '缺少 audioBase64 参数',
    };
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');

  const params = {
    EngSerViceType: "16k_zh", // 中文通用引擎
    SourceType: 1, // 语音数据
    VoiceFormat: "m4a", // 微信录音的格式
    Data: audioBase64,
    DataLen: audioBuffer.length
  };

  try {
    const response = await client.SentenceRecognition(params);
    // 成功，返回识别结果
    return {
      errCode: 0,
      errMsg: '识别成功',
      data: {
        text: response.Result
      },
      rawResponse: response
    };
  } catch (error) {
    console.error('腾讯云 ASR 请求失败:', error);
    return {
      errCode: -1,
      errMsg: '语音识别失败，请查看云函数日志',
      error: {
        code: error.code,
        message: error.message
      }
    };
  }
};
