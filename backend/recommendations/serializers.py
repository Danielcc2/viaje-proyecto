from rest_framework import serializers
from .models import Recommendation
from articles.serializers import ArticleSerializer

class RecommendationSerializer(serializers.ModelSerializer):
    article = ArticleSerializer(read_only=True)
    
    class Meta:
        model = Recommendation
        fields = ['id', 'article', 'score', 'created_at']
        read_only_fields = ['id', 'created_at'] 