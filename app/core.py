# app/core.py

from datetime import timedelta

# 1) Секретный ключ (должен быть длинным и случайным)
SECRET_KEY = "efab3d01b2c4e689d7156d63a5f9e7cb2f1a0d4e3a59876b4c3d2e1f0a9b8c7d"
# 2) Алгоритм подписи JWT
ALGORITHM = "HS256"
# 3) Время жизни токена (минуты)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 день
