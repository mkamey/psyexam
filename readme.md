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

### 2025/3/6 - 検査セットからの検査項目追加機能の改善

#### 改善内容
1. doctor.$patientId.tsx内の条件式を修正
   - 検査セットから検査項目を追加するときのバリデーション条件を改善
   - アクションタイプごとに必要なパラメータを明示的に指定する方式に変更

2. デバッグ支援機能を追加
   - アクション実行時のパラメータ詳細をコンソールログに出力
   - エラー発生時の診断情報を強化

3. UI/UXの改善
   - 検査セット追加時に画面リロードなしで即時表示される機能を実装
   - クライアント側の状態管理で即座に検査リストを更新するロジックを追加

#### 修正理由
- 検査セットから検査項目を追加しようとするとエラーが発生していた
- 元の条件式が複雑で、`addFromExamSet`アクションの処理で誤判定が発生していた
- 検査セットを追加した後に画面をリロードしないと変更が表示されなかった
- ユーザー体験を向上させるため、アクションの即時反映が必要だった

#### 技術的な詳細
1. 条件式の修正
```typescript
// 修正前: 複雑で理解しにくい条件式
if (!patientId || ((!examId && actionType !== "analyze" && actionType !== "addFromExamSet"))) {
  return json({ error: "Invalid data" }, { status: 400 });
}

// 修正後: アクションタイプごとに必要なパラメータを明示的に指定
if (!patientId || (
  (actionType === "add" && !examId) ||
  (actionType === "delete" && !examId) ||
  (actionType === "analyze" && !resultId) ||
  (actionType === "addFromExamSet" && !examSetId)
)) {
  console.log("エラー: 無効なデータ", { patientId, examId, actionType, resultId, examSetId });
  return json({ error: "Invalid data" }, { status: 400 });
}
```

2. クライアント側での即時更新機能
```typescript
// 検査セット追加時に即座に画面更新
onClick={() => {
  if (selectedExamSetId) {
    // 選択した検査セットの内容を取得
    const selectedSet = examSets.find(set => set.id === selectedExamSetId);
    if (selectedSet) {
      // サーバーに送信
      fetcher.submit(
        {
          patientId: patientId.toString(),
          examSetId: selectedExamSetId.toString(),
          actionType: "addFromExamSet"
        },
        { method: "POST" }
      );
      
      // 既存の検査IDを抽出
      const existingExamIds = localStackedExams.map(exam => exam.examId);
      
      // クライアント側でも検査リストを更新(重複を避ける)
      selectedSet.examSetItems.forEach(item => {
        // 重複しない検査だけを追加
        if (!existingExamIds.includes(item.examId)) {
          // 追加する検査を予定リストに追加
          setLocalStackedExams(prev => [...prev, {
            id: 0,
            patientId,
            examId: item.examId,
            exam: item.exam
          }]);
          
          // 利用可能な検査リストから削除
          setLocalAvailableExams(prev =>
            prev.filter(exam => exam.id !== item.examId)
          );
        }
      });
    }
  }
}}
```

#### 注意点
- TypeScriptの型エラー (`examSet`と`examSetItem`が`PrismaClient`に存在しない) は表示されるが、実際の動作には影響しない
- 必要に応じて `npx prisma generate` を実行することで型定義を更新可能


### 2025/3/5 - メニューバーロゴのリンク先改善

#### 改善内容
1. ヘッダーロゴのクリック時の遷移先を画面タイプによって変更
   - 患者画面: トップページ (`http://localhost:3010`) に遷移
   - 管理画面: 医師用ダッシュボード (`http://localhost:3010/index_doctor`) に遷移

2. Remixの`Link`コンポーネントを使用し、クライアントサイドルーティングを適用
   - ページ全体のリロードを避け、スムーズな遷移を実現
   - 現在のURL情報を使用して適切なリンク先を動的に決定

#### 修正理由
- ユーザー体験の向上：ヘッダーロゴからユーザーの現在のロールに適したページへ移動できるようにする
- ナビゲーション効率の改善：患者と医師それぞれに最適な画面遷移を提供

#### 技術的な詳細
```tsx
// URLパスに基づいてリンク先を決定
// /doctorまたは/index_doctorで始まるパスは管理画面と判断
const isDoctor = location.pathname.startsWith('/doctor') || location.pathname.startsWith('/index_doctor');
const linkDestination = isDoctor ? "/index_doctor" : "/";

console.log(`現在のパス: ${location.pathname}, リンク先: ${linkDestination}`);

// Remixの<Link>コンポーネントを使用したロゴのリンク実装
<Link to={linkDestination} className="cursor-pointer">
  <img
    className="h-10 w-auto hidden dark:block"
    src="/logo-dark.png"
    alt="ロゴ (ダークモード)"
  />
  <img
    className="h-10 w-auto block dark:hidden"
    src="/logo-light.png"
    alt="ロゴ (ライトモード)"
  />
</Link>
```


### 2025/3/5 - 管理者アカウントの再作成

#### 改善内容
1. データベース再構築後に削除された管理者アカウントを再作成
   - create-admin.sqlスクリプトによる管理者ユーザーの作成
   - update-password.jsによるパスワードハッシュの生成
   - update-admin.sqlによるパスワード更新

2. 認証関連の問題解決
   - パスワードハッシュのフォーマット違い(`$2a$`と`$2b$`)の修正
   - bcryptjsのバージョンによる互換性問題の解決

#### 修正理由
- データベース再構築によって管理者アカウントが削除された
- システムへのログインができなくなり、管理機能にアクセスできない状態だった
- セキュアなパスワード管理を維持しながら管理者アカウントを復旧する必要があった

#### 技術的な詳細
1. 管理者アカウント作成用のSQLスクリプト
```sql
-- adminユーザーが存在しない場合は作成
INSERT INTO users (username, email, full_name, password, role, is_approved, created_at, updated_at)
SELECT 'admin', 'admin@example.com', '管理者', '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', 'admin', true, NOW(), NOW()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
```

2. 新しいパスワードハッシュの生成と適用
```javascript
// update-password.js
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`パスワード '${password}' のハッシュ:`, hash);
  
  // SQLコマンドを生成
  console.log('\nSQLコマンド:');
  console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
}

generateHash().catch(console.error);
```

3. 管理者アカウントの復旧手順
```bash
# 新しいハッシュを生成
node update-password.js

# 生成されたハッシュを使ってSQLを作成
echo "UPDATE users SET password = '生成されたハッシュ' WHERE username = 'admin';" > update-admin.sql

# MySQLコンテナでSQLを実行
docker exec -i mysql-container mysql -uroot -pp0ssw0rd psyexam < update-admin.sql
```

### 2025/3/5 - 心理検査セット機能の実装
#### 改善内容
1. 心理検査セット機能の追加
   - 複数の検査をセットとしてグループ化する機能の実装
   - 「抑うつ経過」などの検査セットを一括で患者に割り当て可能に
   - 検査セットの作成・編集・削除機能の提供

2. データモデルの拡張
   - ExamSet(検査セット)モデルの追加
   - ExamSetItem(検査セット項目)モデルの追加
   - 既存の検査機能との統合

3. UI/UX改善
   - 検査セット管理画面の実装
   - 医師の患者検査管理画面に検査セット選択機能を追加
   - 検査セットの内容を視覚的に表示

#### 修正理由
- 頻繁に一緒に使用される検査を効率的に選択できる仕組みが必要だった
- 医師の作業効率向上と操作ミスの低減
- 類似の検査パターンの標準化と再利用性の向上

#### 技術的な詳細
1. Prismaスキーマへの検査セットモデル追加
```prisma
model ExamSet {
  id          Int           @id @default(autoincrement())
  name        String        @unique @db.VarChar(255)
  description String?       @db.VarChar(1000)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  
  examSetItems ExamSetItem[]

  @@map("exam_sets")
}

model ExamSetItem {
  id        Int      @id @default(autoincrement())
  examSet   ExamSet  @relation(fields: [examSetId], references: [id], onDelete: Cascade)
  examSetId Int      @map("exam_set_id")
  exam      Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  examId    Int      @map("exam_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@unique([examSetId, examId])
  @@map("exam_set_items")
}
```

2. 患者検査管理画面での検査セット使用機能
```jsx
{/* 検査セットから追加 */}
<section className="mb-8 mt-8">
  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">検査セットから追加</h2>
  {examSets && examSets.length > 0 ? (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className="mb-4">
        <label htmlFor="examSetSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          検査セットを選択
        </label>
        <div className="flex gap-4 items-end">
          <select
            id="examSetSelect"
            value={selectedExamSetId || ""}
            onChange={(e) => setSelectedExamSetId(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-grow">
            <option value="">-- 検査セットを選択 --</option>
            {examSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.examSetItems.length}件の検査)
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedExamSetId) {
                fetcher.submit(
                  {
                    patientId: patientId.toString(),
                    examSetId: selectedExamSetId.toString(),
                    actionType: "addFromExamSet"
                  },
                  { method: "POST" }
                );
                setSelectedExamSetId(null);
              }
            }}
            disabled={!selectedExamSetId}
            className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded">
            検査セットを追加
          </button>
        </div>
      </div>
    </div>
  ) : (
    <p className="text-gray-500">検査セットがありません</p>
  )}
</section>
```

### 2025/3/4 - 検査結果のグラフ表示機能強化
#### 改善内容
1. 結果表示の視覚化を強化
   - 総合スコアをドーナツグラフで表示する機能を追加
   - 時系列データのグラフ表示条件を改善（1件のデータでも表示可能に）
   - 領域別分析にプログレスバーとカラーコードを追加

2. UI/UX改善
   - ドーナツグラフのサイズを拡大し視認性を向上
   - 重症度別のカラーコードを設定し、直感的な理解を促進
   - 領域別分析のデザインを洗練し、情報の階層を明確化

#### 修正理由
- 数値だけでは理解しにくいスコア情報の視覚化
- 経時的な症状の変化を一目で把握できる機能の提供
- ユーザーエクスペリエンスとデータの可読性の向上

#### 技術的な詳細
1. ドーナツグラフコンポーネントの強化
```jsx
<div className="w-48 h-48 relative flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
  <div className="absolute top-2 left-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
    総合スコア
  </div>
  <DonutChart
    score={analysisResults[result.id]!.total_score}
    maxScore={Object.values(analysisResults[result.id]!.details.domain_analysis).reduce(
      (sum, domain) => sum + domain.max_score, 0
    )}
    severity={analysisResults[result.id]!.severity}
  />
</div>
```

2. 時系列データ表示の拡張
```jsx
{/* 時系列データがある場合は時系列グラフを表示 - 1件のみでも表示 */}
{timeSeriesData[result.examId] && timeSeriesData[result.examId].length > 0 && (
  <div className="mt-6">
    <h4 className="font-semibold mb-2">時系列データ:</h4>
    <div className="h-64 w-full">
      <TimeSeriesChart
        data={timeSeriesData[result.examId]}
        examName={result.exam.examname}
        cutoff={result.exam.cutoff}
      />
    </div>
  </div>
)}
```

### 2025/3/4 - FastAPI解析結果のレスポンス処理修正
#### 改善内容
1. FastAPIのレスポンス処理を修正
    - `details`フィールドのJSON文字列を辞書型に変換する処理を追加
    - モデルに`details_dict`プロパティを追加
    - スキーマ設定の更新

2. ルーターの修正
    - レスポンス生成時に`details_dict`プロパティを使用するように変更
    - 既存の解析結果と新規解析結果の両方で一貫した処理を実装

#### 修正理由
- 解析結果のJSON形式エラーの解決
- `ResponseValidationError`の修正
- フロントエンドでの解析結果表示の正常化

#### 技術的な詳細
1. モデルの修正
```python
@property
def details_dict(self):
    """JSONテキストを辞書に変換して返す"""
    if self.details:
        try:
            return json.loads(self.details)
        except json.JSONDecodeError:
            return {}
    return {}
```

2. ルーターの修正
```python
# details_dictプロパティを使用するために一度辞書に変換してからモデルを作成
analysis_dict = {
    "id": existing_analysis.id,
    "result_id": existing_analysis.result_id,
    "patient_id": existing_analysis.patient_id,
    "exam_id": existing_analysis.exam_id,
    "total_score": existing_analysis.total_score,
    "details": existing_analysis.details_dict,  # JSON文字列を辞書に変換
    "interpretation": existing_analysis.interpretation,
    "severity": existing_analysis.severity,
    "created_at": existing_analysis.created_at,
    "updated_at": existing_analysis.updated_at
}
return schemas.AnalysisResultResponse(**analysis_dict)
```

### 2025/3/4 - FastAPI通信の問題を修正
#### 改善内容
1. FastAPIとRemix間の通信設定を修正
    - コンテナ間通信のポート設定を修正
    - `FASTAPI_URL`環境変数をコンテナ内部のポートに合わせて更新
    - フロントエンドのAPIエンドポイント設定を修正

2. Docker設定の最適化
    - `docker-compose.yml`のFastAPI URLを内部通信用に修正
    - FastAPIコンテナとRemixコンテナ間の通信を効率化

#### 修正理由
- コンテナ間通信エラーの解決
- ネットワークエラーの修正
- APIリクエストの信頼性向上

#### 技術的な詳細
1. docker-compose.ymlの更新
```yaml
environment:
  - FASTAPI_URL=http://fastapi:8000
```

2. フロントエンドのAPI URL設定
```typescript
const FASTAPI_URL = "http://localhost:8110";  // ブラウザからのアクセス用
```

### 2025/3/5 - CORSの問題解決とAPIリクエスト修正

#### 改善内容
1. FastAPIのCORS設定を修正
   - 重複していたFastAPIアプリケーションの初期化部分を統合
   - CORSミドルウェアの設定をより明示的に設定
   - `allow_origins`に正しくオリジンを設定

2. クライアント側のAPIリクエスト処理を改善
   - デバッグログを追加して問題を診断できるように修正
   - エラー処理の強化とより詳細なエラーメッセージの表示
   - コンテンツタイプヘッダーを明示的に設定

#### 修正理由
- ブラウザからのAPIリクエスト時にCORSエラーが発生する問題があった
- `Access-Control-Allow-Origin`ヘッダーが適切に設定されていなかった
- FastAPIアプリケーションの初期化が重複していたため、CORS設定が正しく適用されなかった

#### 技術的な詳細
1. FastAPIの初期化と設定の統合
```python
# 修正前(問題があった状態): 二重初期化
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定 - 1回目(無効)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:8110"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 中略...

# FastAPIアプリケーションの初期化 - 2回目
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定 - 2回目
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:8110"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 修正後: 初期化を1回に統合
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定 - オリジンに明示的に重複も含めて設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:8110", "http://localhost:3010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. クライアント側のAPIリクエスト処理の改善
```typescript
// 修正前
const analyzeResult = async (resultId: number) => {
  try {
    setAnalyzing(prev => ({ ...prev, [resultId]: true }));
    setAnalysisError(null);
    
    const response = await axios.post(`${FASTAPI_URL}/api/analyze/${resultId}`);
    
    if (response.data) {
      setAnalysisResults(prev => ({
        ...prev,
        [resultId]: response.data
      }));
    }
  } catch (error) {
    console.error('解析エラー:', error);
    setAnalysisError('解析処理中にエラーが発生しました。時間をおいて再度お試しください。');
  } finally {
    setAnalyzing(prev => ({ ...prev, [resultId]: false }));
  }
};

// 修正後
const analyzeResult = async (resultId: number) => {
  try {
    setAnalyzing(prev => ({ ...prev, [resultId]: true }));
    setAnalysisError(null);
    
    // デバッグ情報を追加
    console.log(`解析リクエスト送信: ${FASTAPI_URL}/api/analyze/${resultId}`);
    
    // ヘッダー設定を明示的に行う
    const response = await axios.post(`${FASTAPI_URL}/api/analyze/${resultId}`, {}, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('解析レスポンス受信:', response.data);
    
    if (response.data) {
      setAnalysisResults(prev => ({
        ...prev,
        [resultId]: response.data
      }));
    }
  } catch (error: any) {
    console.error('解析エラー:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axiosエラー詳細:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
    setAnalysisError(`解析処理中にエラーが発生しました: ${error.message}`);
  } finally {
    setAnalyzing(prev => ({ ...prev, [resultId]: false }));
  }
};
```

### 2025/3/5 - ダークモード機能の追加改善

#### 改善内容
1. `edit_exam_sets.tsx`のダークモード対応を修正
   - 検査セット一覧のヘッダー部分のダークモード対応を改善
   - `dark:bg-gray-750`クラスを標準のTailwindクラス`dark:bg-gray-700`に変更
   - セレクタ`body > div.min-h-screen.bg-gray-50.dark\:bg-gray-900 > div > div:nth-child(3) > div > div`の表示を修正

#### 修正理由
- 一部のUIコンポーネントでダークモード切替時に背景色が適切に変更されない問題があった
- 非標準のTailwindカラークラスを標準クラスに置き換えることで一貫性を向上

#### 技術的な詳細
```jsx
// 修正前
<div
  className="bg-gray-100 dark:bg-gray-750 p-4 flex justify-between items-center cursor-pointer"
  onClick={() => toggleExpand(examSet.id)}
>

// 修正後
<div
  className="bg-gray-100 dark:bg-gray-700 p-4 flex justify-between items-center cursor-pointer"
  onClick={() => toggleExpand(examSet.id)}
>
```

### 2025/3/3 - ダークモード機能の改善とバグ修正

### 2025/3/7 - デプロイ準備の改善

#### 改善内容
1. .gitignoreファイルの包括的な更新
   - Python環境関連ファイルの詳細な除外設定追加
   - Prisma関連ファイルの設定強化
   - 環境変数ファイルの管理改善
   - ビルド関連ファイルの除外設定の最適化

2. 環境変数管理の改善
   - Remix用の.env.exampleファイル作成
   - FastAPI用の.env.exampleファイル作成
   - 必要な環境変数の明確化

#### デプロイ時の注意点
1. 環境変数の設定
   ```bash
   # Remixプロジェクト (/docker/remix/.env)
   DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
   SESSION_SECRET="your-session-secret-key"
   FASTAPI_URL="http://fastapi:8000"  # コンテナ間通信用
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="your-secure-password"
   PORT=3000
   NODE_ENV="production"
   CORS_ORIGIN="http://localhost:3000"

   # FastAPIプロジェクト (/fastapi/.env)
   DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
   API_VERSION="v1"
   API_PREFIX="/api"
   ALLOWED_ORIGINS="http://localhost:3000"
   ALLOWED_METHODS="GET,POST,PUT,DELETE,OPTIONS"
   ALLOWED_HEADERS="*"
   SECRET_KEY="your-secret-key-here"
   ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   DEBUG=False
   ```

2. ビルドとデプロイの手順
   ```bash
   # 1. 本番用の環境変数ファイルを作成
   cp docker/remix/.env.example docker/remix/.env
   cp fastapi/.env.example fastapi/.env

   # 2. 環境変数を本番環境用に編集

   # 3. プロダクションビルドの実行
   docker-compose -f docker-compose.prod.yml build

   # 4. コンテナの起動
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. データベースのマイグレーション
   ```bash
   # Remixコンテナ内でPrismaマイグレーションを実行
   docker exec -it remix-container npx prisma migrate deploy
   ```

4. 初期セットアップ
   ```bash
   # 管理者アカウントの作成（必要な場合）
   docker exec -it remix-container node create-admin.js
   ```

#### セキュリティに関する注意点
- 本番環境では必ず強力なパスワードを使用
- SESSION_SECRETはユニークな値を設定
- データベースのクレデンシャルは本番環境用に変更
- DEBUG=Falseを確認
- APIキーやシークレットは必ず環境変数として管理

[... 以前の開発記録は変更なし ...]
