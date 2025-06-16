# Freelance sistēma

Tīmekļa lietotne brīvstrādnieku projektu, pieteikumu un lietotāju profilu pārvaldībai.

## Funkcijas

- Lietotāju reģistrācija un pieteikšanās (darba devēja un brīvstrādnieka lomas)
- Darba devēji var izveidot un pārvaldīt projektus
- Brīvstrādnieki var pieteikties projektiem
- Darba devēji var pārskatīt pieteikumus un mainīt projekta statusu
- Lietotāji var skatīt profilus un atstāt atsauksmes viens par otru
- Birkas sistēma brīvstrādnieku prasmēm
- Reaģējošs lietotāja interfeiss ar HTML/CSS/JS priekšgala daļu

## Tehnoloģiju steks

- **Aizmugure:** FastAPI, SQLAlchemy, PostgreSQL
- **Priekšgals:** HTML, CSS, JavaScript
- **Autentifikācija:** JWT (JSON Web Tokens)
- **ORM:** SQLAlchemy

## Projekta struktūra

```
app/
  core.py
  database.py
  main.py
  models.py
  schemas.py
  utils.py
  routers/
    applications.py
    projects.py
    reviews.py
    user_reviews.py
    users.py
  static/
    css/
      style.css
    js/
      ...
  templates/
    404.html
    create_project.html
    index.html
    project_applications.html
    project_detail.html
    projects.html
    register.html
    user_profile.html
update_schema.py
```

## Uzstādīšana

1. **Klonējiet repozitoriju**

2. **Instalējiet atkarības**
   ```sh
   pip install -r requirements.txt
   ```

3. **Konfigurējiet datubāzi**

   Atjauniniet `DATABASE_URL` failā `app/database.py`, ja nepieciešams.

4. **Izveidojiet datubāzes shēmu**
   ```sh
   python update_schema.py
   ```

5. **Palaidiet serveri**
   ```sh
   uvicorn app.main:app --reload
   ```

6. **Atveriet pārlūkprogrammā**

   Apmeklējiet [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Izstrāde

- Statiskie faili atrodas `app/static/`
- HTML veidnes atrodas `app/templates/`
- Aizmugures API pieejams zem `/api/`

## Licence

MIT licence

---

**Piezīme:** Lai nodrošinātu pilnu funkcionalitāti, pārliecinieties, ka PostgreSQL darbojas un ir pieejams saskaņā ar konfigurāciju.
