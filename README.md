# BlogViaje - Plataforma de contenidos y recomendaciones de viaje

BlogViaje es una plataforma completa para publicación de artículos y guías de viaje, donde los usuarios pueden registrarse para recibir recomendaciones personalizadas según sus intereses.

## Características

- 🔐 **Autenticación completa**: Registro, login y gestión de perfil de usuario
- 📝 **Gestión de contenido**: Artículos con imágenes, valoraciones y comentarios
- 🏷️ **Sistema de categorías**: Filtrado por tags e intereses
- 💯 **Recomendaciones personalizadas**: Basadas en intereses y valoraciones
- 🌐 **Interfaz responsive**: Adaptada a todos los dispositivos

## Tecnologías

### Backend
- **Django + Django REST Framework**: API robusta y gestión de admin
- **PostgreSQL**: Base de datos relacional para almacenamiento persistente
- **Redis**: Cache para recomendaciones y sesiones
- **JWT**: Autenticación basada en tokens

### Frontend
- **Next.js**: SSG/SSR para SEO y rendimiento
- **React**: Componentes reutilizables
- **Tailwind CSS**: Estilos modernos y responsive

### Infraestructura
- **Docker + Docker Compose**: Contenerización para desarrollo y producción
- **CI/CD con GitHub Actions**: Pruebas y despliegue automático

## Instalación y ejecución

### Requisitos previos
- Docker y Docker Compose
- Git

### Pasos para ejecutar el proyecto

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/blog-viaje.git
cd blog-viaje
```

2. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables (o personalízalas):
```
DJANGO_SECRET_KEY=una-clave-secreta-muy-segura
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=blogviaje
```

3. Inicia los servicios con Docker Compose:
```bash
docker-compose up -d
```

4. Accede a las aplicaciones:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/
   - Admin de Django: http://localhost:8000/admin/

### Desarrollo local sin Docker

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Estructura del proyecto

```
blog-viaje/
├── backend/                # Proyecto Django
│   ├── blog_viaje/         # Configuración principal
│   ├── users/              # App de usuarios
│   ├── articles/           # App de artículos
│   └── recommendations/    # App de recomendaciones
├── frontend/               # Proyecto Next.js
│   ├── app/                # Páginas y rutas
│   ├── components/         # Componentes React
│   └── context/            # Context API (auth, etc.)
└── docker-compose.yml      # Configuración de Docker
```

## API Endpoints

### Autenticación
- `POST /api/token/` - Obtener token JWT
- `POST /api/token/refresh/` - Refrescar token JWT
- `POST /api/users/register/` - Registrar nuevo usuario

### Usuarios
- `GET /api/users/profile/` - Obtener perfil del usuario
- `GET/PATCH /api/users/interests/` - Obtener/actualizar intereses

### Artículos
- `GET /api/articles/` - Listar artículos (con filtros)
- `POST /api/articles/` - Crear artículo
- `GET /api/articles/{slug}/` - Detalle de artículo
- `POST /api/articles/{slug}/rate/` - Valorar artículo
- `GET /api/articles/{slug}/comments/` - Listar comentarios
- `POST /api/articles/{slug}/comments/create/` - Crear comentario

### Recomendaciones
- `GET /api/recommendations/` - Obtener recomendaciones personalizadas

## Contribuir

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 