from django.urls import path
from .views import (
    ArticleListView,
    ArticleDetailView,
    ArticleCreateView,
    ArticleUpdateView,
    ArticleDeleteView,
    TagListView,
    RateArticleView,
    CommentCreateView,
    CommentListView,
    RichTextImageUploadView,
    RichTextEditorConfigView,
    RichTextEditorDocsView,
)

urlpatterns = [
    path('', ArticleListView.as_view(), name='article-list'),
    path('create/', ArticleCreateView.as_view(), name='article-create'),
    path('tags/', TagListView.as_view(), name='tag-list'),
    path('upload-image/', RichTextImageUploadView.as_view(), name='rich-text-image-upload'),
    path('editor-config/', RichTextEditorConfigView.as_view(), name='rich-text-editor-config'),
    path('editor-docs/', RichTextEditorDocsView.as_view(), name='rich-text-editor-docs'),
    path('<slug:slug>/', ArticleDetailView.as_view(), name='article-detail'),
    path('<slug:slug>/update/', ArticleUpdateView.as_view(), name='article-update'),
    path('<slug:slug>/delete/', ArticleDeleteView.as_view(), name='article-delete'),
    path('<slug:slug>/rate/', RateArticleView.as_view(), name='article-rate'),
    path('<slug:slug>/comments/', CommentListView.as_view(), name='comment-list'),
    path('<slug:slug>/comments/create/', CommentCreateView.as_view(), name='comment-create'),
] 