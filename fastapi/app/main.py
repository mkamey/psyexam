from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
from sqlalchemy import text

from . import models
from .database import engine, SessionLocal
from .routers import analysis

# ロギングの設定
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:8110"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベースのテーブル作成
@app.on_event("startup")
def startup_event():
    logger.debug("Creating database tables...")
    try:
        # テーブルを作成
        models.Base.metadata.create_all(bind=engine)
        logger.debug("Database tables created successfully")
        
        # データベース接続をテスト
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.debug("Database connection test successful")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise e

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010", "http://localhost:8110"],  # フロントエンドのURLを許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(analysis.router, prefix="/api", tags=["analysis"])

# ヘルスチェックエンドポイント
@app.get("/")
async def root():
    return {"message": "心理検査解析APIサーバー稼働中"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}