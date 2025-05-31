# app/models.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DECIMAL, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    # Устанавливам default="active"
    status = Column(String, default="active")  

    projects = relationship("Project", back_populates="employer")
    applications = relationship("Application", back_populates="freelancer")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(DECIMAL, nullable=False)
    status = Column(String, default="open")       # open, in_progress, closed и т.д.
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Связи
    employer = relationship("User", back_populates="projects")
    applications = relationship("Application", back_populates="project", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    proposal_text = Column(Text, nullable=False)
    proposed_price = Column(DECIMAL, nullable=False)
    status = Column(String, default="pending")    # pending, accepted, rejected
    freelancer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Связи
    freelancer = relationship("User", back_populates="applications")
    project = relationship("Project", back_populates="applications")
    review = relationship("Review", back_populates="application", uselist=False, cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)

    # Связь
    application = relationship("Application", back_populates="review")
