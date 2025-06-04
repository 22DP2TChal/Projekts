# app/routers/applications.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

# Импорты из пакета app
from app.database import get_db
from app.schemas import ApplicationCreate, ApplicationOut, ApplicationUpdate
from app.models import Application, Project, User
from app.utils import get_current_active_user, require_freelancer

router = APIRouter()


@router.post(
    "/projects/{project_id}/applications/",
    response_model=ApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_application_for_project(
    project_id: int,
    application_in: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_freelancer),
):
    """
    Фрилансер подаёт заявку на проект (project_id).
    Каждый фрилансер может подать заявку на один и тот же проект только один раз.
    """
    # Проверяем, что проект существует
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Проверяем, что проект открыт для заявок
    if project.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not open",
        )

    # Проверяем, что фрилансер ещё не подавал заявку на этот проект
    existing_app = (
        db.query(Application)
        .filter(
            Application.project_id == project_id,
            Application.freelancer_id == current_user.id,
        )
        .first()
    )
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this project",
        )

    # Создаём новую заявку
    new_app = Application(
        proposal_text=application_in.proposal_text,
        proposed_price=application_in.proposed_price,
        status=application_in.status,
        freelancer_id=current_user.id,
        project_id=project_id,
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app


@router.get(
    "/projects/{project_id}/applications/",
    response_model=List[ApplicationOut],
    status_code=status.HTTP_200_OK,
)
def read_applications_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Возвращает все заявки на указанный проект (project_id).
    Доступны только владельцу проекта (employer) или admin.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Проверяем, что текущий пользователь — владелец проекта либо админ
    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view applications for this project",
        )

    applications_list = (
        db.query(Application)
        .filter(Application.project_id == project_id)
        .all()
    )
    return applications_list


@router.get(
    "/projects/{project_id}/applications/me",
    response_model=ApplicationOut,
    status_code=status.HTTP_200_OK,
)
def read_my_application(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_freelancer),
):
    """
    Проверка: есть ли заявка текущего фрилансера (current_user) на проект project_id.
    Если есть — возвращаем её (200). Если нет — бросаем 404.
    """
    application = (
        db.query(Application)
        .filter(
            Application.project_id == project_id,
            Application.freelancer_id == current_user.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return application


@router.get("/", response_model=List[ApplicationOut])
def read_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Получить все заявки (admin), без фильтрации.
    """
    applications_list = db.query(Application).offset(skip).limit(limit).all()
    return applications_list


@router.get("/{application_id}", response_model=ApplicationOut)
def read_application(application_id: int, db: Session = Depends(get_db)):
    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    return application


@router.put("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    application_in: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Обновление заявки:
      - Если role="freelancer" и это его заявка → может менять только proposal_text и proposed_price.
      - Иначе (role="employer" на своём проекте или admin) → может менять только status.
    """
    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    project = db.query(Project).filter(Project.id == application.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # --- Фрилансер может редактировать только свою заявку (proposal_text и proposed_price) ---
    if current_user.role == "freelancer" and application.freelancer_id == current_user.id:
        if application_in.proposal_text is not None:
            application.proposal_text = application_in.proposal_text
        if application_in.proposed_price is not None:
            application.proposed_price = application_in.proposed_price
        # Поле status фрилансером не меняется, даже если пришло в application_in
        db.commit()
        db.refresh(application)
        return application

    # --- Иначе разрешаем только владельцу проекта (employer) или admin менять status ---
    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )

    # Если это employer или admin, то редактируем поле status
    if application_in.status is not None:
        application.status = application_in.status
        db.commit()
        db.refresh(application)
        return application

    # Если employer/admin не указал новый status → 400 Bad Request
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No status provided for update"
    )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Удаление заявки (только владелец заявки или admin).
    """
    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.freelancer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )

    db.delete(application)
    db.commit()
    return
