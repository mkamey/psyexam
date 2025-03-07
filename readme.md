# 心理検査システム開発記録

## 概要
このプロジェクトは、心理検査を管理・実施するためのウェブアプリケーションです。医師が患者の心理検査を管理し、結果を閲覧できるシステムを提供します。また、心理検査の解析機能を備えたバックエンドも実装しています。

## 技術スタック
- フロントエンド: React, Remix, TailwindCSS
- バックエンド:
  - Node.js, Remix (フロントエンド)
  - FastAPI (心理検査解析機能)
- データベース: MySQL
- ORM:
  - Prisma (Remix)
  - SQLAlchemy (FastAPI)
- コンテナ化: Docker, Docker Compose

## 開発環境のセットアップ
```bash
# リポジトリをクローン
git clone [repository-url]

# プロジェクトディレクトリに移動
cd psyexam

# 環境変数ファイルを作成
cp docker/remix/.env.example docker/remix/.env.development
cp fastapi/.env.example fastapi/.env.development

# 開発環境を設定
bash set-executable.sh
./switch-env.sh development

# Dockerコンテナを起動
docker-compose up -d
```

## 環境切り替え
このプロジェクトでは開発環境と本番環境を簡単に切り替えることができます。

```bash
# 開発環境（192.168.10.41:8180）に切り替え
./switch-env.sh development

# 本番環境（psytest.hokurikuwhisky.club）に切り替え
./switch-env.sh production

# 変更を反映するために再起動
docker-compose down
docker-compose up -d
```

詳細は以下のドキュメントを参照してください:
- `ENV_SWITCHING.md` - 環境切り替えの詳細な手順
- `CLOUDFLARE_TUNNEL.md` - Cloudflare Tunnelを使った本番環境のデプロイ方法

## 主な機能
- ユーザー認証(ログイン/ログアウト)
- 患者情報の管理
- 心理検査の実施と結果の記録
- 検査結果の閲覧と分析

## 開発状況

### 2025/3/7 - 環境切り替え機能の実装
- 開発環境と本番環境を簡単に切り替える機能を追加
- 環境ごとの設定ファイルの分離
- Cloudflare Tunnel対応のための設定

### 2025/3/7 - Nginxリバースプロキシによる統合の実装
- Nginxコンテナを追加し、フロントエンドとバックエンドのリクエストを統合
- CORS問題を解決するための設定を適用
- 同一オリジンからのリクエストを実現

### 2025/3/6 - 検査セットからの検査項目追加機能の改善
- 検査セットから検査項目を追加するときのバリデーション条件を改善
- デバッグ支援機能を追加
- UI/UXの改善

### 2025/3/5 - 心理検査セット機能の実装
- 複数の検査をセットとしてグループ化する機能の実装
- 「抑うつ経過」などの検査セットを一括で患者に割り当て可能に
- 検査セットの作成・編集・削除機能の提供

### 2025/3/4 - 検査結果のグラフ表示機能強化
- 総合スコアをドーナツグラフで表示する機能を追加
- 時系列データのグラフ表示条件を改善
- 領域別分析にプログレスバーとカラーコードを追加
