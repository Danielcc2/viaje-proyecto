import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-teal-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna 1: Sobre nosotros */}
          <div>
            <h3 className="text-xl font-bold mb-4">BlogViaje</h3>
            <p className="text-gray-300 mb-4">
              Descubre los mejores destinos, consejos y rutas para tus próximas aventuras.
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div>
            <h3 className="text-xl font-bold mb-4">Enlaces rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/articulos" className="text-gray-300 hover:text-white transition-colors">
                  Artículos
                </Link>
              </li>
              <li>
                <Link href="/destinos" className="text-gray-300 hover:text-white transition-colors">
                  Destinos
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-gray-300 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Suscríbete */}
          <div>
            <h3 className="text-xl font-bold mb-4">Suscríbete</h3>
            <p className="text-gray-300 mb-4">
              Recibe las últimas novedades y ofertas exclusivas en tu correo.
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Tu email"
                className="py-2 px-3 text-black rounded-l focus:outline-none"
              />
              <button
                type="submit"
                className="bg-yellow-500 text-black py-2 px-4 rounded-r hover:bg-yellow-400 transition-colors"
              >
                Suscribir
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-teal-700 text-center text-gray-400">
          <p>© {new Date().getFullYear()} BlogViaje. Todos los derechos reservados. <Link href="/privacidad" className="hover:text-white transition-colors">Política de privacidad y cookies</Link></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 