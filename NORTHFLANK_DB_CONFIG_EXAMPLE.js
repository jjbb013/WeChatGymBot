// NORTHFLANK_DB_CONFIG_EXAMPLE.js
// 这是一个 Node.js 后端项目中数据库连接配置的示例文件。
// 您可以将其内容应用到您的后端项目中，以自动适配 Northflank 的环境变量。

const mysql = require('mysql2');

// 自动适配环境变量
// 这段代码会优先尝试读取常规的环境变量 (如 MYSQL_HOST)，
// 如果找不到，则会尝试读取 Northflank 提供的以 NF_ 开头的变量 (如 NF_MYSQL_HOST)。
const dbConfig = {
  host: process.env.MYSQL_HOST || process.env.NF_MYSQL_HOST,
  user: process.env.MYSQL_USER || process.env.NF_MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || process.env.NF_MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.NF_MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 检查是否成功获取了所有必要的配置
if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  console.error("错误: 数据库连接信息不完整。请检查您的环境变量配置。");
  // 在实际应用中，这里应该抛出错误或退出进程
  // process.exit(1); 
}

const pool = mysql.createPool(dbConfig);

// 导出连接池的 promise 版本，方便使用 async/await
module.exports = pool.promise();
