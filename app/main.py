# app/main.py (пример структуры)

from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.routers import users, projects, applications, reviews  # ваши роутеры
from app.database import engine, Base

app = FastAPI()

# Монтируем статику
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Инициализируем шаблоны (папка app/templates)
templates = Jinja2Templates(directory="app/templates")

# Создаём все таблицы
Base.metadata.create_all(bind=engine)


# Маршрут для главной (Login) и других статичных страниц...
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

# Новый маршрут: детали проекта + форма заявки
@app.get("/projects/{project_id}", response_class=HTMLResponse)
def get_project_detail(request: Request, project_id: int):
    """
    Возвращает HTML-страницу project_detail.html,
    JS на клиенте достанет реальные данные через AJAX.
    """
    return templates.TemplateResponse("project_detail.html", {
        "request": request,
        "project_id": project_id  
    })


@app.get("/projects", response_class=HTMLResponse)
def get_projects_page(request: Request):
    return templates.TemplateResponse("projects.html", {"request": request})




# Включаем роутеры API
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
