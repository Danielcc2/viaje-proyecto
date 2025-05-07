from rest_framework import serializers
from .models import User, Profile
from articles.models import Tag
from django.core.cache import cache

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'full_name', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True},
            'first_name': {'required': False},
            'last_name': {'required': False}
        }
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    interests = TagSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    interest_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Profile
        fields = ['id', 'user', 'interests', 'interest_ids']
    
    def update(self, instance, validated_data):
        interest_ids = validated_data.pop('interest_ids', None)
        interest_changed = False
        
        if interest_ids is not None:
            # Guardar los intereses anteriores para comparar
            previous_interests = set(instance.interests.values_list('id', flat=True))
            new_interests = set(interest_ids)
            
            # Comprobar si hay cambios en los intereses
            interest_changed = previous_interests != new_interests
            
            # Actualizar intereses
            instance.interests.clear()
            for interest_id in interest_ids:
                try:
                    tag = Tag.objects.get(id=interest_id)
                    instance.interests.add(tag)
                except Tag.DoesNotExist:
                    pass
        
        # Si los intereses han cambiado, regenerar recomendaciones
        if interest_changed:
            self.regenerate_recommendations(instance.user)
        
        return instance
    
    def regenerate_recommendations(self, user):
        """
        Algoritmo de recomendaciones usando la fórmula:
        SCORE = (PESO_USUARIO * COINCIDENCIAS_ETIQUETAS) + (PESO_COMUNIDAD * VALORACION_COMUNIDAD_NORMALIZADA)
        
        Donde:
        - COINCIDENCIAS_ETIQUETAS = número de etiquetas en común entre el usuario y el artículo.
        - VALORACION_COMUNIDAD_NORMALIZADA = valor entre 0 y 1 (rating promedio entre 1 y 5 → normalizado a 0.2 - 1.0).
        - PESO_USUARIO y PESO_COMUNIDAD = pesos ajustables (0.7 y 0.3 respectivamente).
        """
        try:
            # Importamos aquí para evitar importaciones circulares
            from recommendations.models import Recommendation
            from articles.models import Article, Rating, Tag
            from django.db.models import Q, Avg, Count
            from django.utils import timezone
            import random
            
            print(f"\n\n===== GENERANDO RECOMENDACIONES PARA {user.email} =====")
            
            # Limpiar recomendaciones existentes y cache
            Recommendation.objects.filter(user=user).delete()
            cache_key = f'recommendations_{user.id}'
            cache.delete(cache_key)
            
            # Obtener intereses del usuario
            user_interest_ids = list(user.profile.interests.values_list('id', flat=True))
            user_interest_slugs = list(Tag.objects.filter(id__in=user_interest_ids).values_list('slug', flat=True))
            
            if not user_interest_ids:
                print("AVISO: El usuario no tiene intereses seleccionados")
                return
                
            print(f"Intereses del usuario: {', '.join(user_interest_slugs)}")
            
            # Artículos ya vistos/valorados por el usuario
            seen_articles = Article.objects.filter(
                Q(ratings__user=user) | Q(author=user)
            ).values_list('id', flat=True).distinct()
            
            # Obtener todos los artículos
            all_articles = Article.objects.exclude(
                id__in=seen_articles
            ).annotate(
                avg_rating=Avg('ratings__score'),
                ratings_count=Count('ratings')
            )
            
            # Definir los pesos para la fórmula
            PESO_USUARIO = 0.7
            PESO_COMUNIDAD = 0.3
            
            # Calcular scores y preparar recomendaciones
            article_scores = []
            
            for article in all_articles:
                # Obtener etiquetas del artículo
                article_tag_ids = list(article.tags.values_list('id', flat=True))
                article_tag_slugs = list(article.tags.values_list('slug', flat=True))
                
                # Verificar coincidencias con intereses del usuario
                matching_tags = set(article_tag_ids).intersection(set(user_interest_ids))
                
                if not matching_tags:
                    continue  # Saltar si no hay coincidencias
                
                # 1. Calcular COINCIDENCIAS_ETIQUETAS
                # Normalizado: dividir por el número total de intereses del usuario para obtener un valor entre 0 y 1
                coincidencias_etiquetas = len(matching_tags) / len(user_interest_ids)
                
                # 2. Calcular VALORACION_COMUNIDAD_NORMALIZADA
                # Convertir el rating promedio (1-5) a un valor entre 0.2 y 1.0
                avg_rating = article.avg_rating or 0
                valoracion_comunidad = max(0.2, avg_rating / 5.0) if avg_rating else 0.2
                
                # 3. Aplicar la fórmula
                score = (PESO_USUARIO * coincidencias_etiquetas) + (PESO_COMUNIDAD * valoracion_comunidad)
                
                # Ajustar score al rango 0.1-0.99
                adjusted_score = min(0.99, max(0.1, score))
                
                # Redondear a 2 decimales para mejor visualización
                adjusted_score = round(adjusted_score * 100) / 100
                
                # Añadir a la lista de scores
                article_scores.append({
                    'article': article,
                    'score': adjusted_score,
                    'match_count': len(matching_tags),
                    'coincidencias_etiquetas': coincidencias_etiquetas,
                    'valoracion_comunidad': valoracion_comunidad,
                    'tags': article_tag_slugs
                })
                
                # Imprimir detalle de puntuación
                print(f"\nArtículo: {article.title}")
                print(f"  Tags: {', '.join(article_tag_slugs)}")
                print(f"  Coincidencias: {len(matching_tags)} de {len(user_interest_ids)} etiquetas ({coincidencias_etiquetas:.2f})")
                print(f"  Valoración comunidad: {avg_rating:.1f}/5.0 ({valoracion_comunidad:.2f})")
                print(f"  Score final: {adjusted_score:.2f}")
                
            # Ordenar por puntuación y crear recomendaciones
            sorted_articles = sorted(
                article_scores,
                key=lambda x: x['score'],
                reverse=True
            )
            
            # Crear las recomendaciones (máximo 4)
            recommendations_count = 0
            for item in sorted_articles[:4]:
                Recommendation.objects.create(
                    user=user,
                    article=item['article'],
                    score=item['score']
                )
                recommendations_count += 1
                print(f"✓ Recomendación creada: {item['article'].title} - Score: {item['score']:.2f}")
            
            # Si no hay suficientes recomendaciones con intereses, añadir populares
            if recommendations_count < 4:
                self._add_popular_recommendations(user, seen_articles, recommendations_count)
                
            print(f"===== FINALIZADO: {recommendations_count} RECOMENDACIONES GENERADAS =====\n")
            
        except Exception as e:
            import traceback
            print(f"Error regenerando recomendaciones: {e}")
            print(traceback.format_exc())
    
    def _add_popular_recommendations(self, user, seen_article_ids, existing_count):
        """Añadir recomendaciones basadas en popularidad"""
        from recommendations.models import Recommendation
        from articles.models import Article
        from django.db.models import Avg, Count
        import random
        
        try:
            remaining_needed = 4 - existing_count
            print(f"Añadiendo {remaining_needed} recomendaciones populares")
            
            # Excluir artículos ya recomendados y vistos
            already_recommended = Recommendation.objects.filter(user=user).values_list('article_id', flat=True)
            excluded_ids = list(already_recommended) + list(seen_article_ids)
            
            # Obtener artículos populares
            popular_articles = Article.objects.exclude(
                id__in=excluded_ids
            ).annotate(
                avg_rating=Avg('ratings__score'),
                ratings_count=Count('ratings')
            ).order_by('-avg_rating', '-ratings_count')[:remaining_needed*2]
            
            # Si hay suficientes, aleatorizar un poco para ofrecer variedad
            popular_articles = list(popular_articles)
            if len(popular_articles) > remaining_needed:
                popular_articles = random.sample(popular_articles, remaining_needed)
            
            # Crear recomendaciones populares usando solo el componente VALORACION_COMUNIDAD
            PESO_COMUNIDAD = 0.6  # Mayor peso a valoración comunitaria para artículos populares
            
            for article in popular_articles:
                # Normalizar valoración (1-5) a (0.2-1.0)
                avg_rating = article.avg_rating or 0
                valoracion_comunidad = max(0.2, avg_rating / 5.0) if avg_rating else 0.2
                
                # Calculamos score basado solo en valoración comunitaria
                score = PESO_COMUNIDAD * valoracion_comunidad
                
                # Asegurar que el score está entre 0.1 y 0.5 (menor que los basados en intereses)
                score = min(0.5, max(0.1, score))
                
                Recommendation.objects.create(
                    user=user,
                    article=article,
                    score=score
                )
                print(f"✓ Recomendación popular creada: {article.title} - Score: {score:.2f}")
                
        except Exception as e:
            print(f"Error añadiendo recomendaciones populares: {e}")

class UserRoleSerializer(serializers.ModelSerializer):
    """
    Serializador específico para actualizar el rol de usuario
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id', 'email', 'first_name', 'last_name'] 