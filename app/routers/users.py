# app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Импорты из пакета app
from app.database import get_db
from app.schemas import UserCreate, UserOut, Token
from app.models import User
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