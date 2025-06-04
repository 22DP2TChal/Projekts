# app/schemas.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# ------------------------------
# 1) User-схемы
# ------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(freelancer|employer|admin)$")

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    status: str

    model_config = {"from_attributes": True}


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
    status: Optional[str] = Field(default="open")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    budget: Optional[float] = Field(gt=0)
    status: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    employer_id: int

    model_config = {"from_attributes": True}


# ------------------------------
# 3) Application-схемы
# ------------------------------
class ApplicationBase(BaseModel):
    proposal_text: str
    proposed_price: float = Field(gt=0)
    status: Optional[str] = Field(default="pending")

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    proposal_text: Optional[str] = None
    proposed_price: Optional[float] = None
    status: Optional[str] = None

class ApplicationOut(ApplicationBase):
    id: int
    freelancer_id: int
    project_id: int

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}
