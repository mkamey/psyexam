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

### 2025/3/3 - ダークモード機能の改善とバグ修正

[... 以前の開発記録は変更なし ...]
