// pages/chat/chat.js
const { getStructuredDataFromGemini } = require('../../utils/gemini.js');
const { addFitnessLog, getTodayActionSetCount, getLastFitnessLog, setLastFitnessLog, getFitnessLogsByPeriod, deleteLastFitnessLog } = require('../../utils/storage.js');
const { transcribeAudio } = require('../../utils/asr.js');
const app = getApp();

const recorderManager = wx.getRecorderManager();

Page({
  data: {
    messages: [
      { role: 'ai', content: '你好！我是你的健身小助手，请输入你的健身数据，我会为您记录。也可以输入“帮助”或“项目介绍”来更深入的了解我。' }
    ],
    inputValue: '',
    isThinking: false,
    isVoiceMode: false,
    showSendButton: false,
    isSendButtonDisabled: true,
    isRecording: false,
    isProcessingVoice: false,
    userAvatar: '/images/default-avatar.png',
    // --- 录音UI相关 ---
    volumeLevel: 0,
    isCancelling: false,
    recordStatusText: '手指上滑，取消发送',
    startY: 0,
    recordTimer: null
  },

  onLoad: function() {
    this.initRecorder();
  },

  onShow: function() {
    const userProfile = wx.getStorageSync('userProfile');
    if (userProfile && userProfile.avatarUrl) {
      this.setData({
        userAvatar: userProfile.avatarUrl
      });
    }
  },

  handleInput: function(e) {
    const value = e.detail.value;
    const trimmedValue = value.trim();
    this.setData({
      inputValue: value,
      showSendButton: trimmedValue.length > 0,
      isSendButtonDisabled: trimmedValue.length === 0
    });
  },

  sendMessage: function() {
    const text = this.data.inputValue;
    if (!text.trim() || this.data.isThinking) return;

    const userMessage = { role: 'user', content: text };
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isThinking: true,
      showSendButton: false,
      isSendButtonDisabled: true
    });

    this.getAiResponse(text);
  },

  switchInputMode: function() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode
    });
  },

  initRecorder: function() {
    recorderManager.onStart(() => {
      console.log('recorder start');
      this.setData({ 
        isRecording: true,
        recordStatusText: '手指上滑，取消发送',
        isCancelling: false
      });
      this.startVolumeAnimation();
    });

    recorderManager.onStop((res) => {
      console.log('recorder stop', res);
      this.setData({ isRecording: false, volumeLevel: 0 });
      this.stopVolumeAnimation();

      if (this.data.isCancelling) {
        console.log('录音已取消');
        return;
      }

      if (res.duration < 1000) {
        wx.showToast({ title: '录音时间太短', icon: 'none' });
        return;
      }
      
      this.handleVoiceFile(res.tempFilePath);
    });

    recorderManager.onError((res) => {
      console.error('recorder error', res);
      wx.showToast({ title: '录音失败', icon: 'error' });
      this.setData({ isRecording: false, volumeLevel: 0 });
      this.stopVolumeAnimation();
    });
  },

  handleVoiceRecordStart: function(e) {
    if (this.data.isProcessingVoice) {
      wx.showToast({ title: '语音处理中...', icon: 'none' });
      return;
    }
    this.setData({ startY: e.touches[0].clientY });
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => this.startRecording(),
            fail: () => wx.showToast({ title: '您拒绝了录音权限', icon: 'none' })
          });
        } else {
          this.startRecording();
        }
      }
    });
  },

  startRecording: function() {
    const options = {
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'aac',
    };
    recorderManager.start(options);
  },

  handleVoiceRecordEnd: function() {
    if (this.data.isRecording) {
      recorderManager.stop();
    }
  },

  handleVoiceRecordMove: function(e) {
    const touch = e.touches[0];
    const moveY = touch.clientY;
    const startY = this.data.startY;

    if (startY - moveY > 50) { // 50px作为阈值
      this.setData({
        isCancelling: true,
        recordStatusText: '松开手指，取消发送'
      });
    } else {
      this.setData({
        isCancelling: false,
        recordStatusText: '手指上滑，取消发送'
      });
    }
  },

  startVolumeAnimation: function() {
    this.data.recordTimer = setInterval(() => {
      const volume = Math.floor(Math.random() * 80) + 20; // 模拟音量变化
      this.setData({ volumeLevel: volume });
    }, 200);
  },

  stopVolumeAnimation: function() {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
      this.setData({ recordTimer: null });
    }
  },

  handleVoiceFile: async function(tempFilePath) {
    if (!tempFilePath) return;
    this.setData({ isProcessingVoice: true });
    wx.showLoading({ title: '识别中...' });

    try {
      const recognizedText = await transcribeAudio(tempFilePath);
      this.setData({
        inputValue: recognizedText,
        showSendButton: true,
        isSendButtonDisabled: false
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '识别失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ isProcessingVoice: false });
    }
  },

  showMoreFunctions: function() {
    wx.showActionSheet({
      itemList: ['个人信息'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({
            url: '/pages/profile/profile',
          });
        }
      }
    });
  },

  async getAiResponse(userText) {
    // --- 任务2 & 3：处理关键词 ---
    if (userText.trim() === '项目介绍') {
      const introText = "本项目是健身类的聊天机器人项目，用于快速，便捷的记录健身数据，也可以对健身数据进行周期性回顾，展示健身日历，报表等功能，后续也会开发健身动作指引的功能，项目由潘小明设计开发，如果你在使用过程中发现任何可以优化的内容，请添加我的微信进行沟通，你的支持是我开发的最大动力，微信号：Will_Pan_World";
      const aiMessage = { role: 'ai', content: introText };
      this.setData({
        messages: [...this.data.messages, aiMessage],
        isThinking: false
      });
      return;
    }

    if (userText.trim().toLowerCase() === '帮助' || userText.trim().toLowerCase() === 'help') {
      const helpText = `健身小助手使用手册

a) 记录健身数据
你可以输入固定的标准格式文字记录，也可以使用自然语言来描述你的健身数据。
- 标准格式：项目名称 负重 次数，三项数据之间使用空格分割，例如：深蹲 100KG 8
- 自然语言：例如：我做了 8 次深蹲，负重 100 公斤
- 连续记录：相同的动作，连续做多组时，无需完整输入所有内容，只需输入发生变化的信息。例如：120KG 8 或只输入 8

b) 健身数据回顾
你可以使用自然语言描述，例如：“汇总今日数据”，“统计我今天的训练情况”，或将“今天”替换成本周、本月，让机器人为你按照固定周期统计你的健身记录。

c) 结束训练并总结
当你完成当天的全部训练后，可以输入“结束训练”或“Over”，机器人会自动为你统计当天的训练数据。

d) 撤回错误记录
如果发生健身记录错误的情况，你可以输入“撤回”，机器人会帮你撤回上一次的健身记录数据。
注意：仅能撤回最近的一次数据，无法连续撤回多条数据。`;
      const aiMessage = { role: 'ai', content: helpText };
      this.setData({
        messages: [...this.data.messages, aiMessage],
        isThinking: false
      });
      return;
    }

    const lowerCaseText = userText.trim().toLowerCase();

    if (lowerCaseText === '结束训练' || lowerCaseText === 'over') {
      const openid = await app.globalData.openidPromise;
      const logs = await getFitnessLogsByPeriod(openid, 'today');
      const summaryText = this.formatSummary('today', logs);
      const aiMessage = { role: 'ai', content: summaryText };
      this.setData({
        messages: [...this.data.messages, aiMessage],
        isThinking: false
      });
      return;
    }

    if (userText.trim() === '撤回') {
      const openid = await app.globalData.openidPromise;
      const success = await deleteLastFitnessLog(openid);
      let feedbackText = '';
      if (success) {
        feedbackText = '✅ 已成功撤回上一条记录。';
      } else {
        feedbackText = '❌ 撤回失败，可能没有可撤回的记录。';
      }
      const aiMessage = { role: 'ai', content: feedbackText };
      this.setData({
        messages: [...this.data.messages, aiMessage],
        isThinking: false
      });
      return;
    }
    // --- 关键词处理结束 ---

    try {
      const lastLog = getLastFitnessLog();
      const structuredData = await getStructuredDataFromGemini(userText, lastLog);
      let aiResponseText = '';

      if (structuredData.type === 'log' && structuredData.data) {
        const logData = structuredData.data;
        if (logData.action && logData.reps) {
          const openid = await app.globalData.openidPromise;
          const setCount = await getTodayActionSetCount(openid, logData.action);
          logData.sets = setCount + 1;

          const savedLog = await addFitnessLog(logData);
          setLastFitnessLog(savedLog);

          const weight = savedLog.weight || 0;
          aiResponseText = `记录成功: ${savedLog.action} ${weight}kg ${savedLog.reps}次。\n💪 这是您今天完成的第 ${savedLog.sets} 组 ${savedLog.action}.`;
          
          // 当用户完成第一组时，给予提示
          if (savedLog.sets === 1) {
            aiResponseText += `\n\n💡 小提示：下次做 "${savedLog.action}" 时，您可以只输入变化的重量或次数哦，例如: "${weight}kg 10" 或 "12"。`;
          }
        } else {
          aiResponseText = "抱歉，我没能完全理解您的训练记录，可以请您说得更具体一点吗？";
        }
      } else if (structuredData.type === 'summary' && structuredData.data && structuredData.data.period) {
        const openid = await app.globalData.openidPromise;
        const period = structuredData.data.period;
        const logs = await getFitnessLogsByPeriod(openid, period);
        aiResponseText = this.formatSummary(period, logs);
      } else {
        aiResponseText = structuredData.data || "我正在学习中，暂时还不太明白。";
      }
      
      const aiMessage = { role: 'ai', content: aiResponseText };
      this.setData({
        messages: [...this.data.messages, aiMessage]
      });

    } catch (error) {
      console.error('Gemini API call failed:', error);
      const errorMessage = { role: 'ai', content: `抱歉，AI服务暂时出现了一点问题，请稍后再试。\n错误: ${error.message}` };
      this.setData({
        messages: [...this.data.messages, errorMessage]
      });
    } finally {
      this.setData({
        isThinking: false
      });
    }
  },

  formatSummary: function(period, logs) {
    if (!logs || logs.length === 0) {
      return `您在${this.getPeriodText(period)}没有任何训练记录。`;
    }

    const summary = {
      totalSets: logs.length,
      totalVolume: 0,
      actionStats: {}
    };

    logs.forEach(log => {
      const volume = (log.reps || 0) * (log.weight || 0);
      summary.totalVolume += volume;

      if (!summary.actionStats[log.action]) {
        summary.actionStats[log.action] = {
          sets: 0,
          totalReps: 0,
          totalVolume: 0,
          maxWeight: 0
        };
      }
      const stats = summary.actionStats[log.action];
      stats.sets += 1;
      stats.totalReps += log.reps || 0;
      stats.totalVolume += volume;
      if ((log.weight || 0) > stats.maxWeight) {
        stats.maxWeight = log.weight;
      }
    });

    let response = `您在${this.getPeriodText(period)}的训练总结如下：\n\n`;
    response += `总组数: ${summary.totalSets} 组\n`;
    response += `总容量 (次数*重量): ${summary.totalVolume.toFixed(2)} kg\n\n`;
    response += `动作详情：\n`;

    for (const action in summary.actionStats) {
      const stats = summary.actionStats[action];
      response += `- ${action}: ${stats.sets}组, 共${stats.totalReps}次, 最高重量${stats.maxWeight}kg\n`;
    }

    return response;
  },

  getPeriodText: function(period) {
    switch (period) {
      case 'today': return '今天';
      case 'week': return '本周';
      case 'month': return '本月';
      case 'quarter': return '本季度';
      default: return '';
    }
  },

  copyText: function(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success',
          duration: 1000
        });
      }
    });
  }
});
