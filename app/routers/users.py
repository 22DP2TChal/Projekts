# app/routers/users.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Импорты из пакета app
from app.database import get_db
from app.schemas import TagOut, UserCreate, UserOut, Token, UserUpdate
from app.models import User,Tag
from app.utils import get_password_hash, verify_password, create_access_token, get_current_active_user

router = APIRouter()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя.
    """
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role,
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user



@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    # Раньше, вероятно, было так:
    # access_token = create_access_token({"sub": user.id})
    # Исправляем на:
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}



@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Получить информацию о текущем авторизованном пользователе.
    """
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def read_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Публичный профиль пользователя по его ID.
    Доступен всем (без авторизации).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден."
        )
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user_profile(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Обновление профиля пользователя (только сам пользователь или админ).
    Поля, которые можно обновлять: about (текст) и tags (список имён тегов).
    """
    # 1) Права доступа: только владелец профиля или админ
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования этого профиля",
        )

    # 2) Загружаем пользователя из БД
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
        )

    # 3) Обновляем поле “about”, если пришло
    if user_in.about is not None:
        db_user.about = user_in.about

    # 4) Обрабатываем поле “tags”: список строк
    if user_in.tags is not None:
        # Очистим существующие связи many-to-many
        db_user.tags.clear()

        # Для каждого имени тега из списка:
        for tag_name in user_in.tags:
            # Приводим к нижнему регистру и убираем лишние пробелы
            name_clean = tag_name.strip()
            if not name_clean:
                continue

            # Ищем в БД Tag с таким именем
            tag_obj = db.query(Tag).filter(Tag.name == name_clean).first()
            if not tag_obj:
                # Если такого тега нет — создаём его
                tag_obj = Tag(name=name_clean)
                db.add(tag_obj)
                db.flush()  # чтобы получить tag_obj.id без отдельного commit
            # Добавляем связь «пользователь ↔ тег»
            db_user.tags.append(tag_obj)

    # 5) Сохраняем изменения
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


# Дополнительно: можно добавить эндпоинты для получения списка всех тегов (TagOut),
# чтобы клиент мог показать их в выпадающем списке. Например:
@router.get("/tags/", response_model=List[TagOut])
def read_all_tags(db: Session = Depends(get_db)):
    """
    Вернуть все существующие теги (для фронтенда: показать список autocomplete).
    """
    tags = db.query(Tag).order_by(Tag.name).all()
    return tags
