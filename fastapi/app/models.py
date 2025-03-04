from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

# 既存のテーブル構造を再定義（読み取り用）
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    sex = Column(Integer)
    birthdate = Column(DateTime)
    initial = Column(String(8))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # リレーション
    results = relationship("Result", back_populates="patient")
    analysis_results = relationship("AnalysisResult", back_populates="patient")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    examname = Column(String(255), unique=True, index=True)
    cutoff = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # リレーション
    results = relationship("Result", back_populates="exam")
    analysis_results = relationship("AnalysisResult", back_populates="exam")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"))
    item0 = Column(Integer, nullable=True)
    item1 = Column(Integer, nullable=True)
    item2 = Column(Integer, nullable=True)
    item3 = Column(Integer, nullable=True)
    item4 = Column(Integer, nullable=True)
    item5 = Column(Integer, nullable=True)
    item6 = Column(Integer, nullable=True)
    item7 = Column(Integer, nullable=True)
    item8 = Column(Integer, nullable=True)
    item9 = Column(Integer, nullable=True)
    free0 = Column(String(2000), nullable=True)
    free1 = Column(String(2000), nullable=True)
    free2 = Column(String(2000), nullable=True)
    free3 = Column(String(2000), nullable=True)
    free4 = Column(String(2000), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # リレーション
    patient = relationship("Patient", back_populates="results")
    exam = relationship("Exam", back_populates="results")
    analysis_result = relationship("AnalysisResult", back_populates="result", uselist=False)


# 新規テーブル：解析結果
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("results.id", ondelete="CASCADE"), unique=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"))
    
    # 解析結果の総合スコア
    total_score = Column(Float)
    
    # 解析結果の詳細（JSON形式のテキスト）
    details = Column(Text)
    
    # 解析結果の評価/解釈
    interpretation = Column(Text)
    
    # 解析結果の重症度レベル (例: 軽度、中等度、重度)
    severity = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # リレーション
    result = relationship("Result", back_populates="analysis_result")
    patient = relationship("Patient", back_populates="analysis_results")
    exam = relationship("Exam", back_populates="analysis_results")