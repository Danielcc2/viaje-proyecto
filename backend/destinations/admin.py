from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin
from .models import Destination, Continent

class ContinentAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

class DestinationAdmin(SummernoteModelAdmin):
    summernote_fields = ('description',)
    list_display = ('name', 'country', 'city', 'continent', 'created_at', 'updated_at')
    list_filter = ('country', 'continent', 'created_at')
    search_fields = ('name', 'description', 'country', 'city')
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ('continent',)
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(Destination, DestinationAdmin)
admin.site.register(Continent, ContinentAdmin)
