from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project is not open",
        )

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
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

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

    if current_user.role == "freelancer" and application.freelancer_id == current_user.id:
        if application_in.proposal_text is not None:
            application.proposal_text = application_in.proposal_text
        if application_in.proposed_price is not None:
            application.proposed_price = application_in.proposed_price
        db.commit()
        db.refresh(application)
        return application

    if project.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )

    if application_in.status is not None:
        application.status = application_in.status
        db.commit()
        db.refresh(application)
        return application

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
