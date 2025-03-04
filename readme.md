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
