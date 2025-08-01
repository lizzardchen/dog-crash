module.exports = {
  apps: [{
    name: 'dog-crash-server',
    script: 'app.js',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 日志配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 内存和重启配置
    max_memory_restart: '500M',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Node.js 参数
    node_args: '--max-old-space-size=400',
    
    // 监控配置
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // 自动重启条件
    autorestart: true,
    
    // 合并日志
    merge_logs: true
  }],

  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/dog-crash-server.git',
      path: '/opt/dog-crash-server',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};