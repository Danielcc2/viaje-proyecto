'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-teal-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            BlogViaje
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink href="/" current={pathname}>
              Inicio
            </NavLink>
            <NavLink href="/articulos" current={pathname}>
              Artículos
            </NavLink>
            <NavLink href="/destinos" current={pathname}>
              Destinos
            </NavLink>
            
            {user ? (
              <>
                <NavLink href="/perfil" current={pathname}>
                  Mi Perfil
                </NavLink>
                <button
                  onClick={logout}
                  className="text-white hover:text-teal-200 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink href="/login" current={pathname}>
                  Iniciar Sesión
                </NavLink>
                <NavLink href="/registro" current={pathname}>
                  Registrarse
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 space-y-3 pb-3">
            <MobileNavLink href="/" onClick={toggleMenu}>
              Inicio
            </MobileNavLink>
            <MobileNavLink href="/articulos" onClick={toggleMenu}>
              Artículos
            </MobileNavLink>
            <MobileNavLink href="/destinos" onClick={toggleMenu}>
              Destinos
            </MobileNavLink>
            
            {user ? (
              <>
                <MobileNavLink href="/perfil" onClick={toggleMenu}>
                  Mi Perfil
                </MobileNavLink>
                <button
                  onClick={() => {
                    logout();
                    toggleMenu();
                  }}
                  className="block w-full text-left py-2 text-white hover:text-teal-200 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <MobileNavLink href="/login" onClick={toggleMenu}>
                  Iniciar Sesión
                </MobileNavLink>
                <MobileNavLink href="/registro" onClick={toggleMenu}>
                  Registrarse
                </MobileNavLink>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

// Componente para enlaces de navegación en escritorio
const NavLink = ({ href, current, children }: { href: string; current: string; children: React.ReactNode }) => {
  const isActive = current === href || (href !== '/' && current.startsWith(href));
  
  return (
    <Link
      href={href}
      className={`${
        isActive ? 'text-yellow-300 font-medium' : 'text-white'
      } hover:text-teal-200 transition-colors`}
    >
      {children}
    </Link>
  );
};

// Componente para enlaces de navegación en móvil
const MobileNavLink = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block py-2 text-white hover:text-teal-200 transition-colors"
    >
      {children}
    </Link>
  );
};

export default Header; 