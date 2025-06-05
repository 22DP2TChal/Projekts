# scripts/create_schema.py

from app.database import engine, Base
# Импортируем все модели, чтобы SQLAlchemy их «увидел»
from app.models import (
    User,
    Project,
    Application,
    Review,
    Tag,
    UserReview,
    # и вспомогательную таблицу user_tags, если она отдельно объявлена
    user_tags
)

def main():
    """
    Эта функция пройдётся по всем описанным в app/models.py классам
    и создаст в базе все таблицы (если их ещё нет).
    """
    Base.metadata.create_all(bind=engine)
    print("Все таблицы созданы/существуют в новой базе.")

if __name__ == "__main__":
    main()
