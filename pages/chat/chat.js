// pages/chat/chat.js
const { getStructuredDataFromGemini } = require('../../utils/gemini.js');
const { addFitnessLog, getTodayActionSetCount, getLastFitnessLog, setLastFitnessLog } = require('../../utils/storage.js');
const { transcribeAudio } = require('../../utils/asr.js');

const recorderManager = wx.getRecorderManager();

Page({
  data: {
    messages: [
      { role: 'ai', content: '你好！我是你的智能健身助手，有什么可以帮你的吗？' }
    ],
    inputValue: '',
    isThinking: false, // AI思考中
    isVoiceMode: false, // 是否为语音输入模式
    showSendButton: false, // 是否显示发送按钮
    isSendButtonDisabled: true, // 发送按钮是否禁用
    isRecording: false // 是否正在录音
  },

  onLoad: function() {
    this.initRecorder();
  },

  // --- 输入框与发送逻辑 ---
  handleInput: function(e) {
    const value = e.detail.value;
    const trimmedValue = value.trim();
    this.setData({
      inputValue: value,
      showSendButton: trimmedValue.length > 0, // 当有输入时显示发送按钮
      isSendButtonDisabled: trimmedValue.length === 0 // 当输入为空时禁用发送按钮
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
      showSendButton: false, // 发送后隐藏发送按钮
      isSendButtonDisabled: true // 发送后禁用按钮
    });

    // 调用AI处理
    this.getAiResponse(text);
  },

  // --- 交互模式切换 ---
  switchInputMode: function() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode
    });
  },

  // --- 语音输入 ---
  initRecorder: function() {
    recorderManager.onStart(() => {
      console.log('recorder start');
      this.setData({ isRecording: true });
    });

    recorderManager.onStop((res) => {
      console.log('recorder stop', res);
      this.setData({ isRecording: false });
      if (res.duration < 1000) {
        wx.showToast({ title: '录音时间太短', icon: 'none' });
        return;
      }
      // 获取到临时文件路径
      const { tempFilePath } = res;
      this.handleVoiceFile(tempFilePath);
    });

    recorderManager.onError((res) => {
      console.error('recorder error', res);
      wx.showToast({ title: '录音失败', icon: 'error' });
      this.setData({ isRecording: false });
    });
  },

  handleVoiceRecordStart: function() {
    // 检查并请求录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.startRecording();
            },
            fail: () => {
              wx.showToast({ title: '您拒绝了录音权限', icon: 'none' });
            }
          });
        } else {
          this.startRecording();
        }
      }
    });
  },

  startRecording: function() {
    const options = {
      duration: 60000, // 录音时长，单位ms，最长1分钟
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 96000, // 编码码率
      format: 'mp3', // 音频格式
    };
    recorderManager.start(options);
  },

  handleVoiceRecordEnd: function() {
    if (this.data.isRecording) {
      recorderManager.stop();
    }
  },

  handleVoiceFile: async function(tempFilePath) {
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
    }
  },

  showMoreFunctions: function() {
    // 点击“+”号，显示更多功能，如发送图片等
    wx.showToast({ title: '更多功能开发中', icon: 'none' });
  },

  // --- AI 核心逻辑 ---
  async getAiResponse(userText) {
    try {
      const lastLog = getLastFitnessLog();
      const structuredData = await getStructuredDataFromGemini(userText, lastLog);
      let aiResponseText = '';

      if (structuredData.type === 'log' && structuredData.data) {
        const logData = structuredData.data;
        // 验证一下模型返回的数据是否基本完整
        if (logData.action && logData.reps) {
          // 查询当天该动作已完成的组数
          const setCount = await getTodayActionSetCount(logData.action);
          logData.sets = setCount + 1; // 将真实的组数写入logData

          // 调用异步的 addFitnessLog
          const savedLog = await addFitnessLog(logData);
          
          // 记录成功后，更新上一次的记录
          setLastFitnessLog(savedLog);

          const weight = savedLog.weight || 0;
          aiResponseText = `记录成功: ${savedLog.action} ${weight}kg ${savedLog.reps}次.\n💪 这是您今天完成的第 ${savedLog.sets} 组 ${savedLog.action}.`;
        } else {
          aiResponseText = "抱歉，我没能完全理解您的训练记录，可以请您说得更具体一点吗？";
        }
      } else {
        // 处理闲聊或其他类型的回复
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
        isThinking: false // 无论成功或失败，都结束思考
      });
    }
  }
});
