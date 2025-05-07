import './globals.css'
import 'react-quill/dist/quill.snow.css'
import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "../components/Footer";
import AuthProvider from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blog de Viajes",
  description: "Descubre los mejores destinos, consejos y rutas de viaje en nuestro blog especializado",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
