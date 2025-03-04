"""
心理検査解析モジュールパッケージ

このパッケージには、様々な心理検査の解析ロジックを実装したモジュールが含まれています。
それぞれの検査タイプに対して専用のモジュールが用意されており、
モジュール名が検査名と一致し、その中に同名の関数が実装されています。

例えば:
- PHQ-9検査の解析は phq_9.py の phq_9() 関数で実行
- SDS検査の解析は sds.py の sds() 関数で実行

この設計により、新しい検査タイプを追加する際に、
新しいモジュールを作成するだけで対応できるようになっています。
"""

from importlib import import_module
import logging

logger = logging.getLogger(__name__)

def get_analyzer(exam_type: str):
    """
    検査タイプに対応する解析関数を動的に取得します。
    
    Args:
        exam_type: 検査タイプ名 (例: "phq-9"、"sds")
        
    Returns:
        解析関数、またはNone（対応する関数が見つからない場合）
    """
    # ハイフンをアンダースコアに変換 (例: "phq-9" → "phq_9")
    module_name = exam_type.replace("-", "_").lower()
    
    try:
        # 動的にモジュールをインポート
        module = import_module(f".{module_name}", package="app.analyzers")
        
        # モジュールから同名の関数を取得
        analyzer_func = getattr(module, module_name)
        logger.info(f"解析モジュール {module_name} を正常に読み込みました")
        
        return analyzer_func
    except (ImportError, AttributeError) as e:
        logger.error(f"解析モジュール {module_name} の読み込みに失敗しました: {str(e)}")
        return None