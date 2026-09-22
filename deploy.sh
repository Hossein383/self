#!/usr/bin/env bash

# ==============================================================================
# Telegram Control Center — Interactive Production Docker Deployment Script
# ==============================================================================

set -e

echo "====================================================================="
echo "   🚀 Telegram Enterprise Control Center — Production Docker Installer"
echo "====================================================================="
echo ""

# 1. Ask for Port Configuration
read -p "📌 پورت انتشار سرور را وارد کنید [پیش‌فرض: 3000]: " USER_PORT
USER_PORT=${USER_PORT:-3000}

# 2. Ask for Panel Master Password
read -s -p "🔑 رمز عبور ورود به پنل مدیریت را وارد کنید [پیش‌فرض: admin123]: " USER_PASSWORD
echo ""
USER_PASSWORD=${USER_PASSWORD:-admin123}

# Confirm Password
read -s -p "🔑 تکرار رمز عبور ورود به پنل: " USER_PASSWORD_CONFIRM
echo ""

if [ "$USER_PASSWORD" != "$USER_PASSWORD_CONFIRM" ]; then
  echo "❌ خطای عدم تطابق: رمزهای عبور وارد شده یکسان نیستند!"
  exit 1
fi

echo ""
echo "⚙️ در حال تنظیم فایل کانفیگ محیطی .env ..."
cat <<EOF > .env
PORT=${USER_PORT}
PANEL_PASSWORD=${USER_PASSWORD}
TELEGRAM_API_ID=2040
TELEGRAM_API_HASH=b18441a1ff607e10a989891a5462e627
NODE_ENV=production
EOF

echo "✅ تنظیمات با موفقیت ذخیره شد."
echo ""
echo "🐳 در حال ساخت ایمیج داکر و راه‌اندازی کانتینر در پورت ${USER_PORT} ..."

if command -v docker-compose &> /dev/null; then
    docker-compose down || true
    docker-compose up -d --build
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose down || true
    docker compose up -d --build
else
    echo "⚠️ داکر کامپوز یافت نشد. در حال اجرا با دستور مستقیم docker run ..."
    docker build -t telegram-control-center .
    docker stop telegram_control_center || true
    docker rm telegram_control_center || true
    docker run -d \
      --name telegram_control_center \
      --restart unless-stopped \
      -p ${USER_PORT}:3000 \
      -e PANEL_PASSWORD="${USER_PASSWORD}" \
      -e NODE_ENV=production \
      telegram-control-center
fi

echo ""
echo "====================================================================="
echo "🎉 دیپلوی سیستم با موفقیت کامل انجام شد!"
echo "🌐 آدرس دسترسی به پنل: http://<SERVER_IP>:${USER_PORT}"
echo "🔑 رمز عبور ورود به پنل: (رمز عبوری که وارد نمودید)"
echo "====================================================================="
