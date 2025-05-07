from django.contrib import admin
from .models import Recommendation

class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'article', 'score_percentage', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__email', 'article__title')
    
    def score_percentage(self, obj):
        """Mostrar el score como porcentaje"""
        return f"{int(obj.score * 100)}%"
    
    score_percentage.short_description = "Score (%)"
    
    def get_queryset(self, request):
        """Mostrar solo recomendaciones relevantes al usuario admin"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

admin.site.register(Recommendation, RecommendationAdmin)
