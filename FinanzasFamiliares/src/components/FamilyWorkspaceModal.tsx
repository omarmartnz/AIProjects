import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Plus,
  KeyRound,
  Copy,
  Check,
  Share2,
  Home,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Lock,
  ShieldAlert,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';

interface FamilyWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'list' | 'create' | 'join' | 'invite';
}

export const FamilyWorkspaceModal: React.FC<FamilyWorkspaceModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'list',
}) => {
  const {
    user,
    userFamilies,
    currentFamilyId,
    activeFamily,
    switchFamily,
    createFamily,
    createInvite,
    revokeInvite,
    joinFamilyByCode,
    userParentCheck,
    canCreateInvite,
  } = useAuth();

  const [tab, setTab] = useState<'list' | 'create' | 'join' | 'invite'>(defaultTab);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<{ code: string; symbol: string }>({
    code: 'USD',
    symbol: '$',
  });
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Secure invite states
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    expiresAt: number;
    formattedExpiry: string;
  } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [revokingInvite, setRevokingInvite] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedInviteText, setCopiedInviteText] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const params = new URLSearchParams(window.location.search);
        const inviteParam = params.get('invite') || params.get('join') || '';
        if (inviteParam) {
          setJoinCodeInput(inviteParam);
          setTab('join');
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // Live timer countdown for generated invite
  useEffect(() => {
    if (!generatedInvite) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((generatedInvite.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [generatedInvite]);

  if (!isOpen) return null;

  const parentCheck = typeof userParentCheck === 'function'
    ? userParentCheck(activeFamily?.id)
    : {
        allowed: Boolean(canCreateInvite),
        isParent: Boolean(canCreateInvite),
        memberRole: 'Familiar',
        roleName: 'Familiar',
      };
  const isParentOrOwner = Boolean(parentCheck?.allowed ?? parentCheck?.isParent ?? canCreateInvite);

  const formatSecondsLeft = (secs: number) => {
    if (secs <= 0) return 'Expirado';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getInviteUrl = () => {
    if (typeof window === 'undefined' || !generatedInvite) return '';
    const cleanBaseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
    return `${cleanBaseUrl}?invite=${encodeURIComponent(generatedInvite.token)}`;
  };

  const getInviteMessage = () => {
    if (!activeFamily || !generatedInvite) return '';
    const url = getInviteUrl();
    return `¡Hola! Te invito a unirte a nuestro espacio familiar "${activeFamily.familyName}".

Únete directamente desde este enlace seguro:
${url}

O ingresa este token efímero de 256-bit en la app:
${generatedInvite.token}

Nota: Por seguridad, este código es de uso único y expira en 60 minutos.`;
  };

  const handleGenerateInvite = async () => {
    if (!activeFamily) return;
    setError(null);
    setGeneratingInvite(true);
    try {
      const res = await createInvite(activeFamily.id);
      const token = res.token || res.invite?.token;
      const expiresAt = res.expiresAt || res.invite?.expiresAt;
      if (res.success && token && expiresAt) {
        setGeneratedInvite({
          token,
          expiresAt,
          formattedExpiry: res.formattedExpiry || '60 minutos',
        });
        setSuccess('¡Invitación segura de 256-bit generada!');
        setTimeout(() => setSuccess(null), 3000);
      } else if (!res.success) {
        setError(res.message || 'No fue posible generar la invitación');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No fue posible generar la invitación');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!generatedInvite) return;
    setError(null);
    setRevokingInvite(true);
    try {
      await revokeInvite(generatedInvite.token);
      setGeneratedInvite(null);
      setSuccess('La invitación ha sido revocada inmediatamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al revocar la invitación');
    } finally {
      setRevokingInvite(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
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
      setTimeout(() => {
        setSuccess(null);
        setTab('list');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear el espacio familiar');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await joinFamilyByCode(joinCodeInput.trim());
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          setSuccess(null);
          setJoinCodeInput('');
          onClose();
        }, 1200);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al unirte a la familia');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyInviteMessage = () => {
    const msg = getInviteMessage();
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Header - Fijo */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-5 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/20 shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                  Hogares Familiares
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  Gestión colaborativa con seguridad y cifrado familiar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0 ml-2"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Tab Navigation - Fija */}
          <div className="mt-3 grid grid-cols-4 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => { setTab('list'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition truncate ${
                tab === 'list'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Mis Hogares
            </button>
            <button
              type="button"
              onClick={() => { setTab('create'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition truncate ${
                tab === 'create'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              + Crear
            </button>
            <button
              type="button"
              onClick={() => { setTab('join'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition truncate ${
                tab === 'join'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Unirse
            </button>
            <button
              type="button"
              onClick={() => { setTab('invite'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition truncate ${
                tab === 'invite'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Invitar
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">

        {/* TAB 1: LIST */}
        {tab === 'list' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
              <span>Hogares a los que perteneces ({userFamilies.length}):</span>
              <button
                type="button"
                onClick={() => setTab('create')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>

            {userFamilies.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                <Home className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  No estás en ningún hogar familiar todavía
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto">
                  Crea tu propio espacio familiar o únete con un token que te haya compartido un padre o madre del hogar.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setTab('create')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    Crear mi Hogar
                  </button>
                  <button
                    onClick={() => setTab('join')}
                    className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold"
                  >
                    Unirme con Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {userFamilies.map((fam) => {
                  const isActive = fam.id === currentFamilyId;
                  return (
                    <div
                      key={fam.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {fam.familyName}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              Activo
                            </span>
                          )}
                          {fam.isOwner && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                              Creador
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>{fam.isOwner ? 'Hogar Creado por ti' : 'Espacio Familiar Compartido'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => {
                              switchFamily(fam.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 text-xs font-semibold transition"
                          >
                            Abrir
                          </button>
                        ) : (
                          <button
                            onClick={() => setTab('invite')}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition inline-flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Invitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nombre del Hogar Familiar
              </label>
              <input
                type="text"
                required
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="ej. Familia Gómez, Nuestro Piso, Casa de Playa..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Moneda Base Principal
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1.5 border rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setSelectedCurrency({ code: curr.code, symbol: curr.symbol })}
                    title={curr.name}
                    className={`py-2 px-1.5 rounded-lg text-xs border transition text-center flex flex-col items-center justify-center ${
                      selectedCurrency.code === curr.code
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <span className="font-bold text-xs">{curr.code} ({curr.symbol})</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate w-full px-0.5">{curr.name.split(' (')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-100 block">
                  Espacio 100% Limpio y Seguro
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Sin datos de prueba. Incluye las 9 categorías financieras con límites en 0.
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newFamilyName.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Crear Espacio Familiar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 3: JOIN */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="mt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-1">¿Tienes un token de invitación?</span>
              Pídele a tu padre o madre del hogar que genere un token seguro de 60 minutos desde su panel para sincronizar gastos y presupuestos.
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Token o Enlace de Invitación
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="Pega el token de 256-bit o enlace..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Puedes pegar directamente el enlace completo o solo el token hexadecimal de 256 bits.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !joinCodeInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Unirme a esta Familia</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 4: INVITE */}
        {tab === 'invite' && (
          <div className="mt-4 space-y-4">
            
            {/* If NOT Parent/Mother/Owner: Show clear restriction */}
            {!isParentOrOwner ? (
              <div className="text-center p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Acceso Restringido a Padres y Madres
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Por políticas de seguridad y control del hogar, únicamente los usuarios con rol de <strong>Padre o Madre</strong> (o creadores del espacio) pueden generar invitaciones para <strong>{activeFamily?.familyName || 'este hogar'}</strong>.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                  <span>Tu rol en este hogar:</span>
                  <strong className="text-stone-900 dark:text-stone-100">{parentCheck.memberRole || 'Miembro'}</strong>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Si necesitas invitar a un nuevo familiar, solicita a un padre o madre del hogar que genere un código desde su sesión.
                </p>
              </div>
            ) : (
              <>
                {/* Security Specifications Card */}
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Sistema de Invitación Criptográfica de Alta Seguridad
                    </span>
                  </div>
                  <ul className="text-[11px] text-stone-600 dark:text-stone-300 space-y-1.5 list-disc list-inside">
                    <li><strong>Token de 256 bits:</strong> Generado con entropía criptográfica aleatoria.</li>
                    <li><strong>Expiración estricta de 60 minutos:</strong> El token caduca automáticamente.</li>
                    <li><strong>Uso único:</strong> Se revoca de inmediato al ser canjeado por el familiar.</li>
                    <li><strong>Privacidad total:</strong> Solo visible al momento de generar la invitación.</li>
                  </ul>
                </div>

                {/* State 1: No active token generated in this session yet */}
                {!generatedInvite ? (
                  <div className="text-center py-6 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850/50 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        ¿Deseas invitar a un familiar a {activeFamily?.familyName}?
                      </h5>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs mx-auto">
                        Genera un token de 256-bit seguro y compártelo por WhatsApp o enlace directo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{generatingInvite ? 'Generando token seguro...' : 'Generar Invitación Segura (256-bit)'}</span>
                    </button>
                  </div>
                ) : (
                  /* State 2: Active Generated 256-bit Token */
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-stone-900 text-stone-100 dark:bg-stone-950 border border-stone-800 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                          <span>TOKEN CRIPTOGRÁFICO DE 256 BITS</span>
                        </span>
                        
                        {/* Countdown Badge */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-xs font-mono font-bold">
                          <Clock className={`w-3.5 h-3.5 ${secondsRemaining > 0 ? 'text-amber-400 animate-pulse' : 'text-rose-400'}`} />
                          <span className={secondsRemaining > 0 ? 'text-amber-300' : 'text-rose-400'}>
                            {formatSecondsLeft(secondsRemaining)}
                          </span>
                        </div>
                      </div>

                      {/* Monospace token display box */}
                      <div className="p-3 rounded-lg bg-black/50 border border-stone-800 text-[11px] font-mono break-all leading-relaxed select-all text-emerald-400">
                        {generatedInvite.token}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold">
                          ✓ Uso único
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-semibold">
                          ⏱ Expira en 60 min
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                          🔒 Cifrado 256-bit
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        {copiedToken ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-stone-500" />}
                        <span>{copiedToken ? '¡Token Copiado!' : 'Copiar Token'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyInviteMessage}
                        className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedInviteText ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        <span>{copiedInviteText ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
                      </button>
                    </div>

                    {/* Secondary Actions: Revoke & Re-generate */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                      <button
                        type="button"
                        onClick={handleRevokeInvite}
                        disabled={revokingInvite}
                        className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{revokingInvite ? 'Revocando...' : 'Revocar invitación'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateInvite}
                        disabled={generatingInvite}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Generar nuevo token</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Members in current family */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                Miembros en este hogar ({activeFamily?.state.members?.length || 0}):
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeFamily?.state.members?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.avatar}</span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                        {m.role}
                      </span>
                    </div>
                    {m.email && (
                      <span className="text-[11px] text-stone-400 truncate max-w-[140px]">{m.email}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        </div>

      </div>
    </div>
  );
};
