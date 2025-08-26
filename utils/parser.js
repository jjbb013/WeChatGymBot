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

    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts.length > 1 ? parts[parts.length - 2] : null;

    const repsRegex = /^(\d+)$/;
    const weightRegex = /^(-?\d*\.?\d+)(kg|公斤)?$/i;

    let repsMatch = lastPart.match(repsRegex);
    let weightMatch = secondLastPart ? secondLastPart.match(weightRegex) : null;

    // --- 调整匹配顺序和逻辑 ---

    // 1. 尝试匹配 "重量 次数" (e.g., "80kg 10") - 优先处理这种继承动作的场景
    // 必须有 lastLog 才能继承动作
    if (repsMatch && weightMatch && parts.length === 2 && lastLog) {
        return {
            action: lastLog.action,
            weight: parseFloat(weightMatch[1]),
            reps: parseInt(repsMatch[1]),
        };
    }

    // 2. 尝试匹配 "动作 重量 次数" 格式 (e.g., "杠铃卧推 80kg 10")
    // 确保有足够的 parts 来构成 "动作 重量 次数"
    if (repsMatch && weightMatch && parts.length >= 3) {
        action = parts.slice(0, -2).join(' ');
        weight = parseFloat(weightMatch[1]);
        reps = parseInt(repsMatch[1]);
        return { action, weight, reps };
    }

    // 3. 尝试匹配 "动作 次数" (e.g., "杠铃卧推 10")
    // 确保 lastPart 是次数，且 action 部分不是纯数字或带kg的数字
    repsMatch = lastPart.match(repsRegex);
    if (repsMatch && parts.length > 1) {
        action = parts.slice(0, -1).join(' ');
        if (!action.match(weightRegex)) { // 确保 action 不是 "重量" 格式
             return {
                action,
                weight: lastLog ? lastLog.weight : 0,
                reps: parseInt(repsMatch[1]),
            };
        }
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

    return null;
}

module.exports = {
  parseFitnessLog
};
