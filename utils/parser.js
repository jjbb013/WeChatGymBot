// utils/parser.js

/**
 * 解析健身记录字符串
 * @param {string} text - 用户输入的文本, e.g., "深蹲 5组x10次@60kg"
 * @returns {object|null} - 解析成功返回包含动作、组数、次数、重量的对象，否则返回 null
 */
function parseFitnessLog(text) {
  // 正则表达式，匹配格式：[动作] [组数]x[次数]@[重量]
  // 支持的格式变体:
  // 深蹲 5x10@60kg
  // 卧推 5组10次 60
  // 硬拉 5*8 80公斤
  const regex = /(.+?)\s*(\d+)\s*[组xX*]\s*(\d+)\s*(?:次)?\s*@?\s*(\d+\.?\d*)\s*(kg|公斤)?/i;
  
  const match = text.match(regex);

  if (match) {
    return {
      action: match[1].trim(),
      sets: parseInt(match[2], 10),
      reps: parseInt(match[3], 10),
      weight: parseFloat(match[4])
    };
  }

  return null;
}

module.exports = {
  parseFitnessLog
};
