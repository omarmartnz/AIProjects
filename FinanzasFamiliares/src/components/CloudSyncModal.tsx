import React, { useState } from 'react';
import {
  Cloud,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Laptop,
  Tablet,
  X,
  ShieldCheck,
} from 'lucide-react';
import { FamilyState } from '../types';
import { useAuth } from '../context/AuthContext';
import { cloudSecurityMode, isCloudSecurityStrict } from '../config/securityMode';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  passphrase?: string;
  cloudStatus: 'synced' | 'syncing' | 'offline';
  lastSyncText: string;
  onForceSync: () => void;
  onSwitchFamilyCode?: (code: string) => void;
  onOpenSecurityModal?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  state,
  passphrase,
  cloudStatus,
  lastSyncText,
  onForceSync,
  onOpenSecurityModal,
}) => {
  const { user, activeFamily } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (passphrase) {
      navigator.clipboard.writeText(passphrase);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const familyDisplayName = activeFamily?.familyName || state.familyName || 'Mi Hogar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Sincronización en la Nube Multi-Dispositivo
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Google Cloud Firestore en tiempo real ({isCloudSecurityStrict
                  ? (import.meta.env.PROD ? 'Modo Estricto (Producción)' : 'Modo Estricto (Desarrollo)')
                  : 'Modo Compatibilidad (Desarrollo)'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* E2EE Security Badge */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold block">
                  {isCloudSecurityStrict ? 'Modo Estricto de Seguridad Activo' : 'Modo Compatibilidad de Desarrollo Activo'}
                </span>
                <p className="mt-0.5 opacity-90">
                  {isCloudSecurityStrict
                    ? 'Modo estricto activo con controles reforzados. El cifrado AES-GCM 256-bit protege la sincronización cloud y el backup/exportación E2EE.'
                    : 'Entorno de desarrollo para pruebas e integración. En este modo, el cifrado AES-GCM 256-bit aplica al backup/exportación E2EE.'}
                </p>
                <p className="mt-0.5 opacity-75">Modo Cloud: <span className="font-mono uppercase">{cloudSecurityMode}</span></p>
              </div>
            </div>
            {onOpenSecurityModal && (
              <button
                type="button"
                onClick={onOpenSecurityModal}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline whitespace-nowrap"
              >
                Configurar Clave
              </button>
            )}
          </div>

          {/* Active Family Card */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Hogar Familiar Activo
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                Zero-Trust Firestore
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
              <span className="text-base font-bold text-stone-900 dark:text-stone-100 block">
                {familyDisplayName}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 block mt-0.5">
                {user?.email ? `Vinculado a la cuenta ${user.email}` : 'Sesión local en este dispositivo'}
              </span>
            </div>

            {passphrase && (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block text-center">
                  Clave de Seguridad E2EE (Passphrase)
                </span>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-sm font-mono font-bold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    {passphrase}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 shadow-xs transition"
                    title="Copiar clave de seguridad"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-relaxed">
              Para enlazar tu móvil, tablet u ordenador, inicia sesión con tu cuenta de usuario. Todas las finanzas de tu hogar se actualizan en tiempo real.
            </p>
          </div>

          {/* Multi-device graphic icons */}
          <div className="flex items-center justify-center gap-6 py-1 text-stone-500 dark:text-stone-400">
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-6 h-6 text-emerald-600" />
              <span className="text-[10px] font-medium">Móvil Familiar</span>
            </div>
            <div className="w-8 border-t border-dashed border-stone-300 dark:border-stone-600" />
            <div className="flex flex-col items-center gap-1">
              <Tablet className="w-6 h-6 text-blue-600" />
              <span className="text-[10px] font-medium">Tablet Hogar</span>
            </div>
            <div className="w-8 border-t border-dashed border-stone-300 dark:border-stone-600" />
            <div className="flex flex-col items-center gap-1">
              <Laptop className="w-6 h-6 text-indigo-600" />
              <span className="text-[10px] font-medium">Portátil</span>
            </div>
          </div>

          {/* Cloud Status & Manual Sync Button */}
          <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Cloud className={`w-5 h-5 ${cloudStatus === 'synced' ? 'text-emerald-500' : 'text-amber-500'}`} />
                {cloudStatus === 'synced' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  Estado en la Nube: Conectado
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {lastSyncText || 'En Vivo (Firestore)'}
                </span>
              </div>
            </div>

            <button
              onClick={onForceSync}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
