'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Tipos
interface Destination {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  image: string;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface Author {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_joined: string;
}

interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  author: Author;
  tags: Tag[];
  avg_rating: number | null;
  ratings_count: number;
  created_at: string;
  updated_at: string;
}

// Configuración del Backend - URLs posibles
const BACKEND_URLS = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://0.0.0.0:8000',
  'http://192.168.1.33:8000'
];

export default function DestinationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBackendUrl, setActiveBackendUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  
  useEffect(() => {
    if (!slug) {
      setError('No se proporcionó un destino válido');
      setLoading(false);
      return;
    }
    
    const fetchDestination = async () => {
      setLoading(true);
      
      // Intentar cargar desde cada URL posible
      for (const baseUrl of BACKEND_URLS) {
        try {
          const url = `${baseUrl}/api/destinations/${slug}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            mode: 'cors',
            cache: 'no-store',
          });
          
          if (response.ok) {
            const data = await response.json();
            setDestination(data);
            setActiveBackendUrl(baseUrl);
            setError(null);
            setLoading(false);
            return; // Salir si encontramos el destino
          } else if (response.status === 404) {
            setError('El destino solicitado no existe');
          } else {
            console.error(`Error en ${baseUrl}: ${response.status}`);
          }
        } catch (err) {
          console.error(`Error conectando a ${baseUrl}:`, err);
        }
      }
      
      // Si llegamos aquí es que no se pudo cargar el destino de ninguna URL
      setError('No se pudo cargar el destino desde el servidor');
      setLoading(false);
    };
    
    fetchDestination();
  }, [slug]);
  
  // Verificar si el usuario es administrador
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !token || !activeBackendUrl) return;
      
      try {
        const response = await fetch(`${activeBackendUrl}/api/users/permissions/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin);
          console.log('Estado de administrador:', data.is_admin);
        }
      } catch (err) {
        console.error('Error al verificar el estado de administrador:', err);
      }
    };
    
    checkAdminStatus();
  }, [user, token, activeBackendUrl]);
  
  // Cargar artículos relacionados
  useEffect(() => {
    if (!destination || !activeBackendUrl) return;
    
    const fetchRelatedArticles = async () => {
      try {
        // Buscar artículos por país o ciudad para mostrar contenido relacionado
        const searchTerm = destination.country || destination.city || destination.name;
        const response = await fetch(`${activeBackendUrl}/api/articles/?search=${encodeURIComponent(searchTerm)}&limit=4`);
        
        if (response.ok) {
          const data = await response.json();
          setRelatedArticles(data.results || []);
        }
      } catch (err) {
        console.error('Error al cargar artículos relacionados:', err);
      }
    };
    
    fetchRelatedArticles();
  }, [destination, activeBackendUrl]);
  
  const handleDelete = async () => {
    if (!user) {
      setError('Debes iniciar sesión para eliminar un destino');
      router.push('/login');
      return;
    }

    // Comprobar si el usuario tiene permisos de administrador
    try {
      const permissionsResponse = await fetch(`${activeBackendUrl}/api/users/permissions/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        console.log('Datos de permisos:', permissionsData);
        
        if (!permissionsData.is_admin) {
          setError('No tienes permisos para eliminar destinos');
          return;
        }
      } else {
        console.error('Error al verificar permisos:', permissionsResponse.status);
        setError('Error al verificar tus permisos');
        return;
      }
    } catch (err) {
      console.error('Error al comprobar permisos:', err);
      setError('Error al verificar tus permisos de administrador');
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar este destino? Esta acción no se puede deshacer.')) {
      try {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          router.push('/login');
          return;
        }
        
        // URL para eliminar el destino
        const deleteUrl = `${activeBackendUrl}/api/destinations/${destination?.slug}/delete/`;
        console.log('Intentando eliminar destino con URL:', deleteUrl);
        console.log('Token encontrado:', storedToken ? 'Sí' : 'No');
        console.log('Destino a eliminar:', destination);
        
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
          console.log('Destino eliminado correctamente');
          router.push('/destinos');
        } else {
          // Intentar obtener información de error de la respuesta
          let errorDetail = 'No se pudo eliminar el destino';
          try {
            const errorResponse = await response.text();
            console.error('Respuesta de error completa:', errorResponse);
            if (errorResponse) {
              try {
                const errorJson = JSON.parse(errorResponse);
                errorDetail = errorJson.detail || errorJson.message || errorDetail;
              } catch (e) {
                // No es JSON, usar el texto como está
                if (errorResponse.length < 100) {  // Solo si es breve
                  errorDetail = errorResponse;
                }
              }
            }
          } catch (e) {
            console.error('Error al leer la respuesta:', e);
          }
          
          if (response.status === 403) {
            errorDetail = 'No tienes permisos para eliminar este destino';
          } else if (response.status === 404) {
            errorDetail = 'El destino no existe o ya ha sido eliminado';
          }
          
          throw new Error(errorDetail);
        }
      } catch (err: any) {
        console.error('Error al eliminar:', err);
        setError(`Error al eliminar el destino: ${err.message}`);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        <p className="ml-3 text-gray-600">Cargando destino...</p>
      </div>
    );
  }
  
  if (error || !destination) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-red-50 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error || 'No se encontró el destino solicitado'}</p>
          <Link 
            href="/destinos"
            className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Volver a destinos
          </Link>
        </div>
      </div>
    );
  }
  
  // Función para obtener la URL de la imagen
  const getImageUrl = () => {
    if (!destination.image) {
      return '/images/destinos/placeholder.jpg';
    }
    
    // Si la imagen ya es una URL completa, usarla
    if (destination.image.startsWith('http')) {
      return destination.image;
    }
    
    // Si es una ruta relativa de media, construir la URL completa
    return `${activeBackendUrl}${destination.image}`;
  };
  
  // Formato de fecha
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };
  
  // Extraer un extracto limpio de HTML
  const getExcerpt = (content: string, maxLength: number = 100) => {
    // Eliminar etiquetas HTML
    const plainText = content.replace(/<[^>]*>/g, '');
    // Limitar longitud
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Mensajes de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}
      
        {/* Navegación */}
        <div className="mb-8">
          <Link 
            href="/destinos"
            className="inline-flex items-center text-teal-600 hover:text-teal-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver a destinos
          </Link>
          
          {/* Indicador de administrador */}
          {isAdmin && (
            <span className="ml-4 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Modo Administrador
            </span>
          )}
        </div>
        
        {/* Cabecera del destino con botón de eliminar */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">{destination.name}</h1>
          
          {/* Botón eliminar en la esquina (solo visible para administradores) */}
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-md shadow-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Eliminar
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center text-gray-600 mb-6 gap-4">
          <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm">
            {destination.country}
          </span>
          <span className="text-sm">
            {destination.city}
          </span>
        </div>
        
        {/* Imagen destacada */}
        <div className="mb-8 rounded-lg overflow-hidden h-96 relative">
          <Image
            src={getImageUrl()}
            alt={destination.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 800px"
            style={{ objectFit: 'cover' }}
            className="transition-transform hover:scale-105 duration-500"
            priority
          />
        </div>
        
        {/* Descripción */}
        <div className="prose lg:prose-xl max-w-none mb-12" 
          dangerouslySetInnerHTML={{ __html: destination.description }}
        />
        
        {/* Artículos relacionados */}
        {relatedArticles.length > 0 && (
          <div className="my-16">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Artículos sobre {destination.name}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedArticles.map(article => (
                <div key={article.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col transform hover:-translate-y-1">
                  <div className="relative h-48">
                    {article.image ? (
                      <Image
                        src={article.image.startsWith('http') 
                          ? article.image 
                          : (article.image.startsWith('/media/') 
                              ? `${activeBackendUrl}${article.image}` 
                              : `${activeBackendUrl}/media/${article.image}`)}
                        alt={article.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/destinos/default.jpg';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 flex items-center justify-center">
                        <span className="text-4xl text-white font-bold">{article.title.charAt(0)}</span>
                      </div>
                    )}
                    
                    {/* Badge con fecha */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-4">
                      <p className="text-sm font-medium">{formatDate(article.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold mb-2 line-clamp-2 text-gray-800">
                      <Link href={`/articulos/${article.slug}`} className="hover:text-teal-600 transition-colors">
                        {article.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
                      {getExcerpt(article.content, 120)}
                    </p>
                    
                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold mr-2">
                          {article.author.first_name?.charAt(0) || article.author.email?.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{article.author.first_name || article.author.email.split('@')[0]}</span>
                      </div>
                      
                      <Link 
                        href={`/articulos/${article.slug}`}
                        className="inline-flex items-center text-teal-600 hover:text-teal-800 font-medium text-sm"
                      >
                        Leer artículo
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Enlaces rápidos */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap gap-4 justify-between">
            <Link 
              href="/destinos"
              className="inline-flex items-center text-teal-600 hover:text-teal-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Ver todos los destinos
            </Link>
            
            <a 
              href="#"
              className="inline-flex items-center text-teal-600 hover:text-teal-800"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="mr-1">Volver arriba</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 