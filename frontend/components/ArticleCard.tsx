import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

// Función para limpiar HTML
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Función para verificar si una imagen existe localmente
const imageExists = async (url: string): Promise<boolean> => {
  // Usar caché para evitar repetir verificaciones
  if (typeof window !== 'undefined') {
    const cache = window.sessionStorage;
    const cachedResult = cache.getItem(`img_exists_${url}`);
    
    if (cachedResult !== null) {
      return cachedResult === 'true';
    }
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const exists = response.ok;
      cache.setItem(`img_exists_${url}`, exists.toString());
      return exists;
    } catch (error) {
      cache.setItem(`img_exists_${url}`, 'false');
      return false;
    }
  }
  
  // Fallback para entornos sin sessionStorage
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Tipos para el componente
interface ArticleTag {
  id: number;
  name: string;
  slug: string;
}

interface ArticleAuthor {
  id: number;
  email: string;
  display_name: string;
}

interface ArticleCardProps {
  id: number;
  title: string;
  slug: string;
  content: string;
  image?: string | null;
  tags: ArticleTag[];
  author?: ArticleAuthor;
  avg_rating: number | null;
  ratings_count: number;
  created_at: string;
  is_destination?: boolean;
  continent?: string;
}

const ArticleCard = ({
  title,
  slug,
  content,
  image,
  tags,
  author,
  avg_rating,
  ratings_count,
  created_at,
  is_destination = false,
  continent
}: ArticleCardProps) => {
  const [imageToUse, setImageToUse] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Formatear la fecha
  const formattedDate = new Date(created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Obtener un extracto del contenido limpiando el HTML
  const cleanText = typeof window !== 'undefined' ? stripHtml(content) : content.replace(/<[^>]*>/g, '');
  const excerpt = cleanText.length > 150 
    ? cleanText.substring(0, 150) + '...' 
    : cleanText;
  
  // Determinar qué imagen usar
  useEffect(() => {
    const determineImage = async () => {
      try {
        // Verificar si hay una imagen proporcionada por el backend
        if (image) {
          const backendImageUrl = image.startsWith('http') 
            ? image 
            : (image.startsWith('/media/') 
                ? `http://localhost:8000${image}` 
                : `http://localhost:8000/media/${image}`);
          
          console.log('Usando imagen del backend:', backendImageUrl);
          setImageToUse(backendImageUrl);
          return;
        }
        
        // Extraer una posible palabra clave del slug o título para buscar imagen relacionada
        const normalizeText = (text: any): string => {
          if (text === null || text === undefined) return '';
          
          // Convertir a string explícitamente cualquier tipo de valor
          const textString = String(text);
          
          return textString.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
            .replace(/[^\w\s]/g, ''); // Eliminar caracteres especiales
        };
        
        // Posibles palabras clave del artículo (del título y slug)
        const keywords = [
          ...normalizeText(title).split(/\s+/),
          ...normalizeText(slug).split(/[-_]/),
          // Extraer términos geográficos específicos
          ...tags.map(tag => normalizeText(tag.name))
        ].filter(word => word.length > 3); // Solo palabras relevantes
        
        // Términos geográficos prioritarios a buscar
        const geoTerms = [
          'francia', 'paris', 'italia', 'roma', 'españa', 'madrid', 'barcelona',
          'japón', 'japon', 'tokio', 'china', 'tailandia', 'india', 'vietnam',
          'alemania', 'berlín', 'berlin', 'grecia', 'atenas', 'portugal', 'lisboa',
          'estados', 'unidos', 'nueva', 'york', 'mexico', 'canada', 'brasil',
          'africa', 'egipto', 'marruecos', 'australia', 'nueva', 'zelanda'
        ];
        
        // Buscar términos geográficos en las palabras clave
        let matchedTerm = keywords.find(word => geoTerms.includes(word));
        
        if (matchedTerm) {
          // Normalizar algunos términos específicos
          if (matchedTerm === 'estados' || matchedTerm === 'unidos') matchedTerm = 'usa';
          if (matchedTerm === 'nueva' && keywords.includes('york')) matchedTerm = 'newyork';
          if (matchedTerm === 'nueva' && keywords.includes('zelanda')) matchedTerm = 'nuevazelanda';
        } else {
          // Si no hay coincidencia en términos geográficos, tomar la palabra más larga
          matchedTerm = keywords.sort((a, b) => b.length - a.length)[0] || slug;
        }
        
        // Limitar verificaciones de imágenes para mejorar rendimiento
        const imageExtensions = ['.jpg', '.webp']; // Reducir a formatos más comunes
        
        // Intentar con el matchedTerm
        for (const ext of imageExtensions) {
          const destinosImageUrl = `/images/destinos/${matchedTerm}${ext}`;
          if (await imageExists(destinosImageUrl)) {
            setImageToUse(destinosImageUrl);
            return;
          }
        }
        
        // Usar una categoría genérica basada en el continente si está disponible
        if (continent) {
          const continentTerm = normalizeText(continent);
          for (const ext of imageExtensions) {
            const continentImageUrl = `/images/destinos/${continentTerm}${ext}`;
            if (await imageExists(continentImageUrl)) {
              setImageToUse(continentImageUrl);
              return;
            }
          }
        }
        
        // Usar la imagen por defecto
        setImageToUse('/images/destinos/default.jpg');
      } catch (error) {
        console.error('Error al determinar la imagen:', error);
        setImageToUse('/images/destinos/default.jpg');
      }
    };
    
    determineImage();
  }, [image, slug, tags, title, continent]);

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative h-48">
        {imageToUse ? (
          <Image
            src={imageToUse}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.log(`Error cargando imagen para: ${title}`);
              // Si la imagen principal falla, intentar con una imagen por defecto
              if (imageToUse !== '/images/destinos/default.jpg') {
                setImageToUse('/images/destinos/default.jpg');
              } else {
                // Si la imagen por defecto también falla, mostrar un div con la inicial
                setImageToUse(null);
              }
            }}
            priority={true}
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-teal-100 flex items-center justify-center">
            <span className="text-5xl text-teal-700">{title.charAt(0).toUpperCase()}</span>
          </div>
        )}
        
        {/* Badge para destinos */}
        {is_destination && (
          <div className="absolute top-2 right-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full">
            Destino
          </div>
        )}
        
        {/* Badge para continente */}
        {continent && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {continent}
          </div>
        )}
      </div>
      
      <div className="p-6">
        {/* Información de publicación */}
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-500 text-sm">{formattedDate}</p>
          {author && (
            <p className="text-gray-600 text-sm">
              Por <span className="font-medium">{author.display_name || author.email.split('@')[0]}</span>
            </p>
          )}
        </div>
        
        {/* Título */}
        <h3 className="text-xl font-bold mb-2 text-gray-900">
          <Link href={is_destination ? `/destinos/${slug}` : `/articulos/${slug}`} className="hover:text-teal-600 transition-colors">
            {title}
          </Link>
        </h3>
        
        {/* Extracto */}
        <p className="text-gray-700 mb-4">{excerpt}</p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <Link 
              key={tag.id} 
              href={`/categorias/${tag.slug}`}
              className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded hover:bg-teal-100 transition-colors"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        
        {/* Valoración */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {avg_rating ? (
              <>
                <span className="text-yellow-500 mr-1">★</span>
                <span className="text-gray-700">{avg_rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm ml-1">
                  ({ratings_count} {ratings_count === 1 ? 'valoración' : 'valoraciones'})
                </span>
              </>
            ) : (
              <div className="flex items-center">
                <span className="text-gray-300 mr-1">★</span>
                <span className="text-gray-400 text-sm">Nuevo</span>
              </div>
            )}
          </div>
          
          <Link 
            href={is_destination ? `/destinos/${slug}` : `/articulos/${slug}`} 
            className="text-teal-600 hover:text-teal-800 font-medium transition-colors"
          >
            {is_destination ? 'Explorar destino →' : 'Leer más →'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard; 