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

# CORS設定 - より詳細に
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # すべてのオリジンを許可
    allow_credentials=False,  # 認証情報を含むリクエストでないのでFalseに
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # 明示的にメソッドを列挙
    allow_headers=["Content-Type", "Authorization", "Accept"],  # 一般的に必要なヘッダーを列挙
    expose_headers=["Content-Type"],  # レスポンスで公開するヘッダー
    max_age=600,  # プリフライトリクエストの結果をキャッシュする時間(秒)
)

# CORSデバッグログの追加
@app.middleware("http")
async def log_requests(request, call_next):
    logger.debug(f"Incoming request: {request.method} {request.url}")
    logger.debug(f"Request headers: {request.headers}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

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

# ルーターの登録
app.include_router(analysis.router, prefix="/api", tags=["analysis"])

# ヘルスチェックエンドポイント
@app.get("/")
async def root():
    return {"message": "心理検査解析APIサーバー稼働中"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}