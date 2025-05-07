FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de requerimientos y instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando para iniciar la aplicación
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "blog_viaje.wsgi:application"] 