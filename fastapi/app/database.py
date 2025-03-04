import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 環境変数の読み込み（.envファイルがある場合）
load_dotenv()

# 環境変数からデータベースURL取得または基本設定
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:p0ssw0rd@db:3306/psyexam")

# SQLAlchemyエンジンの作成
engine = create_engine(
    DATABASE_URL
)

# セッションの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# モデルのベースクラス
Base = declarative_base()

# DBセッションの依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()