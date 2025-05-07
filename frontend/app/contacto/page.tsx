'use client';

import { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import Link from 'next/link';

// Declaración para window.grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
      reset: () => void;
    };
  }
}

// Interfaz para el formulario
interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  policy: boolean;
}

// Interfaz para errores de validación
interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  policy?: string;
  recaptcha?: string;
}

export default function ContactPage() {
  // Estado del formulario
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    policy: false
  });
  
  // Estados de UI
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  // Supervisar bloqueo temporal después de 3 intentos fallidos
  useEffect(() => {
    if (submissionAttempts >= 3 && !isBlocked) {
      setIsBlocked(true);
      const blockTime = 30; // 30 segundos
      setBlockTimeRemaining(blockTime);
      
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsBlocked(false);
            setSubmissionAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [submissionAttempts, isBlocked]);

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores al editar
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormErrors];
        return newErrors;
      });
    }
  };

  // Manejar checkbox política
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: checked }));
    
    // Limpiar error
    if (errors.policy) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.policy;
        return newErrors;
      });
    }
  };

  // Validar el formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validar nombre
    if (!form.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    // Validar email
    if (!form.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = 'Introduce un email válido';
      }
    }
    
    // Validar asunto
    if (!form.subject.trim()) {
      newErrors.subject = 'El asunto es obligatorio';
    } else if (form.subject.trim().length < 5) {
      newErrors.subject = 'El asunto debe tener al menos 5 caracteres';
    }
    
    // Validar mensaje
    if (!form.message.trim()) {
      newErrors.message = 'El mensaje es obligatorio';
    } else if (form.message.trim().length < 20) {
      newErrors.message = 'El mensaje debe tener al menos 20 caracteres';
    }
    
    // Validar política
    if (!form.policy) {
      newErrors.policy = 'Debes aceptar la política de privacidad';
    }
    
    // Validar reCAPTCHA
    if (!recaptchaToken) {
      newErrors.recaptcha = 'Por favor, verifica que no eres un robot';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Detectar patrones de spam en el mensaje
  const detectSpam = (): boolean => {
    const spamPatterns = [
      /\b(?:buy|sell)\b.*\b(?:viagra|cialis)\b/i,
      /\bcasino\b/i,
      /\bpoker\b/i,
      /\blottery\b/i,
      /\b(?:http|https):\/\/(?!(?:www\.)?blogviaje\.com)\b/i,  // Enlaces externos excepto a blogviaje.com
      /\b(?:earn money|ganar dinero|make money)\b/i
    ];
    
    return spamPatterns.some(pattern => pattern.test(form.message + ' ' + form.subject));
  };

  // Enviar el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si el usuario está bloqueado temporalmente
    if (isBlocked) {
      return;
    }
    
    // Incrementar contador de intentos
    setSubmissionAttempts(prev => prev + 1);
    
    // Validar el formulario
    if (!validateForm()) {
      return;
    }
    
    // Detectar spam
    if (detectSpam()) {
      setErrors({
        message: 'Tu mensaje ha sido detectado como spam. Por favor, revisa el contenido.'
      });
      return;
    }
    
    // Comenzar envío
    setIsSubmitting(true);
    
    try {
      // Simular envío al backend (esto se conectaría a tu API real)
      const response = await new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          // Simulamos una respuesta exitosa
          resolve({ success: true });
        }, 1500);
      });
      
      if (response.success) {
        setSubmitStatus('success');
        // Restablecer formulario
        setForm({
          name: '',
          email: '',
          subject: '',
          message: '',
          policy: false
        });
        setRecaptchaToken(null);
        setSubmissionAttempts(0);
        
        // Componente renderizado por Google reCAPTCHA
        if (typeof window !== 'undefined' && window.grecaptcha) {
          window.grecaptcha.reset();
        }
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Contacto</h1>
        <p className="text-gray-600 mb-8">
          ¿Tienes alguna pregunta o sugerencia? No dudes en ponerte en contacto con nosotros.
        </p>
        
        {submitStatus === 'success' && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">¡Mensaje enviado correctamente!</p>
            </div>
            <p className="mt-2">Nos pondremos en contacto contigo lo antes posible.</p>
          </div>
        )}
        
        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">Error al enviar el mensaje</p>
            </div>
            <p className="mt-2">Por favor, inténtalo de nuevo más tarde o contáctanos directamente por correo electrónico.</p>
          </div>
        )}
        
        {isBlocked && (
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">Demasiados intentos</p>
            </div>
            <p className="mt-2">Por favor, espera {blockTimeRemaining} segundos antes de intentar enviar el formulario de nuevo.</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-gray-700 text-sm font-medium mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Tu nombre"
                maxLength={50}
                disabled={isSubmitting}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="tu@email.com"
                maxLength={100}
                disabled={isSubmitting}
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-gray-700 text-sm font-medium mb-2">
                Asunto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Asunto de tu mensaje"
                maxLength={100}
                disabled={isSubmitting}
              />
              {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject}</p>}
            </div>
            
            <div>
              <label htmlFor="message" className="block text-gray-700 text-sm font-medium mb-2">
                Mensaje <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
                maxLength={2000}
                disabled={isSubmitting}
              />
              {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {form.message.length}/2000 caracteres
              </p>
            </div>
            
            <div className="my-6">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Clave de prueba, reemplazar con tu clave real
                onChange={setRecaptchaToken}
              />
              {errors.recaptcha && <p className="mt-1 text-sm text-red-500">{errors.recaptcha}</p>}
            </div>
            
            <div className="my-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="policy"
                  name="policy"
                  checked={form.policy}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-teal-600 border-gray-300 rounded mt-1 mr-2"
                  disabled={isSubmitting}
                />
                <label htmlFor="policy" className="text-gray-700 text-sm">
                  He leído y acepto la <Link href="/privacidad" className="text-teal-600 hover:underline">política de privacidad</Link> <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.policy && <p className="mt-1 text-sm text-red-500">{errors.policy}</p>}
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting || isBlocked}
                className={`w-full py-3 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
                  ${(isSubmitting || isBlocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                * Campos obligatorios
              </p>
            </div>
          </form>
        </div>
        
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Información de contacto</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-teal-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:info@blogviaje.com" className="text-teal-600 hover:underline">info@blogviaje.com</a>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-teal-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-medium">Dirección</p>
                  <address className="not-italic">
                    Calle Aventura, 123<br />
                    28001 Madrid, España
                  </address>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-teal-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="font-medium">Teléfono</p>
                  <a href="tel:+34912345678" className="text-teal-600 hover:underline">+34 91 234 56 78</a>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Horario de atención</h2>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Lunes - Viernes:</span>
                <span className="font-medium">9:00 - 18:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado:</span>
                <span className="font-medium">10:00 - 14:00</span>
              </li>
              <li className="flex justify-between">
                <span>Domingo:</span>
                <span className="font-medium">Cerrado</span>
              </li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">Síguenos</h2>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-teal-600">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-teal-600">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-teal-600">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 