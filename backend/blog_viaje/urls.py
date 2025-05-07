"""
URL configuration for blog_viaje project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from articles.views import (
    ArticleListView, ArticleDetailView, ArticleCreateView, 
    ArticleUpdateView, ArticleDeleteView, TagListView,
    RateArticleView, CommentListView, CommentCreateView,
    RichTextEditorConfigView, RichTextImageUploadView, RichTextEditorDocsView
)

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'users': reverse('user-register', request=request, format=format),
        'articles': reverse('article-list', request=request, format=format),
        'destinations': reverse('destination-list', request=request, format=format),
        'recommendations': reverse('user-recommendations', request=request, format=format),
        'token': reverse('token_obtain_pair', request=request, format=format),
        'token_refresh': reverse('token_refresh', request=request, format=format),
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('users.urls')),
    path('api/articles/', ArticleListView.as_view(), name='article-list'),
    path('api/articles/create/', ArticleCreateView.as_view(), name='article-create'),
    path('api/articles/<slug:slug>/', ArticleDetailView.as_view(), name='article-detail'),
    path('api/articles/<slug:slug>/update/', ArticleUpdateView.as_view(), name='article-update'),
    path('api/articles/<slug:slug>/delete/', ArticleDeleteView.as_view(), name='article-delete'),
    path('api/articles/<int:pk>/delete/', ArticleDeleteView.as_view(), name='article-delete-by-id'),
    path('api/articles/<slug:slug>/rate/', RateArticleView.as_view(), name='article-rate'),
    path('api/articles/<slug:slug>/comments/', CommentListView.as_view(), name='article-comments'),
    path('api/articles/<slug:slug>/comments/create/', CommentCreateView.as_view(), name='comment-create'),
    path('api/tags/', TagListView.as_view(), name='tag-list'),
    path('api/recommendations/', include('recommendations.urls')),
    path('api/destinations/', include('destinations.urls')),
    path('api/articles/editor-config/', RichTextEditorConfigView.as_view(), name='editor-config'),
    path('api/articles/upload-image/', RichTextImageUploadView.as_view(), name='upload-image'),
    path('api/articles/editor-docs/', RichTextEditorDocsView.as_view(), name='editor-docs'),
    path('summernote/', include('django_summernote.urls')),
]

# Servir archivos media durante desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
