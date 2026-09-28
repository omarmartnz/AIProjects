import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Coins,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Database,
  X,
  Sparkles,
  CheckCircle2,
  Home,
  Users,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Cloud,
  Smartphone,
  Tablet,
  Laptop,
  ArrowRight,
  Bell,
  BellRing,
  BellOff,
  Mail,
  Volume2,
  VolumeX,
  Send,
  Sliders,
  CheckCircle,
  Info,
  Calendar,
} from 'lucide-react';
import { FamilyState, AlertSettings, BudgetAlert } from '../types';
import { defaultAlertSettings } from '../data/initialData';
import { SUPPORTED_CURRENCIES } from '../utils/currencies';
import { calculateKeyFingerprint, generateSecurityPassphrase } from '../utils/crypto';
import { exportFullFamilyToExcel } from '../utils/exportExcel';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showBrowserNotification,
  playNotificationSound,
  NotificationPermissionStatus,
} from '../utils/notifications';

interface SecurityCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  passphrase: string;
  initialTab?: 'currency' | 'security' | 'family' | 'alerts';
  cloudStatus?: 'synced' | 'syncing' | 'offline';
  lastSyncText?: string;
  alerts?: BudgetAlert[];
  onForceSync?: () => Promise<void> | void;
  onSwitchFamilyCode?: (code: string) => void;
  onUpdatePassphrase: (newPassphrase: string) => void;
  onUpdateCurrency: (currencyCode: string, symbol: string) => void;
  onClearAllData: () => void;
  onShowToast?: (title: string, desc: string, type?: 'success' | 'info' | 'warning') => void;
  onUpdateAlertSettings?: (newSettings: Partial<AlertSettings>) => void;
  onUpdateGlobalAlertThreshold?: (threshold: number) => void;
  onSendTestNotification?: () => Promise<boolean>;
  onOpenBackupExport?: () => void;
}

export const SecurityCurrencyModal: React.FC<SecurityCurrencyModalProps> = ({
  isOpen,
  onClose,
  state,
  passphrase,
  initialTab = 'currency',
  cloudStatus = 'synced',
  lastSyncText = 'Sincronizado',
  alerts = [],
  onForceSync,
  onSwitchFamilyCode,
  onUpdatePassphrase,
  onUpdateCurrency,
  onClearAllData,
  onShowToast,
  onUpdateAlertSettings,
  onUpdateGlobalAlertThreshold,
  onSendTestNotification,
  onOpenBackupExport,
}) => {
  const [activeTab, setActiveTab] = useState<'currency' | 'security' | 'family' | 'alerts'>(initialTab);
  const { user, activeFamily, currentFamilyId, userFamilies, deleteFamily } = useAuth();

  const members = state.members || [];
  const currentMember = user
    ? members.find(
        (m) =>
          (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
          m.id === `mem-${user.uid.slice(0, 8)}`
      )
    : null;

  const currentFamilyInfo = userFamilies.find(f => f.id === currentFamilyId || f.id === activeFamily?.id);
  const isCreator = Boolean(!user || (user && (activeFamily?.ownerId === user.uid || currentFamilyInfo?.isOwner)));
  const targetFamilyName = activeFamily?.familyName || currentFamilyInfo?.familyName || state.familyName || 'Mi Hogar';

  // Role permissions:
  // - Tab 'Seguridad & Nube': solo padre / creador y madre
  // - Sección Sincronización en la Nube Multi-Dispositivo: todos los que tienen acceso al tab (padre/creador y madre)
  // - Demás secciones (Clave de Seguridad, Criptografía y Resguardo/Exportación total): solo padre / creador
  const roleName = currentMember?.role || (isCreator ? 'Padre / Creador' : 'Miembro');
  const normalizedRole = roleName.toLowerCase();
  const isPadre = isCreator || normalizedRole.includes('padre') || roleName === 'Padre / Esposo' || roleName === 'Padre';
  const isMadre = normalizedRole.includes('madre') || roleName === 'Madre / Esposa' || roleName === 'Madre';
  const canAccessSecurityTab = isCreator || isPadre || isMadre;
  const isPadreOrCreator = isCreator || isPadre;

  // Deletion confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [isDeletingFamily, setIsDeletingFamily] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Currency state
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(state.currencyCode || 'EUR');
  const [customSymbol, setCustomSymbol] = useState(state.currency || '€');
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);

  // Security state
  const [showKey, setShowKey] = useState(false);
  const [tempPassphrase, setTempPassphrase] = useState(passphrase);
  const [copiedKey, setCopiedKey] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('----');
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  // Alert settings state
  const alertSettings = state.alertSettings || defaultAlertSettings;
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(alertSettings.notificationsEnabled);
  const [localBrowserNotifications, setLocalBrowserNotifications] = useState(alertSettings.browserNotifications);
  const [localSoundEnabled, setLocalSoundEnabled] = useState(alertSettings.soundEnabled);
  const [localNotifyOnWarning, setLocalNotifyOnWarning] = useState(alertSettings.notifyOnWarning);
  const [localNotifyOnDanger, setLocalNotifyOnDanger] = useState(alertSettings.notifyOnDanger);
  const [localNotifyOnRecurringDue, setLocalNotifyOnRecurringDue] = useState(alertSettings.notifyOnRecurringDue);

  // Email alerts state (upcoming / non-functional yet)
  const [localEmailAlertsEnabled, setLocalEmailAlertsEnabled] = useState(alertSettings.emailAlertsEnabled);
  const [localEmailAddress, setLocalEmailAddress] = useState(alertSettings.emailAddress || user?.email || '');
  const [localEmailFrequency, setLocalEmailFrequency] = useState<'instant' | 'daily' | 'weekly'>(alertSettings.emailFrequency || 'instant');
  const [localEmailNotifyOnDangerOnly, setLocalEmailNotifyOnDangerOnly] = useState(alertSettings.emailNotifyOnDangerOnly ?? true);

  // Global threshold state
  const [localGlobalThreshold, setLocalGlobalThreshold] = useState<number>(state.globalAlertThreshold || 80);

  // Notification permission state
  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus>(() => getNotificationPermission());
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    setSelectedCurrencyCode(state.currencyCode || 'EUR');
    setCustomSymbol(state.currency || '€');
    setTempPassphrase(passphrase);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [state.currencyCode, state.currency, passphrase, isOpen, initialTab]);

  useEffect(() => {
    const currentAlertSettings = state.alertSettings || defaultAlertSettings;
    setLocalNotificationsEnabled(currentAlertSettings.notificationsEnabled);
    setLocalBrowserNotifications(currentAlertSettings.browserNotifications);
    setLocalSoundEnabled(currentAlertSettings.soundEnabled);
    setLocalNotifyOnWarning(currentAlertSettings.notifyOnWarning);
    setLocalNotifyOnDanger(currentAlertSettings.notifyOnDanger);
    setLocalNotifyOnRecurringDue(currentAlertSettings.notifyOnRecurringDue);
    setLocalEmailAlertsEnabled(currentAlertSettings.emailAlertsEnabled);
    if (currentAlertSettings.emailAddress) {
      setLocalEmailAddress(currentAlertSettings.emailAddress);
    } else if (user?.email && !localEmailAddress) {
      setLocalEmailAddress(user.email);
    }
    if (currentAlertSettings.emailFrequency) {
      setLocalEmailFrequency(currentAlertSettings.emailFrequency);
    }
    setLocalEmailNotifyOnDangerOnly(currentAlertSettings.emailNotifyOnDangerOnly ?? true);
    setLocalGlobalThreshold(state.globalAlertThreshold || 80);
    setPermStatus(getNotificationPermission());
  }, [state.alertSettings, state.globalAlertThreshold, user?.email, isOpen]);

  // Handlers for Alert Settings
  const handleToggleNotifications = async (enabled: boolean) => {
    setLocalNotificationsEnabled(enabled);
    let browserVal = localBrowserNotifications;
    if (enabled && !localBrowserNotifications && isNotificationSupported()) {
      if (permStatus !== 'granted') {
        const perm = await requestNotificationPermission();
        setPermStatus(perm);
        if (perm === 'granted') {
          browserVal = true;
          setLocalBrowserNotifications(true);
        }
      } else {
        browserVal = true;
        setLocalBrowserNotifications(true);
      }
    }
    onUpdateAlertSettings?.({
      notificationsEnabled: enabled,
      browserNotifications: browserVal,
    });
    if (enabled) {
      playNotificationSound('success');
      onShowToast?.('Notificaciones Habilitadas', 'Los avisos de presupuesto están activos.', 'success');
    } else {
      onShowToast?.('Notificaciones Silenciadas', 'No se emitirán alertas en este dispositivo.', 'info');
    }
  };

  const handleToggleBrowserNotifications = async (enabled: boolean) => {
    if (enabled) {
      const perm = await requestNotificationPermission();
      setPermStatus(perm);
      if (perm === 'granted') {
        setLocalBrowserNotifications(true);
        onUpdateAlertSettings?.({ browserNotifications: true });
        playNotificationSound('success');
        onShowToast?.('Notificaciones de Navegador Activas', 'Recibirás avisos de escritorio.', 'success');
      } else {
        setLocalBrowserNotifications(false);
        onUpdateAlertSettings?.({ browserNotifications: false });
        onShowToast?.(
          'Permiso de Notificación',
          perm === 'denied'
            ? 'Las notificaciones están bloqueadas en tu navegador. Puedes desbloquearlas en los permisos del sitio.'
            : 'Se requiere permiso del navegador para mostrar avisos de escritorio.',
          'warning'
        );
      }
    } else {
      setLocalBrowserNotifications(false);
      onUpdateAlertSettings?.({ browserNotifications: false });
    }
  };

  const handleToggleSound = (enabled: boolean) => {
    setLocalSoundEnabled(enabled);
    onUpdateAlertSettings?.({ soundEnabled: enabled });
    if (enabled) {
      playNotificationSound('warning');
    }
  };

  const handleToggleNotifyWarning = (enabled: boolean) => {
    setLocalNotifyOnWarning(enabled);
    onUpdateAlertSettings?.({ notifyOnWarning: enabled });
  };

  const handleToggleNotifyDanger = (enabled: boolean) => {
    setLocalNotifyOnDanger(enabled);
    onUpdateAlertSettings?.({ notifyOnDanger: enabled });
  };

  const handleToggleNotifyRecurring = (enabled: boolean) => {
    setLocalNotifyOnRecurringDue(enabled);
    onUpdateAlertSettings?.({ notifyOnRecurringDue: enabled });
  };

  const handleToggleEmailAlerts = (enabled: boolean) => {
    setLocalEmailAlertsEnabled(enabled);
    onUpdateAlertSettings?.({
      emailAlertsEnabled: enabled,
      emailAddress: localEmailAddress,
      emailFrequency: localEmailFrequency,
      emailNotifyOnDangerOnly: localEmailNotifyOnDangerOnly,
    });
    onShowToast?.(
      'Preferencia Guardada',
      enabled
        ? 'Opción de correo activada (el envío se habilitará en la siguiente fase).'
        : 'Alertas por correo desactivadas.',
      'info'
    );
  };

  const handleSaveEmailConfig = () => {
    onUpdateAlertSettings?.({
      emailAlertsEnabled: localEmailAlertsEnabled,
      emailAddress: localEmailAddress.trim(),
      emailFrequency: localEmailFrequency,
      emailNotifyOnDangerOnly: localEmailNotifyOnDangerOnly,
    });
    onShowToast?.(
      'Preferencias de Correo Guardadas',
      'Tu dirección y frecuencia han quedado registradas para el servicio de avisos.',
      'success'
    );
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      if (onSendTestNotification) {
        await onSendTestNotification();
      } else {
        const perm = await requestNotificationPermission();
        setPermStatus(perm);
        if (perm === 'granted') {
          showBrowserNotification('🔔 Finanzas Familiares: Alerta de Prueba', {
            body: '¡Todo listo! Las notificaciones del sistema están funcionando correctamente en este dispositivo.',
            playSound: localSoundEnabled,
            soundType: 'success',
          });
          onShowToast?.('Notificación Enviada', 'Se ha emitido un aviso de prueba en tu navegador', 'success');
        } else {
          onShowToast?.(
            'Permiso Requerido',
            perm === 'denied'
              ? 'Las notificaciones están bloqueadas en este navegador. Revisa los permisos del candado en la barra de direcciones.'
              : 'Se requiere autorización para mostrar notificaciones.',
            'warning'
          );
        }
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingManual(true);
    try {
      await onForceSync?.();
    } finally {
      setIsSyncingManual(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setConfirmNameInput('');
      setDeleteError(null);
      setIsDeletingFamily(false);
    } else {
      if (initialTab === 'security' && !canAccessSecurityTab) {
        setActiveTab('currency');
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, canAccessSecurityTab]);

  useEffect(() => {
    if (passphrase) {
      calculateKeyFingerprint(passphrase).then(setFingerprint).catch(() => setFingerprint('----'));
    }
  }, [passphrase]);

  if (!isOpen) return null;

  const handleExportFullExcel = () => {
    try {
      exportFullFamilyToExcel(state, targetFamilyName);
      onShowToast?.(
        'Excel Generado con Éxito',
        `Se ha exportado toda la información de "${targetFamilyName}" a un libro de Excel (.xls)`,
        'success'
      );
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err);
      onShowToast?.('Error al exportar', err.message || 'No se pudo generar el archivo de Excel', 'warning');
    }
  };

  const handleExecuteDeleteFamily = async () => {
    if (!isCreator) {
      setDeleteError('Solo el creador tiene permisos para eliminar permanentemente esta unidad familiar.');
      return;
    }
    if (confirmNameInput.trim() !== targetFamilyName.trim()) {
      setDeleteError(`Debes escribir exactamente "${targetFamilyName}".`);
      return;
    }
    if (!acknowledgedDisclaimer) {
      setDeleteError('Debes marcar la casilla aceptando que la data se borrará permanentemente y asumiendo toda la responsabilidad.');
      return;
    }

    try {
      setIsDeletingFamily(true);
      setDeleteError(null);
      const targetId = activeFamily?.id || currentFamilyId;
      const res = await deleteFamily(targetId || undefined);

      onShowToast?.(
        'Unidad Familiar Eliminada',
        res?.message || `"${targetFamilyName}" ha sido eliminada permanentemente.`,
        'success'
      );
      setShowDeleteConfirm(false);
      setConfirmNameInput('');
      onClose();
    } catch (err: any) {
      console.error('Error al borrar unidad familiar:', err);
      setDeleteError(err.message || 'Error al eliminar la unidad familiar');
    } finally {
      setIsDeletingFamily(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(passphrase);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateNewKey = () => {
    const generated = generateSecurityPassphrase();
    setTempPassphrase(generated);
    onUpdatePassphrase(generated);
  };

  const handleSavePassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPassphrase.trim()) {
      onUpdatePassphrase(tempPassphrase.trim());
    }
  };

  const handleSelectPredefinedCurrency = (code: string, symbol: string) => {
    setSelectedCurrencyCode(code);
    setCustomSymbol(symbol);
    setIsCustomCurrency(false);
    onUpdateCurrency(code, symbol);
  };

  const handleSaveCustomCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCurrencyCode.trim() && customSymbol.trim()) {
      onUpdateCurrency(selectedCurrencyCode.trim().toUpperCase(), customSymbol.trim());
    }
  };

  const hasUnsavedPassphraseChanges = isPadreOrCreator && tempPassphrase.trim() !== passphrase;

  const handleAttemptClose = () => {
    if (hasUnsavedPassphraseChanges) {
      setActiveTab('security');
      onShowToast?.(
        'Cambios sin guardar',
        'Debes guardar la clave de seguridad antes de cerrar esta ventana.',
        'warning'
      );
      return false;
    }
    onClose();
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Header - Siempre visible en la parte superior */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                  Opciones de Configuracion
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
                  Moneda base, seguridad, unidad familiar y centro de alertas
                </p>
              </div>
            </div>
            <button
              onClick={handleAttemptClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0 ml-2"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher - Fijo en la parte superior debajo del header */}
        <div className="flex-shrink-0 px-4 sm:px-6 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => { setActiveTab('currency'); setShowDeleteConfirm(false); }}
              className={`flex-1 min-h-[42px] py-2.5 px-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'currency'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <Coins className="w-4 h-4 shrink-0" />
              <span>Moneda</span>
            </button>
            {/* TAB SEGURIDAD & NUBE - Solo Padre / Creador y Madre */}
            <button
              type="button"
              onClick={() => {
                if (!canAccessSecurityTab) {
                  onShowToast?.(
                    'Acceso Restringido',
                    'La pestaña Seguridad & Nube está disponible únicamente para el Padre / Creador y la Madre.',
                    'warning'
                  );
                  return;
                }
                setActiveTab('security');
                setShowDeleteConfirm(false);
              }}
              className={`flex-1 min-h-[42px] py-2.5 px-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'security'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              } ${!canAccessSecurityTab ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={!canAccessSecurityTab ? 'Restringido a Padre / Creador y Madre' : 'Seguridad & Nube'}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Seguridad & Nube</span>
              {!canAccessSecurityTab && <Lock className="w-3 h-3 text-stone-400 shrink-0" />}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('family'); setShowDeleteConfirm(false); }}
              className={`flex-1 min-h-[42px] py-2.5 px-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'family'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Unidad Familiar</span>
            </button>
            {/* NUEVO TAB ALERTAS */}
            <button
              type="button"
              onClick={() => { setActiveTab('alerts'); setShowDeleteConfirm(false); }}
              className={`flex-1 min-h-[42px] py-2.5 px-2 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'alerts'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Alertas</span>
              {alerts && alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-tight">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cuerpo scrolleable del contenido de pestañas */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* TAB 1: CURRENCY */}
          {activeTab === 'currency' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold block mb-0.5">Moneda Base de la Familia:</span>
              <span>
                Todos los presupuestos, informes en PDF y límites se unifican en esta moneda ({state.currencyCode} {state.currency}). Al registrar gastos puedes seleccionar cualquier otra moneda y se convertirá automáticamente.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                Selecciona una Moneda Principal
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border rounded-xl border-stone-200 dark:border-stone-700">
                {SUPPORTED_CURRENCIES.map(curr => {
                  const isSelected = state.currencyCode === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => handleSelectPredefinedCurrency(curr.code, curr.symbol)}
                      className={`p-2.5 rounded-lg text-left border transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs'
                          : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono font-bold">{curr.code}</span>
                        <span className="text-base font-bold">{curr.symbol}</span>
                      </div>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-1">
                        {curr.name.split(' (')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom currency toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCustomCurrency(!isCustomCurrency)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {isCustomCurrency ? '← Volver a lista estándar' : '¿Usar otra moneda o símbolo personalizado?'}
              </button>

              {isCustomCurrency && (
                <form onSubmit={handleSaveCustomCurrency} className="mt-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Código (ej. USD, UYU)
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        required
                        value={selectedCurrencyCode}
                        onChange={e => setSelectedCurrencyCode(e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 text-xs uppercase font-mono font-bold rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Símbolo (ej. $, €, S/.)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={customSymbol}
                        onChange={e => setCustomSymbol(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Aplicar Moneda Personalizada
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SEGURIDAD & NUBE */}
        {activeTab === 'security' && !canAccessSecurityTab && (
          <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 text-center space-y-3.5 my-3 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Acceso Restringido a Seguridad & Nube
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                Esta pestaña contiene los parámetros de cifrado de extremo a extremo, llaves maestras y sincronización en la nube. Únicamente el <strong>Padre / Creador</strong> y la <strong>Madre</strong> tienen autorización para acceder.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('currency')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition cursor-pointer"
              >
                Ir a Opciones de Moneda
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && canAccessSecurityTab && (
          <div className="space-y-4">
            {/* Panel de Sincronización en la Nube Multi-Dispositivo */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Sincronización en la Nube Multi-Dispositivo
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Sincronización en tiempo real protegida con cifrado de extremo a extremo
                    </p>
                  </div>
                </div>
              </div>

              {/* Cloud Status & Manual Sync Button */}
              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Cloud className={`w-5 h-5 ${cloudStatus === 'synced' ? 'text-emerald-500' : cloudStatus === 'syncing' || isSyncingManual ? 'text-amber-500 animate-pulse' : 'text-stone-400'}`} />
                    {cloudStatus === 'synced' && !isSyncingManual && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      {cloudStatus === 'synced' && !isSyncingManual
                        ? 'Estado en la Nube: Conectado'
                        : cloudStatus === 'syncing' || isSyncingManual
                        ? 'Estado en la Nube: Sincronizando...'
                        : 'Estado en la Nube: Modo Local / Desconectado'}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      {lastSyncText || 'Sincronizado'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingManual || cloudStatus === 'syncing'}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition active:scale-95 disabled:opacity-60"
                  title="Forzar sincronización con la nube"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingManual || cloudStatus === 'syncing' ? 'animate-spin text-emerald-500' : ''}`} />
                  <span>{isSyncingManual ? 'Sincronizando' : 'Sincronizar'}</span>
                </button>
              </div>

              {/* Espacio Familiar & Sincronización Autenticada */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Hogar Familiar Activo
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    Zero-Trust Seguro
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100 block truncate">
                      {targetFamilyName}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block truncate">
                      {user ? `Vinculado a ${user.email || user.displayName}` : 'Sesión Local Protegida'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('family')}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition shrink-0"
                  >
                    Gestionar Miembros
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Para acceder desde otro móvil, tablet o portátil, inicia sesión con tu cuenta. Todos tus hogares autorizados se sincronizan automáticamente en tiempo real mediante Firestore.
                </p>
              </div>

              {/* Multi-device graphic icons */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 px-3 rounded-lg bg-white/60 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-700/60 text-stone-500 dark:text-stone-400">
                <div className="flex flex-col items-center gap-1">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span className="text-[10px] font-medium">Móvil Familiar</span>
                </div>
                <div className="w-6 sm:w-8 border-t border-dashed border-stone-300 dark:border-stone-600" />
                <div className="flex flex-col items-center gap-1">
                  <Tablet className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-medium">Tablet Hogar</span>
                </div>
                <div className="w-6 sm:w-8 border-t border-dashed border-stone-300 dark:border-stone-600" />
                <div className="flex flex-col items-center gap-1">
                  <Laptop className="w-5 h-5 text-indigo-600" />
                  <span className="text-[10px] font-medium">Portátil</span>
                </div>
              </div>
            </div>

            {/* DEMÁS SECCIONES: Solo Padre / Creador */}
            {isPadreOrCreator ? (
              <>
                {/* Zero-Knowledge & E2EE Status Card */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-200">
                    <span className="font-bold block">Arquitectura Zero-Knowledge (AES-GCM 256-bit)</span>
                    <p className="mt-0.5 opacity-90 leading-relaxed">
                      Tus transacciones, saldos bancarios y presupuestos son encriptados en este navegador antes de viajar a la nube. El servidor solo almacena texto cifrado opaco sin posibilidad de lectura por terceros.
                    </p>
                  </div>
                </div>

                {/* Master Key Card */}
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. Clave de Seguridad Familiar (Passphrase)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKey ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={tempPassphrase}
                      onChange={e => setTempPassphrase(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 text-stone-700 dark:text-stone-300"
                      title="Copiar clave de cifrado"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <span>Huella criptográfica:</span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">{fingerprint}</strong>
                    </span>

                    <div className="flex gap-2">
                      {isCreator && (
                        <button
                          type="button"
                          onClick={handleGenerateNewKey}
                          className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Generar nueva</span>
                        </button>
                      )}
                      {tempPassphrase !== passphrase && (
                        <button
                          type="button"
                          onClick={handleSavePassphrase}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resguardo de la informacion */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Resguardo de la informacion</span>
                    </h4>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      Libro Excel (.xls)
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                    Descarga un respaldo completo con todas las hojas de cálculo de la unidad familiar (<strong>{targetFamilyName}</strong>): transacciones, límites presupuestarios, categorías, miembros, cuentas bancarias, metas de ahorro y suscripciones.
                  </p>

                  <button
                    type="button"
                    onClick={handleExportFullExcel}
                    className="w-full py-2.5 px-3 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Exportar toda la información a Excel (.xls)</span>
                  </button>

                  {onOpenBackupExport && (
                    <button
                      type="button"
                      onClick={() => {
                        if (handleAttemptClose()) {
                          onOpenBackupExport();
                        }
                      }}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Copia de Seguridad Cifrada y CSV (Avanzado)</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Sección para Madre u otros usuarios autorizados al tab pero no a las claves/resguardo */
              <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">
                    Gestión de Claves Maestras y Resguardo Restringidos
                  </span>
                  <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    La visualización y edición de la <strong>Clave de Seguridad Familiar (Passphrase)</strong>, así como la <strong>Exportación Integral y Resguardo</strong> de la base de datos, están reservadas exclusivamente para el <strong>Padre / Creador</strong> de este hogar.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UNIDAD FAMILIAR */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            {/* Family Workspace Summary Card */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Unidad Familiar Seleccionada
                </span>
                {isCreator ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    👑 Creador del Hogar
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center gap-1">
                    👤 Miembro
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  <Home className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                    {targetFamilyName}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Espacio protegido con tokens efímeros de 256-bit</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Miembros registrados en este hogar:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {state.members.length} {state.members.length === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>

            {/* PWA App Installation card */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Instalar en este Dispositivo
                  </h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Instala Finanzas Familiares como aplicación en tu pantalla de inicio o escritorio
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <PWAInstallButton variant="full" />
              </div>
            </div>

            {/* If NOT Creator: Info Card with NO delete button */}
            {!isCreator && (
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
                  <ShieldCheck className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>Permisos de Administración Restringidos</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Estás conectado como miembro en <strong>{targetFamilyName}</strong>. La opción para borrar de forma permanente esta unidad familiar solo aparece y está disponible para su creador original.
                </p>
              </div>
            )}

            {/* ONLY FOR CREATOR: Danger Zone and Deletion with exact name confirmation */}
            {isCreator && (
              <div className="space-y-3 pt-1">
                {!showDeleteConfirm ? (
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                          Zona de Peligro: Borrado Permanente
                        </h4>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                          Como creador, tienes el permiso exclusivo para eliminar definitivamente <strong>{targetFamilyName}</strong>. Esta acción destruirá en la nube todos los registros de transacciones, presupuestos fijados, metas y cuentas vinculadas de forma irreversible.
                        </p>
                      </div>
                    </div>

                    {/* Recomendación de Respaldo Previa */}
                    <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                          <strong>Recomendación importante:</strong> Te recomendamos hacer un respaldo íntegro de la información en la opción <strong>Seguridad & Nube</strong> de la configuración antes de eliminar este hogar.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-white dark:bg-stone-800 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 dark:hover:bg-stone-700 transition shrink-0 whitespace-nowrap text-center"
                      >
                        Ir a Seguridad & Nube
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setConfirmNameInput('');
                        setAcknowledgedDisclaimer(false);
                        setDeleteError(null);
                      }}
                      className="w-full py-2.5 px-3 text-xs font-bold rounded-lg text-rose-700 dark:text-rose-300 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center gap-2 transition shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar permanentemente la unidad familiar seleccionada</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-rose-500 dark:border-rose-700 bg-white dark:bg-stone-900 shadow-xl space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          Confirmación de Seguridad Requerida
                        </h4>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                          Esta acción es <strong>permanente e irreversible</strong>. No existirá forma de recuperar los datos ni restaurar la información una vez confirmada.
                        </p>
                      </div>
                    </div>

                    {/* Recomendación de Respaldo en Confirmación */}
                    <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/40 space-y-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                        <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Recomendación: Respaldo previo de seguridad</span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Te recomendamos hacer un respaldo de la información en la opción <strong>Seguridad & Nube</strong> de la configuración antes de proceder. Puedes descargar de inmediato una copia completa en Excel de todas tus transacciones, presupuestos y cuentas:
                      </p>
                      <button
                        type="button"
                        onClick={handleExportFullExcel}
                        className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 shadow-xs text-center cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Descargar Respaldo Completo en Excel (.xls)</span>
                      </button>
                    </div>

                    {/* Exención de Responsabilidad y Advertencia Explícita */}
                    <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/40 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900 dark:text-rose-200">
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Aviso de Pérdida Permanente y Exención de Responsabilidad</span>
                      </div>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                        Al borrar esta unidad familiar, <strong>la data se borrará permanentemente</strong> de todos los servidores, dispositivos y respaldos (transacciones, presupuestos, miembros, metas y cuentas vinculadas).
                      </p>
                      <div className="p-2.5 rounded-md bg-white/90 dark:bg-stone-900/90 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-950 dark:text-rose-100 leading-relaxed font-medium">
                        ⚠️ <strong>Aviso legal:</strong> El equipo que mantiene y desarrolla la aplicación <strong>no es responsable de cualquier dato perdido</strong>, daño o perjuicio directo o indirecto. El usuario que realiza esta eliminación <strong>asume toda la responsabilidad</strong> sobre la pérdida irreversible de los datos.
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                        1. Escribe el nombre de la unidad familiar para verificar:
                      </label>
                      <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold text-xs text-center border border-stone-200 dark:border-stone-700 select-all tracking-wide">
                        {targetFamilyName}
                      </div>
                      <input
                        type="text"
                        value={confirmNameInput}
                        onChange={(e) => {
                          setConfirmNameInput(e.target.value);
                          setDeleteError(null);
                        }}
                        placeholder={`Escribe "${targetFamilyName}"`}
                        autoFocus
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                      />
                      {confirmNameInput.trim().length > 0 && confirmNameInput.trim() !== targetFamilyName.trim() && (
                        <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>El nombre ingresado aún no coincide con "{targetFamilyName}".</span>
                        </p>
                      )}
                      {confirmNameInput.trim() === targetFamilyName.trim() && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>Nombre verificado correctamente.</span>
                        </p>
                      )}
                    </div>

                    {/* Casilla de verificación de aceptación explícita */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                        2. Aceptación explícita de condiciones:
                      </label>
                      <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={acknowledgedDisclaimer}
                          onChange={(e) => {
                            setAcknowledgedDisclaimer(e.target.checked);
                            setDeleteError(null);
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-stone-700 dark:text-stone-300 leading-snug font-medium">
                          Entiendo y acepto explícitamente que <strong>la data se borrará permanentemente</strong> sin posibilidad de recuperación, que <strong>el equipo que mantiene la app no es responsable de cualquier dato perdido</strong> y <strong>asumo toda la responsabilidad</strong> de esta acción.
                        </span>
                      </label>
                    </div>

                    {deleteError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                        {deleteError}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isDeletingFamily}
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setConfirmNameInput('');
                          setAcknowledgedDisclaimer(false);
                          setDeleteError(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={
                          confirmNameInput.trim() !== targetFamilyName.trim() ||
                          !acknowledgedDisclaimer ||
                          isDeletingFamily
                        }
                        onClick={handleExecuteDeleteFamily}
                        className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {isDeletingFamily ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Borrando permanentemente...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Confirmar y Borrar Definitivamente</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ALERTAS Y NOTIFICACIONES */}
        {activeTab === 'alerts' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header del Tab */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Centro de Alertas & Notificaciones
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Avisos en tiempo real sobre límites de presupuesto y gastos periódicos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {localNotificationsEnabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Notificaciones Activas</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600">
                    <BellOff className="w-3 h-3 text-stone-500" />
                    <span>Notificaciones Silenciadas</span>
                  </span>
                )}
              </div>
            </div>

            {/* SECCIÓN 1: INTERRUPTOR PRINCIPAL (HABILITAR O DESHABILITAR) */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Habilitar Notificaciones
                    </span>
                    {localNotificationsEnabled && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        Activado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Activa o silencia de inmediato todos los avisos de presupuesto y recordatorios del sistema en este dispositivo.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={localNotificationsEnabled}
                  onClick={() => handleToggleNotifications(!localNotificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    localNotificationsEnabled ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      localNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {!localNotificationsEnabled && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-amber-900 dark:text-amber-200 text-xs">
                  <BellOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-[11px]">Notificaciones en pausa</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      No recibirás alertas emergentes de escritorio ni avisos con sonido cuando se sobrepasen los presupuestos fijados. Puedes reactivarlas cuando quieras.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: CANALES DE NOTIFICACIÓN & PRUEBAS (Navegador y Sonidos) */}
            <div className={`p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs space-y-3.5 transition-opacity ${
              localNotificationsEnabled ? 'opacity-100' : 'opacity-60 pointer-events-none'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Notificaciones de Navegador Web & Dispositivo
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  Chrome, Safari, Edge, Android, PWA
                </span>
              </div>

              {/* Sub-item: Notificaciones nativas */}
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Notificaciones Nativas de Escritorio
                    </span>
                    {permStatus === 'granted' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Permiso Concedido
                      </span>
                    )}
                    {permStatus === 'denied' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        Bloqueado en el navegador
                      </span>
                    )}
                    {permStatus === 'default' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        Requiere Autorización
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Muestra una notificación emergente del sistema cuando se alcance un tope o se registre un gasto excesivo.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {permStatus !== 'granted' && permStatus !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await requestNotificationPermission();
                        setPermStatus(res);
                        if (res === 'granted') {
                          setLocalBrowserNotifications(true);
                          onUpdateAlertSettings?.({ browserNotifications: true });
                          onShowToast?.('Permiso Concedido', 'Las notificaciones de navegador están activas.', 'success');
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0"
                    >
                      Autorizar Permiso
                    </button>
                  )}

                  <button
                    type="button"
                    role="switch"
                    aria-checked={localBrowserNotifications}
                    onClick={() => handleToggleBrowserNotifications(!localBrowserNotifications)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      localBrowserNotifications ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        localBrowserNotifications ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Botón para probar la notificación en vivo */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Comprueba si tu navegador muestra correctamente las alertas con el botón de prueba:
                </p>
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestNotification}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isSendingTest ? 'Enviando...' : 'Probar Notificación'}</span>
                </button>
              </div>

              {/* Sub-item: Efectos de sonido */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                    {localSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Tono de Alerta Audible
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Reproduce un sonido suave sintetizado al emitir advertencias de presupuesto.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => playNotificationSound('warning')}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-1.5 py-0.5"
                    title="Escuchar sonido de prueba"
                  >
                    Escuchar
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localSoundEnabled}
                    onClick={() => handleToggleSound(!localSoundEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      localSoundEnabled ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        localSoundEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: EVENTOS DISPARADORES DE ALERTAS */}
            <div className={`p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs space-y-3 transition-opacity ${
              localNotificationsEnabled ? 'opacity-100' : 'opacity-60 pointer-events-none'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Disparadores de Alertas
                </span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">
                  Elige qué eventos generan avisos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Alertas Críticas (>100%) */}
                <div
                  onClick={() => handleToggleNotifyDanger(!localNotifyOnDanger)}
                  className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                    localNotifyOnDanger
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-200'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-500 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">Límite Superado (100%)</span>
                      <input
                        type="checkbox"
                        checked={localNotifyOnDanger}
                        onChange={() => {}}
                        className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                      />
                    </div>
                    <p className="text-[10px] mt-1 opacity-80">
                      Avisa cuando cualquier categoría o el total mensual supere el presupuesto pactado.
                    </p>
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Alerta Crítica
                  </span>
                </div>

                {/* 2. Avisos Preventivos (Umbral ej. 80%) */}
                <div
                  onClick={() => handleToggleNotifyWarning(!localNotifyOnWarning)}
                  className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                    localNotifyOnWarning
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-500 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">Aviso Preventivo ({localGlobalThreshold}%)</span>
                      <input
                        type="checkbox"
                        checked={localNotifyOnWarning}
                        onChange={() => {}}
                        className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                    </div>
                    <p className="text-[10px] mt-1 opacity-80">
                      Avisa al alcanzar el umbral de advertencia para prevenir sobrecostos antes de fin de mes.
                    </p>
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Advertencia
                  </span>
                </div>

                {/* 3. Gastos Recurrentes / Facturas */}
                <div
                  onClick={() => handleToggleNotifyRecurring(!localNotifyOnRecurringDue)}
                  className={`p-3 rounded-lg border cursor-pointer transition select-none flex flex-col justify-between ${
                    localNotifyOnRecurringDue
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/80 text-blue-950 dark:text-blue-200'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-500 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">Facturas & Recurrentes</span>
                      <input
                        type="checkbox"
                        checked={localNotifyOnRecurringDue}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                    </div>
                    <p className="text-[10px] mt-1 opacity-80">
                      Recordatorio de cobros periódicos próximos a vencer en los siguientes 5 días.
                    </p>
                  </div>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Vencimientos
                  </span>
                </div>
              </div>

              {/* Ajuste del Umbral de Advertencia Global */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Umbral de Advertencia Global: {localGlobalThreshold}%
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Porcentaje de consumo en el que se activan los avisos preventivos.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[70, 75, 80, 85, 90].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setLocalGlobalThreshold(val);
                        onUpdateGlobalAlertThreshold?.(val);
                        onShowToast?.('Umbral Actualizado', `El umbral de advertencia se fijó en ${val}%.`, 'info');
                      }}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                        localGlobalThreshold === val
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: ALERTAS POR CORREO ELECTRÓNICO (EMAIL) [OPCIÓN NO FUNCIONAL TODAVÍA] */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Alertas por Correo Electrónico
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Próximamente
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Recibe reportes y avisos de presupuesto en tu buzón de correo.
                    </p>
                  </div>
                </div>

                {/* Switch de Alertas por Correo */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={localEmailAlertsEnabled}
                  onClick={() => handleToggleEmailAlerts(!localEmailAlertsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    localEmailAlertsEnabled ? 'bg-indigo-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      localEmailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Mensaje aclaratorio de estado en desarrollo / no funcional todavía */}
              <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2 text-indigo-950 dark:text-indigo-200 text-xs">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">
                  <span className="font-bold">Estado del servicio: </span>
                  La opción de correo está integrada para que puedas configurar y guardar tus preferencias con anticipación. El motor de despacho por correo (SMTP/Cloud Functions) se activará en la siguiente fase de desarrollo.
                </div>
              </div>

              {/* Formulario de configuración de correo (disponible para preparar la configuración) */}
              <div className={`space-y-3 pt-1 transition-opacity ${localEmailAlertsEnabled ? 'opacity-100' : 'opacity-60'}`}>
                {/* Input de correo */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Correo Electrónico de Destino
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="email"
                      value={localEmailAddress}
                      onChange={(e) => setLocalEmailAddress(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    {user?.email && user.email !== localEmailAddress && (
                      <button
                        type="button"
                        onClick={() => setLocalEmailAddress(user.email || '')}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition shrink-0"
                      >
                        Usar mi cuenta ({user.email.split('@')[0]})
                      </button>
                    )}
                  </div>
                </div>

                {/* Frecuencia de envío */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Frecuencia de Notificaciones por Correo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'instant', label: 'Instantánea', desc: 'Al excederse' },
                      { id: 'daily', label: 'Diaria', desc: 'Resumen noche' },
                      { id: 'weekly', label: 'Semanal', desc: 'Lunes reporte' },
                    ].map((freq) => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setLocalEmailFrequency(freq.id as any)}
                        className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                          localEmailFrequency === freq.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200'
                            : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <span className="text-xs font-bold">{freq.label}</span>
                        <span className="text-[10px] opacity-75">{freq.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtro: Solo peligro */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localEmailNotifyOnDangerOnly}
                    onChange={(e) => setLocalEmailNotifyOnDangerOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-stone-700 dark:text-stone-300">
                    Enviar únicamente cuando se exceda el 100% de un presupuesto (filtrar advertencias)
                  </span>
                </label>

                {/* Botón de guardar preferencias de correo */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveEmailConfig}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Preferencias de Correo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: VISTA PREVIA DE ALERTAS ACTIVAS DEL MES */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Estado Actual de Alertas ({alerts.length})</span>
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Mes en curso
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-4 text-xs text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 rounded-lg p-3 border border-stone-200/80 dark:border-stone-800">
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                  ¡Todo en orden! No hay presupuestos excedidos ni vencimientos pendientes este mes.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {alerts.map(al => (
                    <div
                      key={al.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        al.level === 'danger'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <span>{al.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/10 dark:bg-white/10">
                            {al.categoryName}
                          </span>
                        </div>
                        {al.description && (
                          <p className="text-[11px] opacity-80 truncate mt-0.5">
                            {al.description}
                          </p>
                        )}
                      </div>
                      <span className="font-extrabold text-sm shrink-0">
                        {al.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        </div>

        {/* Footer - Siempre accesible y fijo en la parte inferior */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
            {activeTab === 'currency' && 'Configuración de moneda base'}
            {activeTab === 'security' && 'Cifrado E2EE y nube activos'}
            {activeTab === 'family' && targetFamilyName}
            {activeTab === 'alerts' && (localNotificationsEnabled ? 'Notificaciones activas' : 'Notificaciones silenciadas')}
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition shrink-0"
          >
            Listo y Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
