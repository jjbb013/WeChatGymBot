// utils/asr.js

// 使用 1morething.pp.ua 的语音转文本服务
const API_URL = 'https://voice2text.1morething.pp.ua';
const API_TOKEN = 'YOUR_API_TOKEN'; // 请替换为您的 API 密钥

/**
 * 调用语音转文本 API 将音频文件转为文字
 * @param {string} tempFilePath - 微信录音临时文件路径
 * @returns {Promise<string>} - 返回识别出的文本
 */
function transcribeAudio(tempFilePath) {
  return new Promise((resolve, reject) => {
    // 1. 读取文件并进行 Base64 编码
    wx.getFileSystemManager().readFile({
      filePath: tempFilePath,
      encoding: 'base64',
      success: res => {
        const base64Data = res.data;

        // 2. 调用云函数，直接传递 Base64 数据
        wx.cloud.callFunction({
          name: 'voiceToText',
          data: {
            audioBase64: base64Data
          },
          success: cloudRes => {
            if (cloudRes.result.errCode === 0) {
              const text = cloudRes.result.data.text;
              if (text) {
                resolve(text);
              } else {
                reject(new Error('云函数返回数据格式不正确'));
              }
            } else {
              console.error('云函数执行出错:', cloudRes.result);
              reject(new Error(cloudRes.result.errMsg || '云函数处理失败'));
            }
          },
          fail: err => {
            console.error('调用云函数失败:', err);
            reject(new Error('调用云函数失败'));
          }
        });
      },
      fail: err => {
        console.error('读取文件失败:', err);
        reject(new Error('读取录音文件失败'));
      }
    });
  });
}

module.exports = {
  transcribeAudio
};
