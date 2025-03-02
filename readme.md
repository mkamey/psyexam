# 心理検査システム開発記録

## 概要
このプロジェクトは、心理検査を管理・実施するためのウェブアプリケーションです。医師が患者の心理検査を管理し、結果を閲覧できるシステムを提供します。

## 技術スタック
- フロントエンド: React, Remix, TailwindCSS
- バックエンド: Node.js, Remix
- データベース: MySQL
- ORM: Prisma
- コンテナ化: Docker, Docker Compose

## 開発環境のセットアップ
```bash
# リポジトリをクローン
git clone [リポジトリURL]

# プロジェクトディレクトリに移動
cd psyexam

# Dockerコンテナを起動
docker-compose up -d
```

## 主な機能
- ユーザー認証（ログイン/ログアウト）
- 患者情報の管理
- 心理検査の実施と結果の記録
- 検査結果の閲覧と分析

## 開発状況

### 2025/3/2 - ログイン問題の修正（第1回）
#### 問題点
1. ログイン時に「ユーザーが見つかりません: admin」というエラーが発生
2. Viteの解決エラー: "Failed to resolve "remix:manifest" from /usr/server/node_modules/.vite/deps/@remix-run_react.js"

#### 原因
1. Prismaのマイグレーション（`npx prisma db push --accept-data-loss`）によって初期データが上書きされていた可能性
2. Remix v2.16.0とVite 6.0.0の組み合わせで発生する既知の問題

#### 修正内容
1. `docker-entrypoint.sh`を修正
   - ユーザーテーブルの確認方法を改善
   - ユーザーが存在しない場合に確実に管理者ユーザーを作成するよう修正

2. `vite.config.ts`を修正
   - マニフェスト解決の問題を修正するための設定を追加
   - ビルド設定の最適化
   - 開発サーバーの設定を追加

3. `session.server.ts`にデバッグログを追加
   - データベース接続の状態確認
   - 全ユーザーリストの取得と確認

### 2025/3/2 - ログイン問題の修正（第2回）
#### 問題点
デバッグログから、データベースにユーザーが全く存在していないことが判明：
```
[login] データベース接続成功。ユーザー総数: 0
[login] ユーザー検索クエリ実行: username=admin
[login] ユーザーが見つかりません: admin
[login] 現在のユーザー一覧: []
```

#### 原因
docker-entrypoint.shでの管理者ユーザー作成処理が正しく実行されていない。SQLコマンドでのユーザー作成が失敗している可能性がある。

#### 修正内容
1. Prismaシードスクリプト（`prisma/seed.js`）を作成
   - Prisma APIを使用して直接ユーザーを作成するスクリプトを実装
   - 既存のユーザーを確認し、管理者ユーザーが存在しない場合のみ作成

2. package.jsonにシードコマンドを追加
   ```json
   "scripts": {
     "seed": "node prisma/seed.js",
     "db:reset": "npx prisma db push --force-reset && npm run seed"
   }
   ```

3. docker-entrypoint.shを修正
   - Prismaのマイグレーション後に確実にシードスクリプトを実行するよう変更
   - シードスクリプトが失敗した場合のバックアップとして手動でのユーザー作成も試みる
   - 詳細なデバッグ情報を出力するよう改善

## 次のステップ
1. ログイン機能の動作確認
2. 患者情報管理機能の実装
3. 心理検査実施機能の実装
4. 結果閲覧・分析機能の実装

## トラブルシューティング
### ログインできない場合
1. コンテナログを確認
   ```bash
   docker-compose logs remix
   ```

2. データベースの状態を確認
   ```bash
   # MySQLコンテナに接続
   docker-compose exec db mysql -u root -pp0ssw0rd
   
   # データベースを選択
   USE psyexam;
   
   # ユーザーテーブルを確認
   SELECT * FROM users;
   ```

3. 必要に応じて管理者ユーザーを手動で作成
   ```sql
   INSERT INTO users (username, email, full_name, password, role, is_approved) 
   VALUES ('admin', 'admin@example.com', '管理者', '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', 'admin', true);
   ```
   注: パスワードは「admin123」のハッシュ値です。

### Viteのエラーが発生する場合
1. node_modulesを削除して再インストール
   ```bash
   docker-compose exec remix rm -rf node_modules
   docker-compose exec remix npm install
   ```

2. Remixのキャッシュをクリア
   ```bash
   docker-compose exec remix npm run clean
   ```

## コミット手順
```bash
git add .
git commit -m "Fix login issues and Vite configuration"
git push origin main
