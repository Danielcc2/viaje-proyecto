'use client';

import { useState, useEffect } from 'react';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// Tipos
interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  tags: Tag[];
  avg_rating: number | null;
  ratings_count: number;
  created_at: string;
}

// Datos de ejemplo para mostrar mientras se arregla la API
const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Las mejores playas de México',
    slug: 'mejores-playas-mexico',
    content: 'México cuenta con algunas de las mejores playas del mundo. Desde las turquesas aguas de Cancún hasta las tranquilas costas de la Riviera Nayarit, estas son nuestras recomendaciones...',
    image: null,
    tags: [
      { id: 1, name: 'Playas', slug: 'playas' },
      { id: 2, name: 'México', slug: 'mexico' }
    ],
    avg_rating: 4.5,
    ratings_count: 12,
    created_at: '2023-11-15T10:30:00Z'
  },
  {
    id: 2,
    title: 'Guía para mochileros en Europa',
    slug: 'guia-mochileros-europa',
    content: 'Viajar por Europa con una mochila es una experiencia inigualable. Aquí te contamos cómo planificar tu ruta, ahorrar en alojamiento y transporte, y disfrutar al máximo de la cultura local...',
    image: null,
    tags: [
      { id: 3, name: 'Mochileros', slug: 'mochileros' },
      { id: 4, name: 'Europa', slug: 'europa' },
      { id: 5, name: 'Presupuesto', slug: 'presupuesto' }
    ],
    avg_rating: 4.8,
    ratings_count: 24,
    created_at: '2023-10-22T15:45:00Z'
  }
];

const mockTags: Tag[] = [
  { id: 1, name: 'Playas', slug: 'playas' },
  { id: 2, name: 'México', slug: 'mexico' },
  { id: 3, name: 'Mochileros', slug: 'mochileros' },
  { id: 4, name: 'Europa', slug: 'europa' }
];

export default function ArticulosPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const [canCreateContent, setCanCreateContent] = useState(false);

  // Comprobar permisos del usuario
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/users/permissions/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCanCreateContent(data.can_create_content || false);
        }
      } catch (error) {
        console.error('Error al comprobar permisos:', error);
      }
    };
    
    checkPermissions();
  }, [user]);

  // Obtener artículos y tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL con tags seleccionados
        let url = 'http://localhost:8000/api/articles/';
        if (selectedTags.length > 0) {
          const tagParams = selectedTags.map(tag => `tags=${tag}`).join('&');
          url += `?${tagParams}`;
        }
        
        // Añadir búsqueda si existe
        if (searchTerm) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}search=${searchTerm}`;
        }
        
        console.log('Fetching articles from:', url);
        
        // Obtener artículos
        const articlesResponse = await fetch(url);
        
        if (!articlesResponse.ok) {
          console.error('Error en la respuesta de artículos:', articlesResponse.status, articlesResponse.statusText);
          const errorText = await articlesResponse.text();
          console.error('Detalles del error:', errorText);
          throw new Error(`Error al cargar datos: ${articlesResponse.status}`);
        }
        
        const articlesData = await articlesResponse.json();
        console.log('Articles data:', articlesData);
        
        // Verificar estructura de datos
        if (!articlesData.results && Array.isArray(articlesData)) {
          // Si la API devuelve directamente un array en lugar de objeto paginado
          setArticles(articlesData);
        } else {
          setArticles(articlesData.results || []);
        }
        
        // Obtener tags
        try {
          // Corrección en la URL de tags
          const tagsUrl = 'http://localhost:8000/api/tags/';
          console.log('Fetching tags from:', tagsUrl);
          
          const tagsResponse = await fetch(tagsUrl);
          
          console.log('Tags response status:', tagsResponse.status);
          
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            console.log('Tags data:', tagsData);
            
            // Verificar estructura de datos
            if (!tagsData.results && Array.isArray(tagsData)) {
              setTags(tagsData);
            } else {
              setTags(tagsData.results || []);
            }
          } else {
            console.error('Error al cargar tags:', tagsResponse.status);
            // En caso de error, usar tags de los artículos cargados
            const uniqueTags: Tag[] = [];
            const tagIds = new Set();
            
            // Asegurar que estamos trabajando con un array de artículos
            const articlesArray = Array.isArray(articlesData) ? articlesData : (articlesData.results || []);
            
            articlesArray.forEach((article: Article) => {
              if (article.tags && Array.isArray(article.tags)) {
                article.tags.forEach(tag => {
                  if (!tagIds.has(tag.id)) {
                    tagIds.add(tag.id);
                    uniqueTags.push(tag);
                  }
                });
              }
            });
            
            setTags(uniqueTags);
          }
        } catch (tagErr) {
          console.error('Error al obtener tags:', tagErr);
          setTags([]);
        }
      } catch (err) {
        console.error('Error obteniendo artículos:', err);
        setError(`Error al cargar los artículos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        // Solo usar datos mock si no hay datos reales
        if (articles.length === 0) {
          setArticles(mockArticles);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTags, searchTerm]);
  
  // Función para alternar tags seleccionados
  const toggleTag = (slug: string) => {
    setSelectedTags(prev => {
      if (prev.includes(slug)) {
        return prev.filter(tag => tag !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };
  
  // Función para limpiar filtros
  const clearFilters = () => {
    setSelectedTags([]);
    setSearchTerm('');
  };

  // Decidir qué datos mostrar
  const displayArticles = articles.length > 0 ? articles : mockArticles;
  const displayTags = tags.length > 0 ? tags : mockTags;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Artículos de Viaje</h1>
          <p className="text-gray-600">
            Descubre consejos, guías y destinos para tus próximas aventuras
          </p>
        </div>
        
        {user && canCreateContent && (
          <Link
            href="/articulos/crear"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Crear artículo
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-800 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Barra lateral de filtros */}
        <div className="md:w-1/4">
          <div className="bg-white p-6 rounded-lg shadow-md sticky top-24">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Filtros</h2>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Buscar</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar artículos..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Categorías</h3>
              <div className="space-y-2">
                {displayTags.map(tag => (
                  <div key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`tag-${tag.slug}`}
                      checked={selectedTags.includes(tag.slug)}
                      onChange={() => toggleTag(tag.slug)}
                      className="mr-2 h-4 w-4 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor={`tag-${tag.slug}`} className="text-gray-700">
                      {tag.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {(selectedTags.length > 0 || searchTerm) && (
              <button
                onClick={clearFilters}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
        
        {/* Lista de artículos */}
        <div className="md:w-3/4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-700 mb-4">{error}</p>
            </div>
          ) : displayArticles.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <h3 className="text-xl font-medium text-gray-700 mb-2">No se encontraron artículos</h3>
              <p className="text-gray-600 mb-4">Prueba a cambiar los filtros de búsqueda</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayArticles.map(article => (
                <ArticleCard key={article.id} {...article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 