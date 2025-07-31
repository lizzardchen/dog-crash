#!/bin/bash

# Dog Crash Game Server 启动脚本

echo "🐕 Dog Crash Game Server 启动脚本"
echo "=================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装。请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi

# 检查MongoDB是否运行
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB 未运行，尝试启动..."
    if command -v brew &> /dev/null; then
        brew services start mongodb-community
    else
        echo "❌ 请手动启动 MongoDB 服务"
        exit 1
    fi
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 启动服务器
echo "🚀 启动服务器..."
echo "🌍 服务器地址: http://localhost:3000"
echo "📊 健康检查: http://localhost:3000/health"
echo "🎮 API文档: http://localhost:3000/api"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev