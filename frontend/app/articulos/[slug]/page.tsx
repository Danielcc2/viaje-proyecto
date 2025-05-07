'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Tipos
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

interface Article {
  id: number;
  title: string;
  slug: string;
  author: Author;
  author_name?: string;
  content: string;
  image: string | null;
  tags: Tag[];
  avg_rating: number | null;
  ratings_count: number;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: number;
  user: Author;
  author_name?: string;
  content: string;
  created_at: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  
  // Verificar si el usuario es administrador
  useEffect(() => {
    // Para depuración, establecer isAdmin en true directamente
    setIsAdmin(true);
    
    const checkIsAdmin = async () => {
      if (!user || !token) return;
      
      try {
        console.log('Verificando si el usuario es administrador...');
        console.log('Usuario actual:', user);
        
        const response = await fetch('http://localhost:8000/api/users/permissions/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Respuesta de permisos:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Datos de permisos:', data);
          // No sobrescribimos el valor de isAdmin que establecimos arriba
          console.log('¿Es admin según la API?', data.is_admin);
        }
      } catch (err) {
        console.error('Error verificando permisos de administrador:', err);
      }
    };
    
    checkIsAdmin();
  }, [user, token]);
  
  // Cargar datos del artículo
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/articles/${slug}/`);
        
        if (!response.ok) {
          throw new Error(`Error al cargar el artículo: ${response.status}`);
        }
        
        const data = await response.json();
        setArticle(data);
        
        // Cargar comentarios
        const commentsResponse = await fetch(`http://localhost:8000/api/articles/${slug}/comments/`);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.results || []);
        }
        
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar el artículo. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [slug]);
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calcular tiempo de lectura
  const calculateReadingTime = (content: string) => {
    // Eliminar etiquetas HTML para contar solo el texto
    const textOnly = content.replace(/<[^>]*>/g, '');
    // Contar palabras (aproximado)
    const words = textOnly.split(/\s+/).length;
    // Velocidad media de lectura: 200 palabras por minuto
    const minutes = Math.ceil(words / 200);
    return minutes;
  };

  // Enviar valoración
  const handleRating = async (score: number) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      setRatingLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No se encontró token de autenticación');
        setError('Por favor, inicia sesión nuevamente para valorar');
        return;
      }

      console.log('Enviando valoración a:', `http://localhost:8000/api/articles/${slug}/rate/`);
      console.log('Valoración:', score);
      
      const response = await fetch(`http://localhost:8000/api/articles/${slug}/rate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score })
      });
      
      console.log('Respuesta del servidor (valoración):', response.status, response.statusText);
      
      let errorMessage = 'Error al enviar valoración';
      
      try {
        // Capturar el texto de la respuesta
        const responseText = await response.text();
        console.log('Respuesta de valoración en texto:', responseText);
        
        if (!response.ok) {
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
              const errorData = JSON.parse(responseText);
              console.error('Detalles del error:', errorData);
              errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
            } catch (parseErr) {
              console.error('Error al analizar respuesta JSON:', parseErr);
            }
          }
          
          setError(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Actualizar artículo para reflejar la nueva valoración
        const articleResponse = await fetch(`http://localhost:8000/api/articles/${slug}/`);
        if (articleResponse.ok) {
          const updatedArticle = await articleResponse.json();
          setArticle(updatedArticle);
        }
        
        setRating(score);
        setError(null);
      } catch (parseErr) {
        console.error('Error al procesar la respuesta:', parseErr);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error:', err);
      if (!error) setError('Error al enviar la valoración. Por favor, intenta de nuevo.');
    } finally {
      setRatingLoading(false);
    }
  };
  
  // Enviar comentario
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!comment.trim()) return;
    
    try {
      setCommentLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No se encontró token de autenticación');
        setError('Por favor, inicia sesión nuevamente para comentar');
        return;
      }
      
      console.log('Enviando comentario a:', `http://localhost:8000/api/articles/${slug}/comments/create/`);
      console.log('Contenido del comentario:', comment);
      
      const response = await fetch(`http://localhost:8000/api/articles/${slug}/comments/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: comment })
      });
      
      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      let errorMessage = 'Error al enviar comentario';
      
      try {
        // Capturar el texto de la respuesta antes de intentar analizarlo como JSON
        const responseText = await response.text();
        console.log('Respuesta en texto:', responseText);
        
        if (!response.ok) {
          // Intentar analizar el texto como JSON solo si parece ser JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
              const errorData = JSON.parse(responseText);
              console.error('Detalles del error:', errorData);
              errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
            } catch (parseErr) {
              console.error('Error al analizar respuesta JSON:', parseErr);
            }
          } else {
            console.error('Respuesta no es JSON válido:', responseText);
          }
          
          setError(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Analizar el texto como JSON solo si la respuesta es exitosa
        let newComment;
        try {
          newComment = JSON.parse(responseText);
          console.log('Comentario creado:', newComment);
        } catch (parseErr) {
          console.error('Error al analizar respuesta JSON del comentario:', parseErr);
          setError('El comentario se envió pero hubo un error al procesar la respuesta');
          return;
        }
        
        setComments(prev => [newComment, ...prev]);
        setComment('');
        setError(null);
      } catch (parseErr) {
        console.error('Error al procesar la respuesta del comentario:', parseErr);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error al enviar comentario:', err);
      if (!error) setError('Error al enviar el comentario. Por favor, intenta de nuevo.');
    } finally {
      setCommentLoading(false);
    }
  };
  
  // URL completa de la imagen
  const imageUrl = article?.image 
    ? article.image.startsWith('http') 
      ? article.image 
      : (article.image.startsWith('/media/') 
          ? `http://localhost:8000${article.image}` 
          : `http://localhost:8000/media/${article.image}`)
    : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-red-50 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error || 'No se encontró el artículo solicitado'}</p>
          <Link 
            href="/articulos"
            className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Volver a artículos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Mensajes de error globales */}
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
            href="/articulos"
            className="inline-flex items-center text-teal-600 hover:text-teal-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver a artículos
          </Link>
          
          {/* Información de depuración */}
          <div className="my-4 p-2 bg-gray-100 text-xs rounded-lg">
            <p>¿Usuario logueado?: {user ? 'Sí' : 'No'}</p>
            {user && <p>ID de usuario: {user.id}</p>}
            {user && <p>¿Es admin?: {isAdmin ? 'Sí' : 'No'} (Forzado a Sí para depuración)</p>}
            {article && <p>ID del autor: {article.author.id}</p>}
            <p>¿Debería mostrar botón de eliminar?: Sí (siempre visible)</p>
          </div>
          
          {/* Este botón de editar imágenes sólo aparece para usuarios logueados */}
          {user && (
            <Link
              href={`/articulos/${article.slug}/editar-imagenes`}
              className="inline-flex items-center text-teal-600 hover:text-teal-800 ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Gestionar imágenes
            </Link>
          )}
        </div>
        
        {/* BOTÓN DE ELIMINAR - Siempre visible */}
        <div className="my-6">
          <button
            onClick={async () => {
              if (window.confirm('¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer.')) {
                try {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    router.push('/login');
                    return;
                  }
                  
                  const response = await fetch(`http://localhost:8000/api/articles/${article.slug}/delete/`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (response.ok) {
                    router.push('/articulos');
                  } else {
                    throw new Error('No se pudo eliminar el artículo');
                  }
                } catch (err) {
                  console.error('Error al eliminar:', err);
                  setError('Error al eliminar el artículo. Por favor, inténtalo de nuevo.');
                }
              }
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg shadow-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            ELIMINAR ESTE ARTÍCULO
          </button>
        </div>
        
        {/* Cabecera del artículo */}
        <div className="mb-8" style={{ 
          backgroundColor: '#f8fafc', 
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h1 
            className="mb-4" 
            style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#1a202c',
              fontFamily: 'Helvetica Neue, Arial, sans-serif'
            }}
          >
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Avatar del autor */}
            <div 
              style={{ 
                width: '3rem', 
                height: '3rem', 
                borderRadius: '50%', 
                backgroundColor: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem'
              }}
            >
              {article.author.first_name?.charAt(0).toUpperCase() || article.author.email.charAt(0).toUpperCase()}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>
                {article.author.first_name || article.author.email.split('@')[0]}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {formatDate(article.created_at)}
              </span>
            </div>
            
            <div style={{ 
              backgroundColor: '#e2e8f0', 
              padding: '0.5rem 1rem', 
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: '#475569'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {calculateReadingTime(article.content)} min de lectura
            </div>
            
            {article.created_at !== article.updated_at && (
              <div style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#64748b' }}>
                Actualizado: {formatDate(article.updated_at)}
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {article.tags.map(tag => (
              <Link 
                key={tag.id} 
                href={`/categorias/${tag.slug}`}
                style={{ 
                  backgroundColor: '#e6fffa', 
                  color: '#0d9488',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  fontWeight: '500'
                }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Imagen destacada mejorada */}
        {imageUrl && (
          <div style={{ 
            marginBottom: '2.5rem', 
            borderRadius: '1rem',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ position: 'relative', height: '500px' }}>
              <Image
                src={imageUrl}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 800px"
                style={{ objectFit: 'cover', borderRadius: '1rem' }}
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              padding: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>Destino destacado</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{article.title}</div>
            </div>
          </div>
        )}
        
        {/* Contenido del artículo */}
        <div 
          className="prose lg:prose-xl max-w-none article-content"
          style={{
            fontFamily: 'Georgia, serif',
            lineHeight: 1.8,
            color: '#2d3748',
            fontSize: '1.125rem'
          }}
        >
          <div 
            dangerouslySetInnerHTML={{ 
              __html: article.content
                .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios HTML
                .replace(/children: "Información de depuración"/g, '') // Eliminar información de depuración específica
                .replace(/data-[a-zA-Z0-9-]*="[^"]*"/g, '') // Eliminar atributos data-*
            }} 
          />
        </div>
        
        {/* Valoración */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">¿Te ha gustado este artículo?</h3>
          
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={ratingLoading}
                className={`text-3xl focus:outline-none transition-colors ${
                  (rating || 0) >= star ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          
          <div className="text-gray-600">
            {article.ratings_count > 0 ? (
              <p>
                Valoración media: {article.avg_rating?.toFixed(1)} de 5 
                ({article.ratings_count} {article.ratings_count === 1 ? 'valoración' : 'valoraciones'})
              </p>
            ) : (
              <p>Sé el primero en valorar este artículo</p>
            )}
          </div>
        </div>
        
        {/* Comentarios */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">Comentarios</h3>
          
          {user ? (
            <form onSubmit={handleComment} className="mb-8">
              <div className="mb-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deja tu comentario..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={4}
                  required
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={commentLoading || !comment.trim()}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {commentLoading ? 'Enviando...' : 'Enviar comentario'}
              </button>
            </form>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg mb-8 text-center">
              <p className="text-gray-700 mb-2">Para dejar un comentario, necesitas iniciar sesión</p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
          
          {comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{comment.user.first_name || comment.user.email.split('@')[0]}</span>
                    <span className="text-gray-500 text-sm">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-700">No hay comentarios aún. ¡Sé el primero en comentar!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 