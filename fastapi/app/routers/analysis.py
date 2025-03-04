from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import json
import logging
from typing import Dict, Any

from .. import schemas, models
from ..database import get_db
from ..analyzers import get_analyzer

# ロギングの設定
logger = logging.getLogger(__name__)

# ルーターの作成
router = APIRouter()

@router.post(
    "/analyze/{result_id}",
    response_model=schemas.AnalysisResultResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"model": schemas.HTTPError, "description": "検査結果が見つかりません"},
        400: {"model": schemas.HTTPError, "description": "解析エラー"},
        500: {"model": schemas.HTTPError, "description": "サーバーエラー"}
    }
)
async def analyze_result(
    result_id: int,
    db: Session = Depends(get_db)
):
    """
    検査結果を解析し、解析結果をデータベースに保存します。
    
    既に解析結果が存在する場合は、それを返します。
    """
    # 検査結果の取得
    result = db.query(models.Result).filter(models.Result.id == result_id).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {result_id} の検査結果が見つかりません"
        )
    
    # 既存の解析結果があるか確認
    existing_analysis = db.query(models.AnalysisResult).filter(
        models.AnalysisResult.result_id == result_id
    ).first()
    
    if existing_analysis:
        # 既存の解析結果がある場合はそれを返す
        logger.info(f"ID {result_id} の既存の解析結果を返します")
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
    
    # 検査タイプの取得
    exam = db.query(models.Exam).filter(models.Exam.id == result.exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {result.exam_id} の検査タイプが見つかりません"
        )
    
    # 検査結果データの準備
    result_data = prepare_result_data(result)
    
    try:
        # 検査タイプに応じた解析モジュールを取得
        analyzer_func = get_analyzer(exam.examname)
        if not analyzer_func:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"検査タイプ '{exam.examname}' の解析モジュールが見つかりません"
            )
        
        # 解析実行
        analysis_result = analyzer_func(result_data)
        
        # 解析結果をデータベースに保存
        db_analysis = models.AnalysisResult(
            result_id=result_id,
            patient_id=result.patient_id,
            exam_id=result.exam_id,
            total_score=analysis_result["total_score"],
            details=json.dumps(analysis_result["details"]),
            interpretation=analysis_result["interpretation"],
            severity=analysis_result.get("severity")
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        
        logger.info(f"ID {result_id} の検査結果の解析を完了しました")
        # details_dictプロパティを使用するために一度辞書に変換してからモデルを作成
        analysis_dict = {
            "id": db_analysis.id,
            "result_id": db_analysis.result_id,
            "patient_id": db_analysis.patient_id,
            "exam_id": db_analysis.exam_id,
            "total_score": db_analysis.total_score,
            "details": db_analysis.details_dict,  # JSON文字列を辞書に変換
            "interpretation": db_analysis.interpretation,
            "severity": db_analysis.severity,
            "created_at": db_analysis.created_at,
            "updated_at": db_analysis.updated_at
        }
        return schemas.AnalysisResultResponse(**analysis_dict)
    
    except Exception as e:
        db.rollback()
        logger.error(f"解析エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"解析処理中にエラーが発生しました: {str(e)}"
        )


@router.get(
    "/analysis-results/{patient_id}",
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": schemas.HTTPError, "description": "患者が見つかりません"},
        500: {"model": schemas.HTTPError, "description": "サーバーエラー"}
    }
)
async def get_patient_analysis_results(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """
    指定された患者の全ての解析結果を取得します。
    """
    # 患者の存在確認
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {patient_id} の患者が見つかりません"
        )
    
    try:
        # 解析結果の取得
        analysis_results = db.query(models.AnalysisResult).filter(
            models.AnalysisResult.patient_id == patient_id
        ).all()
        
        # 検査情報を付加
        results_with_exams = []
        for analysis in analysis_results:
            exam = db.query(models.Exam).filter(models.Exam.id == analysis.exam_id).first()
            if exam:
                analysis_dict = {
                    "id": analysis.id,
                    "result_id": analysis.result_id,
                    "exam_id": analysis.exam_id,
                    "exam_name": exam.examname,
                    "total_score": analysis.total_score,
                    "severity": analysis.severity,
                    "interpretation": analysis.interpretation,
                    "details": json.loads(analysis.details) if analysis.details else {},
                    "created_at": analysis.created_at
                }
                results_with_exams.append(analysis_dict)
        
        return {"analysis_results": results_with_exams}
    
    except SQLAlchemyError as e:
        logger.error(f"データベースエラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="解析結果の取得中にエラーが発生しました"
        )
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"解析結果の処理中にエラーが発生しました: {str(e)}"
        )


@router.delete(
    "/analysis-results/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": schemas.HTTPError, "description": "解析結果が見つかりません"},
        500: {"model": schemas.HTTPError, "description": "サーバーエラー"}
    }
)
async def delete_analysis_result(
    analysis_id: int,
    db: Session = Depends(get_db)
):
    """
    指定されたIDの解析結果を削除します。
    """
    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.id == analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {analysis_id} の解析結果が見つかりません"
        )
    
    try:
        db.delete(analysis)
        db.commit()
        return None
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"解析結果削除エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="解析結果の削除中にエラーが発生しました"
        )


# ヘルパー関数
def prepare_result_data(result: models.Result) -> Dict[str, Any]:
    """
    SQLAlchemyモデルから解析に必要なデータを辞書形式で抽出します。
    """
    result_data = {}
    
    # 全てのitem*フィールドを抽出
    for i in range(10):  # item0 から item9 まで
        item_key = f"item{i}"
        if hasattr(result, item_key):
            result_data[item_key] = getattr(result, item_key)
    
    # 全てのfree*フィールドを抽出
    for i in range(5):  # free0 から free4 まで
        free_key = f"free{i}"
        if hasattr(result, free_key):
            result_data[free_key] = getattr(result, free_key)
    
    return result_data