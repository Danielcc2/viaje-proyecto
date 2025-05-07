'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { default as TiptapLink } from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CodeBlock from '@tiptap/extension-code-block';
import Heading from '@tiptap/extension-heading';
import DOMPurify from 'dompurify';

// Medidas de seguridad 2025 - Definir patrones seguros
const SAFE_PATTERNS = {
  TITLE: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,!?¡¿()\-:'"]+$/,
  TAG: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-]+$/,
  URL: /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  FILE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TITLE_LENGTH: 200,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS: 10,
};

// Función de sanitización
const sanitizeInput = (input: string, pattern: RegExp | null = null): string => {
  // Primero eliminar caracteres potencialmente peligrosos
  let sanitized = input.trim();
  
  // Si hay un patrón específico, validar que la entrada lo cumpla
  if (pattern && !pattern.test(sanitized)) {
    // Si no cumple el patrón, eliminar caracteres no permitidos
    sanitized = sanitized.replace(/[^\w\s.,!?¡¿()\-:'"áéíóúÁÉÍÓÚñÑüÜ]/g, '');
  }
  
  // Sanitizar HTML si hubiera
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [], // No permitir etiquetas HTML en textos planos
    ALLOWED_ATTR: []
  });
  
  return sanitized;
};

// Función para validar URL
const isValidUrl = (url: string): boolean => {
  try {
    // Validar patrón básico
    if (!SAFE_PATTERNS.URL.test(url)) return false;
    
    // Verificar que la URL es válida
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Función para sanitizar contenido HTML
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 
      'u', 'strike', 'code', 'pre', 'a', 'img', 
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'sup', 'sub', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'class', 
      'style', 'width', 'height', 'title', 'colspan', 'rowspan',
      'data-align', 'align'
    ],
    FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'button'],
    ADD_ATTR: ['target'], // Añadir target="_blank" a enlaces
    ADD_TAGS: [], // No añadir etiquetas adicionales
    WHOLE_DOCUMENT: false,
    SANITIZE_DOM: true,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOW_SELF_CLOSE_IN_ATTR: false,
    USE_PROFILES: {
      html: true,
      svg: false,
      svgFilters: false,
      mathMl: false
    }
  });
};

// Definimos las interfaces necesarias
interface Tag {
  id: number;
  name: string;
  slug: string;
}

export default function CrearArticuloPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const authCheckCompleted = useRef(false);
  const userName = user ? (user.first_name || user.full_name || user.email.split('@')[0]) : '';
  
  // Estados para el formulario
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCreateContent, setCanCreateContent] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isDestination, setIsDestination] = useState(false);
  const [continents, setContinents] = useState<{id: number, name: string, slug: string}[]>([]);
  const [selectedContinent, setSelectedContinent] = useState<number | null>(null);
  
  // Inicializar el editor de Tiptap con extensiones ampliadas
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Desactivamos el heading de StarterKit para configurarlo manualmente
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Placeholder.configure({
        placeholder: 'Escribe tu artículo aquí...',
      }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Underline,
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
      Subscript,
      Superscript,
      CodeBlock,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    immediatelyRender: false // Evitar problemas de hidratación SSR
  });
  
  // Agregar imagen al editor
  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  }, [imageUrl, editor]);

  // Agregar enlace al editor
  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [linkUrl, editor]);
  
  // Cargar tags disponibles
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/tags/');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.results || []);
        }
      } catch (err) {
        console.error('Error al cargar tags:', err);
      }
    };
    
    const fetchContinents = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/destinations/continents/');
        if (response.ok) {
          const data = await response.json();
          setContinents(data);
        } else {
          // Si falla la carga desde la API, usar continentes predeterminados
          setContinents([
            { id: 1, name: 'Europa', slug: 'europa' },
            { id: 2, name: 'Asia', slug: 'asia' },
            { id: 3, name: 'América', slug: 'america' },
            { id: 4, name: 'África', slug: 'africa' },
            { id: 5, name: 'Oceanía', slug: 'oceania' },
            { id: 6, name: 'Antártida', slug: 'antartida' }
          ]);
        }
      } catch (err) {
        console.error('Error al cargar continentes:', err);
        // Usar continentes predeterminados en caso de error
        setContinents([
          { id: 1, name: 'Europa', slug: 'europa' },
          { id: 2, name: 'Asia', slug: 'asia' },
          { id: 3, name: 'América', slug: 'america' },
          { id: 4, name: 'África', slug: 'africa' },
          { id: 5, name: 'Oceanía', slug: 'oceania' },
          { id: 6, name: 'Antártida', slug: 'antartida' }
        ]);
      }
    };
    
    fetchTags();
    fetchContinents();
  }, []);
  
  // Verificar autenticación y permisos
  useEffect(() => {
    // Evitar múltiples verificaciones
    if (authCheckCompleted.current) return;
    
    const checkAuth = async () => {
      setIsCheckingPermissions(true);
      
      // Esperar a que se complete la carga de autenticación
      if (authLoading) return;
      
      // Si después de cargar no estamos autenticados, redirigir
      if (!isAuthenticated && !authLoading) {
        router.push('/login');
        return;
      }
      
      // Si no tenemos token, no hacer nada más y esperar
      // (el token podría estar cargándose aún del localStorage)
      if (!token) return;
      
      try {
        // Comprobar permisos
        const response = await fetch('http://localhost:8000/api/users/permissions/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCanCreateContent(data.can_create_content || false);
          
          // Redirigir si no tiene permisos
          if (!data.can_create_content) {
            setError('No tienes permisos para crear contenido');
            setTimeout(() => {
              router.push('/articulos');
            }, 3000);
          }
        }
        
        // Marcar que ya hemos completado la verificación
        authCheckCompleted.current = true;
      } catch (err) {
        console.error('Error verificando permisos:', err);
      } finally {
        setIsCheckingPermissions(false);
      }
    };
    
    checkAuth();
  }, [user, token, router, isAuthenticated, authLoading]);
  
  // Toggle para seleccionar/deseleccionar tags
  const toggleTag = (tagSlug: string) => {
    setSelectedTags(prev => 
      prev.includes(tagSlug)
        ? prev.filter(slug => slug !== tagSlug)
        : [...prev, tagSlug]
    );
  };

  // Eliminar una etiqueta personalizada
  const removeCustomTag = (tagToRemove: string) => {
    setCustomTags(prev => prev.filter(tag => tag !== tagToRemove));
  };
  
  // Manejo de tecla Enter para añadir etiqueta
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  // Validación de título
  const validateTitle = (value: string): { valid: boolean; error?: string } => {
    if (!value.trim()) {
      return { valid: false, error: 'El título es obligatorio' };
    }
    
    if (value.length > SAFE_PATTERNS.MAX_TITLE_LENGTH) {
      return { 
        valid: false, 
        error: `El título no puede superar los ${SAFE_PATTERNS.MAX_TITLE_LENGTH} caracteres` 
      };
    }
    
    if (!SAFE_PATTERNS.TITLE.test(value)) {
      return { 
        valid: false, 
        error: 'El título contiene caracteres no permitidos' 
      };
    }
    
    return { valid: true };
  };

  // Validación de etiquetas
  const validateTag = (tag: string): { valid: boolean; error?: string } => {
    if (!tag.trim()) {
      return { valid: false };
    }
    
    if (tag.length > SAFE_PATTERNS.MAX_TAG_LENGTH) {
      return { 
        valid: false, 
        error: `La etiqueta no puede superar los ${SAFE_PATTERNS.MAX_TAG_LENGTH} caracteres` 
      };
    }
    
    if (!SAFE_PATTERNS.TAG.test(tag)) {
      return { 
        valid: false, 
        error: 'La etiqueta contiene caracteres no permitidos' 
      };
    }
    
    return { valid: true };
  };

  // Validación de imagen
  const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Validar tamaño
    if (file.size > SAFE_PATTERNS.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `La imagen no puede superar los ${SAFE_PATTERNS.MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }
    
    // Validar tipo
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SAFE_PATTERNS.FILE_EXTENSIONS.includes(extension)) {
      return { 
        valid: false, 
        error: `Formato de imagen no válido. Formatos permitidos: ${SAFE_PATTERNS.FILE_EXTENSIONS.join(', ')}` 
      };
    }
    
    return { valid: true };
  };

  // Función para procesar etiquetas personalizadas correctamente
  const processCustomTags = (tags: string[]) => {
    // Asegurarnos que cada etiqueta esté limpia y sin duplicados
    const uniqueTags = new Set<string>();
    
    // Primero procesar cada etiqueta
    tags.forEach(tag => {
      // Sanitizar la etiqueta
      const cleanTag = sanitizeInput(tag, SAFE_PATTERNS.TAG);
      
      // Validar que la etiqueta sea válida
      const validation = validateTag(cleanTag);
      if (validation.valid && cleanTag) {
        uniqueTags.add(cleanTag);
      }
    });
    
    // Limitar número de etiquetas
    return Array.from(uniqueTags).slice(0, SAFE_PATTERNS.MAX_TAGS);
  };

  // Función para manejar cambio de imagen con validación mejorada
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar la imagen
      const validation = validateImage(file);
      if (!validation.valid) {
        setError(validation.error || 'Error en la imagen');
        // Limpiar el input de archivo
        e.target.value = '';
        return;
      }
      
      // Si es válida, procesar normalmente
      setImage(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setImagePreview(result);
        }
      };
      reader.readAsDataURL(file);
      
      // Limpiar errores
      setError(null);
    }
  };

  // Función para añadir una etiqueta personalizada con validación
  const addCustomTag = () => {
    if (!newTag.trim()) return;
    
    // Dividir por comas para permitir añadir múltiples etiquetas
    const tagsToAdd = newTag.split(',').map(tag => tag.trim());
    
    // Procesar y validar cada etiqueta
    const validTags: string[] = [];
    let hasInvalidTags = false;
    
    tagsToAdd.forEach(tag => {
      // Sanitizar la etiqueta
      const cleanTag = sanitizeInput(tag, SAFE_PATTERNS.TAG);
      
      // Validar la etiqueta
      const validation = validateTag(cleanTag);
      if (validation.valid && cleanTag) {
        // Verificar que no sea duplicada
        if (!customTags.includes(cleanTag) && !validTags.includes(cleanTag)) {
          validTags.push(cleanTag);
        }
      } else if (validation.error) {
        hasInvalidTags = true;
        setError(`Etiqueta inválida: ${validation.error}`);
      }
    });
    
    // Si hay etiquetas válidas, añadirlas
    if (validTags.length > 0) {
      // Verificar límite de etiquetas
      if (customTags.length + validTags.length > SAFE_PATTERNS.MAX_TAGS) {
        setError(`No puedes añadir más de ${SAFE_PATTERNS.MAX_TAGS} etiquetas`);
        return;
      }
      
      setCustomTags([...customTags, ...validTags]);
      setNewTag('');
      
      // Si no hubo etiquetas inválidas, limpiar errores
      if (!hasInvalidTags) {
        setError(null);
      }
    }
  };

  // Enviar el artículo con mejores validaciones
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      setError(titleValidation.error || 'Título inválido');
      return;
    }
    
    if (!content || content.trim() === '') {
      setError('El contenido del artículo no puede estar vacío');
      return;
    }
    
    // Validar que si es destino, se haya seleccionado un continente
    if (isDestination && !selectedContinent) {
      setError('Si el artículo es un destino, debes seleccionar un continente');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Crear FormData para enviar datos
      const formData = new FormData();
      formData.append('title', sanitizeInput(title, SAFE_PATTERNS.TITLE));
      formData.append('content', sanitizeHtml(content));
      
      // Agregar tags
      const allTags = [...selectedTags];
      if (customTags.length > 0) {
        const processedTags = processCustomTags(customTags);
        processedTags.forEach(tag => {
          if (!allTags.includes(tag)) {
            allTags.push(tag);
          }
        });
      }
      
      if (allTags.length > 0) {
        // Cambiar el formato para enviar correctamente los tags al backend
        formData.append('new_tags', JSON.stringify(allTags));
        console.log('Tags a enviar:', JSON.stringify(allTags));
      }
      
      // Agregar imagen principal si existe
      if (image) {
        formData.append('image', image);
      }
      
      // Agregar flag de destino
      formData.append('is_destination', isDestination ? 'true' : 'false');
      
      // Agregar continente si es destino
      if (isDestination && selectedContinent) {
        formData.append('continent', selectedContinent.toString());
      }
      
      // Para depuración
      console.log('Datos del formulario a enviar:');
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      // Enviar datos
      const response = await fetch('http://localhost:8000/api/articles/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // No incluir Content-Type, FormData lo establece automáticamente con el boundary
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error respuesta:', response.status, errorData);
        throw new Error(errorData.detail || 'Error al crear el artículo');
      }
      
      const data = await response.json();
      console.log('Artículo creado:', data);
      
      // Redirigir a la página del artículo creado
      router.push(`/articulos/${data.slug}`);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el artículo');
    } finally {
      setLoading(false);
    }
  };
  
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  if (!user || !canCreateContent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <h3 className="text-xl font-medium text-red-800 mb-4">
            Acceso restringido
          </h3>
          <p className="text-gray-700 mb-6">
            {error || "No tienes permiso para acceder a esta sección. Se requiere rol de creador de contenido."}
          </p>
          <Link 
            href="/articulos"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Crear nuevo artículo</h1>
        
        {/* Información del autor */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold mr-3">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-gray-800 font-medium">Escribiendo como: {userName}</p>
            <p className="text-gray-500 text-sm">Los artículos publicados aparecerán con tu nombre</p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          
          {/* Imagen */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
              Imagen destacada
            </label>
            <input
              type="file"
              id="image"
              onChange={handleImageChange}
              accept="image/*"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            
            {imagePreview && (
              <div className="mt-2 relative h-48 w-full">
                <img 
                  src={imagePreview} 
                  alt="Vista previa" 
                  className="h-full w-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Opción de Destino */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_destination"
                checked={isDestination}
                onChange={(e) => setIsDestination(e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 mr-2"
              />
              <label htmlFor="is_destination" className="text-sm font-medium text-gray-700">
                Este artículo es un destino turístico
              </label>
            </div>
            
            {/* Selector de Continente (solo visible si es destino) */}
            {isDestination && (
              <div className="mt-4 mb-6 ml-6 border-l-2 border-teal-200 pl-4">
                <label className="block text-gray-700 mb-2">
                  Selecciona el continente al que pertenece este destino:
                </label>
                <select
                  value={selectedContinent || ''}
                  onChange={(e) => setSelectedContinent(e.target.value ? parseInt(e.target.value) : null)}
                  className="border rounded-md py-2 px-3 w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Selecciona un continente --</option>
                  {continents.map(continent => (
                    <option key={continent.id} value={continent.id}>
                      {continent.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  El continente ayuda a categorizar y mostrar correctamente este destino en la sección de destinos.
                </p>
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div className="space-y-8">
            {/* Selector de categorías (tags) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categorías</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {availableTags.map(tag => (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.slug)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border
                      ${selectedTags.includes(tag.slug)
                        ? 'bg-teal-100 border-teal-500 text-teal-900'
                        : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}
                    `}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.slug)}
                        onChange={() => {}} // Manejado por el onClick del div
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <span className="ml-2">{tag.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input para añadir nuevas categorías */}
              <div className="flex mt-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(sanitizeInput(e.target.value, SAFE_PATTERNS.TAG))}
                  onKeyDown={handleKeyDown}
                  placeholder="Añadir nueva categoría..."
                  className="border rounded-l-md py-2 px-3 w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                  maxLength={SAFE_PATTERNS.MAX_TAG_LENGTH}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  disabled={newTag.trim() === ''}
                  className="bg-teal-600 text-white px-4 rounded-r-md hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  Añadir
                </button>
              </div>

              {/* Mostrar tags personalizados */}
              {customTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Categorías personalizadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {customTags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeCustomTag(tag)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Editor de contenido */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Contenido *
              </label>
              <div className="mb-2">
                <p className="text-sm text-gray-500">
                  Usa las herramientas de formato para crear un artículo más atractivo: 
                  encabezados, negritas, listas, enlaces, imágenes y más.
                </p>
              </div>
              
              {/* Barra de herramientas del editor */}
              <div className="border rounded-lg overflow-hidden mb-12">
                <div className="bg-gray-100 border-b px-4 py-2">
                  {/* Primera fila de botones */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'p') {
                          editor?.chain().focus().setParagraph().run();
                        } else if (value.startsWith('h')) {
                          const level = parseInt(value.charAt(1)) as 1 | 2 | 3 | 4 | 5 | 6;
                          editor?.chain().focus().setHeading({ level }).run();
                        }
                        e.target.value = ''; // Reset para futuros cambios
                      }}
                      className="p-1 rounded border"
                      value=""
                    >
                      <option value="" disabled>Formato</option>
                      <option value="p">Párrafo</option>
                      <option value="h1">H1</option>
                      <option value="h2">H2</option>
                      <option value="h3">H3</option>
                    </select>
                    
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`p-1 px-2 ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
                        title="Negrita"
                      >
                        <span className="font-bold">B</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`p-1 px-2 ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
                        title="Cursiva"
                      >
                        <span className="italic">I</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        className={`p-1 px-2 ${editor?.isActive('underline') ? 'bg-gray-200' : ''}`}
                        title="Subrayado"
                      >
                        <span className="underline">U</span>
                      </button>
                    </div>
                    
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`p-1 px-2 ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
                        title="Lista de viñetas"
                      >
                        •
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        className={`p-1 px-2 ${editor?.isActive('orderedList') ? 'bg-gray-200' : ''}`}
                        title="Lista numerada"
                      >
                        1.
                      </button>
                    </div>
                    
                    {/* Opciones de alineación */}
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                        className={`p-1 px-2 ${editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
                        title="Alinear a la izquierda"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                        className={`p-1 px-2 ${editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
                        title="Centrar"
                      >
                        ↔
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                        className={`p-1 px-2 ${editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
                        title="Alinear a la derecha"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                        className={`p-1 px-2 ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
                        title="Justificar"
                      >
                        ⇔
                      </button>
                    </div>
                    
                    {/* Opciones avanzadas */}
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleHighlight().run()}
                        className={`p-1 px-2 ${editor?.isActive('highlight') ? 'bg-gray-200' : ''}`}
                        title="Resaltar texto"
                      >
                        <span className="bg-yellow-200 px-1">T</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                        className={`p-1 px-2 ${editor?.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
                        title="Bloque de código"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleSubscript().run()}
                        className={`p-1 px-2 ${editor?.isActive('subscript') ? 'bg-gray-200' : ''}`}
                        title="Subíndice"
                      >
                        ₂
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                        className={`p-1 px-2 ${editor?.isActive('superscript') ? 'bg-gray-200' : ''}`}
                        title="Superíndice"
                      >
                        ²
                      </button>
                    </div>
                    
                    {/* Enlaces e imágenes */}
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className={`p-1 px-2 ${editor?.isActive('link') ? 'bg-gray-200' : ''}`}
                        title="Insertar enlace"
                      >
                        🔗
                      </button>
                      <button
                        type="button" 
                        onClick={() => {
                          const url = editor?.isActive('link') ? editor.getAttributes('link').href : null;
                          if (url) {
                            window.open(url, '_blank');
                          }
                        }}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Abrir enlace"
                        disabled={!editor?.isActive('link')}
                      >
                        🌐
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editor?.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                          }
                        }}
                        disabled={!editor?.isActive('link')}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Eliminar enlace"
                      >
                        🗑️
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImageInput(!showImageInput)}
                        className="p-1 px-2"
                        title="Insertar imagen"
                      >
                        🖼️
                      </button>
                    </div>
                    
                    {/* Opciones de tabla */}
                    <div className="flex border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        className="p-1 px-2"
                        title="Insertar tabla"
                      >
                        <span className="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="3" y1="15" x2="21" y2="15"></line>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                            <line x1="15" y1="3" x2="15" y2="21"></line>
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().addColumnBefore().run()}
                        disabled={!editor?.can().addColumnBefore()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Añadir columna antes"
                      >
                        +←
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().addColumnAfter().run()}
                        disabled={!editor?.can().addColumnAfter()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Añadir columna después"
                      >
                        +→
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().deleteColumn().run()}
                        disabled={!editor?.can().deleteColumn()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Eliminar columna"
                      >
                        -Col
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().addRowBefore().run()}
                        disabled={!editor?.can().addRowBefore()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Añadir fila antes"
                      >
                        +↑
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().addRowAfter().run()}
                        disabled={!editor?.can().addRowAfter()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Añadir fila después"
                      >
                        +↓
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().deleteRow().run()}
                        disabled={!editor?.can().deleteRow()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Eliminar fila"
                      >
                        -Fila
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().deleteTable().run()}
                        disabled={!editor?.can().deleteTable()}
                        className="p-1 px-2 disabled:opacity-50"
                        title="Eliminar tabla"
                      >
                        ✖
                      </button>
                    </div>
                  </div>
                  
                  {/* Inputs para enlaces e imágenes */}
                  {showLinkInput && (
                    <div className="mt-2 p-2 bg-gray-50 rounded flex gap-2">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://ejemplo.com"
                        className="flex-1 px-2 py-1 border rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLink();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-3 py-1 bg-teal-600 text-white rounded"
                      >
                        Añadir enlace
                      </button>
                    </div>
                  )}
                  
                  {showImageInput && (
                    <div className="mt-2 p-2 bg-gray-50 rounded flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="flex-1 px-2 py-1 border rounded"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addImage();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addImage}
                          className="px-3 py-1 bg-teal-600 text-white rounded whitespace-nowrap"
                        >
                          Añadir imagen
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Puedes pegar la URL de una imagen o usar un servicio de alojamiento de imágenes como <a href="https://imgur.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Imgur</a> o <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Postimages</a>.
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Contenido del editor */}
                <EditorContent editor={editor} className="prose max-w-none min-h-[500px] p-4" />
              </div>
            </div>
          </div>
          
          <div className="pt-5 border-t border-gray-200">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="flex justify-end">
              <Link
                href="/articulos"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 mr-3"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Publicando...' : 'Publicar artículo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}