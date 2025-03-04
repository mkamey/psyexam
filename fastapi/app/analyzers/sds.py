"""
SDS (Self-Rating Depression Scale/Zung自己評価式抑うつ尺度) 検査の解析モジュール

SDSは、うつ病の重症度を測定するための20項目の質問票です。
各質問は1〜4点で評価され、合計スコアは20〜80点となります。
SDS指標(SDS Index)は、合計点を最大スコア(80点)で割って100をかけたもので表されます。

重症度の評価:
- 20-49点 (SDS指標: 25-59): 正常範囲
- 50-59点 (SDS指標: 60-69): 軽度〜中等度のうつ状態
- 60-69点 (SDS指標: 70-79): 中等度〜重度のうつ状態
- 70-80点 (SDS指標: 80-100): 重度のうつ状態
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def sds(result_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    SDS検査結果の解析を行います。
    
    Args:
        result_data: 検査結果データ (item0〜item19の値を含むDict)
        
    Returns:
        Dict: 解析結果を含む辞書
            - total_score: 合計スコア (20-80点)
            - sds_index: SDS指標 (25-100)
            - severity: 重症度評価
            - interpretation: 解析の解釈
            - details: 詳細な分析結果
    """
    logger.info("SDSの解析を開始します")
    
    # 有効なアイテム番号
    valid_items = [f"item{i}" for i in range(20)]  # item0からitem19までが有効
    
    # スコアの抽出と合計計算
    item_scores = {}
    total_score = 0
    
    # SDSでは、一部の項目のスコアが逆転項目になっています
    # 通常項目: item0, item1, item3, item4, item5, item7, item8, item9, item10, item13, item15, item19
    # 逆転項目: item2, item6, item11, item12, item14, item16, item17, item18
    reversed_items = ["item2", "item6", "item11", "item12", "item14", "item16", "item17", "item18"]
    
    for item_key in valid_items:
        if item_key in result_data and result_data[item_key] is not None:
            # SDSの回答は1〜4の範囲で処理
            raw_score = result_data[item_key]
            
            # 逆転項目の場合はスコアを反転 (1→4, 2→3, 3→2, 4→1)
            if item_key in reversed_items:
                score = 5 - raw_score  # 1→4, 2→3, 3→2, 4→1
            else:
                score = raw_score
                
            item_scores[item_key] = score
            total_score += score
        else:
            logger.warning(f"{item_key}のスコアがありません。最小値(1)として扱います。")
            item_scores[item_key] = 1
            total_score += 1
    
    # SDS指標の計算 (合計点 ÷ 80 × 100)
    sds_index = (total_score / 80) * 100
    
    # 重症度の評価
    severity = get_severity(total_score)
    
    # 解釈の生成
    interpretation = generate_interpretation(total_score, sds_index, severity)
    
    # 領域別の評価
    domain_scores = analyze_domains(item_scores)
    
    return {
        "total_score": total_score,
        "sds_index": sds_index,
        "severity": severity,
        "interpretation": interpretation,
        "details": {
            "item_scores": item_scores,
            "domain_analysis": domain_scores
        }
    }


def get_severity(score: int) -> str:
    """スコアに基づいて重症度を判定します"""
    if score < 50:
        return "正常範囲"
    elif score < 60:
        return "軽度〜中等度のうつ状態"
    elif score < 70:
        return "中等度〜重度のうつ状態"
    else:
        return "重度のうつ状態"


def generate_interpretation(score: int, sds_index: float, severity: str) -> str:
    """スコア、SDS指標、重症度に基づいて解釈を生成します"""
    base_text = f"SDSの合計スコアは{score}点、SDS指標は{sds_index:.1f}で、これは{severity}を示しています。"
    
    if score < 50:
        return base_text + " 現時点では臨床的に意義のあるうつ症状は認められません。"
    elif score < 60:
        return base_text + " 軽度から中等度のうつ症状が認められます。経過観察と心理的サポートが推奨されます。"
    elif score < 70:
        return base_text + " 中等度から重度のうつ症状が認められます。専門的な介入が必要かもしれません。カウンセリングや投薬治療の検討を推奨します。"
    else:
        return base_text + " 重度のうつ症状が認められます。専門的な精神医学的評価と治療介入が必要です。早急な対応を検討してください。"


def analyze_domains(item_scores: Dict[str, int]) -> Dict[str, Any]:
    """
    SDSの項目をうつ症状の領域別に分析します
    
    SDSの項目は以下の領域に分類できます:
    - 感情的症状: item0, item3, item4, item7, item8, item9
    - 生理的症状: item1, item2, item11, item12, item14, item16, item17, item18
    - 心理的症状: item5, item6, item10, item13, item15, item19
    """
    domains = {
        "感情的症状": {
            "items": ["item0", "item3", "item4", "item7", "item8", "item9"],
            "score": 0,
            "max_score": 24
        },
        "生理的症状": {
            "items": ["item1", "item2", "item11", "item12", "item14", "item16", "item17", "item18"],
            "score": 0,
            "max_score": 32
        },
        "心理的症状": {
            "items": ["item5", "item6", "item10", "item13", "item15", "item19"],
            "score": 0,
            "max_score": 24
        }
    }
    
    # 各領域のスコアを計算
    for domain_name, domain_info in domains.items():
        for item in domain_info["items"]:
            if item in item_scores:
                domain_info["score"] += item_scores[item]
        
        # 各領域の重症度を計算 (最大スコアに対する割合を考慮)
        severity_percent = (domain_info["score"] / domain_info["max_score"]) * 100
        if severity_percent < 60:
            domain_info["severity"] = "正常範囲"
        elif severity_percent < 70:
            domain_info["severity"] = "軽度〜中等度"
        elif severity_percent < 80:
            domain_info["severity"] = "中等度〜重度"
        else:
            domain_info["severity"] = "重度"
    
    return domains