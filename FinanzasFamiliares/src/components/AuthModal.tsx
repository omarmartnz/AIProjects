import React, { useState } from 'react';
import {
  Users,
  X,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('La ventana emergente de Google fue bloqueada por el navegador. Puedes permitir ventanas emergentes o acceder con correo y contraseña.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else {
        setError(err.message || 'Error al conectar con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Por favor ingresa tu nombre');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await signUpWithEmail(email, password, displayName);
        setSuccessMessage('¡Cuenta creada exitosamente!');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('operation-not-allowed');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Ya existe una cuenta con este correo electrónico');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres');
      } else {
        setError(err.message || 'Error en la autenticación');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {mode === 'login' && 'Iniciar Sesión'}
                {mode === 'register' && 'Crear Cuenta Familiar'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Accede a tus finanzas familiares en la nube
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success alert */}
        {error === 'operation-not-allowed' ? (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-100">
                  El registro con Correo y Contraseña requiere activación
                </h4>
                <p className="mt-1 leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                  Firebase Authentication tiene activado el acceso con <strong>Google</strong>. Para usar correo/contraseña, debe habilitarse en Firebase Console.
                </p>
              </div>
            </div>

            {/* Quick Solution Button */}
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80">
              <p className="font-semibold text-stone-800 dark:text-stone-200 mb-2 text-[11px]">
                Solución recomendada (sin configurar nada):
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Acceder ahora con Google (1 Clic)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Console guide */}
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1 text-stone-800 dark:text-stone-200">
                Para habilitar Correo en Firebase:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-stone-600 dark:text-stone-300">
                <li>
                  Abre la{' '}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900"
                  >
                    Consola de Firebase (Sign-in method) ↗
                  </a>
                </li>
                <li>Haz clic en <strong>Correo electrónico/contraseña</strong>.</li>
                <li>Activa <strong>Habilitar</strong> y haz clic en <strong>Guardar</strong>.</li>
              </ol>
            </div>
          </div>
        ) : error ? (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Mode Switcher Pills */}
        <div className="mt-4 grid grid-cols-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-1.5 rounded-lg transition ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`py-1.5 rounded-lg transition ${
              mode === 'register'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Google One-Click Login */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-stone-600 dark:text-stone-400">
            <span>Acceso Inmediato</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Listo para usar
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-800" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-900 px-2 font-medium">
            o con correo
          </div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nombre o Apodo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ej. María Martínez"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{mode === 'login' ? 'Entrar a mi Cuenta' : 'Crear Cuenta Familiar'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Security guarantee note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Datos encriptados y aislados por hogar familiar</span>
        </div>

      </div>
    </div>
  );
};
