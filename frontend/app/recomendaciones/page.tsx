'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';

// Tipos
interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface Author {
  id: number;
  email: string;
  display_name: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  author?: Author;
  tags: Tag[];
  avg_rating: number | null;
  ratings_count: number;
  created_at: string;
}

interface Recommendation {
  id: number;
  article: Article;
  score: number;
  created_at: string;
}

export default function RecommendationsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Redireccionar si no está autenticado
  useEffect(() => {
    if (!isInitialLoading && !isAuthenticated) {
      router.push('/login');
    }
    setIsInitialLoading(false);
  }, [isAuthenticated, router, isInitialLoading]);

  // Cargar recomendaciones
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;

      try {
        setRecsLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://192.168.1.33:8000/api/recommendations/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar recomendaciones');
        }
        
        const data = await response.json();
        console.log('Recomendaciones cargadas:', data);
        setRecommendations(data.results || []);
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar las recomendaciones. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setRecsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [user]);

  // Usamos datos del backend, con fallback a ejemplos si no hay nada
  const displayRecommendations = recommendations.length > 0 ? recommendations : [];

  if (isInitialLoading || (recsLoading && !error)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirigiendo a login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Recomendaciones para ti</h1>
          <p className="text-gray-600">
            Basado en tus intereses y en las valoraciones de la comunidad
          </p>
        </div>
        
        {error ? (
          <div className="bg-red-50 p-6 rounded-lg text-center mb-8">
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-gray-700 mb-6">
              Para recibir recomendaciones personalizadas, necesitamos conocer tus intereses de viaje.
            </p>
            <Link 
              href="/perfil" 
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Configurar mis intereses
            </Link>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-yellow-50 p-6 rounded-lg text-center mb-8">
            <h3 className="text-xl font-medium text-yellow-800 mb-2">
              No tenemos recomendaciones para ti todavía
            </h3>
            <p className="text-gray-700 mb-6">
              Para recibir recomendaciones personalizadas, actualiza tus intereses de viaje o explora algunos artículos.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/perfil" 
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Configurar mis intereses
              </Link>
              <Link 
                href="/articulos" 
                className="px-4 py-2 bg-white border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
              >
                Explorar artículos
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayRecommendations.map(recommendation => (
              <div key={recommendation.id} className="relative">
                <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold px-3 py-1 rounded-full z-10">
                  {Math.min(Math.round(recommendation.score * 100), 100)}% match
                </div>
                <ArticleCard {...recommendation.article} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 