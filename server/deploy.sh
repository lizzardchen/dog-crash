#!/bin/bash

# Dog Crash Server 部署脚本
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
APP_DIR="/opt/$APP_NAME"
USER="root"
PORT="3000"
NODE_VERSION="18"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户执行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}1. 更新系统包...${NC}"
yum update -y

echo -e "${YELLOW}2. 安装必要的系统依赖...${NC}"
yum install -y curl git wget

# 安装 Node.js
echo -e "${YELLOW}3. 安装 Node.js $NODE_VERSION...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
yum install -y nodejs

# 验证安装
node_version=$(node --version)
npm_version=$(npm --version)
echo -e "${GREEN}Node.js 版本: $node_version${NC}"
echo -e "${GREEN}NPM 版本: $npm_version${NC}"

# 安装 PM2
echo -e "${YELLOW}4. 安装 PM2 进程管理器...${NC}"
npm install -g pm2

# 创建应用目录
echo -e "${YELLOW}5. 创建应用目录...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# 如果是首次部署，需要手动上传代码
if [ ! -f "package.json" ]; then
    echo -e "${RED}请先将服务器代码上传到 $APP_DIR${NC}"
    echo -e "${YELLOW}上传方法:${NC}"
    echo -e "  1. 使用 scp: scp -r ./server/* root@your-server:$APP_DIR/"
    echo -e "  2. 使用 rsync: rsync -avz ./server/ root@your-server:$APP_DIR/"
    echo -e "  3. 使用 Git: git clone <your-repo> $APP_DIR"
    exit 1
fi

# 安装项目依赖
echo -e "${YELLOW}6. 安装项目依赖...${NC}"
npm install --production

# 创建 .env 文件
echo -e "${YELLOW}7. 创建环境配置文件...${NC}"
cat > .env << EOF
# 生产环境配置
NODE_ENV=production
PORT=$PORT

# MongoDB 配置 (使用现有的远程数据库)
MONGODB_URI=mongodb://dogcrash:5hRPJyResaF75MPh@124.223.21.118:27017/dogcrash

# CORS 配置 (根据你的客户端域名修改)
ALLOWED_ORIGINS=http://your-client-domain.com,https://your-client-domain.com

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

echo -e "${YELLOW}8. 配置防火墙...${NC}"
# 开放端口
firewall-cmd --permanent --add-port=$PORT/tcp
firewall-cmd --reload

echo -e "${YELLOW}9. 创建 PM2 配置文件...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=400'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

echo -e "${YELLOW}10. 启动应用...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${YELLOW}11. 配置 Nginx 反向代理...${NC}"
yum install -y nginx

# 创建 Nginx 配置
cat > /etc/nginx/conf.d/$APP_NAME.conf << EOF
server {
    listen 80;
    server_name your-domain.com;  # 修改为你的域名
    
    # 客户端最大请求体大小
    client_max_body_size 10M;
    
    # 反向代理到 Node.js 应用
    location /api {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:$PORT/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # 静态文件服务（如果需要）
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 启动 Nginx
systemctl enable nginx
systemctl start nginx

echo -e "${YELLOW}12. 创建系统服务监控脚本...${NC}"
cat > /usr/local/bin/dogcrash-monitor.sh << 'EOF'
#!/bin/bash
# Dog Crash Server 监控脚本

APP_NAME="dog-crash-server"
LOG_FILE="/var/log/dogcrash-monitor.log"

# 检查 PM2 进程
check_pm2() {
    if ! pm2 list | grep -q "$APP_NAME.*online"; then
        echo "[$(date)] PM2 进程异常，尝试重启..." >> $LOG_FILE
        pm2 restart $APP_NAME
    fi
}

# 检查端口监听
check_port() {
    if ! netstat -tlnp | grep -q ":3000.*LISTEN"; then
        echo "[$(date)] 端口3000未监听，尝试重启应用..." >> $LOG_FILE
        pm2 restart $APP_NAME
    fi
}

# 检查健康状态
check_health() {
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "[$(date)] 健康检查失败，尝试重启应用..." >> $LOG_FILE
        pm2 restart $APP_NAME
    fi
}

# 执行检查
check_pm2
check_port
check_health

echo "[$(date)] 监控检查完成" >> $LOG_FILE
EOF

chmod +x /usr/local/bin/dogcrash-monitor.sh

# 添加到 crontab
echo "*/5 * * * * /usr/local/bin/dogcrash-monitor.sh" | crontab -

echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${YELLOW}📝 部署信息:${NC}"
echo -e "  应用目录: $APP_DIR"
echo -e "  运行端口: $PORT"
echo -e "  进程管理: PM2"
echo -e "  反向代理: Nginx (端口80)"
echo -e "  日志位置: $APP_DIR/logs/"
echo -e "  监控脚本: 每5分钟自动检查"

echo -e "${YELLOW}🔧 常用命令:${NC}"
echo -e "  查看应用状态: pm2 status"
echo -e "  查看应用日志: pm2 logs $APP_NAME"
echo -e "  重启应用: pm2 restart $APP_NAME"
echo -e "  停止应用: pm2 stop $APP_NAME"
echo -e "  查看监控日志: tail -f /var/log/dogcrash-monitor.log"

echo -e "${YELLOW}⚠️  请注意:${NC}"
echo -e "  1. 修改 /etc/nginx/conf.d/$APP_NAME.conf 中的域名"
echo -e "  2. 修改 $APP_DIR/.env 中的 ALLOWED_ORIGINS"
echo -e "  3. 确保防火墙开放了80和$PORT端口"
echo -e "  4. 定期备份数据库和应用代码"

echo -e "${GREEN}🎉 服务器部署成功！${NC}"