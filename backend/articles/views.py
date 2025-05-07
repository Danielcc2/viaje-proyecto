from django.shortcuts import render
from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count
from .models import Article, Tag, Rating, Comment
from .serializers import (
    ArticleSerializer, 
    TagSerializer, 
    RatingSerializer,
    CommentSerializer,
    ALLOWED_TAGS,
    ALLOWED_ATTRIBUTES,
    ALLOWED_STYLES,
)
from .permissions import IsAuthorOrReadOnly, CanCreateContent
from django_summernote.utils import get_attachment_model
from django.conf import settings
from django.http import Http404

# Vista para obtener la configuración del editor de texto enriquecido
class RichTextEditorConfigView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, *args, **kwargs):
        config = {
            'uploadUrl': request.build_absolute_uri('/api/articles/upload-image/'),
            'toolbar': settings.SUMMERNOTE_CONFIG['summernote']['toolbar'],
            'height': settings.SUMMERNOTE_CONFIG['summernote']['height'],
            'width': settings.SUMMERNOTE_CONFIG['summernote']['width'],
        }
        return Response(config)

# Vista para la carga de imágenes del editor de texto enriquecido
class RichTextImageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({'error': 'No se proporcionó ningún archivo'}, status=status.HTTP_400_BAD_REQUEST)
        
        attachment = get_attachment_model()
        file_obj = attachment.objects.create(
            name=request.FILES['file'].name,
            file=request.FILES['file'],
            uploaded_by=request.user
        )
        
        return Response({
            'url': file_obj.file.url,
            'filename': file_obj.name
        }, status=status.HTTP_201_CREATED)

# Vista para obtener la documentación del editor
class RichTextEditorDocsView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, *args, **kwargs):
        docs = {
            'editor': {
                'descripción': 'Editor de texto enriquecido con soporte para formato, multimedia y alineación',
                'endpoints': {
                    'configuración': request.build_absolute_uri('/api/articles/editor-config/'),
                    'carga_de_imágenes': request.build_absolute_uri('/api/articles/upload-image/'),
                },
                'funcionalidades': {
                    'formato_de_texto': [
                        'Encabezados (H1-H6)',
                        'Texto en negrita, cursiva, subrayado',
                        'Listas ordenadas y no ordenadas',
                        'Sangría',
                    ],
                    'elementos_multimedia': [
                        'Inserción de enlaces',
                        'Inserción de imágenes',
                        'Color de texto y fondo',
                        'Alineación de texto',
                    ],
                },
                'etiquetas_permitidas': ALLOWED_TAGS,
                'atributos_permitidos': ALLOWED_ATTRIBUTES,
                'estilos_permitidos': ALLOWED_STYLES,
            }
        }
        return Response(docs)

# Create your views here.

class ArticleListView(generics.ListAPIView):
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'content', 'tags__name']
    filterset_fields = ['tags__slug']
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Article.objects.all().annotate(
            avg_rating=Avg('ratings__score'),
            ratings_count=Count('ratings')
        )
        
        # Filtrar por tags si se proporciona en la URL
        tags = self.request.query_params.getlist('tags')
        if tags:
            queryset = queryset.filter(tags__slug__in=tags).distinct()
        
        return queryset

class ArticleDetailView(generics.RetrieveAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Article.objects.all().annotate(
            avg_rating=Avg('ratings__score'),
            ratings_count=Count('ratings')
        )

class ArticleCreateView(generics.CreateAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, CanCreateContent]

class ArticleUpdateView(generics.UpdateAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    lookup_field = 'slug'
    permission_classes = [IsAuthorOrReadOnly]

class ArticleDeleteView(generics.DestroyAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthorOrReadOnly]
    
    def get_object(self):
        # Permitir eliminación tanto por slug como por id
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        
        if 'pk' in self.kwargs:
            # Si se proporciona un ID, buscar por ID
            self.lookup_field = 'pk'
            return super().get_object()
        elif 'slug' in self.kwargs:
            # Si se proporciona un slug, buscar por slug
            self.lookup_field = 'slug'
            return super().get_object()
        else:
            raise Http404("Se requiere un ID o slug para eliminar el artículo")

class TagListView(generics.ListAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class RateArticleView(generics.CreateAPIView):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        try:
            article = Article.objects.get(slug=kwargs.get('slug'))
            score = request.data.get('score')
            
            if not score or not (1 <= int(score) <= 5):
                return Response(
                    {'error': 'La puntuación debe estar entre 1 y 5'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Actualizar rating si ya existe, si no, crear uno nuevo
            rating, created = Rating.objects.update_or_create(
                user=request.user,
                article=article,
                defaults={'score': score}
            )
            
            serializer = self.get_serializer(rating)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Article.DoesNotExist:
            return Response(
                {'error': 'Artículo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

class CommentListView(generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return Comment.objects.filter(article__slug=slug)

class CommentCreateView(generics.CreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        try:
            article = Article.objects.get(slug=kwargs.get('slug'))
            serializer = self.get_serializer(data=request.data)
            
            if serializer.is_valid():
                serializer.save(user=request.user, article=article)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Article.DoesNotExist:
            return Response(
                {'error': 'Artículo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
