"""
Script para probar el nuevo algoritmo de recomendaciones:
SCORE = (PESO_USUARIO * COINCIDENCIAS_ETIQUETAS) + (PESO_COMUNIDAD * VALORACION_COMUNIDAD_NORMALIZADA)
"""

import os
import sys
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog_viaje.settings')
django.setup()

from django.db.models import Avg
from django.contrib.auth import get_user_model
from articles.models import Article, Tag, Rating
from recommendations.models import Recommendation
from users.models import Profile

User = get_user_model()

def test_recommendation_algorithm():
    """
    Prueba el algoritmo de recomendaciones con distintos usuarios y combinaciones.
    """
    print("\n===== PRUEBA DE ALGORITMO DE RECOMENDACIONES =====")
    print("FÓRMULA: SCORE = (0.7 * COINCIDENCIAS_ETIQUETAS) + (0.3 * VALORACION_COMUNIDAD_NORMALIZADA)")
    
    # 1. Obtener usuario de prueba (o crear uno si no existe)
    username = 'test_recommendations@example.com'
    try:
        user = User.objects.get(email=username)
        print(f"Usuario de prueba encontrado: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=username, 
            password='testpassword123',
            first_name='Test',
            last_name='User'
        )
        print(f"Usuario de prueba creado: {user.email}")
    
    # 2. Asegurarnos que tiene perfil
    try:
        profile = user.profile
    except:
        profile = Profile.objects.create(user=user)
    
    # 3. Asignar intereses al perfil
    interests = Tag.objects.all()[:5]  # Tomar 5 etiquetas aleatorias
    profile.interests.clear()  # Limpiar intereses existentes
    interest_names = []
    
    for tag in interests:
        profile.interests.add(tag)
        interest_names.append(tag.name)
    
    print(f"Intereses asignados: {', '.join(interest_names)}")
    
    # 4. Limpiar recomendaciones existentes
    Recommendation.objects.filter(user=user).delete()
    
    # 5. Regenerar recomendaciones usando ProfileSerializer
    from users.serializers import ProfileSerializer
    serializer = ProfileSerializer()
    serializer.regenerate_recommendations(user)
    
    # 6. Mostrar las recomendaciones generadas
    recommendations = Recommendation.objects.filter(user=user).order_by('-score')
    
    print("\n===== RECOMENDACIONES GENERADAS =====")
    if recommendations.count() == 0:
        print("No se generaron recomendaciones.")
        return
    
    for i, rec in enumerate(recommendations, 1):
        # Calcular manualmente el score para verificar
        article_tags = rec.article.tags.all()
        matching_tags = set(article_tags.values_list('id', flat=True)).intersection(
            set(profile.interests.values_list('id', flat=True))
        )
        
        coincidencias_etiquetas = len(matching_tags) / profile.interests.count()
        avg_rating = rec.article.ratings.aggregate(Avg('score'))['score__avg'] or 0
        valoracion_comunidad = max(0.2, avg_rating / 5.0) if avg_rating else 0.2
        
        calculated_score = (0.7 * coincidencias_etiquetas) + (0.3 * valoracion_comunidad)
        calculated_score = min(0.99, max(0.1, round(calculated_score * 100) / 100))
        
        print(f"Recomendación #{i}:")
        print(f"  Artículo: {rec.article.title}")
        print(f"  Tags: {', '.join([t.name for t in article_tags])}")
        print(f"  Coincidencias: {len(matching_tags)} de {profile.interests.count()} etiquetas")
        print(f"  Rating promedio: {avg_rating:.1f}/5.0")
        print(f"  Score almacenado: {rec.score:.2f}")
        print(f"  Score calculado: {calculated_score:.2f}")
        print()
    
    print("===== FIN DE PRUEBA =====")

if __name__ == "__main__":
    test_recommendation_algorithm() 