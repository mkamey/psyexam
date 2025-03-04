from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging

from . import models
from .database import engine, SessionLocal
from .routers import analysis

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# データベースのテーブル作成
models.Base.metadata.create_all(bind=engine)

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="心理検査解析API",
    description="様々な心理検査の結果を解析するためのAPIサーバー",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010"],  # フロントエンドのURLを許可
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