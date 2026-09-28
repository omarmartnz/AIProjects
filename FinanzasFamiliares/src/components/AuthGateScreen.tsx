import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Home,
  KeyRound,
  PieChart,
  Wallet,
  PiggyBank,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cloudSecurityMode } from '../config/securityMode';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateScreenProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const PREDEFINED_CURRENCIES = SUPPORTED_CURRENCIES;

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  isDarkMode,
  toggleDarkMode,
}) => {
  const {
    user,
    userFamilies,
    activeFamily,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    createFamily,
    joinFamilyByCode,
    switchFamily,
    logOut,
  } = useAuth();

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Onboarding state for logged-in users with no active family
  const [onboardingTab, setOnboardingTab] = useState<'create' | 'join'>('create');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<{ code: string; symbol: string }>({
    code: 'USD',
    symbol: '$',
  });
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Auto-detect invite code in URL (e.g. ?invite=FAM-ABC or ?join=FAM-ABC)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite') || params.get('join') || '';
      if (inviteParam) {
        setJoinCodeInput(inviteParam.toUpperCase());
        setOnboardingTab('join');
      }
    } catch {
      // ignore
    }
  }, []);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google sign in handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Ventana emergente bloqueada por el navegador. Habilita las ventanas emergentes (popups) para este sitio.');
      } else if (err.code === 'auth/internal-error') {
        setError('Error al comunicar con la ventana de Google. Intenta nuevamente o usa acceso por correo.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Dominio no autorizado en Firebase. Agrega este dominio en Firebase Authentication > Settings > Authorized domains.');
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email / Password handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Por favor ingresa tu nombre');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await signUpWithEmail(email, password, displayName);
        setSuccess('¡Cuenta creada con éxito! Configurando tu espacio...');
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('operation-not-allowed');
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Correo o contraseña incorrectos');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Ya existe una cuenta registrada con este correo');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido');
      } else {
        setError(err.message || 'Error al autenticar');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create family onboarding handler
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    setError(null);
    setLoading(true);

    try {
      await createFamily(
        newFamilyName.trim(),
        false,
        selectedCurrency.code,
        selectedCurrency.symbol
      );
      setSuccess(`¡Hogar "${newFamilyName}" creado con éxito!`);
    } catch (err: any) {
      setError(err.message || 'Error al crear el hogar familiar');
    } finally {
      setLoading(false);
    }
  };

  // Join family by invite code
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await joinFamilyByCode(joinCodeInput.trim());
      if (res.success) {
        setSuccess('¡Te has unido exitosamente a la familia!');
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al unirse al hogar familiar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="Finanzas Familiares"
              className="w-10 h-10 rounded-xl shadow-md shadow-indigo-600/20 object-cover shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-stone-900 dark:text-stone-100">
                  Finanzas Familiares
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Seguro & Colaborativo
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
                Presupuestos, regla 50/30/20 y sincronización en vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Espacios Familiares Aislados</span>
            </div>

            <PWAInstallButton variant="header" />

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              title="Cambiar tema claro / oscuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user && (
              <button
                onClick={logOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Value Proposition */}
        <div className="flex-1 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Acceso Privado para tu Hogar</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.15]">
            Controla las finanzas de tu hogar en pareja y en familia
          </h1>

          <p className="text-base text-stone-600 dark:text-stone-400 leading-relaxed">
            Inicia sesión para acceder al espacio financiero exclusivo de tu familia. Gestiona presupuestos con la regla 50/30/20, transacciones compartidas y metas de ahorro sincronizadas en tiempo real en todos tus dispositivos.
          </p>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Regla Presupuestaria 50/30/20
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Equilibrio entre necesidades básicas, estilo de vida y ahorro mensual.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Sincronización Multidispositivo
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Toda la familia colabora en tiempo real desde sus móviles o computadoras.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5">
                <PiggyBank className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Metas de Ahorro & Fondos
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Aportaciones grupales para vacaciones, emergencias o proyectos comunes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Aislamiento & Privacidad
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Cada hogar tiene su base de datos aislada con controles reforzados y cifrado E2EE para respaldos exportados.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Card */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-7 shadow-xl border border-stone-200 dark:border-stone-800 relative">
            
            {/* SCENARIO A: User is NOT logged in */}
            {!user && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {authMode === 'login' ? 'Acceder a mi Familia' : 'Crear Cuenta Familiar'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Ingresa para consultar tus presupuestos y movimientos
                  </p>
                </div>

                {/* Status Messages */}
                {error === 'operation-not-allowed' ? (
                  <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-100">
                          El registro con Correo y Contraseña no está habilitado en Firebase
                        </h4>
                        <p className="mt-1 leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                          Por seguridad y configuración inicial, este proyecto de Firebase tiene activado el acceso directo con <strong>Google</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Quick Recommended Action */}
                    <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80">
                      <p className="font-semibold text-stone-800 dark:text-stone-200 mb-2 text-[11px]">
                        Opción 1: Entrar inmediatamente con 1 clic (recomendado)
                      </p>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Entrar ahora con Google</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* How to enable Email/Password in Firebase */}
                    <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/80 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                      <p className="font-semibold mb-1 text-stone-800 dark:text-stone-200">
                        Opción 2: Habilitar Correo/Contraseña en Firebase Console
                      </p>
                      <ol className="list-decimal pl-4 space-y-1 text-stone-600 dark:text-stone-300">
                        <li>
                          Ve a la{' '}
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
                        <li>Activa el interruptor <strong>Habilitar</strong> y haz clic en <strong>Guardar</strong>.</li>
                        <li>Regresa a esta ventana y podrás registrarte con tu correo.</li>
                      </ol>
                    </div>
                  </div>
                ) : error ? (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {success && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Google 1-Click Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-stone-600 dark:text-stone-400">
                    <span>Acceso Recomendado</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activo y Listo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-bold shadow-xs transition disabled:opacity-50"
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
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200 dark:border-stone-800" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-900 px-3 font-semibold">
                    o con correo electrónico
                  </div>
                </div>

                {/* Tabs Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className={`py-2 rounded-lg transition ${
                      authMode === 'login'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(null); }}
                    className={`py-2 rounded-lg transition ${
                      authMode === 'register'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    Crear Cuenta
                  </button>
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Tu Nombre o Apodo
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="ej. Carlos Morales"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{authMode === 'login' ? 'Entrar a mi Familia' : 'Registrar y Continuar'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* SCENARIO B: User IS logged in, but has NO active family workspace */}
            {user && (!activeFamily || userFamilies.length === 0) && (
              <div>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                    <Home className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    ¡Bienvenido, {user.displayName || 'Familiar'}!
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Para comenzar a registrar presupuestos y gastos, crea tu hogar familiar o únete con un código de invitación.
                  </p>
                </div>

                {/* Feedback */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold mb-4">
                  <button
                    type="button"
                    onClick={() => { setOnboardingTab('create'); setError(null); }}
                    className={`py-2 rounded-lg transition ${
                      onboardingTab === 'create'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    Crear Hogar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOnboardingTab('join'); setError(null); }}
                    className={`py-2 rounded-lg transition ${
                      onboardingTab === 'join'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    Tengo un Código
                  </button>
                </div>

                {/* TAB 1: Create Family */}
                {onboardingTab === 'create' && (
                  <form onSubmit={handleCreateFamily} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Nombre de tu Hogar o Familia
                      </label>
                      <input
                        type="text"
                        required
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        placeholder="ej. Familia Martínez, Casa Central..."
                        className="w-full px-3 py-2.5 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Moneda Base Principal
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1.5 border rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
                        {PREDEFINED_CURRENCIES.map((curr) => (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => setSelectedCurrency({ code: curr.code, symbol: curr.symbol })}
                            title={curr.name}
                            className={`py-2 px-1.5 rounded-lg text-xs border transition text-center flex flex-col items-center justify-center ${
                              selectedCurrency.code === curr.code
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold ring-1 ring-emerald-500'
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750'
                            }`}
                          >
                            <span className="font-bold text-xs">{curr.code} ({curr.symbol})</span>
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate w-full px-0.5">{curr.name.split(' (')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                        Espacio 100% limpio: incluye categorías financieras estándar con límites en 0.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !newFamilyName.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>Crear mi Espacio Familiar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* TAB 2: Join Family */}
                {onboardingTab === 'join' && (
                  <form onSubmit={handleJoinFamily} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Token de Invitación Familiar
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value)}
                          placeholder="Pega el token de 256-bit o enlace..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono tracking-wider bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        Pega el token de invitación de 60 minutos generado por el padre o madre del hogar.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !joinCodeInput.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>Unirse al Hogar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}

                {/* Switcher if user has other families */}
                {userFamilies.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      O selecciona uno de tus hogares existentes:
                    </p>
                    <div className="space-y-1.5">
                      {userFamilies.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => switchFamily(f.id)}
                          className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs font-semibold transition text-left"
                        >
                          <span>{f.familyName}</span>
                          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                            {f.isOwner ? 'Creador' : 'Miembro'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 px-4 text-center text-xs text-stone-400 dark:text-stone-500">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>© Finanzas Familiares</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>Control presupuestario colaborativo ({cloudSecurityMode === 'strict' ? 'Prod Estricto' : 'Dev Compat'})</span>
        </div>
      </footer>

    </div>
  );
};
