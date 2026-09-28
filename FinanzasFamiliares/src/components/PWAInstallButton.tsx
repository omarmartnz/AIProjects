import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Laptop, ExternalLink, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu' | 'full';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running in standalone/installed mode, do not show button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    // If the browser already captured the direct install prompt event (Chromium desktop/Android outside iframe)
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        onInstalled?.();
      }
    } else {
      // If inside an iframe (preview), on iOS Safari, or waiting for prompt event, show the modal
      setShowGuideModal(true);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
    setShowGuideModal(false);
  };

  const renderButtonContent = () => {
    if (variant === 'menu') {
      return (
        <button
          onClick={handleInstallClick}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-between font-medium group transition"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Instalar Aplicación</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            {isInstallable ? 'Directo' : 'PWA'}
          </span>
        </button>
      );
    }

    if (variant === 'full') {
      return (
        <button
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          <span>{isInstallable ? 'Instalar Directo en este Dispositivo' : 'Instalar en este Dispositivo'}</span>
        </button>
      );
    }

    // Default variant: 'header' compact button
    return (
      <button
        onClick={handleInstallClick}
        title={isInstallable ? 'Instalación directa disponible' : 'Instalar Finanzas Familiares en tu dispositivo'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold shadow-2xs transition"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{isInstallable ? 'Instalar Directo' : 'Instalar App'}</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  };

  return (
    <>
      {renderButtonContent()}

      {/* Installation Guide / Iframe Notice Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                    Instalar Finanzas Familiares
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Acceso como app nativa sin barra de navegación
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If in iframe (like AI Studio preview): explain and offer 1-click open in full tab */}
            {isInIframe ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 space-y-1.5">
                  <p className="font-semibold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>¿Por qué no sale el diálogo directo aquí?</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Estás dentro de la <strong>vista previa del entorno</strong>. Por seguridad internacional de la web, Chrome, Edge y Android <strong>bloquean</strong> las ventanas emergentes de instalación directa dentro de marcos embebidos (iframes).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                  <p className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                    Instalación directa en 1 clic:
                  </p>
                  <p className="text-[11px] text-indigo-900 dark:text-indigo-300 leading-relaxed">
                    Abre la aplicación en una pestaña propia. Allí el navegador activa de inmediato el instalador nativo directo.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition text-xs"
                  >
                    <span>Abrir en pestaña nueva para instalar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : isIOS ? (
              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <p className="text-stone-700 dark:text-stone-200 font-medium">
                  En iPhone y iPad (Apple no admite instalación directa por botón):
                </p>
                <ol className="space-y-2.5 pl-1">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span className="pt-0.5">
                      Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-500" /> en Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span className="pt-0.5">
                      Selecciona <strong>«Agregar a pantalla de inicio»</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-indigo-500" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span className="pt-0.5">
                      Confirma tocando <strong>«Agregar»</strong>.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold">
                    <Laptop className="w-4 h-4 text-indigo-500" />
                    <span>En Computadora (Chrome, Edge, Brave):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Haz clic en el icono de <strong>Instalar</strong> (⊕) en el lado derecho de la barra de direcciones del navegador o en el menú de 3 puntos (<strong>⋮</strong>) &rarr; <em>«Instalar Finanzas Familiares»</em>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>En Teléfono Android:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Abre el menú de opciones (<strong>⋮</strong>) en la esquina superior derecha y selecciona <strong>«Instalar aplicación»</strong> o <strong>«Agregar a pantalla principal»</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification if installed in this session */}
      {justInstalled && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Aplicación instalada con éxito!</span>
        </div>
      )}
    </>
  );
};

