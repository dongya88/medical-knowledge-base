# 医疗内容OS - Render部署指南

## 🚀 快速部署步骤

### 第一步：准备代码

1. 确保所有代码已更新：
   - ✅ `database.js` - 已修改为Postgres
   - ✅ `server.js` - 已更新环境变量支持
   - ✅ `package.json` - 已添加pg依赖

2. 创建Git仓库（如果还没有）：
   ```bash
   git init
   git add .
   git commit -m "医疗内容OS - 支持Postgres部署"
   ```

3. 推送到GitHub：
   ```bash
   git remote add origin https://github.com/你的用户名/content-os.git
   git push -u origin main
   ```

### 第二步：创建Render Postgres数据库

1. 登录 [Render.com](https://render.com/)
2. 点击 **New → PostgreSQL**
3. 配置数据库：
   - **Name**: `content-os-db`（随便起）
   - **Database**: `contentos`
   - **User**: `contentos`
4. 点击 **Create Database**
5. 等待创建完成，复制 **Internal Database URL**（格式：`postgres://...`）

### 第三步：创建Web Service

1. 在Render控制台，点击 **New → Web Service**
2. 选择 **Connect GitHub**，授权访问你的仓库
3. 选择你的 `content-os` 仓库
4. 配置Web Service：

| 配置项 | 值 |
|--------|-----|
| **Name** | `content-os` |
| **Region** | Singapore（离中国近） |
| **Runtime** | Node |
| **Branch** | main |
| **Root Directory** | （留空） |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

5. 点击 **Create Web Service**

### 第四步：配置环境变量

在Web Service页面，找到 **Environment** 部分，点击 **Add Environment Variable**：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | 粘贴第二步复制的Postgres连接字符串 |
| `SESSION_SECRET` | 一个随机字符串（例如：`a1b2c3d4e5f6...`） |
| `ZHIPU_API_KEY` | 你的智谱AI API Key |

> ⚠️ **重要**：这些敏感信息不要写在代码里！

### 第五步：等待部署

1. Render会自动开始构建和部署
2. 可以点击 **Logs** 查看实时日志
3. 等待状态变成 **Live**
4. 访问：`https://content-os.onrender.com/login.html`

## 🔑 登录账号

| 用户名 | 密码 |
|--------|------|
| admin | 123abc |
| user1 | 123abc |
| user2 | 123abc |

## ⚠️ 注意事项

### 1. 免费版限制
- 容器会在15分钟无请求后休眠
- 首次访问可能需要5-10秒冷启动
- 每月750小时免费额度，5-10人完全够用

### 2. 数据持久化
- Postgres数据会持久保存
- 用户账号、登录状态都存储在数据库中
- 重启服务不会丢失数据

### 3. API Key安全
- 所有API Key必须通过环境变量配置
- 不要把真实Key写在代码里
- Render会自动加密环境变量

## 🆘 故障排查

### 部署失败
1. 检查Build日志
2. 确认所有依赖都正确安装
3. 检查环境变量是否设置

### 数据库连接失败
1. 确认DATABASE_URL格式正确
2. 检查Postgres数据库是否正常运行
3. 查看Render日志中的错误信息

### 登录不工作
1. 检查浏览器控制台错误
2. 确认数据库初始化成功
3. 检查SESSION_SECRET是否设置

## 📊 监控和维护

### 查看日志
在Render控制台，点击你的Web Service → **Logs**

### 重启服务
点击 **Manual Deploy → Clear build cache & deploy**

### 扩展
如果需要更高性能，可以升级到付费实例：
- Starter: $7/月
- Standard: $25/月

## 🎉 完成！

部署成功后，你就可以通过互联网访问系统了：
- 登录：`https://你的项目名.onrender.com/login.html`
- 主界面：`https://你的项目名.onrender.com/index.html`

分享链接给团队成员，大家就可以开始使用了！
