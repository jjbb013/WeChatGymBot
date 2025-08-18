// utils/parser.js

/**
 * 解析健身记录字符串，支持上下文继承。
 * @param {string} text - 用户输入的文本。
 * @param {object|null} lastLog - 上一次的记录, e.g., { action: '深蹲', weight: 60, reps: 10 }。
 * @returns {object|null} - 解析成功返回包含动作、重量、次数的对象，否则返回 null。
 */
function parseFitnessLog(text, lastLog = null) {
    const originalText = text.trim();
    if (!originalText) return null;

    const parts = originalText.split(/\s+/);
    let action, weight, reps;

    // --- 新的、更健壮的解析逻辑 ---

    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts.length > 1 ? parts[parts.length - 2] : null;

    const repsRegex = /^(\d+)$/; // 次数就是纯数字
    const weightRegex = /^(-?\d*\.?\d+)(kg|公斤)?$/i; // 重量是数字，可带单位

    let repsMatch = lastPart.match(repsRegex);
    let weightMatch = secondLastPart ? secondLastPart.match(weightRegex) : null;

    // 1. 尝试匹配 "动作 重量 次数" 格式 (e.g., "杠铃卧推 80kg 10")
    if (repsMatch && weightMatch) {
        action = parts.slice(0, -2).join(' ');
        weight = parseFloat(weightMatch[1]);
        reps = parseInt(repsMatch[1]);
        return { action, weight, reps };
    }

    // 2. 尝试匹配 "动作 次数" (e.g., "杠铃卧推 10")
    repsMatch = lastPart.match(repsRegex);
    if (repsMatch && parts.length > 1) {
        action = parts.slice(0, -1).join(' ');
        // 检查action部分是否是纯数字或带kg的数字，如果是，则说明输入格式更可能是 "重量 次数"
        if (!action.match(weightRegex)) {
             return {
                action,
                weight: lastLog ? lastLog.weight : 0,
                reps: parseInt(repsMatch[1]),
            };
        }
    }

    // 3. 尝试匹配 "重量 次数" (e.g., "80kg 10")
    repsMatch = lastPart.match(repsRegex);
    weightMatch = secondLastPart ? secondLastPart.match(weightRegex) : null;
    if (repsMatch && weightMatch && parts.length === 2 && lastLog) {
         return {
            action: lastLog.action,
            weight: parseFloat(weightMatch[1]),
            reps: parseInt(repsMatch[1]),
        };
    }
    
    // 4. 尝试匹配 "动作 重量" (e.g., "杠铃卧推 80kg")
    weightMatch = lastPart.match(weightRegex);
    if (weightMatch && parts.length > 1 && lastLog) {
        action = parts.slice(0, -1).join(' ');
        return {
            action,
            weight: parseFloat(weightMatch[1]),
            reps: lastLog.reps, // 继承上次的次数
        };
    }

    // 5. 尝试匹配单独的 "重量" (e.g., "90kg")
    weightMatch = lastPart.match(weightRegex);
    if (weightMatch && parts.length === 1 && weightMatch[2] && lastLog) { // 必须带单位
        return {
            action: lastLog.action, // 继承上次的动作
            weight: parseFloat(weightMatch[1]),
            reps: lastLog.reps, // 继承上次的次数
        };
    }

    // 6. 尝试匹配单独的 "次数" (e.g., "10")
    repsMatch = lastPart.match(repsRegex);
    if (repsMatch && parts.length === 1 && lastLog) {
        return {
            action: lastLog.action,
            weight: lastLog.weight,
            reps: parseInt(repsMatch[1]),
        };
    }

    return null; // 所有模式均未匹配
}

module.exports = {
  parseFitnessLog
};
