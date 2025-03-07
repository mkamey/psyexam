#!/bin/bash

# 使用方法: ./switch-env.sh [development|production]

ENV=${1:-development}  # デフォルトはdevelopment

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
  echo "エラー: 環境は 'development' または 'production' を指定してください"
  exit 1
fi

# 環境変数ファイルのコピー
echo "環境を $ENV に切り替えています..."
cp ./docker/remix/.env.$ENV ./docker/remix/.env
cp ./fastapi/.env.$ENV ./fastapi/.env

echo "RemixとFastAPIの環境変数を $ENV 環境用に設定しました"

# Nginxの設定を更新
if [ "$ENV" = "development" ]; then
  # 開発環境用のNginx設定
  cat > ./nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name 192.168.10.41;

    # フロントエンド（Remix）へのリクエスト
    location / {
        proxy_pass http://remix:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # バックエンド（FastAPI）へのリクエスト
    location /api/ {
        proxy_pass http://fastapi:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  echo "Nginxの設定を開発環境用に更新しました"
else
  # 本番環境用のNginx設定
  cat > ./nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name psytest.hokurikuwhisky.club;

    # フロントエンド（Remix）へのリクエスト
    location / {
        proxy_pass http://remix:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # バックエンド（FastAPI）へのリクエスト
    location /api/ {
        proxy_pass http://fastapi:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  echo "Nginxの設定を本番環境用に更新しました"
fi

# 現在の環境を記録
echo "$ENV" > ./.current_env

echo "環境設定が完了しました。変更を反映するには docker-compose を再起動してください:"
echo "docker-compose down && docker-compose up -d"
