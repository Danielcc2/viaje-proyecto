from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Profile, UserRole
from .serializers import UserSerializer, ProfileSerializer, UserRoleSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.core.exceptions import ObjectDoesNotExist

# Create your views here.

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class UpdateInterestsView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        # Intentar obtener el perfil del usuario
        try:
            return self.request.user.profile
        except ObjectDoesNotExist:
            # Crear un perfil para el usuario si no existe
            return Profile.objects.create(user=self.request.user)

class IsAdminUser(permissions.BasePermission):
    """
    Permiso para verificar si el usuario es administrador.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == UserRole.ADMIN or request.user.is_staff
        )

class UpdateUserRoleView(generics.UpdateAPIView):
    """
    Vista para actualizar el rol de un usuario (solo para administradores).
    """
    queryset = User.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'id'
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Guardar el rol anterior para incluirlo en la respuesta
        previous_role = instance.role
        
        self.perform_update(serializer)
        
        # Añadir información adicional a la respuesta
        response_data = serializer.data
        response_data['previous_role'] = previous_role
        response_data['message'] = f"Rol actualizado correctamente de '{dict(UserRole.choices)[previous_role]}' a '{dict(UserRole.choices)[instance.role]}'"
        
        return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_permissions(request):
    """
    Obtener los permisos del usuario autenticado
    """
    user = request.user
    
    return Response({
        'can_create_content': user.can_create_content(),
        'is_admin': user.role == UserRole.ADMIN or user.is_staff,
        'role': user.role
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_users(request):
    """
    Listar todos los usuarios (solo para administradores)
    """
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    
    return Response({
        'count': users.count(),
        'results': serializer.data
    })
