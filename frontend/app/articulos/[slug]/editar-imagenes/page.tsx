'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

interface ArticleImage {
  id: number;
  image: string;
  caption: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  author: {
    id: number;
    email: string;
  };
}

export default function EditImagesPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Para subir nuevas imágenes
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Redireccionar si no está autenticado
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
    }
  }, [isAuthenticated, router, loading]);

  // Cargar datos del artículo
  useEffect(() => {
    const fetchArticleData = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Obtener datos del artículo
        const articleResponse = await fetch(`http://localhost:8000/api/articles/${slug}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!articleResponse.ok) {
          throw new Error(`Error al cargar el artículo: ${articleResponse.status}`);
        }
        
        const articleData = await articleResponse.json();
        setArticle(articleData);
        
        // Comprobar que el usuario es autor del artículo
        if (articleData.author.id !== user.id) {
          router.push(`/articulos/${slug}`);
          return;
        }
        
        // Obtener imágenes del artículo
        const imagesResponse = await fetch(`http://localhost:8000/api/articles/${slug}/images/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setImages(imagesData.results || []);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar los datos del artículo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticleData();
  }, [slug, isAuthenticated, user, router]);

  // Manejar carga de imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('El archivo debe ser una imagen (JPEG, PNG, GIF o WEBP)');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede superar los 5MB');
        return;
      }
      
      setUploadFile(file);
      setError(null);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile || !article) {
      setError('Selecciona una imagen para subir');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('caption', caption);
      formData.append('article', article.id.toString());
      
      // Crear petición con XMLHttpRequest para mostrar progreso
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Éxito
          setSuccess('Imagen subida correctamente');
          setCaption('');
          setUploadFile(null);
          
          // Actualizar lista de imágenes
          const imagesResponse = await fetch(`http://localhost:8000/api/articles/${slug}/images/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            setImages(imagesData.results || []);
          }
          
          // Limpiar mensaje de éxito después de 3 segundos
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        } else {
          // Error
          setError(`Error al subir la imagen: ${xhr.status}`);
        }
        
        setUploading(false);
      };
      
      xhr.onerror = () => {
        setError('Error de conexión al subir la imagen');
        setUploading(false);
      };
      
      xhr.open('POST', `http://localhost:8000/api/articles/${slug}/images/`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Error al subir la imagen');
      setUploading(false);
    }
  };

  // Eliminar imagen
  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:8000/api/articles/${slug}/images/${imageId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Actualizar lista de imágenes
        setImages(images.filter(img => img.id !== imageId));
        setSuccess('Imagen eliminada correctamente');
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError('Error al eliminar la imagen');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al eliminar la imagen');
    }
  };

  // Establecer imagen principal
  const handleSetMainImage = async (imageUrl: string) => {
    if (!article) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:8000/api/articles/${slug}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageUrl
        })
      });
      
      if (response.ok) {
        // Actualizar artículo
        const updatedArticle = await response.json();
        setArticle(updatedArticle);
        setSuccess('Imagen principal actualizada');
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError('Error al establecer la imagen principal');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al establecer la imagen principal');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          No se pudo cargar el artículo. {error}
        </div>
        <Link href="/articulos" className="mt-4 inline-block text-teal-600 hover:underline">
          Volver a artículos
        </Link>
      </div>
    );
  }

  // Formato imagen URL
  const getFullImageUrl = (url: string) => {
    return url.startsWith('http') ? url : `http://localhost:8000${url}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestionar imágenes</h1>
          <Link href={`/articulos/${slug}`} className="text-teal-600 hover:underline">
            Volver al artículo
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 p-4 rounded-lg text-green-700 mb-6">
            {success}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Imagen principal</h2>
          
          <div className="relative h-64 mb-4 bg-gray-100 rounded-lg overflow-hidden">
            {article.image ? (
              <Image
                src={getFullImageUrl(article.image)}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">No hay imagen principal</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Subir nueva imagen</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Imagen
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Leyenda
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Describe la imagen"
              />
            </div>
            
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-teal-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-sm text-gray-500 mt-1">{uploadProgress}% completado</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className={`w-full py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors
                ${(uploading || !uploadFile) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? 'Subiendo...' : 'Subir imagen'}
            </button>
          </form>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Imágenes del artículo</h2>
          
          {images.length === 0 ? (
            <p className="text-gray-500">No hay imágenes disponibles</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img) => (
                <div key={img.id} className="border rounded-lg overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={getFullImageUrl(img.image)}
                      alt={img.caption || 'Imagen del artículo'}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="p-3">
                    <p className="text-sm text-gray-700 mb-2">{img.caption || 'Sin descripción'}</p>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => handleSetMainImage(img.image)}
                        className="text-sm text-teal-600 hover:underline"
                        disabled={article.image === img.image}
                      >
                        {article.image === img.image ? 'Imagen principal' : 'Establecer como principal'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 