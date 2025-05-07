from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin
from .models import Article, Tag, Rating, Comment

class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

class ArticleAdmin(SummernoteModelAdmin):
    summernote_fields = ('content',)
    list_display = ('title', 'author', 'is_destination', 'continent', 'created_at', 'updated_at')
    list_filter = ('created_at', 'tags', 'is_destination', 'continent')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ('tags',)
    readonly_fields = ('created_at', 'updated_at')
    actions = ['delete_selected']
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        
        # Hacer que el campo continent sea obligatorio si is_destination está marcado
        if form.base_fields.get('is_destination') and form.base_fields.get('continent'):
            form.base_fields['is_destination'].help_text = 'Indica si este artículo debe ser tratado como un destino. Si marcas esta opción, debes seleccionar un continente.'
        
        return form
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(author=request.user)

class RatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'article', 'score', 'created_at')
    list_filter = ('score', 'created_at')
    search_fields = ('user__email', 'article__title')
    readonly_fields = ('created_at',)

class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'article', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'article__title', 'content')
    readonly_fields = ('created_at',)

admin.site.register(Tag, TagAdmin)
admin.site.register(Article, ArticleAdmin)
admin.site.register(Rating, RatingAdmin)
admin.site.register(Comment, CommentAdmin)
