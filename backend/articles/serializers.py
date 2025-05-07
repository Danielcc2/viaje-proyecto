from rest_framework import serializers
import json
import bleach
import re
from django.conf import settings
from .models import Article, Tag, Rating, Comment
from users.serializers import UserSerializer
from users.models import User
from django.db.models import Avg, Count

# Configuraciones para sanitizar el HTML
ALLOWED_TAGS = [
    'a', 'abbr', 'acronym', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
]

ALLOWED_ATTRIBUTES = {
    '*': ['class', 'style'],
    'a': ['href', 'title', 'target'],
    'abbr': ['title'],
    'acronym': ['title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['width', 'border', 'align', 'cellpadding', 'cellspacing'],
    'td': ['width', 'align', 'valign'],
    'th': ['width', 'align', 'valign', 'scope'],
}

ALLOWED_STYLES = [
    'color', 'background-color', 'font-size', 'text-align', 'margin', 'margin-left', 'margin-right',
    'width', 'height', 'font-weight', 'font-style', 'text-decoration', 'border', 'padding', 'padding-left',
    'padding-right'
]

# Función común para sanitizar HTML
def sanitize_html(value):
    """
    Sanitizar el contenido HTML para prevenir ataques XSS y limpiar información de depuración
    """
    # Eliminar comentarios HTML que pueden contener información de depuración
    value = re.sub(r'<!--(.*?)-->', '', value, flags=re.DOTALL)
    
    # Eliminar atributos de data- que pueden contener información de depuración
    value = re.sub(r' data-[a-zA-Z0-9\-_]+="[^"]*"', '', value)
    
    # Sanitizar el HTML
    clean_value = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True
    )
    
    # Verificar que el HTML sea válido y corregir posibles etiquetas mal formadas
    return clean_value

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name']
    
    def get_display_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.email.split('@')[0]  # Usar parte del email si no hay nombre

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'author_name', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_author_name(self, obj):
        return obj.user.get_full_name()
    
    def validate_content(self, value):
        return sanitize_html(value)

class ArticleSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    new_tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False
    )
    author = UserSerializer(read_only=True)
    avg_rating = serializers.FloatField(read_only=True)
    ratings_count = serializers.IntegerField(read_only=True)
    continent_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'image',
            'author', 'tags', 'tag_ids', 'new_tags', 'created_at', 'updated_at',
            'avg_rating', 'ratings_count', 'is_destination', 'continent', 'continent_name'
        ]
        read_only_fields = ['author', 'slug', 'created_at', 'updated_at']
    
    def get_continent_name(self, obj):
        """
        Obtiene el nombre del continente del artículo
        """
        if obj.continent:
            return obj.continent.name
        return None
    
    def validate(self, data):
        """
        Validar que si is_destination es True, continent sea obligatorio
        """
        is_destination = data.get('is_destination', False)
        continent = data.get('continent', None)
        
        if is_destination and not continent:
            raise serializers.ValidationError(
                {"continent": "El campo continente es obligatorio cuando el artículo es un destino."}
            )
        
        return data

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        new_tags = validated_data.pop('new_tags', [])
        
        article = Article.objects.create(
            author=self.context['request'].user,
            **validated_data
        )
        
        # Procesar IDs de tags existentes
        if tag_ids:
            article.tags.set(Tag.objects.filter(id__in=tag_ids))
        
        # Procesar nuevas etiquetas
        if new_tags:
            # Procesar cada etiqueta y verificar si contiene comas
            processed_tags = []
            for tag_item in new_tags:
                # Limpiar y dividir por comas si existen
                if isinstance(tag_item, str):
                    # Verificar si la etiqueta contiene comas para dividirla
                    if ',' in tag_item:
                        # Dividir por comas y procesar cada parte
                        for split_tag in tag_item.split(','):
                            split_tag = split_tag.strip()
                            if split_tag:
                                processed_tags.append(split_tag)
                    else:
                        # Etiqueta sin comas
                        tag_name = tag_item.strip()
                        if tag_name:
                            processed_tags.append(tag_name)
            
            # Crear o obtener cada tag y añadirlo al artículo
            for tag_name in processed_tags:
                # Eliminar posibles caracteres especiales
                tag_name = tag_name.replace('[', '').replace(']', '').replace('"', '')
                
                if not tag_name:
                    continue
                    
                # Buscar si ya existe un tag con ese nombre o crear uno nuevo
                tag, created = Tag.objects.get_or_create(
                    name__iexact=tag_name,
                    defaults={'name': tag_name}
                )
                
                # Añadir el tag al artículo
                article.tags.add(tag)
        
        return article

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        new_tags = validated_data.pop('new_tags', [])
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if tag_ids is not None:
            instance.tags.set(Tag.objects.filter(id__in=tag_ids))
        
        # Procesar nuevas etiquetas
        if new_tags:
            # Procesar cada etiqueta y verificar si contiene comas
            processed_tags = []
            for tag_item in new_tags:
                # Limpiar y dividir por comas si existen
                if isinstance(tag_item, str):
                    # Verificar si la etiqueta contiene comas para dividirla
                    if ',' in tag_item:
                        # Dividir por comas y procesar cada parte
                        for split_tag in tag_item.split(','):
                            split_tag = split_tag.strip()
                            if split_tag:
                                processed_tags.append(split_tag)
                    else:
                        # Etiqueta sin comas
                        tag_name = tag_item.strip()
                        if tag_name:
                            processed_tags.append(tag_name)
            
            # Crear o obtener cada tag y añadirlo al artículo
            for tag_name in processed_tags:
                # Eliminar posibles caracteres especiales
                tag_name = tag_name.replace('[', '').replace(']', '').replace('"', '')
                
                if not tag_name:
                    continue
                    
                # Buscar si ya existe un tag con ese nombre o crear uno nuevo
                tag, created = Tag.objects.get_or_create(
                    name__iexact=tag_name,
                    defaults={'name': tag_name}
                )
                
                # Añadir el tag al artículo
                instance.tags.add(tag)
        
        return instance
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Agregar calificaciones si no están presentes
        if 'avg_rating' not in representation or representation['avg_rating'] is None:
            representation['avg_rating'] = instance.ratings.aggregate(avg=Avg('score'))['avg']
            
        if 'ratings_count' not in representation or representation['ratings_count'] is None:
            representation['ratings_count'] = instance.ratings.count()
            
        return representation

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'article', 'user', 'score', 'created_at']
        read_only_fields = ['user', 'created_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        article = validated_data.get('article')
        
        # Check if user has already rated this article
        try:
            rating = Rating.objects.get(user=user, article=article)
            rating.score = validated_data.get('score')
            rating.save()
            return rating
        except Rating.DoesNotExist:
            return Rating.objects.create(user=user, **validated_data) 