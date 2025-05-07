'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// Interfaces
interface Destination {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  image: string;
  continent?: string | { name: string };
  continent_name?: string;
}

export default function Home() {
  const [email, setEmail] = useState('');
  const { user } = useAuth();
  const [featuredDestinations, setFeaturedDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar destinos destacados
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setLoading(true);
        // Primero obtenemos todos los destinos
        const response = await fetch('http://localhost:8000/api/destinations/', {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          let destinationList = [];
          
          // Verificar el formato de los datos recibidos
          if (data.results && Array.isArray(data.results)) {
            destinationList = data.results;
          } else if (Array.isArray(data)) {
            destinationList = data;
          }
          
          // Si tenemos destinos, seleccionamos 6 aleatorios
          if (destinationList.length > 0) {
            // Función para mezclar un array (algoritmo Fisher-Yates)
            const shuffleArray = <T,>(array: T[]): T[] => {
              for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
              }
              return array;
            };
            
            // Mezclar y tomar los primeros 6 (o menos si no hay suficientes)
            const randomDestinations = shuffleArray([...destinationList])
              .slice(0, 6);
            
            console.log(`Mostrando ${randomDestinations.length} destinos aleatorios`);
            setFeaturedDestinations(randomDestinations);
          }
        }
      } catch (error) {
        console.error('Error al cargar destinos destacados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDestinations();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // En una implementación completa, aquí enviaríamos el email a una API
    alert(`Gracias por suscribirte con: ${email}`);
    setEmail('');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-500 to-blue-500 text-white py-20">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Descubre el mundo, un destino a la vez
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl">
            Guías, consejos y rutas personalizadas para que tus aventuras sean inolvidables
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/articulos" 
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Explorar Artículos
            </Link>
            {user ? (
              <Link 
                href="/perfil" 
                className="bg-white hover:bg-gray-100 text-teal-700 font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Mi Perfil
              </Link>
            ) : (
              <Link 
                href="/registro" 
                className="bg-white hover:bg-gray-100 text-teal-700 font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Registrarse
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Destacados Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Destinos Destacados</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : featuredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredDestinations.map(destination => (
                <DestinationCard 
                  key={destination.id}
                  destination={destination} 
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <DestinationCard 
                title="Playas de Tailandia" 
                description="Arenas blancas, aguas cristalinas y naturaleza exuberante en el sudeste asiático."
                image="/images/destinos/tailandia.jpg" 
                link="/destinos/tailandia"
              />
              <DestinationCard 
                title="Montañas de Suiza" 
                description="Senderos alpinos, lagos de ensueño y pueblos pintorescos en el corazón de Europa."
                image="/images/destinos/suiza.jpg" 
                link="/destinos/suiza"
              />
              <DestinationCard 
                title="Ciudades de Japón" 
                description="Tradición y modernidad se fusionan en una experiencia cultural única en Asia."
                image="/images/destinos/japon.jpg" 
                link="/destinos/japon"
              />
              <DestinationCard 
                title="Cartagena de Indias" 
                description="Ciudad colonial con playas paradisíacas en el Caribe colombiano."
                image="/images/destinos/cartagena.jpg" 
                link="/destinos/cartagena"
              />
              <DestinationCard 
                title="Safari en Kenia" 
                description="Una aventura inolvidable entre la fauna salvaje africana."
                image="/images/destinos/kenia.jpg" 
                link="/destinos/kenia"
              />
              <DestinationCard 
                title="Sidney y alrededores" 
                description="Costas impresionantes, cultura vibrante y experiencias únicas en Australia."
                image="/images/destinos/sidney.jpg" 
                link="/destinos/sidney"
              />
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link 
              href="/destinos" 
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Ver todos los destinos
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Explora por Categoría</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <CategoryButton icon="🏖️" label="Playas" link="/categorias/playas" />
            <CategoryButton icon="🏔️" label="Montañas" link="/categorias/montanas" />
            <CategoryButton icon="🏙️" label="Ciudades" link="/categorias/ciudades" />
            <CategoryButton icon="🍽️" label="Gastronomía" link="/categorias/gastronomia" />
            <CategoryButton icon="🎒" label="Mochileros" link="/categorias/mochileros" />
            <CategoryButton icon="👪" label="Familiar" link="/categorias/familiar" />
            <CategoryButton icon="🌿" label="Ecoturismo" link="/categorias/ecoturismo" />
            <CategoryButton icon="🏛️" label="Cultural" link="/categorias/cultural" />
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-teal-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Quieres recibir inspiración para tus viajes?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Suscríbete a nuestro newsletter y recibe recomendaciones personalizadas, ofertas exclusivas y consejos de viaje.
          </p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email"
              required
              className="py-3 px-4 rounded-lg flex-grow text-gray-900 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Suscribirme
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

// Componente para las tarjetas de destinos - versión dinámica
const DestinationCard = ({ destination, title, description, image, link }: { 
  destination?: Destination;
  title?: string; 
  description?: string; 
  image?: string; 
  link?: string 
}) => {
  // Si tenemos un objeto destination, usarlo. De lo contrario, usar los props individuales
  const displayTitle = destination ? destination.name : title || '';
  const displayDescription = destination ? destination.description.substring(0, 120).replace(/<[^>]*>?/gm, '') + '...' : description || '';
  const displayLink = destination ? `/destinos/${destination.slug}` : link || '#';
  
  // Determinar la imagen a mostrar
  let displayImage = '';
  
  if (destination) {
    // Si la imagen del destino comienza con http, usarla directamente
    if (destination.image && destination.image.startsWith('http')) {
      displayImage = destination.image;
    } 
    // Si es una ruta relativa del backend
    else if (destination.image) {
      displayImage = `http://localhost:8000${destination.image}`;
    } 
    // Intentar encontrar una imagen basada en el país o continente
    else if (destination.country) {
      const country = destination.country.toLowerCase();
      // Mapeo de algunos países a imágenes predefinidas
      if (country.includes('tailandia') || country.includes('thailand')) {
        displayImage = '/images/destinos/tailandia.jpg';
      } else if (country.includes('suiza') || country.includes('switzerland')) {
        displayImage = '/images/destinos/suiza.jpg';
      } else if (country.includes('japón') || country.includes('japan')) {
        displayImage = '/images/destinos/japon.jpg';
      } else {
        // Imagen predeterminada basada en continente
        const continent = destination.continent_name?.toLowerCase() || '';
        if (continent.includes('europa')) {
          displayImage = '/images/destinos/europa.jpg';
        } else if (continent.includes('asia')) {
          displayImage = '/images/destinos/asia.jpg';
        } else if (continent.includes('áfrica')) {
          displayImage = '/images/destinos/africa.jpg';
        } else {
          displayImage = '/images/destinos/default.jpg';
        }
      }
    } else {
      displayImage = '/images/destinos/default.jpg';
    }
  } else {
    displayImage = image || '/images/destinos/default.jpg';
  }
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative h-48">
        <Image
          src={displayImage}
          alt={displayTitle}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
          className="object-cover transition-transform hover:scale-105 duration-500"
          onError={(e) => {
            // En caso de error, usar una imagen predeterminada
            const target = e.target as HTMLImageElement;
            target.src = '/images/destinos/default.jpg';
          }}
        />
        {destination?.continent_name && (
          <div className="absolute top-2 left-2 bg-teal-600 text-white text-xs px-2 py-1 rounded-full">
            {destination.continent_name}
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-900">{displayTitle}</h3>
        <p className="text-gray-700 mb-4">{displayDescription}</p>
        <Link 
          href={displayLink} 
          className="text-teal-600 hover:text-teal-800 font-medium transition-colors"
        >
          Leer más →
        </Link>
      </div>
    </div>
  );
};

// Componente para los botones de categoría
const CategoryButton = ({ icon, label, link }: { icon: string; label: string; link: string }) => {
  return (
    <Link 
      href={link}
      className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center"
    >
      <span className="text-4xl mb-2">{icon}</span>
      <span className="font-medium text-gray-900">{label}</span>
    </Link>
  );
};
