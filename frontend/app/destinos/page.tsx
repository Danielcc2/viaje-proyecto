'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Tipos
interface Destination {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  image: string;
  continent: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

// URL del backend
const BACKEND_URL = 'http://localhost:8000';

export default function DestinosPage() {
  // Estado para destinos desde el backend
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Función para actualizar destinos
  const refreshDestinations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Obteniendo destinos desde:', `${BACKEND_URL}/api/destinations/`);
      
      // Añadir un timestamp para evitar problemas de caché
      const timestamp = new Date().getTime();
      const response = await fetch(`${BACKEND_URL}/api/destinations/?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
      });
      
      console.log('Respuesta de destinos:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Detalles del error:', errorText);
        throw new Error(`Error al cargar destinos: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Datos de destinos:', data);
      
      let destinationsData = [];
      
      // Verificar formato de respuesta
      if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
        destinationsData = data.results;
        
        // Cargar también la segunda página si existe
        if (data.next) {
          try {
            const nextPageResponse = await fetch(`${data.next}&t=${timestamp}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              cache: 'no-store',
            });
            
            if (nextPageResponse.ok) {
              const nextPageData = await nextPageResponse.json();
              if (nextPageData && nextPageData.results) {
                destinationsData = [...destinationsData, ...nextPageData.results];
                console.log('Cargada segunda página de destinos, total:', destinationsData.length);
              }
            }
          } catch (nextPageError) {
            console.error('Error cargando la siguiente página:', nextPageError);
          }
        }
      } else if (Array.isArray(data)) {
        destinationsData = data;
      }
      
      // Imprimir información sobre los continentes para depuración
      const continentCounts: Record<string, number> = {};
      destinationsData.forEach((dest: Destination) => {
        const continentName = dest.continent ? dest.continent.name : 'Sin continente';
        continentCounts[continentName] = (continentCounts[continentName] || 0) + 1;
      });
      console.log('Destinos por continente:', continentCounts);
      
      setDestinations(destinationsData);
    } catch (err) {
      console.error('Error obteniendo destinos:', err);
      setError(`Error al cargar los destinos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Obtener destinos al cargar
  useEffect(() => {
    refreshDestinations();
  }, []);

  // Agrupar países por continentes
  const continents: Record<string, string[]> = {
    'Europa': ['España', 'Francia', 'Italia', 'Alemania', 'Portugal', 'Reino Unido', 'Grecia', 'Suiza', 'Países Bajos', 'Austria'],
    'Asia': ['Japón', 'China', 'Tailandia', 'India', 'Vietnam', 'Indonesia', 'Malasia', 'Singapur', 'Corea del Sur', 'Filipinas'],
    'América': ['Estados Unidos', 'México', 'Canadá', 'Brasil', 'Argentina', 'Colombia', 'Perú', 'Chile', 'Cuba', 'Costa Rica'],
    'África': ['Marruecos', 'Egipto', 'Sudáfrica', 'Kenia', 'Tanzania', 'Túnez', 'Etiopía', 'Ghana', 'Senegal', 'Namibia'],
    'Oceanía': ['Australia', 'Nueva Zelanda', 'Fiji', 'Polinesia Francesa', 'Samoa', 'Vanuatu', 'Islas Cook', 'Papúa Nueva Guinea'],
    'Antártida': ['Base Esperanza', 'Estación McMurdo', 'Base Marambio', 'Villa Las Estrellas', 'Base Orcadas']
  };
  
  // Obtener el continente de un país
  const getContinentByCountry = (country: string): string => {
    for (const [continent, countries] of Object.entries(continents)) {
      if (countries.includes(country)) {
        return continent;
      }
    }
    return 'Otros';
  };

  // Estado para filtros
  const [selectedContinent, setSelectedContinent] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Imprimir una marca de depuración cuando cambia el continente seleccionado
  useEffect(() => {
    console.log(`Continente seleccionado: ${selectedContinent}`);
    
    // Calcular cuántos destinos deberían mostrarse con este filtro
    const matchingDestinations = destinations.filter(destination => 
      selectedContinent === 'Todos' || 
      (selectedContinent === 'Otros' && (!destination.continent || destination.continent.name === 'Otros')) ||
      (destination.continent && destination.continent.name === selectedContinent)
    );
    
    console.log(`Destinos que coinciden con el filtro ${selectedContinent}: ${matchingDestinations.length}`);
    matchingDestinations.forEach(dest => {
      console.log(`- ${dest.name} (${dest.continent ? dest.continent.name : 'Sin continente'})`);
    });
  }, [selectedContinent, destinations]);

  // Lista de continentes disponibles
  const availableContinents = ['Todos', ...Object.keys(continents), 'Otros'];

  // Filtrar destinos
  const filteredDestinations = destinations.filter(destination => {
    // Filtro por continente - Ahora usa el continente directamente del objeto
    const passesContinent = 
      selectedContinent === 'Todos' || 
      (selectedContinent === 'Otros' && (!destination.continent || destination.continent.name === 'Otros')) ||
      (destination.continent && destination.continent.name === selectedContinent);
    
    // Añadir una verificación especial para 'América' (comparación insensible a acentos)
    if (selectedContinent === 'América' && destination.continent) {
      const continentName = destination.continent.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (continentName.toLowerCase() === 'america') {
        return true;
      }
    }
    
    // Filtro por término de búsqueda
    const passesSearch = 
      searchTerm === '' || 
      destination.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      destination.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      destination.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    return passesContinent && passesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Explora Destinos Increíbles</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
          Descubre lugares maravillosos alrededor del mundo y planifica tu próxima aventura.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 max-w-3xl mx-auto">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-800 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}
      
      {/* Filtros - Solo mostrar si hay destinos */}
      {destinations.length > 0 && (
        <div className="mb-12 flex flex-col gap-6">
          {/* Barra de búsqueda */}
          <div className="w-full max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Buscar destinos, ciudades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          
          {/* Filtros de continentes */}
          <div className="w-full">
            <h3 className="text-lg font-medium text-gray-700 mb-2 text-center">Continentes</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {availableContinents.map(continent => (
                <button
                  key={continent}
                  onClick={() => {
                    setSelectedContinent(continent);
                    console.log(`Seleccionado continente: ${continent}`);
                    
                    // Refrescar destinos si se selecciona América para asegurarnos de tener los datos más recientes
                    if (continent === 'América') {
                      refreshDestinations();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedContinent === continent
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {continent}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Grid de destinos */}
      {!loading && !error && (
        <>
          {filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map(destination => (
                <DestinationCard 
                  key={destination.id}
                  destination={destination}
                  continentName={destination.continent ? destination.continent.name : getContinentByCountry(destination.country)}
                />
              ))}
            </div>
          ) : destinations.length > 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-medium text-gray-700 mb-2">No se encontraron destinos para los filtros seleccionados</h3>
              <p className="text-gray-600 mb-4">Prueba a cambiar los filtros de búsqueda</p>
              <button
                onClick={() => {
                  setSelectedContinent('Todos');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Ver todos los destinos
              </button>
            </div>
          ) : (
            <div className="text-center py-16 bg-yellow-50 rounded-lg">
              <h3 className="text-xl font-medium text-yellow-700 mb-2">No hay destinos disponibles</h3>
              <p className="text-yellow-600 mb-4">Se conectó al backend pero no se encontraron destinos para mostrar</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Recargar página
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Componente de tarjeta de destino
const DestinationCard = ({ 
  destination,
  continentName
}: { 
  destination: Destination,
  continentName: string
}) => {
  // Construir URL completa para la imagen
  const getImageUrl = () => {
    if (!destination.image) {
      return '/images/destinos/default.jpg';
    }
    
    // Si ya es una URL completa
    if (destination.image.startsWith('http')) {
      return destination.image;
    }
    
    // Si es una ruta relativa de media, construir la URL completa
    return destination.image.startsWith('/media/') 
      ? `${BACKEND_URL}${destination.image}` 
      : `${BACKEND_URL}/media/${destination.image}`;
  };
  
  // Eliminar etiquetas HTML de la descripción de manera segura
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') {
      // Ejecuta este código solo en el servidor
      return html.replace(/<[^>]*>/g, '');
    }
    
    // Ejecuta este código en el navegador
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <Image
          src={getImageUrl()}
          alt={destination.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          onError={(e) => {
            // Si la imagen del destino falla, usar una imagen por defecto
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/images/destinos/default.jpg';
          }}
        />
        <div className="absolute top-2 right-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full">
          {continentName}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{destination.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{destination.city}, {destination.country}</p>
        <p className="text-gray-700 mb-4">{stripHtml(destination.description).substring(0, 100)}...</p>
        <Link 
          href={`/destinos/${destination.slug}`}
          className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
        >
          Explorar destino
        </Link>
      </div>
    </div>
  );
};