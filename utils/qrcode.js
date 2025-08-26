// utils/qrcode.js
// 这是一个简化的二维码生成工具，实际项目中可能需要引入更完善的库
// 例如：https://github.com/yingye/weapp-qrcode

function QRCode(canvasId, options) {
  const ctx = wx.createCanvasContext(canvasId);
  const text = options.text || '';
  const width = options.width || 200;
  const height = options.height || 200;
  const padding = options.padding || 0;
  const correctLevel = options.correctLevel || 0; // 0-3, L, M, Q, H

  // 模拟绘制二维码，实际需要更复杂的逻辑
  ctx.setFillStyle('black');
  ctx.fillRect(0, 0, width, height);
  ctx.setFillStyle('white');
  ctx.fillRect(padding, padding, width - 2 * padding, height - 2 * padding);

  // 简单文本显示，非真实二维码
  ctx.setFontSize(12);
  ctx.setFillStyle('black');
  ctx.setTextAlign('center');
  ctx.fillText('QR Code Placeholder', width / 2, height / 2);
  ctx.fillText(text.substring(0, 20) + '...', width / 2, height / 2 + 20); // 显示部分内容

  ctx.draw(false, () => {
    if (options.callback) {
      wx.canvasToTempFilePath({
        canvasId: canvasId,
        success: (res) => {
          options.callback(res);
        },
        fail: (err) => {
          console.error('canvasToTempFilePath failed', err);
          options.callback({ path: '' });
        }
      });
    }
  });

  // 模拟 CorrectLevel
  QRCode.CorrectLevel = {
    L: 0,
    M: 1,
    Q: 2,
    H: 3
  };
}

module.exports = QRCode;
