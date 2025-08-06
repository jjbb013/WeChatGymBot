// utils/gemini.js

const API_URL = 'https://wfyelvimfelx.ap-southeast-1.clawcloudrun.com/v1/chat/completions'; // 更新为用户提供的线上服务地址
const API_KEY = 'sk-willpan'; // API Key不变

// 精心设计的系统提示词，引导模型进行角色扮演并输出JSON
const SYSTEM_PROMPT = `你是一个专业的健身教练AI助手。你的任务是分析用户的对话，并从中提取结构化的健身记录。
当用户描述一个训练动作时，你需要识别出以下关键信息：
- action (动作名称): 字符串
- sets (组数): 数字, 如果未提及，默认为 1
- reps (次数): 数字
- weight (负重): 数字, 如果未提及，默认为 0

你的回复必须遵循以下规则：
1.  如果用户的输入是有效的健身记录，你只能回复一个JSON对象，格式如下：
    {"type": "log", "data": {"action": "动作名称", "sets": 1, "reps": 10, "weight": 50}}
2.  如果用户的输入不是一个健身记录（例如打招呼、问问题、请求报告），你也要回复一个JSON对象，格式如下：
    {"type": "chat", "data": "这是对用户非记录性输入的常规回复"}
3.  不要在JSON之外添加任何额外的文字、解释或注释。`;

/**
 * 调用Gemini API来解析用户输入
 * @param {string} userInput - 用户的输入文本
 * @returns {Promise<object>} - 返回解析后的JSON对象
 */
function getStructuredDataFromGemini(userInput) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: "gemini-2.5-flash", // 指定使用的模型
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userInput }
        ],
        temperature: 0.1, // 低温以确保输出稳定性
        response_format: { type: "json_object" } // 请求JSON格式输出
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
          try {
            let content = res.data.choices[0].message.content;
            
            // 增加健壮性：尝试从Markdown代码块中提取JSON
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              content = jsonMatch[1];
            }

            const structuredData = JSON.parse(content);
            resolve(structuredData);
          } catch (e) {
            console.error("JSON parsing error:", e, "Raw content:", res.data.choices[0].message.content);
            reject(new Error('Failed to parse Gemini response JSON.'));
          }
        } else {
          reject(new Error(`Gemini API Error: ${res.statusCode} - ${JSON.stringify(res.data)}`));
        }
      },
      fail: (err) => {
        reject(new Error(`Network request failed: ${err.errMsg}`));
      }
    });
  });
}

module.exports = {
  getStructuredDataFromGemini
};
