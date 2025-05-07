'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface UserProfile {
  id: number;
  user: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    date_joined: string;
  };
  interests: Tag[];
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redireccionar si no está autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Cargar datos del perfil
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setProfileLoading(true);
        const token = localStorage.getItem('token');
        
        // Obtener perfil
        const profileResponse = await fetch('http://localhost:8000/api/users/interests/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!profileResponse.ok) {
          console.error('Error perfil:', profileResponse.status);
          throw new Error(`Error al cargar el perfil: ${profileResponse.status}`);
        }
        
        const profileData = await profileResponse.json();
        setProfile(profileData);
        setSelectedTags(profileData.interests?.map((tag: Tag) => tag.id) || []);
        
        // Obtener tags disponibles
        try {
          const tagsResponse = await fetch('http://localhost:8000/api/tags/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            setAvailableTags(tagsData.results || []);
          } else {
            console.error('Error tags:', tagsResponse.status);
            // Si falla la carga de tags, usamos primero los del perfil
            if (profileData.interests && profileData.interests.length > 0) {
              setAvailableTags(profileData.interests);
            }
            // Si no hay tags en el perfil, usamos los mock tags que se definen abajo
          }
        } catch (tagErr) {
          console.error('Error obteniendo tags:', tagErr);
          // Usar los tags del perfil si existen
          if (profileData.interests && profileData.interests.length > 0) {
            setAvailableTags(profileData.interests);
          }
          // Si no hay tags en el perfil, se usarán los mock tags que están definidos abajo
        }
        
        setProfileError(null);
      } catch (err) {
        console.error('Error cargando perfil:', err);
        setProfileError('Error al cargar el perfil. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Manejar cambio de intereses
  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  // Guardar intereses actualizados
  const handleSaveInterests = async () => {
    try {
      setIsSaving(true);
      setSuccessMessage('');
      setProfileError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No estás autenticado');
      }
      
      console.log('Enviando intereses:', { interest_ids: selectedTags });
      
      const response = await fetch('http://localhost:8000/api/users/interests/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interest_ids: selectedTags
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error respuesta:', response.status, errorText);
        throw new Error(`Error al actualizar intereses: ${response.status}`);
      }
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccessMessage('¡Tus intereses se han actualizado correctamente!');
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error guardando intereses:', err);
      setProfileError(`Error al actualizar intereses. ${err instanceof Error ? err.message : 'Inténtalo de nuevo.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Datos de ejemplo para desarrollo
  const mockTags: Tag[] = [
    { id: 1, name: 'Playas', slug: 'playas' },
    { id: 2, name: 'Montañas', slug: 'montanas' },
    { id: 3, name: 'Ciudades', slug: 'ciudades' },
    { id: 4, name: 'Gastronomía', slug: 'gastronomia' },
    { id: 5, name: 'Mochileros', slug: 'mochileros' },
    { id: 6, name: 'Familiar', slug: 'familiar' },
    { id: 7, name: 'Ecoturismo', slug: 'ecoturismo' },
    { id: 8, name: 'Cultural', slug: 'cultural' },
    { id: 9, name: 'Aventura', slug: 'aventura' },
    { id: 10, name: 'Lujo', slug: 'lujo' },
    { id: 11, name: 'Presupuesto', slug: 'presupuesto' },
    { id: 12, name: 'Europa', slug: 'europa' },
    { id: 13, name: 'Asia', slug: 'asia' },
    { id: 14, name: 'América', slug: 'america' },
    { id: 15, name: 'África', slug: 'africa' },
    { id: 16, name: 'Oceanía', slug: 'oceania' }
  ];

  // Usamos datos de ejemplo si no hay datos reales todavía
  const displayTags = availableTags.length > 0 ? availableTags : mockTags;

  if (isLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirigiendo a login
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (err) {
      console.error('Error formateando fecha:', err);
      return 'Fecha inválida';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Tu Perfil</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Información básica</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-2">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Nombre:</span> {user.first_name || user.full_name || 'No disponible'}
              </p>
              <p>
                <span className="font-medium">Miembro desde:</span> {formatDate(profile?.user?.date_joined || user.date_joined)}
              </p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Tus intereses de viaje</h2>
            <p className="text-gray-600 mb-4">
              Selecciona los temas que más te interesan para recibir por correo electrónico información personalizada sobre destinos y ofertas relacionadas.
            </p>
            
            {profileError && !profileLoading && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {profileError}
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {displayTags.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors border
                    ${selectedTags.includes(tag.id)
                      ? 'bg-teal-100 border-teal-500 text-teal-900'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'}
                  `}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => {}} // Manejado por el onClick del div
                      className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500 mr-2"
                    />
                    <span>{tag.name}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSaveInterests}
                disabled={isSaving}
                className={`
                  px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700
                  transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
                  ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {isSaving ? 'Guardando...' : 'Guardar intereses'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 