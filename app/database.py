# app/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres@localhost:5432/freelance_db"

# 1) Движок
engine = create_engine(DATABASE_URL)

# 2) Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3) Базовый класс для моделей
Base = declarative_base()

# 4) Зависимость для FastAPI, чтобы получать сессию в эндпоинтах
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
