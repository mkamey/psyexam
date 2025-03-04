"""
PHQ-9 (Patient Health Questionnaire-9) 検査の解析モジュール

PHQ-9は、うつ病の重症度を測定するための9項目の質問票です。
各質問は0〜3点で評価され、合計スコアは0〜27点となります。

重症度の評価:
- 0-4点: なし または 最小限のうつ症状
- 5-9点: 軽度のうつ症状
- 10-14点: 中等度のうつ症状
- 15-19点: 中等度から重度のうつ症状
- 20-27点: 重度のうつ症状
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def phq_9(result_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    PHQ-9検査結果の解析を行います。
    
    Args:
        result_data: 検査結果データ (item0〜item8の値を含むDict)
        
    Returns:
        Dict: 解析結果を含む辞書
            - total_score: 合計スコア
            - severity: 重症度評価
            - interpretation: 解析の解釈
            - details: 詳細な分析結果
    """
    logger.info("PHQ-9の解析を開始します")
    
    # 有効なアイテム番号
    valid_items = [f"item{i}" for i in range(9)]  # item0からitem8までが有効
    
    # スコアの抽出と合計計算
    item_scores = {}
    total_score = 0
    
    for item_key in valid_items:
        if item_key in result_data and result_data[item_key] is not None:
            score = result_data[item_key]
            item_scores[item_key] = score
            total_score += score
        else:
            logger.warning(f"{item_key}のスコアがありません。0として扱います。")
            item_scores[item_key] = 0
    
    # 重症度の評価
    severity = get_severity(total_score)
    
    # 解釈の生成
    interpretation = generate_interpretation(total_score, severity)
    
    # 領域別の評価
    domain_scores = analyze_domains(item_scores)
    
    return {
        "total_score": total_score,
        "severity": severity,
        "interpretation": interpretation,
        "details": {
            "item_scores": item_scores,
            "domain_analysis": domain_scores
        }
    }


def get_severity(score: int) -> str:
    """スコアに基づいて重症度を判定します"""
    if score <= 4:
        return "なし または 最小限"
    elif score <= 9:
        return "軽度"
    elif score <= 14:
        return "中等度"
    elif score <= 19:
        return "中等度から重度"
    else:
        return "重度"


def generate_interpretation(score: int, severity: str) -> str:
    """スコアと重症度に基づいて解釈を生成します"""
    base_text = f"PHQ-9の合計スコアは{score}点で、これは{severity}のうつ症状を示しています。"
    
    if score <= 4:
        return base_text + " 現時点では臨床的に意義のあるうつ症状は認められません。"
    elif score <= 9:
        return base_text + " 経過観察が推奨されます。"
    elif score <= 14:
        return base_text + " 治療計画の検討が推奨されます。カウンセリングや投薬の必要性を評価してください。"
    elif score <= 19:
        return base_text + " 積極的な治療介入が推奨されます。投薬治療や心理療法の開始を検討してください。"
    else:
        return base_text + " 即時の治療介入が必要です。投薬治療と心理療法の併用、場合によっては入院治療の検討が必要かもしれません。"


def analyze_domains(item_scores: Dict[str, int]) -> Dict[str, Any]:
    """
    PHQ-9の項目を精神症状の領域別に分析します
    
    PHQ-9の項目は以下の領域に分類できます:
    - 気分/感情: item0, item1 (興味の喪失、抑うつ気分)
    - 身体症状: item2, item3, item4 (睡眠問題、疲労感、食欲の問題)
    - 認知: item6, item7 (集中力の問題、精神運動の変化)
    - 自己評価: item5 (罪悪感、無価値感)
    - 自殺念慮: item8 (自殺念慮)
    """
    domains = {
        "気分/感情": {"items": ["item0", "item1"], "score": 0, "max_score": 6},
        "身体症状": {"items": ["item2", "item3", "item4"], "score": 0, "max_score": 9},
        "認知": {"items": ["item6", "item7"], "score": 0, "max_score": 6},
        "自己評価": {"items": ["item5"], "score": 0, "max_score": 3},
        "自殺念慮": {"items": ["item8"], "score": 0, "max_score": 3}
    }
    
    # 各領域のスコアを計算
    for domain_name, domain_info in domains.items():
        for item in domain_info["items"]:
            if item in item_scores:
                domain_info["score"] += item_scores[item]
        
        # 各領域の重症度を計算 (最大スコアに対する割合を考慮)
        severity_percent = (domain_info["score"] / domain_info["max_score"]) * 100
        if severity_percent < 33:
            domain_info["severity"] = "軽度"
        elif severity_percent < 66:
            domain_info["severity"] = "中等度"
        else:
            domain_info["severity"] = "重度"
    
    return domains