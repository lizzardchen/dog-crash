#!/bin/bash

# Dog Crash Server 简化部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 开始部署 Dog Crash Server..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="dog-crash-server"
APP_DIR="/www/wwwroot/dog-crash-server"
PORT="3000"
GIT_REPO="https://github.com/lizzardchen/dog-crash.git"
GIT_BRANCH="main"

echo -e "${YELLOW}1. 创建应用目录并克隆代码...${NC}"

# 如果目录已存在，先备份
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}检测到现有部署，创建备份...${NC}"
    mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 创建父目录
mkdir -p "$(dirname "$APP_DIR")"

# 使用 sparse-checkout 只克隆 server 文件夹
echo -e "${YELLOW}使用 sparse-checkout 克隆 server 文件夹...${NC}"
git clone --no-checkout "$GIT_REPO" "$APP_DIR"
cd "$APP_DIR"

# 配置 sparse-checkout
git sparse-checkout init --cone
git sparse-checkout set server

# 检出文件
git checkout "$GIT_BRANCH"

# 将 server 文件夹的内容移到根目录
echo -e "${YELLOW}整理文件结构...${NC}"
if [ -d "server" ]; then
    # 移动 server 文件夹中的所有内容到当前目录
    mv server/* ./ 2>/dev/null || true
    mv server/.* ./ 2>/dev/null || true
    # 删除空的 server 文件夹
    rmdir server 2>/dev/null || true
fi

# 验证 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 未找到 package.json 文件${NC}"
    echo -e "${YELLOW}请检查仓库中 server 文件夹是否包含正确的 Node.js 项目文件${NC}"
    exit 1
fi

echo -e "${GREEN}代码克隆完成！${NC}"

echo -e "${YELLOW}2. 安装项目依赖...${NC}"
npm install --production

echo -e "${YELLOW}3. 创建环境配置文件...${NC}"
cat > .env << EOF
# 生产环境配置
NODE_ENV=production
PORT=$PORT

# MongoDB 配置
MONGODB_URI=mongodb://dogcrash:5hRPJyResaF75MPh@124.223.21.118:27017/dogcrash

# CORS 配置
ALLOWED_ORIGINS=http://crash.realfunplay.cn,https://crash.realfunplay.cn

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

echo -e "${YELLOW}4. 创建 PM2 配置文件...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'app.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '512M'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

echo -e "${YELLOW}5. 启动应用...${NC}"
pm2 start ecosystem.config.js
pm2 save

echo -e "${YELLOW}6. 创建更新脚本...${NC}"
cat > update.sh << EOF
#!/bin/bash
# 快速更新脚本

set -e

echo "🔄 开始更新..."

# 拉取最新代码
git fetch origin
git reset --hard origin/$GIT_BRANCH

# 整理文件结构
if [ -d "server" ]; then
    # 备份配置文件
    [ -f ".env" ] && cp .env .env.backup
    [ -f "ecosystem.config.js" ] && cp ecosystem.config.js ecosystem.config.js.backup
    
    # 移动新文件
    mv server/* ./ 2>/dev/null || true
    mv server/.* ./ 2>/dev/null || true
    rmdir server 2>/dev/null || true
    
    # 恢复配置文件
    [ -f ".env.backup" ] && mv .env.backup .env
    [ -f "ecosystem.config.js.backup" ] && mv ecosystem.config.js.backup ecosystem.config.js
fi

# 安装依赖
npm install --production

# 重启应用
pm2 restart $APP_NAME

echo "✅ 更新完成！"
pm2 status
EOF

chmod +x update.sh

echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${YELLOW}📝 部署信息:${NC}"
echo -e "  应用目录: $APP_DIR"
echo -e "  运行端口: $PORT"
echo -e "  应用名称: $APP_NAME"

echo -e "${YELLOW}🔧 常用命令:${NC}"
echo -e "  查看状态: pm2 status"
echo -e "  查看日志: pm2 logs $APP_NAME"
echo -e "  重启应用: pm2 restart $APP_NAME"
echo -e "  停止应用: pm2 stop $APP_NAME"
echo -e "  更新代码: cd $APP_DIR && ./update.sh"

echo -e "${GREEN}🎉 服务器部署成功！${NC}"