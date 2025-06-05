# app/routers/reviews.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Импорты из пакета app
from app.database import get_db
from app.schemas import ReviewCreate, ReviewOut
from app.models import Review, Application, Project, User
from app.utils import get_current_active_user

router = APIRouter()


@router.post("/applications/{application_id}/reviews/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review_for_application(
    application_id: int,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    print(2)
    """
    Оставление отзыва: только employer (владелец проекта) или admin, если статус заявки == "accepted".
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.status != "accepted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot review unaccepted application")

    project = db.query(Project).filter(Project.id == application.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    existing_review = db.query(Review).filter(Review.application_id == application_id).first()
    if existing_review:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review already exists")

    if not (1 <= review_in.rating <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5")

    new_review = Review(
        rating=review_in.rating,
        comment=review_in.comment,
        application_id=application_id
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review


@router.get("/applications/{application_id}/reviews/", response_model=ReviewOut)
def read_review_for_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    print(1)
    """
    Получение отзыва по заявке (любой авторизованный пользователь).
    """
    review = db.query(Review).filter(Review.application_id == application_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review
