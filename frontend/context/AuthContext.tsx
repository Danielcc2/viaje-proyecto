'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Definir la estructura del usuario
interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_joined?: string;
}

// Definir el tipo del contexto de autenticación
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (email: string, password: string, first_name?: string, last_name?: string) => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Comprobar si hay una sesión activa al cargar la página
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        // Verificar si hay un token en localStorage
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          setToken(storedToken);
          // Hacer una petición al backend para verificar el token
          const response = await fetch('http://localhost:8000/api/users/profile/', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Si el token no es válido, limpiar localStorage
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserLoggedIn();
  }, []);

  // Función para iniciar sesión
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Guardar el token en localStorage y en el estado
        localStorage.setItem('token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        setToken(data.access);
        
        // Obtener los datos del usuario
        const userResponse = await fetch('http://localhost:8000/api/users/profile/', {
          headers: {
            'Authorization': `Bearer ${data.access}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          return true;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al iniciar sesión');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
    
    return false;
  };

  // Función para registrarse
  const register = async (email: string, password: string, first_name?: string, last_name?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = { 
        email, 
        password,
        ...(first_name && { first_name }),
        ...(last_name && { last_name })
      };
      
      const response = await fetch('http://localhost:8000/api/users/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        // Iniciar sesión automáticamente después del registro
        return await login(email, password);
      } else {
        const errorData = await response.json();
        setError(errorData.email?.[0] || errorData.password?.[0] || 'Error al registrarse');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  // Calcular si el usuario está autenticado
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated,
    isLoading: loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 