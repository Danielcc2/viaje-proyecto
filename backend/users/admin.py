from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Profile, UserRole
from django.utils.html import format_html

class UserRoleFilter(admin.SimpleListFilter):
    title = _('Rol de usuario')
    parameter_name = 'role'

    def lookups(self, request, model_admin):
        return UserRole.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset

class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'get_full_name', 'get_role_badge', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_active', UserRoleFilter)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('User role'), {
            'fields': ('role',),
            'description': _(
                'Roles de usuario:<br>'
                '<strong>Administrador (Admin)</strong>: Acceso total a todo el sistema.<br>'
                '<strong>Editor (Writer)</strong>: Puede crear sus propios artículos y editarlos.<br>'
                '<strong>Lector (Reader)</strong>: Solo puede ver los artículos, sin permisos de edición.'
            ),
        }),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
                                       'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Nombre completo'
    
    def get_role_badge(self, obj):
        role_colors = {
            UserRole.ADMIN: 'red',
            UserRole.WRITER: 'green',
            UserRole.READER: 'blue',
        }
        role_text = dict(UserRole.choices).get(obj.role, obj.role)
        color = role_colors.get(obj.role, 'gray')
        return format_html(
            '<span style="background-color:{}; color:white; padding:3px 7px; border-radius:3px;">{}</span>',
            color, role_text
        )
    get_role_badge.short_description = 'Rol'
    
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_user_role', 'get_interests')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    list_filter = ('user__role',)
    
    def get_interests(self, obj):
        interests = list(obj.interests.values_list('name', flat=True))
        if not interests:
            return '—'
        return ", ".join(interests)
    get_interests.short_description = 'Intereses'
    
    def get_user_role(self, obj):
        return dict(UserRole.choices).get(obj.user.role, obj.user.role)
    get_user_role.short_description = 'Rol'

admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
