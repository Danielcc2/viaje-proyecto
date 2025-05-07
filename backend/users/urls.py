from django.urls import path
from .views import (
    UserRegistrationView,
    UserProfileView,
    UpdateInterestsView,
    user_permissions,
    UpdateUserRoleView,
    list_users,
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('interests/', UpdateInterestsView.as_view(), name='update-interests'),
    path('permissions/', user_permissions, name='user-permissions'),
    path('list/', list_users, name='user-list'),
    path('<int:id>/update-role/', UpdateUserRoleView.as_view(), name='update-user-role'),
] 