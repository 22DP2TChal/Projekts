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
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
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
            detail="You have not reviewed this user yet."
        )
    return review


@router.post("/", response_model=UserReviewOut, status_code=status.HTTP_201_CREATED)
def create_user_review(
    user_id: int,
    review_in: UserReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot review yourself."
        )

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if current_user.role == target.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review users with a different role."
        )

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
            detail="You have already reviewed this user."
        )

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
