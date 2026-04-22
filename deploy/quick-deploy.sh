#!/bin/bash

# 快速部署脚本 - 使用expect处理交互式密码输入
# 使用方法: ./quick-deploy.sh

set -e

REMOTE_HOST="192.168.3.74"
REMOTE_USER="tonakai"
REMOTE_PASS="Cc197830"
REMOTE_DIR="/home/tonakai/homework-system"
LOCAL_DIR="/workspace/projects/homework-system"

echo "=========================================="
echo "   创新小学作业管理系统 - 快速部署"
echo "=========================================="
echo ""

# 方式1: 尝试使用sshpass
deploy_with_sshpass() {
    echo "[1/6] 检查并安装依赖..."
    apt-get update -qq && apt-get install -y -qq sshpass rsync expect 2>/dev/null || true

    echo "[2/6] 测试SSH连接..."
    if ! sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $REMOTE_USER@$REMOTE_HOST "echo '连接成功'" 2>/dev/null; then
        echo "错误: 无法连接到 $REMOTE_HOST"
        echo "请检查:"
        echo "  1. 服务器是否可达"
        echo "  2. 用户名密码是否正确"
        echo "  3. SSH服务是否运行"
        return 1
    fi
    echo "SSH连接成功"

    echo "[3/6] 创建远程目录..."
    sshpass -p "$REMOTE_PASS" ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR/{backend,frontend,logs}"

    echo "[4/6] 同步代码文件..."
    # 后端
    sshpass -p "$REMOTE_PASS" rsync -avz --exclude 'node_modules' --exclude 'database/*.db*' --exclude '.env' \
        $LOCAL_DIR/backend/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/ 2>/dev/null

    # 前端
    sshpass -p "$REMOTE_PASS" rsync -avz --exclude 'node_modules' --exclude 'dist' \
        $LOCAL_DIR/frontend/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/frontend/ 2>/dev/null

    echo "[5/6] 在远程服务器安装依赖和构建..."

    sshpass -p "$REMOTE_PASS" ssh $REMOTE_USER@$REMOTE_HOST << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd ~/homework-system

echo "  - 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "  - 安装Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
fi
echo "    Node版本: $(node -v)"

echo "  - 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "  - 安装PM2..."
    sudo npm install -g pm2 2>/dev/null
fi

echo "  - 检查Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "  - 安装Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y nginx 2>/dev/null
fi

echo "  - 安装后端依赖..."
cd ~/homework-system/backend
npm install --production 2>/dev/null

echo "  - 初始化数据库..."
node src/scripts/initDatabase.js 2>/dev/null || echo "数据库已存在"

echo "  - 安装前端依赖..."
cd ~/homework-system/frontend
npm install 2>/dev/null

echo "  - 构建前端..."
npm run build 2>/dev/null

echo "  - 创建环境配置..."
if [ ! -f ~/homework-system/backend/.env ]; then
    cat > ~/homework-system/backend/.env << 'ENVFILE'
PORT=3000
NODE_ENV=production
JWT_SECRET=homework-system-prod-secret-2026
JWT_EXPIRES_IN=24h
JWT_REMEMBER_EXPIRES_IN=7d
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_TIME=15
AI_PROVIDER=deepseek
AI_API_KEY=
AI_MODEL=deepseek-chat
AI_TEMPERATURE=0.3
AI_TIMEOUT=30000
AI_MAX_RETRIES=3
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=uploads
DATABASE_PATH=database/homework.db
ENVFILE
fi

echo "  - 配置PM2..."
cd ~/homework-system/backend
cat > ecosystem.config.js << 'PM2CONFIG'
module.exports = {
  apps: [{
    name: 'homework-backend',
    script: 'src/app.js',
    cwd: '/home/tonakai/homework-system/backend',
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: '/home/tonakai/homework-system/logs/error.log',
    out_file: '/home/tonakai/homework-system/logs/out.log'
  }]
};
PM2CONFIG

pm2 stop homework-backend 2>/dev/null || true
pm2 delete homework-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "  - 配置Nginx..."
sudo tee /etc/nginx/sites-available/homework > /dev/null << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    location / {
        root /home/tonakai/homework-system/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3000;
    }
}
NGINXCONF

sudo ln -sf /etc/nginx/sites-available/homework /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo nginx -s reload

echo "部署完成!"
REMOTE_SCRIPT

    echo "[6/6] 部署完成!"
    echo ""
    echo "=========================================="
    echo "  系统已部署到: http://$REMOTE_HOST"
    echo "=========================================="
    echo ""
    echo "测试账户:"
    echo "  管理员: admin / Admin@123456"
    echo "  教师:   T2026001 / 123456"
    echo "  学生:   202601001 / 123456"
    echo ""
    echo "管理命令:"
    echo "  查看状态: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 status'"
    echo "  查看日志: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 logs homework-backend'"
    echo "  重启服务: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 restart homework-backend'"
    echo ""
    echo "提示: 请配置AI_API_KEY以启用AI批改功能"
}

# 执行部署
deploy_with_sshpass
