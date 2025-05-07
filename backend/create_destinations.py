import os
import django

# Configurar entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog_viaje.settings')
django.setup()

from destinations.models import Destination
from django.core.files.base import ContentFile
import requests
import shutil
import time
import os.path

# Datos de los destinos ejemplo
destinations_data = [
    {
        'name': 'Playas de Tailandia',
        'slug': 'tailandia',
        'description': '<p>Tailandia es famosa por sus playas paradisíacas que atraen a millones de visitantes cada año. Desde las populares Phi Phi Islands hasta las más tranquilas playas de Koh Lanta, hay opciones para todos los gustos.</p><p>El sur de Tailandia ofrece algunas de las aguas más cristalinas del mundo, perfectas para practicar snorkel y buceo. La rica vida marina, con arrecifes de coral coloridos y una gran variedad de peces tropicales, hacen de estas actividades una experiencia inolvidable.</p><p>Además de sus playas, Tailandia también es conocida por su exquisita gastronomía, cultura fascinante y gente acogedora. No te pierdas la oportunidad de probar el auténtico Pad Thai, visitar los templos budistas y disfrutar del legendario masaje tailandés.</p>',
        'country': 'Tailandia',
        'city': 'Varios destinos',
        'image_url': '/images/destinos/tailandia.jpg',
        'filename': 'tailandia.jpg'
    },
    {
        'name': 'Montañas de Suiza',
        'slug': 'suiza',
        'description': '<p>Suiza es sinónimo de belleza alpina, con sus majestuosas montañas, valles verdes y lagos de agua cristalina. Los Alpes suizos ofrecen algunas de las mejores experiencias de senderismo, esquí y alpinismo del mundo.</p><p>Los pueblos tradicionales suizos, con sus casas de madera y balcones floridos, parecen sacados de un cuento de hadas. Lugares como Zermatt, al pie del icónico Matterhorn, o Grindelwald, en la región de Jungfrau, combinan tradición con instalaciones modernas para los visitantes.</p><p>El sistema de transporte suizo, eficiente y puntual, facilita el acceso incluso a los rincones más remotos. Los trenes panorámicos como el Glacier Express o el Bernina Express son en sí mismos una atracción turística, ofreciendo vistas espectaculares del paisaje alpino.</p>',
        'country': 'Suiza',
        'city': 'Alpes Suizos',
        'image_url': '/images/destinos/suiza.jpg',
        'filename': 'suiza.jpg'
    },
    {
        'name': 'Ciudades de Japón',
        'slug': 'japon',
        'description': '<p>Japón ofrece un fascinante contraste entre lo antiguo y lo moderno. Tokio, su capital, es una metrópolis vibrante con rascacielos futuristas, tecnología de vanguardia y una escena gastronómica excepcional, mientras que Kioto preserva la esencia tradicional japonesa con sus templos centenarios, jardines zen y geishas.</p><p>La cultura japonesa, profundamente arraigada en el respeto, la armonía y la atención al detalle, se manifiesta en cada aspecto de la vida diaria. Desde la ceremonia del té hasta las artes marciales, pasando por la elaborada presentación de sus platos, Japón ofrece innumerables oportunidades para sumergirse en tradiciones milenarias.</p><p>La gastronomía japonesa, reconocida como Patrimonio Cultural Inmaterial por la UNESCO, va mucho más allá del sushi. Ramen, tempura, okonomiyaki y wagyu son solo algunas de las delicias culinarias que podrás degustar durante tu visita.</p>',
        'country': 'Japón',
        'city': 'Tokio, Kioto, Osaka',
        'image_url': '/images/destinos/japon.jpg',
        'filename': 'japon.jpg'
    },
    {
        'name': 'Cartagena de Indias',
        'slug': 'cartagena',
        'description': '<p>Cartagena de Indias, declarada Patrimonio de la Humanidad por la UNESCO, es una joya colonial en la costa caribeña de Colombia. Sus calles empedradas, casas coloridas con balcones floridos y plazas encantadoras transportan al visitante a la época colonial española.</p><p>El casco antiguo, rodeado por una imponente muralla construida para defender la ciudad de piratas y corsarios, alberga iglesias históricas, mansiones convertidas en boutique hotels y una vibrante escena gastronómica que fusiona sabores caribeños, africanos y españoles.</p><p>Más allá del centro histórico, las playas de aguas turquesas como Playa Blanca o las Islas del Rosario ofrecen un paraíso tropical para los amantes del sol y el mar. La combinación perfecta de historia, cultura y naturaleza hace de Cartagena un destino imprescindible en Sudamérica.</p>',
        'country': 'Colombia',
        'city': 'Cartagena',
        'image_url': '/images/destinos/cartagena.jpg',
        'filename': 'cartagena.jpg'
    },
    {
        'name': 'Safari en Kenia',
        'slug': 'kenia',
        'description': '<p>Kenia ofrece una de las experiencias de safari más emblemáticas del continente africano. El país alberga algunos de los parques nacionales y reservas más reconocidos del mundo, como el Masai Mara, donde cada año tiene lugar la Gran Migración, un espectáculo natural en el que millones de ñus y cebras cruzan las llanuras en busca de pastos frescos.</p><p>Los "Big Five" (león, leopardo, elefante, rinoceronte y búfalo) son el principal atractivo para muchos visitantes, pero la diversidad de fauna va mucho más allá: jirafas, chitas, hipopótamos, cocodrilos y más de 1,000 especies de aves componen un ecosistema de increíble riqueza.</p><p>La experiencia se completa con la oportunidad de conocer la cultura masai, cuyos coloridos atuendos y tradiciones ancestrales añaden un componente humano fascinante a la aventura. Los alojamientos, desde lujosos lodges hasta campamentos tradicionales, permiten despertar con vistas privilegiadas a la sabana africana.</p>',
        'country': 'Kenia',
        'city': 'Masai Mara, Amboseli',
        'image_url': '/images/destinos/kenia.jpg',
        'filename': 'kenia.jpg'
    },
    {
        'name': 'Sidney y alrededores',
        'slug': 'sidney',
        'description': '<p>Sídney, la ciudad más poblada de Australia, combina a la perfección un entorno natural privilegiado con una vibrante escena urbana. Su bahía, una de las más bellas del mundo, está dominada por dos iconos mundialmente reconocibles: el Puente del Puerto de Sídney y la Casa de la Ópera, cuya arquitectura única semeja velas desplegadas al viento.</p><p>Las playas de Sídney, como la famosa Bondi Beach, son el corazón de la cultura australiana del surf y el ocio al aire libre. El paseo costero entre Bondi y Coogee ofrece algunos de los paisajes más espectaculares de la costa este australiana.</p><p>Más allá de la ciudad, las Montañas Azules a solo dos horas en coche, ofrecen un paisaje de bosques de eucaliptos, acantilados y formaciones rocosas como las Tres Hermanas. La región vinícola del Valle Hunter, también cercana, es perfecta para los amantes del buen vino y la gastronomía.</p>',
        'country': 'Australia',
        'city': 'Sidney',
        'image_url': '/images/destinos/sidney.jpg',
        'filename': 'sidney.jpg'
    }
]

def create_destinations():
    print("Creando destinos ejemplo...")
    
    # Eliminar destinos previos con los mismos slugs para evitar duplicados
    for destination_data in destinations_data:
        Destination.objects.filter(slug=destination_data['slug']).delete()
    
    # Asegurarse de que la carpeta media/destinations existe
    os.makedirs('media/destinations', exist_ok=True)
    
    for destination_data in destinations_data:
        try:
            # Crear el destino primero
            destination = Destination(
                name=destination_data['name'],
                slug=destination_data['slug'],
                description=destination_data['description'],
                country=destination_data['country'],
                city=destination_data['city']
            )
            destination.save()
            
            # Procesar la imagen
            image_url = destination_data['image_url']
            filename = destination_data['filename']
            
            # Si la URL es relativa, buscarla en el frontend
            if image_url.startswith('/'):
                frontend_image_path = f'../frontend/public{image_url}'
                destination_path = f'media/destinations/{filename}'
                
                if os.path.exists(frontend_image_path):
                    # Copiar la imagen al directorio de media
                    shutil.copy(frontend_image_path, destination_path)
                    
                    # Abrir el archivo y asignarlo al modelo
                    with open(destination_path, 'rb') as f:
                        content = f.read()
                        destination.image.save(filename, ContentFile(content), save=True)
                    
                    print(f"Destino creado con imagen: {destination.name}")
                else:
                    print(f"Imagen no encontrada en: {frontend_image_path}")
                    print(f"Destino creado sin imagen: {destination.name}")
            else:
                # Si es una URL remota, descargarla
                try:
                    response = requests.get(image_url, stream=True)
                    if response.status_code == 200:
                        # Guardar directamente en el modelo
                        destination.image.save(filename, ContentFile(response.content), save=True)
                        print(f"Destino creado con imagen remota: {destination.name}")
                    else:
                        print(f"Error al descargar imagen: {response.status_code}")
                        print(f"Destino creado sin imagen: {destination.name}")
                except Exception as e:
                    print(f"Error al descargar la imagen: {e}")
                    print(f"Destino creado sin imagen: {destination.name}")
            
            # Pequeña pausa para no sobrecargar el sistema
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error al crear destino {destination_data['name']}: {e}")
    
    print("Proceso completado.")

if __name__ == "__main__":
    create_destinations() 