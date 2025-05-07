from django.db import models
from django.conf import settings
from articles.models import Article

class Recommendation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    score = models.FloatField(
        help_text="Puntuación de relevancia entre 0 y 1"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-score']
        unique_together = ['user', 'article']
    
    def __str__(self):
        return f"Recomendación de {self.article.title} para {self.user.email} ({self.score:.2f})"
