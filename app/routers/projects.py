from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Literal, Optional, List

from app.database import get_db
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate
from app.models import Project, Application
from app.utils import get_current_active_user, require_employer

router = APIRouter()


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_employer),
):
    new_project = Project(
        title=project_in.title,
        description=project_in.description,
        budget=project_in.budget,
        status=project_in.status,
        employer_id=current_user.id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.get("/", response_model=List[ProjectOut])
def read_projects(
    search: Optional[str] = Query(None, description="Search by title (ILIKE)"),
    status: Optional[Literal["open", "in_progress", "closed"]] = Query(
        None, description="Filter by status"
    ),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    if search:
        query = query.filter(Project.title.ilike(f"%{search}%"))
    if status:
        query = query.filter(Project.status == status)

    projects_list = (
        query
        .order_by(desc(Project.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return projects_list


@router.get("/{project_id}", response_model=ProjectOut)
def read_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Project not found"
        )
    return project


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.budget is not None:
        project.budget = project_in.budget
    if project_in.status is not None:
        project.status = project_in.status

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Project not found"
        )

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized"
        )

    db.delete(project)
    db.commit()
    return


@router.get("/{project_id}/stats", status_code=status.HTTP_200_OK)
def project_statistics(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Project not found"
        )

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized"
        )

    stats = (
        db.query(
            func.count(Application.id).label("application_count"),
            func.avg(Application.proposed_price).label("avg_price")
        )
        .filter(Application.project_id == project_id)
        .first()
    )
    return {
        "project_id": project_id,
        "application_count": stats.application_count or 0,
        "avg_price": float(stats.avg_price or 0.0),
    }
