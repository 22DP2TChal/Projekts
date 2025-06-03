# app/main.py

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.models import Project, User
from app.routers import users, projects as proj_router, applications, reviews

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")
Base.metadata.create_all(bind=engine)

# --- Подключаем API-роутеры ---
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(proj_router.router, prefix="/api/projects", tags=["Projects"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])


# --- HTML-страницы ---
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
def register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/projects", response_class=HTMLResponse)
def get_projects_page(request: Request):
    return templates.TemplateResponse("projects.html", {"request": request})

@app.get("/projects/{project_id}", response_class=HTMLResponse)
def get_project_detail(request: Request, project_id: int):
    """
    Отдаём шаблон project_detail.html. JS внутри этого шаблона
    сам спросит API за JSON проекта и/или отправит заявку.
    """
    return templates.TemplateResponse("project_detail.html", {
        "request": request,
        "project_id": project_id
    })

@app.get("/projects/{project_id}/applications", response_class=HTMLResponse)
def get_project_applications(request: Request, project_id: int, db: Session = Depends(get_db)):
    """
    Отдаём шаблон project_applications.html, где работодатель сможет
    увидеть список всех заявок на конкретный проект.
    """
    # Проверяем, существует ли проект
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Шаблон сам через JS проверит, что текущий пользователь — владелец проекта
    return templates.TemplateResponse("project_applications.html", {
        "request": request,
        "project_id": project_id
    })
