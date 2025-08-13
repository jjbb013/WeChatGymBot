const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'https://voice2text.1morething.pp.ua';
const API_TOKEN = 'sk-willpan';
const FILE_PATH = './voice.m4a';

async function testApi() {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(FILE_PATH)) {
      console.error(`错误：找不到测试文件 ${FILE_PATH}`);
      return;
    }

    // 创建表单
    const form = new FormData();
    form.append('audio', fs.createReadStream(FILE_PATH));

    console.log('正在发送请求至 API...');

    // 发送请求
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });

    console.log('请求成功！');
    console.log('状态码:', response.status);
    console.log('返回数据:', response.data);

  } catch (error) {
    console.error('请求失败:');
    if (error.response) {
      // 请求已发出，但服务器返回了非 2xx 的状态码
      console.error('状态码:', error.response.status);
      console.error('返回头:', error.response.headers);
      console.error('返回数据:', error.response.data);
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('请求已发出，但无响应:', error.request);
    } else {
      // 设置请求时发生了一些事情，触发了错误
      console.error('错误信息:', error.message);
    }
  }
}

testApi();
