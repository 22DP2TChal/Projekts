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

user_tags = Table(
    "user_tags",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    users = relationship("User", secondary=user_tags, back_populates="tags")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)   # “employer” или “freelancer”
    status = Column(String, default="active", nullable=False)

    about = Column(Text, nullable=True)

    tags = relationship("Tag", secondary=user_tags, back_populates="users")

    projects = relationship("Project", back_populates="employer", cascade="all, delete-orphan")

    applications = relationship("Application", back_populates="freelancer", cascade="all, delete-orphan")

    reviews_given = relationship(
        "UserReview",
        foreign_keys="[UserReview.reviewer_id]",
        back_populates="reviewer",
        cascade="all, delete-orphan"
    )

    reviews_received = relationship(
        "UserReview",
        foreign_keys="[UserReview.reviewed_id]",
        back_populates="reviewed",
        cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="open")

    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    employer = relationship("User", back_populates="projects")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False) 

    applications = relationship("Application", back_populates="project", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project = relationship("Project", back_populates="applications")

    freelancer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    freelancer = relationship("User", back_populates="applications")

    proposal_text = Column(Text, nullable=False)
    proposed_price = Column(DECIMAL(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    reviews = relationship("Review", back_populates="application", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    application = relationship("Application", back_populates="reviews")

    rating = Column(Integer, nullable=False)   # от 1 до 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, index=True)

    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewed_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)     # от 1 до 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewed = relationship("User", foreign_keys=[reviewed_id], back_populates="reviews_received")
