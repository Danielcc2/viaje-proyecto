from django.db import models
from django.utils.text import slugify
import unidecode
from users.models import User, Profile
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver
from destinations.models import Continent

def create_unique_slug(instance, new_slug=None):
    """
    Crear un slug único para un modelo dado. Si el slug ya existe, agrega un número al final.
    """
    slug = new_slug or slugify(unidecode.unidecode(instance.name))
    ModelClass = instance.__class__
    qs_exists = ModelClass.objects.filter(slug=slug).exists()
    
    if qs_exists:
        # Si el slug ya existe, agregamos un número al final
        new_slug = f"{slug}-{ModelClass.objects.filter(slug__startswith=slug).count() + 1}"
        return create_unique_slug(instance, new_slug=new_slug)
    
    return slug

class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = create_unique_slug(self)
        super().save(*args, **kwargs)

class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='articles')
    content = models.TextField()
    image = models.ImageField(upload_to='articles/', null=True, blank=True)
    tags = models.ManyToManyField(Tag, related_name='articles')
    is_destination = models.BooleanField(default=False, help_text="Indica si este artículo debe ser tratado como un destino")
    continent = models.ForeignKey(Continent, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles', help_text="Continente al que pertenece este artículo si es un destino")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title

class Rating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='ratings')
    score = models.IntegerField(choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')])
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'article')
    
    def __str__(self):
        return f"{self.user.email} puntuó {self.article.title}: {self.score}"

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} comentó en {self.article.title}"

@receiver(post_save, sender=Article)
def create_destination_from_article(sender, instance, created, **kwargs):
    """
    Crea un destino automáticamente cuando se crea o actualiza un artículo
    que tiene is_destination=True
    """
    if instance.is_destination:
        # Importamos aquí para evitar importaciones circulares
        from destinations.models import Destination
        
        try:
            # Verificar si ya existe un destino con el mismo slug
            try:
                destination = Destination.objects.get(slug=instance.slug)
                # Actualizar el destino existente con los datos del artículo
                destination.name = instance.title
                destination.description = instance.content
                destination.image = instance.image
                # Lo más importante: Actualizar el continente
                destination.continent = instance.continent
                destination.save()
                print(f"Destino actualizado: {destination.name}, Continente: {instance.continent.name if instance.continent else 'No definido'}")
            except Destination.DoesNotExist:
                # Usar el continente seleccionado por el usuario
                continent = instance.continent
                
                # Determinar país y ciudad - usar valores predeterminados basados en el título
                # si no se proporcionaron explícitamente
                country = 'España'  # Valor por defecto
                city = instance.title  # Usar el título como nombre de la ciudad por defecto
                
                # Crear el destino
                destination = Destination(
                    name=instance.title,
                    slug=instance.slug,
                    description=instance.content,
                    country=country,
                    city=city,
                    continent=continent,
                    image=instance.image
                )
                destination.save()
                
                # Log para depuración
                print(f"Destino creado: {destination.name}, País: {destination.country}, Ciudad: {destination.city}, Continente: {continent.name if continent else 'No definido'}")
        except Exception as e:
            # Log de error para depuración
            print(f"Error al crear/actualizar destino: {str(e)}")
