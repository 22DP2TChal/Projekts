# app/schemas.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal


# ------------------------------
# 1) User-схемы
# ------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["freelancer", "employer", "admin"]


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Literal["freelancer", "employer", "admin"]
    status: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str  # "bearer"


# ------------------------------
# 2) Project-схемы
# ------------------------------
class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    budget: float = Field(gt=0)
    status: Optional[Literal["open", "in_progress", "closed"]] = "open"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    budget: Optional[float] = Field(default=None, gt=0)
    status: Optional[Literal["open", "in_progress", "closed"]] = None

    class Config:
        orm_mode = True


class ProjectOut(ProjectBase):
    id: int
    employer_id: int

    class Config:
        orm_mode = True


# ------------------------------
# 3) Application-схемы
# ------------------------------
class ApplicationBase(BaseModel):
    proposal_text: str
    proposed_price: float = Field(gt=0)
    status: Optional[Literal["pending", "accepted", "rejected"]] = "pending"


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    proposal_text: Optional[str] = None
    proposed_price: Optional[float] = None
    status: Optional[Literal["pending", "accepted", "rejected"]] = None

    class Config:
        orm_mode = True


class ApplicationOut(ApplicationBase):
    id: int
    freelancer_id: int
    project_id: int

    class Config:
        orm_mode = True


# ------------------------------
# 4) Review-схемы
# ------------------------------
class ReviewBase(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewOut(ReviewBase):
    id: int
    application_id: int
    created_at: Optional[str]

    class Config:
        orm_mode = True
