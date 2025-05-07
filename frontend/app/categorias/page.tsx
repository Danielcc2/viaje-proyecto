'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Tipos
interface Tag {
  id: number;
  name: string;
  slug: string;
}

// Lista de iconos para categorías
const categoryIcons: Record<string, string> = {
  'playas': '🏖️',
  'montanas': '🏔️',
  'ciudades': '🏙️',
  'gastronomia': '🍽️',
  'mochileros': '🎒',
  'familiar': '👪',
  'ecoturismo': '🌿',
  'cultural': '🏛️',
  'italia': '🇮🇹',
  'espana': '🇪🇸',
  'francia': '🇫🇷',
  'mexico': '🇲🇽',
  'japon': '🇯🇵',
  'tailandia': '🇹🇭',
  'tenerife': '🏝️',
  // Agrega más según las categorías reales
};

// Obtener un icono para una categoría
const getCategoryIcon = (slug: string): string => {
  return categoryIcons[slug] || '🌍';
};

export default function CategoriesPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        
        // Primero intentamos obtener los tags del endpoint específico
        const tagsResponse = await fetch('http://localhost:8000/api/tags/');
        
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData.results || []);
        } else {
          // Si falla, intentamos extraer tags únicos de los artículos
          const articlesResponse = await fetch('http://localhost:8000/api/articles/');
          
          if (articlesResponse.ok) {
            const articlesData = await articlesResponse.json();
            
            const uniqueTags: Tag[] = [];
            const tagIds = new Set();
            
            articlesData.results.forEach((article: any) => {
              article.tags.forEach((tag: Tag) => {
                if (!tagIds.has(tag.id)) {
                  tagIds.add(tag.id);
                  uniqueTags.push(tag);
                }
              });
            });
            
            setTags(uniqueTags);
          } else {
            throw new Error('No se pudieron cargar las categorías');
          }
        }
        
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar las categorías. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTags();
  }, []);
  
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
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Categorías</h1>
        <p className="text-gray-600">
          Explora nuestros artículos por categorías de interés
        </p>
      </div>
      
      {error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          {error}
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No hay categorías disponibles</h3>
          <p className="text-gray-600 mb-4">Actualmente no hay categorías para mostrar</p>
          <Link 
            href="/articulos"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Ver todos los artículos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {tags.map(tag => (
            <Link 
              key={tag.id}
              href={`/categorias/${tag.slug}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center text-center"
            >
              <span className="text-4xl mb-2">{getCategoryIcon(tag.slug)}</span>
              <span className="font-medium text-gray-900">{tag.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 