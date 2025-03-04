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
git clone [リポジトリURL]

# プロジェクトディレクトリに移動
cd psyexam

# Dockerコンテナを起動
docker-compose up -d
```

## 主な機能
- ユーザー認証(ログイン/ログアウト)
- 患者情報の管理
- 心理検査の実施と結果の記録
- 検査結果の閲覧と分析

## 開発状況

### 2025/3/3 - ダークモード機能の改善とバグ修正
#### 改善内容
1. TailwindCSS設定の最適化
   - content パターンを修正し、全コンポーネントのスタイルを適切に処理
   - variants の拡張によるダークモードの柔軟な適用
   - カスタムカラーの追加によるテーマの一貫性確保

2. DarkModeContext の機能強化
   - isLoaded フラグの導入によるローカルストレージの初期化制御
   - エラーハンドリングの改善
   - デバッグログの追加

3. Layout コンポーネントの改善
   - useEffect を使用した HTML 要素への dark クラスの適切な適用
   - トランジション効果の追加による視覚的な滑らかさの向上

4. 各ページコンポーネントのダークモードスタイル統一
   - フォーム要素のスタイル統一
   - テーブルとカードのダークモード対応
   - ボタンとインタラクティブ要素のコントラスト改善

#### 修正理由
- ダークモード切り替えが正しく機能しない問題の解決
- コンポーネント間でのスタイルの一貫性確保
- ユーザーエクスペリエンスの向上

#### 技術的な詳細
1. Tailwind設定の変更
   ```typescript
   // tailwind.config.ts
   darkMode: 'class',
   content: [
     "./app/**/*.{js,jsx,ts,tsx}",
     "./app/components/**/*.{js,jsx,ts,tsx}",
     "./app/routes/**/*.{js,jsx,ts,tsx}",
   ],
   ```

2. HTML要素へのダークモードクラス適用
   ```typescript
   useEffect(() => {
     document.documentElement.classList.toggle('dark', isDarkMode);
   }, [isDarkMode]);
   ```

### 2025/3/3 - ダークモードとライトモードの切り替え機能の実装
#### 改善内容
1. TailwindCSS設定の更新
   - `darkMode: 'class'`設定を追加し、HTMLのclass属性に基づいてダークモードが適用されるようにしました

2. ダークモードコンテキストの作成
   ```typescript
   // DarkModeContext.tsx
   // ダークモード状態を管理するためのコンテキスト
   // - ローカルストレージにユーザーの設定を保存
   // - システム設定(prefers-color-scheme)に基づく初期設定
   ```

3. ダークモード切り替えボタンの作成
   ```typescript
   // DarkModeToggle.tsx
   // - ダークモード/ライトモードを切り替えるボタンコンポーネント
   // - モードに適したアイコン表示
   ```

4. クライアントサイドのダークモード初期化
   ```typescript
   // entry.client.tsx
   // DarkModeProviderでRemixBrowserをラップ
   ```

5. アプリケーション全体へのダークモード適用
   ```typescript
   // root.tsx
   // - ヘッダーにダークモード切り替えボタンを配置
   // - ClientOnlyコンポーネントでHydrationエラーを防止
   // - モードに応じたロゴ表示
   ```

6. 各ページのダークモードスタイル適用
   ```tsx
   // _index.tsx, login.tsx などのページコンポーネント
   // - dark:クラス修飾子を使用したスタイル定義
   // - テキスト、背景色、ボーダーなどのスタイル対応
   ```

#### 改善理由
- ユーザーが自分の視覚的な好みに合わせてアプリケーションの外観を変更できるようにする
- 暗い環境での使用や長時間の使用における目の疲労を軽減
- システムのアクセシビリティとユーザー体験の向上

### 2025/3/3 - JSONファイルアップロード機能の追加

#### 改善内容
1. 認証済みユーザー専用のJSONファイルアップロード機能を実装
   - マルチパートフォームデータのハンドリング
   - ファイル形式の検証(JSONのみ許可)
   - JSON構文の検証
   - ファイルの安全な保存

2. アップロードUIの実装
   - ファイル選択インターフェース
   - アップロード状態の表示
   - エラーハンドリングとユーザーフィードバック

#### 技術的な詳細
1. ファイルアップロードハンドラーの実装
   ```typescript
   const uploadHandler: UploadHandler = async ({ name, contentType, data, filename }) => {
     // JSONファイルの検証
     // ファイルの読み込みと保存
     // エラーハンドリング
   };
   ```

2. セキュリティ対策
   - 承認済みユーザーのみアクセス可能
   - ファイル形式の厳格な検証
   - 適切なエラーハンドリング

#### 改善理由
- 検査用JSONファイルの管理を効率化
- セキュアなファイルアップロードの実現
- ユーザビリティの向上

### 2025/3/3 - Git設定の最適化
#### 改善内容
1. .gitignoreファイルを拡充
```gitignore
# 依存関係ディレクトリ
**/node_modules/
**/.cache/
**/build/

# ローカル設定ファイル
.env
*.env.local
.env.development.local
.env.test.local
.env.production.local

# システムファイル
.DS_Store
Thumbs.db

# ログファイル
*.log
logs/

# デバッグファイル
*.pid
*.seed

# エディタ/IDE
.vscode/
.idea/

# テスト関連
coverage/
.nyc_output/

# Docker関連
docker/db/data/

# データベースマイグレーション
docker/remix/prisma/migrations/

# ビルド成果物
dist/
out/
*.tsbuildinfo

# パッケージ管理
*.tgz
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# その他
*.swp
*.swo
```

#### 改善理由
- バージョン管理対象外のファイルを明確化
- 開発環境固有のファイルがコミットされないよう保護
- ビルド生成物の除外によるリポジトリサイズ最適化

### 2025/3/2 - ログイン問題の修正(第1回)


### 2025/3/4 - 心理検査解析バックエンドの実装
#### バックエンド実装
1. FastAPIを使用したバックエンド構築
   - 検査結果解析のための専用APIサーバー
   - RESTful APIエンドポイント実装

2. 心理検査解析機能の実装
   - 検査ごとに専用のPythonモジュールを用意(例: phq-9.py)
   - モジュール内に検査名と同名の関数を実装(例: phq-9関数)
   - 様々な複雑さに対応できる柔軟な設計

3. MySQLデータベース連携
   - SQLAlchemyによるORM実装
   - 解析前データと解析後データの両方を保存
   - データモデルの設計

4. フロントエンドとの連携
   - 医師の患者ページに解析ボタンを追加
   - API呼び出しによる非同期解析処理
   - 解析結果の表示機能

5. システム全体の連携
   - Dockerによるサービスの追加
   - ネットワーク設定によるサービス間通信
   - 適切なエラーハンドリングとログ記録

#### 実装内容の詳細

1. FastAPIバックエンドの実装
   - SQLAlchemyを用いたMySQLデータベースとの連携
   - 検査データの解析機能の実装(PHQ-9、SDSモジュール)
   - 検査結果の解析と保存用のAPIエンドポイント
   - CORSミドルウェアによるフロントエンド連携対応
   - エラーハンドリングと適切なレスポンス処理

2. 解析モジュールの作成
   - PHQ-9解析モジュール
     - スコア集計と重症度評価
     - 領域別(気分/感情、身体症状、認知、自己評価、自殺念慮)の詳細分析
   - SDS解析モジュール
     - スコア集計と指標計算
     - 逆転項目の処理ロジック
     - 領域別(感情的症状、生理的症状、心理的症状)の分析

3. フロントエンド連携機能
   - 患者詳細ページに解析ボタン追加
   - Axiosを利用したFastAPIとの非同期通信
   - 解析結果の視覚的表示
   - 解析中状態の管理と適切なUI表示

4. Docker環境の拡張
   - FastAPIコンテナの追加
   - データベースとネットワークの共有設定
   - 環境変数によるサービス間連携

#### プロジェクト構造
```
fastapi/
├── app/
│   ├── main.py         # FastAPIアプリケーションのエントリーポイント
│   ├── database.py     # データベース接続設定
│   ├── models.py       # SQLAlchemyモデル定義
│   ├── schemas.py      # Pydanticモデル(リクエスト/レスポンススキーマ)
│   ├── routers/        # APIルーター
│   │   └── analysis.py # 解析関連エンドポイント
│   └── analyzers/      # 検査ごとの解析モジュール
│       ├── __init__.py # 動的解析モジュール読み込み
│       ├── phq_9.py    # PHQ-9解析モジュール
│       └── sds.py      # SDS解析モジュール
├── Dockerfile          # FastAPIのDockerfile
└── requirements.txt    # 依存パッケージ
```

## 次のステップ
1. 複数の検査タイプに対応する解析モジュールの追加
2. 解析結果の履歴表示機能
3. 検査結果のグラフ表示機能追加
4. 認証機能の多要素認証対応
5. 患者情報のCSVインポート機能実装
6. ロールベースアクセス制御の強化

## コミット手順
```bash
git add .
git commit -m "心理検査解析バックエンドの実装とフロントエンド連携"
git push origin main
