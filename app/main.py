# app/main.py

from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.models import Project
from app.routers import users, projects as proj_router, applications, reviews, user_reviews
from app.utils import get_current_active_user, require_employer

app = FastAPI()

# Статика и шаблоны
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Синхронизируем БД (если ещё не созданы таблицы)
Base.metadata.create_all(bind=engine)

# --- Подключаем API-роутеры ---
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(proj_router.router, prefix="/api/projects", tags=["Projects"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])

# Теперь подключение user_reviews.router
# В нём уже прописан prefix="/api/users/{user_id}/reviews"
app.include_router(user_reviews.router, tags=["User review"])


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

@app.get("/projects/create", response_class=HTMLResponse)
def get_create_project(request: Request):
    return templates.TemplateResponse("create_project.html", {"request": request})

@app.get("/projects/{project_id}", response_class=HTMLResponse)
def get_project_detail(request: Request, project_id: int):
    return templates.TemplateResponse("project_detail.html", {
        "request": request,
        "project_id": project_id
    })

@app.get("/projects/{project_id}/applications", response_class=HTMLResponse)
def get_project_applications(request: Request, project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return templates.TemplateResponse("project_applications.html", {
        "request": request,
        "project_id": project_id
    })

@app.get("/users/{user_id}")
def redirect_to_profile(user_id: int):
    return RedirectResponse(url=f"/users/{user_id}/profile")

@app.get("/users/{user_id}/profile", response_class=HTMLResponse)
def get_user_profile(request: Request, user_id: int):
    return templates.TemplateResponse("user_profile.html", {"request": request})
