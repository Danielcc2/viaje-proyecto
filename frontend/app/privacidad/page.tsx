'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// Tipo para el contenido editable
interface EditableContent {
  id: string;
  title?: string;
  content: string;
}

// Componente para secciones colapsables con posibilidad de edición
const CollapsibleSection = ({ 
  title, 
  children, 
  id, 
  isAdmin, 
  onEdit 
}: { 
  title: string; 
  children: React.ReactNode;
  id: string;
  isAdmin: boolean;
  onEdit: (id: string, content: string, title?: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleEdit = () => {
    // Extraer el contenido HTML como texto
    const content = document.getElementById(`content-${id}`)?.innerHTML || '';
    onEdit(id, content, title);
  };
  
  return (
    <div className="border-b border-gray-200 py-4">
      <div className="flex w-full justify-between items-center">
        <button
          className="flex-grow flex justify-between items-center text-left font-medium text-gray-900"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h3 className="text-lg font-semibold">{title}</h3>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isAdmin && (
          <button 
            onClick={handleEdit}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-teal-600"
            title="Editar sección"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className={`mt-2 ${isOpen ? 'block' : 'hidden'}`} id={`content-${id}`}>
        {children}
      </div>
    </div>
  );
};

// Componente de editor para contenido
const ContentEditor = ({ 
  content, 
  title, 
  onSave, 
  onCancel 
}: { 
  content: string; 
  title?: string;
  onSave: (content: string, title?: string) => void; 
  onCancel: () => void;
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [editedTitle, setEditedTitle] = useState(title || '');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto p-6">
        <h2 className="text-xl font-bold mb-4">Editar contenido</h2>
        
        {title && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contenido (HTML)
          </label>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            rows={10}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(editedContent, editedTitle)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PrivacyPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingContent, setEditingContent] = useState<EditableContent | null>(null);
  
  // Verificar si el usuario es administrador
  useEffect(() => {
    if (user) {
      // Comprobar si el usuario tiene rol de administrador
      // Esto dependerá de cómo esté estructurado tu sistema de usuarios
      const checkIsAdmin = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:8000/api/users/me/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.is_staff || data.is_superuser || false);
          }
        } catch (error) {
          console.error('Error al verificar permisos de administrador:', error);
        }
      };
      
      checkIsAdmin();
    }
  }, [user]);
  
  // Función para iniciar la edición de contenido
  const handleEdit = (id: string, content: string, title?: string) => {
    setEditingContent({ id, content, title });
  };
  
  // Función para guardar los cambios
  const handleSave = async (content: string, title?: string) => {
    if (!editingContent) return;
    
    // Aquí implementarías la lógica para guardar los cambios en el backend
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/settings/privacy-policy/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section_id: editingContent.id,
          content: content,
          title: title
        })
      });
      
      if (response.ok) {
        // Actualizar el contenido en la página
        const contentElement = document.getElementById(`content-${editingContent.id}`);
        if (contentElement) {
          contentElement.innerHTML = content;
        }
        
        // Actualizar el título si existe
        if (title && editingContent.title) {
          const titleElement = document.querySelector(`[data-section-id="${editingContent.id}"]`);
          if (titleElement) {
            titleElement.textContent = title;
          }
        }
        
        // Cerrar el editor
        setEditingContent(null);
      } else {
        alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad y Cookies</h1>
            
            {isAdmin && (
              <button 
                onClick={() => handleEdit('header', '', 'Política de Privacidad y Cookies')}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-teal-600"
                title="Editar encabezado"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-700">
              Última actualización: 4 de mayo de 2025
            </p>
            
            {isAdmin && (
              <button 
                onClick={() => handleEdit('date', 'Última actualización: 4 de mayo de 2025')}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-teal-600"
                title="Editar fecha"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="prose max-w-none relative">
            <div id="content-intro">
              <p>
                En BlogViaje, accesible desde <strong>www.blogviaje.com</strong>, una de nuestras principales prioridades es la privacidad de nuestros visitantes. Esta Política de Privacidad y Cookies documenta los tipos de información que recopilamos y registramos, y cómo la utilizamos.
              </p>
              
              <p className="mt-4">
                Si tienes preguntas adicionales o requieres más información sobre nuestra Política de Privacidad, no dudes en contactarnos a través de <a href="mailto:privacidad@blogviaje.com" className="text-teal-600 hover:underline">privacidad@blogviaje.com</a>.
              </p>
              
              <p className="mt-4">
                Esta Política de Privacidad se aplica solo a nuestras actividades en línea y es válida para los visitantes de nuestro sitio web con respecto a la información que comparten y/o recopilamos en BlogViaje.
              </p>
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => handleEdit('intro', document.getElementById('content-intro')?.innerHTML || '')}
                className="absolute top-0 right-0 p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-teal-600"
                title="Editar introducción"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="mt-8 space-y-2">
            <CollapsibleSection 
              title="1. Responsable del tratamiento" 
              id="responsable"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>Responsable:</strong> BlogViaje, S.L.<br />
                  <strong>NIF:</strong> B12345678<br />
                  <strong>Domicilio social:</strong> Calle Aventura, 123, 28001 Madrid, España<br />
                  <strong>Correo electrónico:</strong> privacidad@blogviaje.com<br />
                  <strong>Teléfono:</strong> +34 91 234 56 78
                </p>
                
                <p>
                  Inscrita en el Registro Mercantil de Madrid, Tomo XXXX, Folio XXX, Hoja M-XXXXX, Inscripción X.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="2. Finalidad del tratamiento de datos" 
              id="finalidad"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  En BlogViaje tratamos la información que nos facilitan las personas interesadas con las siguientes finalidades:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Gestionar el registro como usuario en nuestra web y la creación de una cuenta personal.</li>
                  <li>Gestionar la relación con nuestros usuarios, lo que incluye responder a consultas y dudas.</li>
                  <li>Gestionar las recomendaciones personalizadas de contenido basadas en tus intereses.</li>
                  <li>Enviar comunicaciones comerciales sobre nuestros servicios, siempre y cuando hayas dado tu consentimiento expreso.</li>
                  <li>Analizar tu uso de nuestra web, incluyendo el tiempo de permanencia y el contenido visitado, para mejorar nuestros servicios.</li>
                  <li>Garantizar el cumplimiento de las condiciones de uso de la plataforma y la prevención del fraude.</li>
                </ul>
                
                <p className="mt-2">
                  No se tomarán decisiones automatizadas con los datos proporcionados, salvo en la elaboración de recomendaciones personalizadas basadas en tus intereses y comportamiento en la web.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="3. Legitimación del tratamiento" 
              id="legitimacion"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Las bases legales para el tratamiento de tus datos son:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Consentimiento del interesado</strong> para el registro como usuario, la participación en sorteos y promociones, así como para el envío de comunicaciones comerciales.</li>
                  <li><strong>Ejecución de un contrato</strong> para gestionar las relaciones con nuestros usuarios y clientes.</li>
                  <li><strong>Interés legítimo</strong> para la mejora de nuestros servicios, la prevención del fraude y la gestión de la seguridad de la web.</li>
                  <li><strong>Cumplimiento de obligaciones legales</strong> para conservar facturas, contratos y documentos relacionados con las obligaciones fiscales y mercantiles.</li>
                </ul>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="4. Datos recopilados" 
              id="datos"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Los datos personales que tratamos incluyen:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Datos identificativos:</strong> nombre, apellidos y nombre de usuario.</li>
                  <li><strong>Datos de contacto:</strong> dirección de correo electrónico y, opcionalmente, número de teléfono.</li>
                  <li><strong>Datos de registro:</strong> contraseña (almacenada de forma cifrada).</li>
                  <li><strong>Datos de navegación:</strong> dirección IP, ubicación geográfica general, tipo de navegador, fecha y hora de acceso, tiempo de permanencia, páginas visitadas, enlaces en los que hace clic.</li>
                  <li><strong>Datos de preferencias:</strong> intereses declarados, categorías de artículos consultados, ajustes de configuración.</li>
                  <li><strong>Datos de interacción:</strong> comentarios, valoraciones, reacciones a artículos.</li>
                </ul>
                
                <p className="mt-2">
                  Estos datos se obtienen cuando:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Te registras como usuario.</li>
                  <li>Utilizas nuestros servicios.</li>
                  <li>Interactúas con nuestro contenido (comentarios, valoraciones, etc.).</li>
                  <li>Te comunicas con nosotros por cualquier medio.</li>
                  <li>Navegas por nuestra web.</li>
                </ul>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="5. Período de conservación de datos" 
              id="periodo"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Conservaremos tus datos personales mientras:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Mantengas tu cuenta activa en nuestra plataforma.</li>
                  <li>No revoque tu consentimiento, en caso de que sea la base legal para el tratamiento.</li>
                  <li>No solicites su supresión.</li>
                </ul>
                
                <p className="mt-2">
                  Después, mantendremos tus datos bloqueados durante los plazos de prescripción legal para atender posibles responsabilidades:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>5 años para datos relacionados con consumidores y usuarios (Art. 1964 del Código Civil).</li>
                  <li>4 años para obligaciones fiscales (Art. 66 de la Ley General Tributaria).</li>
                  <li>3 años para datos laborales (Art. 4 del Estatuto de los Trabajadores).</li>
                </ul>
                
                <p className="mt-2">
                  Una vez prescriban estas acciones, procederemos a suprimir definitivamente tus datos.
                </p>
                
                <p className="mt-2">
                  Si solicitas la baja como usuario, tus datos serán cancelados inmediatamente, salvo aquellos que debamos conservar por obligación legal o para prevenir el fraude.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="6. Destinatarios de los datos" 
              id="destinatarios"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Tus datos podrán ser comunicados a:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Proveedores de servicios:</strong> que nos ayudan a prestar nuestros servicios (hosting, servicios de correo electrónico, servicios de análisis, etc.).</li>
                  <li><strong>Entidades financieras:</strong> en caso de que realices pagos a través de nuestra plataforma.</li>
                  <li><strong>Administraciones Públicas:</strong> en cumplimiento de obligaciones legales.</li>
                </ul>
                
                <p className="mt-2">
                  Todos nuestros proveedores de servicios están obligados a cumplir con la normativa de protección de datos y han firmado acuerdos de tratamiento de datos que garantizan la confidencialidad y seguridad de tu información.
                </p>
                
                <p className="mt-2">
                  No realizamos transferencias internacionales de datos fuera del Espacio Económico Europeo (EEE) sin las garantías adecuadas.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="7. Derechos de los interesados" 
              id="derechos"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Como titular de los datos, tienes derecho a:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Acceso:</strong> conocer qué datos personales tuyos estamos tratando.</li>
                  <li><strong>Rectificación:</strong> modificar tus datos cuando sean inexactos o incompletos.</li>
                  <li><strong>Supresión:</strong> solicitar la eliminación de tus datos cuando, entre otros motivos, ya no sean necesarios para los fines para los que fueron recogidos.</li>
                  <li><strong>Limitación:</strong> solicitar la limitación del tratamiento de tus datos cuando impugnes su exactitud, el tratamiento sea ilícito, o ya no los necesitemos pero tú los necesites para reclamaciones.</li>
                  <li><strong>Oposición:</strong> oponerte a que tratemos tus datos cuando el tratamiento se base en nuestro interés legítimo.</li>
                  <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y de uso común, y transmitirlos a otro responsable.</li>
                  <li><strong>Revocación del consentimiento:</strong> retirar tu consentimiento en cualquier momento sin que afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada.</li>
                </ul>
                
                <p className="mt-2">
                  Para ejercer estos derechos, puedes dirigirte a nosotros mediante:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Correo electrónico:</strong> <a href="mailto:privacidad@blogviaje.com" className="text-teal-600 hover:underline">privacidad@blogviaje.com</a></li>
                  <li><strong>Correo postal:</strong> Calle Aventura, 123, 28001 Madrid, España</li>
                </ul>
                
                <p className="mt-2">
                  Deberás aportar una copia de tu DNI o documento equivalente que acredite tu identidad.
                </p>
                
                <p className="mt-2">
                  También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si consideras que el tratamiento no se ajusta a la normativa vigente.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="8. Política de Cookies" 
              id="cookies"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas nuestra web. Utilizamos cookies para:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Cookies técnicas:</strong> esenciales para el funcionamiento básico del sitio web.</li>
                  <li><strong>Cookies de preferencias:</strong> permiten recordar información para que no tengas que volver a configurar tus preferencias cada vez que visites nuestra página.</li>
                  <li><strong>Cookies de análisis:</strong> nos permiten contar visitas y fuentes de tráfico para medir y mejorar el rendimiento de nuestro sitio.</li>
                  <li><strong>Cookies de marketing:</strong> utilizadas para seguir a los visitantes en los sitios web con el fin de mostrar anuncios relevantes.</li>
                </ul>
                
                <p className="mt-2">
                  <strong>Tipos de cookies según su duración:</strong>
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Cookies de sesión:</strong> se eliminan al cerrar el navegador.</li>
                  <li><strong>Cookies persistentes:</strong> permanecen en tu dispositivo durante un período determinado.</li>
                </ul>
                
                <p className="mt-2">
                  <strong>Detalle de las cookies utilizadas en nuestro sitio:</strong>
                </p>
                
                <table className="w-full mt-2 border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Nombre</th>
                      <th className="border p-2 text-left">Proveedor</th>
                      <th className="border p-2 text-left">Finalidad</th>
                      <th className="border p-2 text-left">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">_ga</td>
                      <td className="border p-2">Google Analytics</td>
                      <td className="border p-2">Distinguir usuarios únicos</td>
                      <td className="border p-2">2 años</td>
                    </tr>
                    <tr>
                      <td className="border p-2">_gid</td>
                      <td className="border p-2">Google Analytics</td>
                      <td className="border p-2">Distinguir usuarios</td>
                      <td className="border p-2">24 horas</td>
                    </tr>
                    <tr>
                      <td className="border p-2">session</td>
                      <td className="border p-2">BlogViaje</td>
                      <td className="border p-2">Mantener la sesión del usuario</td>
                      <td className="border p-2">Sesión</td>
                    </tr>
                    <tr>
                      <td className="border p-2">auth_token</td>
                      <td className="border p-2">BlogViaje</td>
                      <td className="border p-2">Autenticación</td>
                      <td className="border p-2">30 días</td>
                    </tr>
                    <tr>
                      <td className="border p-2">cookie_consent</td>
                      <td className="border p-2">BlogViaje</td>
                      <td className="border p-2">Recordar preferencias de cookies</td>
                      <td className="border p-2">1 año</td>
                    </tr>
                  </tbody>
                </table>
                
                <p className="mt-4">
                  <strong>Gestión de cookies:</strong>
                </p>
                
                <p className="mt-2">
                  Puedes configurar tu navegador para que rechace todas las cookies, acepte solo algunas o te avise cuando un sitio web intente colocar o actualizar una cookie. A continuación, te proporcionamos enlaces a las instrucciones para gestionar las cookies en los navegadores más comunes:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Safari</a></li>
                  <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Microsoft Edge</a></li>
                </ul>
                
                <p className="mt-4">
                  Si bloqueas las cookies, es posible que algunas funcionalidades de nuestra web no estén disponibles y la experiencia de usuario se vea afectada.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="9. Medidas de seguridad" 
              id="seguridad"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Hemos implementado las medidas técnicas y organizativas adecuadas para garantizar un nivel de seguridad adecuado al riesgo, incluyendo:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Cifrado de datos y comunicaciones mediante TLS 1.3.</li>
                  <li>Uso de contraseñas robustas y autenticación de doble factor para accesos administrativos.</li>
                  <li>Acceso restringido a los datos personales, solo al personal autorizado.</li>
                  <li>Registro de todas las actividades de tratamiento de datos.</li>
                  <li>Copias de seguridad periódicas para garantizar la recuperación ante incidentes.</li>
                  <li>Revisiones y auditorías de seguridad regulares.</li>
                  <li>Formación del personal en materia de protección de datos y seguridad de la información.</li>
                </ul>
                
                <p className="mt-2">
                  En caso de producirse una violación de la seguridad que afecte a tus datos personales, te lo notificaremos en un plazo máximo de 72 horas, siempre que sea probable que entrañe un alto riesgo para tus derechos y libertades.
                </p>
                
                <p className="mt-2">
                  A pesar de nuestras medidas, ningún método de transmisión o almacenamiento electrónico es 100% seguro. Si tienes motivos para creer que tu interacción con nosotros ya no es segura, infórmanos inmediatamente.
                </p>
              </div>
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="10. Modificaciones de la política de privacidad" 
              id="modificaciones"
              isAdmin={isAdmin}
              onEdit={handleEdit}
            >
              <div className="space-y-2 text-gray-700">
                <p>
                  Nos reservamos el derecho de modificar esta Política de Privacidad y Cookies para adaptarla a:
                </p>
                
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Novedades legislativas o jurisprudenciales.</li>
                  <li>Cambios en nuestros servicios o funcionalidades.</li>
                  <li>Criterios de la Agencia Española de Protección de Datos.</li>
                </ul>
                
                <p className="mt-2">
                  Cualquier modificación será publicada en esta página, y, en casos de cambios significativos, te informaremos mediante un aviso en la web o por correo electrónico.
                </p>
                
                <p className="mt-2">
                  Te recomendamos que revises periódicamente esta Política de Privacidad para estar informado sobre cómo protegemos tu información.
                </p>
              </div>
            </CollapsibleSection>
          </div>
          
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              Para cualquier duda sobre esta Política de Privacidad y Cookies, puedes contactar con nuestro Delegado de Protección de Datos en <a href="mailto:dpo@blogviaje.com" className="text-teal-600 hover:underline">dpo@blogviaje.com</a>.
            </p>
            
            <Link 
              href="/contacto" 
              className="inline-block mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Contactar con nosotros
            </Link>
          </div>
        </div>
      </div>
      
      {/* Modal de edición */}
      {editingContent && (
        <ContentEditor
          content={editingContent.content}
          title={editingContent.title}
          onSave={handleSave}
          onCancel={() => setEditingContent(null)}
        />
      )}
    </div>
  );
} 