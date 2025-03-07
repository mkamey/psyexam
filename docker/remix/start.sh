#!/bin/bash

echo "アプリケーションの起動前に管理者アカウントを確認します..."
node fix-admin.js

echo "Remixアプリケーションを起動します..."
npm run dev
