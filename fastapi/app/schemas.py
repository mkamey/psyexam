from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# リクエスト用のスキーマ
class AnalysisRequest(BaseModel):
    result_id: int = Field(..., description="解析する検査結果のID")


# レスポンス用のスキーマ
class AnalysisResultBase(BaseModel):
    total_score: float = Field(..., description="解析結果の総合スコア")
    details: Dict[str, Any] = Field(..., description="解析結果の詳細")
    interpretation: str = Field(..., description="解析結果の評価/解釈")
    severity: Optional[str] = Field(None, description="重症度レベル")


class AnalysisResultCreate(AnalysisResultBase):
    result_id: int
    patient_id: int
    exam_id: int


class AnalysisResultResponse(AnalysisResultBase):
    id: int
    result_id: int
    patient_id: int
    exam_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemyモデルからの変換を許可


# 検査結果データのスキーマ
class ResultItem(BaseModel):
    id: int
    exam_name: str
    items: Dict[str, Optional[int]]  # item0, item1, ...
    free_texts: Dict[str, Optional[str]]  # free0, free1, ...
    created_at: datetime

    class Config:
        from_attributes = True


# エラーメッセージ用のスキーマ
class HTTPError(BaseModel):
    detail: str


# 健全性確認用
class HealthCheck(BaseModel):
    status: str