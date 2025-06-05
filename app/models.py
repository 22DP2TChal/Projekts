# app/models.py

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DECIMAL,
    DateTime,
    Table,
)
from sqlalchemy.orm import relationship
from app.database import Base

# — Вспомогательная таблица для связи User ↔ Tag (“многие ко многим”) —
user_tags = Table(
    "user_tags",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# — Модель “Tag” —
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    # Обратная связь для пользователей, у которых есть этот тег
    users = relationship("User", secondary=user_tags, back_populates="tags")


# — Модель “User” —
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)   # “employer” или “freelancer”
    status = Column(String, default="active", nullable=False)

    # Новое поле “О себе”
    about = Column(Text, nullable=True)

    # Связь “многие ко многим” с тегами (skills, keywords)
    tags = relationship("Tag", secondary=user_tags, back_populates="users")

    # —⇨ Связь “один ко многим”: проекты, которые создал этот пользователь (работодатель)
    projects = relationship("Project", back_populates="employer", cascade="all, delete-orphan")

    # —⇨ Связь “один ко многим”: заявки, которые оставил этот пользователь (фрилансер)
    applications = relationship("Application", back_populates="freelancer", cascade="all, delete-orphan")

    # —⇨ “Отзывы, которые дал” (UserReview.reviewer_id → User.id)
    reviews_given = relationship(
        "UserReview",
        foreign_keys="[UserReview.reviewer_id]",
        back_populates="reviewer",
        cascade="all, delete-orphan"
    )

    # —⇨ “Отзывы, которые получил” (UserReview.reviewed_id → User.id)
    reviews_received = relationship(
        "UserReview",
        foreign_keys="[UserReview.reviewed_id]",
        back_populates="reviewed",
        cascade="all, delete-orphan"
    )


# — Модель “Project” —
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="open")

    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Обратная связь с User (работодатель, который создал проект)
    employer = relationship("User", back_populates="projects")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False) 
    
    # “Заявки” (Application) к этому проекту
    applications = relationship("Application", back_populates="project", cascade="all, delete-orphan")


# — Модель “Application” (дополнено created_at) —
class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    # Связь с проектом
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project = relationship("Project", back_populates="applications")

    # Связь с фрилансером, который откликнулся
    freelancer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    freelancer = relationship("User", back_populates="applications")

    proposal_text = Column(Text, nullable=False)
    proposed_price = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # “Отзывы по заявке” (Review)
    reviews = relationship("Review", back_populates="application", cascade="all, delete-orphan")


# — Модель “Review” (привязанная к заявке) —
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    # К какому приложению (Application) относится отзыв
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    application = relationship("Application", back_populates="reviews")

    rating = Column(Integer, nullable=False)   # от 1 до 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# — Модель “UserReview” (пользователь ←→ пользователь) —
class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)

    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewed_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)     # от 1 до 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Связи (автор и получатель)
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewed = relationship("User", foreign_keys=[reviewed_id], back_populates="reviews_received")
