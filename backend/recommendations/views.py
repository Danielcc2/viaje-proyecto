from django.shortcuts import render
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from django.core.cache import cache
from django.db.models import Q, Avg, Count, Exists, OuterRef
from .models import Recommendation
from .serializers import RecommendationSerializer
from articles.models import Article, Rating, Tag
from users.models import Profile
import random

class UserRecommendationsView(generics.ListAPIView):
    serializer_class = RecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Verificamos si hay recomendaciones en cache
        cache_key = f'recommendations_{user.id}'
        queryset = cache.get(cache_key)
        
        if not queryset:
            # Si no hay en cache, generamos las recomendaciones
            queryset = self._generate_recommendations(user)
            # Guardamos en cache por 1 hora
            cache.set(cache_key, queryset, 60 * 60)
        
        return queryset
    
    def _generate_recommendations(self, user):
        """
        Algoritmo simple de recomendación:
        1. Obtener los intereses del usuario
        2. Encontrar artículos con esos tags
        3. Ordenar por valoración media
        4. Excluir artículos que el usuario ya ha valorado
        5. Crear/actualizar registros de recomendación
        """
        try:
            # Obtener los intereses del usuario
            user_profile = Profile.objects.get(user=user)
            user_interests = user_profile.interests.all()
            
            # Artículos que el usuario ya ha valorado
            rated_articles = Rating.objects.filter(user=user).values_list('article_id', flat=True)
            
            # Encontrar artículos con tags que coincidan con los intereses del usuario
            recommended_articles = Article.objects.exclude(id__in=rated_articles)
            
            if user_interests:
                recommended_articles = recommended_articles.filter(tags__in=user_interests)
            
            # Añadir información de valoración media y ordenar
            recommended_articles = recommended_articles.annotate(
                avg_rating=Avg('ratings__score'),
                ratings_count=Count('ratings')
            ).order_by('-avg_rating', '-ratings_count', '-created_at')
            
            # Limitar a 10 recomendaciones
            recommended_articles = recommended_articles[:10]
            
            # Crear o actualizar las recomendaciones
            recommendations = []
            for idx, article in enumerate(recommended_articles):
                # La puntuación es inversamente proporcional a la posición en la lista
                score = 1.0 - (idx / len(recommended_articles)) if recommended_articles else 0
                
                # Actualizar o crear recomendación
                recommendation, created = Recommendation.objects.update_or_create(
                    user=user,
                    article=article,
                    defaults={'score': score}
                )
                
                recommendations.append(recommendation)
            
            return recommendations
            
        except Exception as e:
            print(f"Error generando recomendaciones: {e}")
            return Recommendation.objects.filter(user=user)

class RecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Obtener recomendaciones para el usuario autenticado."""
        user = self.request.user
        return Recommendation.objects.filter(user=user).order_by('-score')
    
    def list(self, request):
        """
        Listar recomendaciones para el usuario. 
        Si no hay suficientes, genera algunas basadas en intereses.
        """
        user = request.user
        queryset = self.get_queryset()
        
        # Si no hay recomendaciones, crear algunas basadas en intereses
        if queryset.count() < 4:
            self._generate_recommendations(user)
            queryset = self.get_queryset()
        
        # Serializar y devolver
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data
        })
    
    def _generate_recommendations(self, user):
        """Generar recomendaciones basadas en intereses o populares."""
        # Limpiar recomendaciones existentes
        Recommendation.objects.filter(user=user).delete()
        
        user_interests = []
        try:
            # Intentar obtener intereses del perfil del usuario
            if hasattr(user, 'profile') and user.profile:
                user_interests = list(user.profile.interests.all().values_list('id', flat=True))
        except:
            pass
        
        # Artículos ya vistos/valorados por el usuario (para no recomendarlos)
        seen_articles = Article.objects.filter(
            Q(ratings__user=user) | Q(author=user)
        ).values_list('id', flat=True)
        
        # Obtener todos los artículos no vistos y anotar con valoraciones medias
        articles_query = Article.objects.exclude(id__in=seen_articles).annotate(
            avg_rating=Avg('ratings__score'),
            ratings_count=Count('ratings')
        )
        
        # Si hay intereses, priorizar artículos con esos tags
        if user_interests:
            articles_with_interest = articles_query.filter(
                tags__id__in=user_interests
            ).distinct()
            
            # Crear recomendaciones con puntajes altos para artículos con intereses
            for article in articles_with_interest[:4]:
                # Calcular score basado en cuántos tags coinciden con intereses
                article_tags = article.tags.values_list('id', flat=True)
                matching_tags = set(article_tags).intersection(set(user_interests))
                score = 0.7 + (0.3 * len(matching_tags) / max(len(user_interests), 1))
                
                try:
                    Recommendation.objects.update_or_create(
                        user=user,
                        article=article,
                        defaults={'score': min(0.99, score)}  # Asegurar que no exceda 1.0
                    )
                except Exception as e:
                    print(f"Error creando recomendación para {article.title}: {e}")
        
        # Si aún necesitamos más recomendaciones, agregar artículos populares
        if Recommendation.objects.filter(user=user).count() < 4:
            remaining_needed = 4 - Recommendation.objects.filter(user=user).count()
            
            # Excluir los ya recomendados
            already_recommended = Recommendation.objects.filter(user=user).values_list('article_id', flat=True)
            remaining_articles = articles_query.exclude(id__in=already_recommended)
            
            # Ordenar por popularidad (usando ratings como criterio)
            popular_articles = remaining_articles.order_by('-avg_rating', '-ratings_count')[:remaining_needed * 2]
            popular_articles = list(popular_articles)
            
            # Si hay suficientes, aleatorizar un poco para variedad
            if len(popular_articles) > remaining_needed:
                popular_articles = random.sample(popular_articles, remaining_needed)
            
            # Crear recomendaciones con puntajes menores para artículos populares
            for i, article in enumerate(popular_articles):
                try:
                    Recommendation.objects.update_or_create(
                        user=user,
                        article=article,
                        defaults={'score': 0.50 - (i * 0.05)}  # Descender de 0.50 a 0.35
                    )
                except Exception as e:
                    print(f"Error creando recomendación para {article.title}: {e}")
