# app/routers/user_reviews.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import UserReviewCreate, UserReviewOut
from app.models import UserReview, User
from app.utils import get_current_active_user

router = APIRouter(
    prefix="/api/users/{user_id}/reviews",
    tags=["user_reviews"]
)


@router.get("/", response_model=List[UserReviewOut])
def read_reviews_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    GET /api/users/{user_id}/reviews/
    Возвращает все отзывы, которые есть к пользователю user_id.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден."
        )

    reviews = (
        db.query(UserReview)
        .filter(UserReview.reviewed_id == user_id)
        .order_by(UserReview.created_at.desc())
        .all()
    )
    return reviews


@router.get("/me", response_model=UserReviewOut)
def read_my_review_of_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    GET /api/users/{user_id}/reviews/me
    Возвращает отзыв, который текущий пользователь (current_user) оставил пользователю user_id.
    Если ещё не оставлял — 404.
    """
    review = (
        db.query(UserReview)
        .filter(
            UserReview.reviewed_id == user_id,
            UserReview.reviewer_id == current_user.id
        )
        .first()
    )
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вы ещё не оставляли отзыв этому пользователю."
        )
    return review


@router.post("/", response_model=UserReviewOut, status_code=status.HTTP_201_CREATED)
def create_user_review(
    user_id: int,
    review_in: UserReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    POST /api/users/{user_id}/reviews/
    Оставить новый отзыв пользователю с id = user_id.
    Правила:
    1) Нельзя оставить отзыв самому себе.
    2) Нельзя оставить более одного отзыва одному и тому же пользователю.
    3) Работодатель не может отзываться на работодателя, фрилансер — на фрилансера.
    """
    # 1) Нельзя себе
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя оставить отзыв самому себе."
        )

    # 2) Проверяем, существует ли пользователь, которому оставляем отзыв
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден."
        )

    # 3) Проверяем, чтобы роли отличались:
    #    “employer” может оставлять отзыв только “freelancer”, и наоборот
    if current_user.role == target.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя оставлять отзывы пользователям с вашей же ролью."
        )

    # 4) Проверяем, не оставлял ли текущий уже отзыв этому же пользователю
    existing = (
        db.query(UserReview)
        .filter(
            UserReview.reviewer_id == current_user.id,
            UserReview.reviewed_id == user_id
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы уже оставляли отзыв этому пользователю."
        )

    # 5) Создаём новый отзыв
    new_review = UserReview(
        reviewer_id=current_user.id,
        reviewed_id=user_id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review
