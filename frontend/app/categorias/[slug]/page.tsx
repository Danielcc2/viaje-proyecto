'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';

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

export default function CategoryPage() {
  const params = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  
  useEffect(() => {
    const fetchArticles = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const url = `http://localhost:8000/api/articles/?tags=${slug}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error al cargar artículos: ${response.status}`);
        }
        
        const data = await response.json();
        setArticles(data.results || []);
        
        // Intentar obtener información sobre el tag
        if (data.results && data.results.length > 0) {
          // Buscar el tag en los artículos cargados
          for (const article of data.results) {
            const foundTag = article.tags.find((t: Tag) => t.slug === slug);
            if (foundTag) {
              setTag(foundTag);
              break;
            }
          }
        }
        
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar los artículos. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [slug]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href="/articulos"
          className="inline-flex items-center text-teal-600 hover:text-teal-800 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a artículos
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-800">
          {tag ? tag.name : slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Categoría'}
        </h1>
        <p className="text-gray-600">
          Explorando artículos en esta categoría
        </p>
      </div>
      
      {error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No se encontraron artículos</h3>
          <p className="text-gray-600 mb-4">No hay artículos disponibles en esta categoría</p>
          <Link 
            href="/articulos"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Ver todos los artículos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => (
            <ArticleCard key={article.id} {...article} />
          ))}
        </div>
      )}
    </div>
  );
} 