# app/routers/projects.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import desc                 # ← понадобится для сортировки

# Импорты из пакета app
from app.database import get_db
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate
from app.models import Project, User
from app.utils import get_current_active_user, require_employer

router = APIRouter()


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employer),
):
    """
    Создание проекта (только employer).
    """
    new_project = Project(
        title=project_in.title,
        description=project_in.description,
        budget=project_in.budget,
        status=project_in.status,
        employer_id=current_user.id
        # created_at заполняется автоматически
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.get("/", response_model=List[ProjectOut])
def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Получить список проектов:
    - если пользователь — employer, вернуть только его проекты (без сортировки);
    - если freelancer, вернуть только проекты с status == "open", отсортированные по дате создания (новые сверху);
    - если admin, вернуть все проекты (без сортировки).
    """
    # 1) Если роль = employer, возвращаем только свои проекты:
    if current_user.role == "employer":
        projects_list = (
            db.query(Project)
            .filter(Project.employer_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return projects_list

    # 2) Если роль = freelancer, возвращаем только открытые проекты, сортируя по created_at DESC:
    elif current_user.role == "freelancer":
        projects_list = (
            db.query(Project)
            .filter(Project.status == "open")
            .order_by(desc(Project.created_at))   # ← сортировка по дате создания
            .offset(skip)
            .limit(limit)
            .all()
        )
        return projects_list

    # 3) Если роль = admin (или прочая), возвращаем все (можно без сортировки):
    projects_list = db.query(Project).offset(skip).limit(limit).all()
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
    current_user: User = Depends(get_current_active_user),
):
    """
    Обновление проекта (только владелец или admin).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

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
    current_user: User = Depends(get_current_active_user),
):
    """
    Удаление проекта (только владелец или admin).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(project)
    db.commit()
    return
