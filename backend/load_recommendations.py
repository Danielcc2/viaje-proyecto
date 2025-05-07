#!/usr/bin/env python
"""
Script para cargar los artículos y recomendaciones de ejemplo en la base de datos.
Ejecutar desde el directorio raíz del proyecto backend:
python load_recommendations.py
"""

import os
import django
import sys

# Configurar entorno
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog_viaje.settings')
django.setup()

from django.db import transaction
from users.models import User, Profile
from articles.models import Article, Tag
from recommendations.models import Recommendation
from django.utils.text import slugify

def load_tags():
    """Cargar o recuperar tags necesarios"""
    tags = {
        'playas': 'Playas',
        'montanas': 'Montañas',
        'ciudades': 'Ciudades', 
        'gastronomia': 'Gastronomía',
        'aventura': 'Aventura',
        'cultural': 'Cultural',
        'europa': 'Europa',
        'asia': 'Asia'
    }
    
    tag_objects = {}
    
    for slug, name in tags.items():
        tag, created = Tag.objects.get_or_create(
            slug=slug,
            defaults={'name': name}
        )
        tag_objects[slug] = tag
        if created:
            print(f"Creado tag: {name}")
        else:
            print(f"Usando tag existente: {name}")
            
    return tag_objects

def load_articles(tags, admin_user):
    """Cargar artículos de ejemplo"""
    
    articles_data = [
        {
            'title': 'Las mejores playas de Tailandia',
            'slug': 'mejores-playas-tailandia',
            'content': 'Tailandia cuenta con algunas de las playas más espectaculares del mundo. Desde las conocidas playas de Phuket hasta las escondidas calas de Koh Lanta, descubre los mejores destinos costeros de este paraíso del sudeste asiático...',
            'tags': [tags['playas'], tags['asia']],
        },
        {
            'title': 'Guía completa para recorrer los Alpes suizos',
            'slug': 'guia-alpes-suizos',
            'content': 'Los Alpes suizos ofrecen algunas de las rutas de senderismo más impresionantes de Europa. Esta guía te ayudará a planificar tu viaje por las montañas, desde alojamientos y transporte hasta las mejores rutas según tu nivel de experiencia...',
            'tags': [tags['montanas'], tags['europa'], tags['aventura']],
        },
        {
            'title': 'Los mejores templos de Kioto: una ruta de 3 días',
            'slug': 'templos-kioto-ruta',
            'content': 'Kioto, la antigua capital imperial de Japón, alberga más de 1.600 templos budistas y 400 santuarios sintoístas. Te proponemos una ruta de tres días para descubrir los más importantes sin agotarte en el intento...',
            'tags': [tags['ciudades'], tags['cultural'], tags['asia']],
        },
        {
            'title': 'Ruta gastronómica por el norte de España',
            'slug': 'ruta-gastronomica-norte-espana',
            'content': 'El norte de España es un paraíso para los amantes de la buena mesa. Desde la sofisticada cocina vasca hasta los mariscos gallegos, pasando por los quesos asturianos y la repostería cántabra, te llevamos de viaje por los sabores del Cantábrico...',
            'tags': [tags['gastronomia'], tags['europa']],
        }
    ]
    
    article_objects = []
    
    for article_data in articles_data:
        article, created = Article.objects.get_or_create(
            slug=article_data['slug'],
            defaults={
                'title': article_data['title'],
                'content': article_data['content'],
                'author': admin_user
            }
        )
        
        if created:
            print(f"Creado artículo: {article.title}")
            article.tags.set(article_data['tags'])
        else:
            print(f"Usando artículo existente: {article.title}")
            
        article_objects.append(article)
    
    return article_objects

def load_recommendations(articles, user):
    """Crear recomendaciones para el usuario"""
    
    # Puntajes para los artículos
    scores = [0.95, 0.88, 0.82, 0.75]
    
    # Eliminar recomendaciones existentes para este usuario
    Recommendation.objects.filter(user=user).delete()
    
    # Crear nuevas recomendaciones
    for i, article in enumerate(articles):
        recommendation = Recommendation.objects.create(
            user=user,
            article=article,
            score=scores[i]
        )
        print(f"Creada recomendación: {recommendation}")

def main():
    print("Cargando datos de ejemplo para recomendaciones...")
    
    try:
        # Buscar usuario
        email = input("Ingresa el email del usuario para asignar las recomendaciones: ")
        
        try:
            user = User.objects.get(email=email)
            print(f"Usuario encontrado: {user.email}")
        except User.DoesNotExist:
            print(f"No se encontró usuario con email {email}.")
            print("Creando un nuevo usuario administrador...")
            user = User.objects.create_superuser(
                email=email,
                password="password123",
                first_name="Admin",
                last_name="Usuario"
            )
            print(f"Usuario administrador creado: {user.email}")
        
        # Crear perfil si no existe
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=user)
            print(f"Perfil creado para: {user.email}")
        
        # Buscar usuario administrador para autor de artículos
        try:
            admin_user = User.objects.filter(is_staff=True).first()
            if not admin_user:
                admin_user = user
        except:
            admin_user = user
        
        with transaction.atomic():
            # Cargar tags
            tags = load_tags()
            
            # Cargar artículos
            articles = load_articles(tags, admin_user)
            
            # Cargar recomendaciones
            load_recommendations(articles, user)
        
        print("¡Datos cargados exitosamente!")
        
    except Exception as e:
        print(f"Error cargando datos: {e}")
        
if __name__ == "__main__":
    main() 