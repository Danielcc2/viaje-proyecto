from rest_framework import permissions
from users.models import UserRole

class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado para permitir que solo los autores puedan editar sus artículos.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permitir métodos seguros (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo permitir escritura si el usuario es el autor
        return obj.author == request.user 

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado para permitir que solo los propietarios de un objeto puedan editarlo.
    """
    def has_object_permission(self, request, view, obj):
        # Los permisos de lectura están permitidos para cualquier solicitud
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Los permisos de escritura solo están permitidos para el propietario del objeto
        return obj.author == request.user

class CanCreateContent(permissions.BasePermission):
    """
    Permiso personalizado para verificar si un usuario puede crear contenido.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Verificar si el usuario tiene el rol adecuado
        return request.user.is_authenticated and request.user.can_create_content() 