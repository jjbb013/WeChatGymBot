// pages/chat/chat.js
const { getStructuredDataFromGemini } = require('../../utils/gemini.js');
const { addFitnessLog, getTodayActionSetCount, getLastFitnessLog, setLastFitnessLog, getFitnessLogsByPeriod } = require('../../utils/storage.js');
const { transcribeAudio } = require('../../utils/asr.js');
const app = getApp();

const recorderManager = wx.getRecorderManager();

Page({
  data: {
    messages: [
      { role: 'ai', content: '你好！我是你的健身小助手，请输入你的健身数据，我会为您记录。' }
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
          aiResponseText = `记录成功: ${savedLog.action} ${weight}kg ${savedLog.reps}次.\n💪 这是您今天完成的第 ${savedLog.sets} 组 ${savedLog.action}.`;
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
