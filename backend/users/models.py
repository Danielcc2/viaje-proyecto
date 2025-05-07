from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

class UserRole(models.TextChoices):
    READER = 'reader', 'Lector'
    WRITER = 'writer', 'Escritor'
    ADMIN = 'admin', 'Administrador'

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El Email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.READER,
        help_text="Rol del usuario que determina sus permisos en la plataforma"
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = CustomUserManager()
    
    def __str__(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.email
    
    def get_full_name(self):
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.email
    
    def get_short_name(self):
        return self.first_name or self.email.split('@')[0]
    
    def can_create_content(self):
        return self.role in [UserRole.WRITER, UserRole.ADMIN] or self.is_staff

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    interests = models.ManyToManyField('articles.Tag', related_name='users_interested')
    # Definimos la relación con los tags aquí directamente
    # La definiremos durante las migraciones después de que exista la tabla Tag
    
    def __str__(self):
        return f"Perfil de {self.user}"
