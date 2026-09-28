import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Cloud,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  FileDown,
  FileSpreadsheet,
  Copy,
  Check,
  AlertTriangle,
  Landmark,
  Settings,
  ChevronDown,
  UserCheck,
  LogOut,
  Share2,
  Home,
  LogIn,
  Lightbulb,
  Menu,
  X,
  CalendarClock,
  BookOpen,
  PanelRight,
} from 'lucide-react';
import { BudgetAlert } from '../types';
import { User } from 'firebase/auth';
import { formatMoney } from '../utils/currencies';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  familyName: string;
  familyCode?: string;
  currency: string;
  currencyCode: string;
  cloudStatus: 'synced' | 'syncing' | 'offline';
  lastSyncText: string;
  isBankSyncing: boolean;
  alerts: BudgetAlert[];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenCloudSync?: () => void;
  onOpenPdfModal: () => void;
  onOpenSecurityCurrency: (tab?: 'currency' | 'security' | 'family' | 'alerts') => void;
  onOpenBackupExport: () => void;
  onSyncBank?: () => void;
  onOpenBanks?: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onOpenFamilyModal: (tab?: 'list' | 'create' | 'join' | 'invite') => void;
  onLogout?: () => void;
  onOpenTips?: () => void;
  onOpenKnowledgeCenter?: () => void;
  onNavigateToTab?: (tab: string) => void;
  isDesktopRightPanelOpen?: boolean;
  onToggleDesktopRightPanel?: () => void;
  isDesktopSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  familyName,
  familyCode,
  currency,
  currencyCode,
  cloudStatus,
  lastSyncText,
  isBankSyncing,
  alerts,
  isDarkMode,
  toggleDarkMode,
  onOpenCloudSync,
  onOpenPdfModal,
  onOpenSecurityCurrency,
  onOpenBackupExport,
  onSyncBank,
  onOpenBanks,
  user,
  onOpenAuth,
  onOpenFamilyModal,
  onLogout,
  onOpenTips,
  onOpenKnowledgeCenter,
  onNavigateToTab,
  isDesktopRightPanelOpen,
  onToggleDesktopRightPanel,
  isDesktopSidebarCollapsed,
  onToggleDesktopSidebar,
}) => {
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const budgetAlertsCount = alerts.filter(a => a.type !== 'recurring_due').length;
  const recurringAlertsCount = alerts.filter(a => a.type === 'recurring_due').length;
  const alertsDropdownTitle =
    budgetAlertsCount > 0 && recurringAlertsCount > 0
      ? `Alertas & Recordatorios (${alerts.length})`
      : recurringAlertsCount > 0
      ? `Recordatorios de Facturas (${recurringAlertsCount})`
      : `Alertas de Presupuesto (${budgetAlertsCount})`;

  const dangerAlerts = alerts.filter(a => a.level === 'danger');

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          
          {/* Logo & Family info */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <button
              onClick={() => onOpenFamilyModal('list')}
              title="Cambiar de Hogar Familiar"
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm shadow-indigo-600/20 shrink-0 transition hover:scale-105 active:scale-95 focus:outline-none"
            >
              <img src="/icon.svg" alt="Finanzas Familiares" className="w-full h-full object-cover" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  onClick={() => onOpenFamilyModal('list')}
                  className="group flex items-center gap-1 text-left min-w-0 max-w-full"
                  title="Gestionar o Cambiar Hogar"
                >
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {familyName}
                  </h1>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-500 shrink-0" />
                </button>
                <button
                  onClick={() => onOpenFamilyModal('invite')}
                  title="Invitar a un familiar con token seguro de 256-bit"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 transition shrink-0 shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Invitar</span>
                </button>
              </div>
              {/* Secondary info hidden on mobile to avoid vertical bloat */}
              <p className="hidden sm:flex text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 truncate items-center gap-1.5 mt-0.5">
                <span>Multi-Familia</span>
                <span className="inline-block w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600"></span>
                <span>Firestore Cloud</span>
              </p>
            </div>
          </div>

          {/* Desktop Actions Bar (>= sm) */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* User Account Button */}
            {user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 transition shrink-0"
                  title="Cuenta de Usuario"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden xl:inline text-xs font-semibold text-stone-800 dark:text-stone-200 max-w-[100px] truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Mi Perfil'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 z-50 p-2 text-xs max-h-[calc(100dvh-5rem)] overflow-y-auto">
                      <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800">
                        <p className="font-bold text-stone-900 dark:text-stone-100 truncate">
                          {user.displayName || 'Usuario Familiar'}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {user.email || 'Cuenta Familiar'}
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenFamilyModal('list');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 font-medium"
                        >
                          <Home className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Mis Hogares Familiares</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenFamilyModal('invite');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 font-medium"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Invitar a este Hogar</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenTips?.();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 font-medium"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>Consejos Financieros</span>
                        </button>

                        {onOpenKnowledgeCenter && (
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              onOpenKnowledgeCenter();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 font-medium"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Centro de Conocimiento</span>
                          </button>
                        )}

                        <div onClick={() => setShowUserMenu(false)}>
                          <PWAInstallButton variant="menu" />
                        </div>
                      </div>

                      <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout?.();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 shadow-xs"
                title="Iniciar Sesión para sincronizar con tu familia"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Iniciar</span>
                <span>Sesión</span>
              </button>
            )}

            {/* Botón Tips / Consejos Financieros */}
            <button
              onClick={onOpenTips}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 transition shrink-0 whitespace-nowrap shadow-2xs"
              title="Consejos financieros para la familia y regla 50/30/20"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Tips</span>
            </button>

            {/* Botón Centro de Conocimiento / Guías de Módulos */}
            {onOpenKnowledgeCenter && (
              <button
                id="header-knowledge-center-button"
                onClick={onOpenKnowledgeCenter}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition shrink-0 whitespace-nowrap shadow-2xs"
                title="Centro de Conocimiento: Explicación y guías paso a paso de cada módulo"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden md:inline">Guías</span>
              </button>
            )}

            {/* Botón de Configurar */}
            <button
              onClick={() => onOpenSecurityCurrency()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition shrink-0 whitespace-nowrap shadow-2xs"
              title="Configuración de Moneda, Claves y Cifrado E2EE"
            >
              <Settings className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
              <span className="hidden sm:inline">Configurar</span>
            </button>

            {/* Botón para instalar PWA */}
            <PWAInstallButton variant="header" />

            {/* Alerts Dropdown Trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowAlertsMenu(!showAlertsMenu)}
                className="relative p-1.5 sm:p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Alertas de presupuesto"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-stone-900 ${dangerAlerts.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                )}
              </button>

              {/* Alerts Dropdown Panel */}
              {showAlertsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAlertsMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 z-50 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                          {alertsDropdownTitle}
                        </h3>
                      </div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {recurringAlertsCount > 0 && budgetAlertsCount === 0 ? 'Vencimientos' : 'Presupuestos y pagos'}
                      </span>
                    </div>

                    <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5">
                      {alerts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400">
                          <Check className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                          ¡Todo en orden! Sin límites excedidos ni facturas por vencer.
                        </div>
                      ) : (
                        alerts.map(alert => {
                          const isRecurring = alert.type === 'recurring_due';
                          const isBankAlert = alert.type === 'member_no_accounts';
                          return (
                            <div
                              key={alert.id}
                              onClick={() => {
                                setShowAlertsMenu(false);
                                if (isBankAlert) {
                                  onNavigateToTab?.('banks');
                                  onOpenBanks?.();
                                } else if (isRecurring) {
                                  onNavigateToTab?.('recurring');
                                } else {
                                  onNavigateToTab?.('budgets');
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition hover:shadow-sm ${
                                isBankAlert
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60'
                                  : alert.level === 'danger'
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 dark:hover:bg-rose-900/60'
                                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/60'
                              }`}
                            >
                              {isBankAlert ? (
                                <div>
                                  <div className="flex items-center justify-between font-medium">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Landmark className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                      <span className="font-semibold truncate">{alert.title}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                                      Pendiente
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] opacity-90 leading-tight">
                                    {alert.description}
                                  </p>
                                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                    <span>Módulo de Cuentas</span>
                                    <span className="underline">Configurar Cuentas →</span>
                                  </div>
                                </div>
                              ) : isRecurring ? (
                                <div>
                                  <div className="flex items-center justify-between font-medium">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <CalendarClock className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                      <span className="font-semibold truncate">{alert.recurringTitle || alert.title}</span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                                        (alert.daysUntilDue ?? 0) < 0
                                          ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                          : (alert.daysUntilDue ?? 0) <= 1
                                          ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                          : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                                      }`}
                                    >
                                      {(alert.daysUntilDue ?? 0) < 0
                                        ? 'Vencida'
                                        : (alert.daysUntilDue ?? 0) === 0
                                        ? 'Hoy'
                                        : (alert.daysUntilDue ?? 0) === 1
                                        ? 'Mañana'
                                        : `En ${alert.daysUntilDue}d`}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[11px] opacity-90">
                                    <span className="truncate">{alert.categoryName}</span>
                                    <span className="font-bold text-xs">
                                      {alert.formattedAmount || formatMoney(alert.currentSpent, currency)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[10px] opacity-75">
                                    <span>Vence: {alert.dueDate || alert.date}</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 underline">Ver en Facturas →</span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center justify-between font-medium">
                                    <span>{alert.title}</span>
                                    <span className="font-bold">{alert.percentage.toFixed(0)}%</span>
                                  </div>
                                  <div className="mt-1 flex justify-between text-[11px] opacity-80">
                                    <span>Gastado: {formatMoney(alert.currentSpent, currency)}</span>
                                    <span>Límite: {formatMoney(alert.budgetLimit, currency)}</span>
                                  </div>
                                  <div className="mt-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${alert.level === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                      style={{ width: `${Math.min(100, alert.percentage)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAlertsMenu(false);
                          onOpenSecurityCurrency('alerts');
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>Configurar Alertas & Notificaciones</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export PDF Button */}
            <button
              onClick={onOpenPdfModal}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 sm:px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition shrink-0 whitespace-nowrap"
              title="Descargar Reporte Financiero en PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden lg:inline">PDF</span>
            </button>

            {/* Desktop Quick Summary Panel Toggle (visible on desktop >= xl) */}
            {onToggleDesktopRightPanel && (
              <button
                onClick={onToggleDesktopRightPanel}
                className={`hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 sm:px-2.5 rounded-lg border transition shrink-0 whitespace-nowrap ${
                  isDesktopRightPanelOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border-transparent text-stone-700 dark:text-stone-300'
                }`}
                title={isDesktopRightPanelOpen ? 'Ocultar panel lateral derecho' : 'Mostrar panel de monitoreo rápido en vivo'}
                aria-label={isDesktopRightPanelOpen ? 'Ocultar panel lateral derecho' : 'Mostrar panel de monitoreo rápido en vivo'}
              >
                <PanelRight className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden 2xl:inline">
                  {isDesktopRightPanelOpen ? 'Panel Activo' : 'Panel Rápido'}
                </span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>
          </div>

          {/* Mobile Actions Bar (< sm) - Clean, no overlap, single row */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Alerts Bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowAlertsMenu(!showAlertsMenu)}
                className="relative p-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Alertas de presupuesto y facturas"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-stone-900 ${dangerAlerts.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                )}
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>

            {/* User Profile Button on Mobile */}
            {user ? (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center justify-center p-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition shrink-0"
                title="Mi Cuenta de Usuario"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 shadow-xs"
                title="Iniciar Sesión"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="text-[11px]">Entrar</span>
              </button>
            )}

            {/* Mobile Menu (Tools) Trigger */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                setShowMobileMenu(true);
              }}
              className="flex items-center justify-center p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition shrink-0"
              title="Abrir menú de herramientas"
            >
              <Menu className="w-4 h-4 text-stone-700 dark:text-stone-300 shrink-0" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Alerts Drawer / Modal (When clicking bell on mobile) */}
      {showAlertsMenu && createPortal(
        <div className="fixed inset-0 z-50 flex sm:hidden items-end xs:items-center justify-center p-0 xs:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowAlertsMenu(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-t-2xl xs:rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 z-50 p-4 max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                    {alertsDropdownTitle}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {recurringAlertsCount > 0 && budgetAlertsCount === 0 ? 'Vencimientos de facturas' : 'Presupuestos y pagos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertsMenu(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0 ml-2"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-2 flex-1 min-h-0 pr-0.5">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400">
                  <Check className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  ¡Todo en orden! Sin límites excedidos ni facturas por vencer.
                </div>
              ) : (
                alerts.map(alert => {
                  const isRecurring = alert.type === 'recurring_due';
                  const isBankAlert = alert.type === 'member_no_accounts';
                  return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowAlertsMenu(false);
                        if (isBankAlert) {
                          onNavigateToTab?.('banks');
                          onOpenBanks?.();
                        } else if (isRecurring) {
                          onNavigateToTab?.('recurring');
                        } else {
                          onNavigateToTab?.('budgets');
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition active:scale-[0.99] ${
                        isBankAlert
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200'
                          : alert.level === 'danger'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {isBankAlert ? (
                        <div>
                          <div className="flex items-center justify-between font-semibold text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <Landmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="truncate">{alert.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                              Pendiente
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] opacity-90 leading-tight">
                            {alert.description}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            <span>Módulo de Cuentas</span>
                            <span>Configurar Cuentas →</span>
                          </div>
                        </div>
                      ) : isRecurring ? (
                        <div>
                          <div className="flex items-center justify-between font-semibold text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="truncate">{alert.recurringTitle || alert.title}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                                (alert.daysUntilDue ?? 0) < 0
                                  ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                  : (alert.daysUntilDue ?? 0) <= 1
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {(alert.daysUntilDue ?? 0) < 0
                                ? 'Vencida'
                                : (alert.daysUntilDue ?? 0) === 0
                                ? 'Hoy'
                                : (alert.daysUntilDue ?? 0) === 1
                                ? 'Mañana'
                                : `En ${alert.daysUntilDue}d`}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="opacity-80 truncate">{alert.categoryName}</span>
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {alert.formattedAmount || formatMoney(alert.currentSpent, currency)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] opacity-75">
                            <span>Vence: {alert.dueDate || alert.date}</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">Ir a Facturas →</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between font-semibold text-xs">
                            <span className="truncate">{alert.title}</span>
                            <span className="font-bold shrink-0 ml-1.5">{alert.percentage.toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] opacity-85">
                            <span>Gastado: {formatMoney(alert.currentSpent, currency)}</span>
                            <span>Tope: {formatMoney(alert.budgetLimit, currency)}</span>
                          </div>
                          <div className="mt-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${alert.level === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, alert.percentage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAlertsMenu(false);
                  onOpenSecurityCurrency('alerts');
                }}
                className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4 text-stone-500 shrink-0" />
                <span>Configurar Alertas & Notificaciones</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile User Profile Drawer / Modal (When clicking user avatar on mobile) */}
      {user && showUserMenu && createPortal(
        <div className="fixed inset-0 z-50 flex sm:hidden items-end xs:items-center justify-center p-0 xs:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowUserMenu(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-t-2xl xs:rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 z-50 p-4 max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            {/* Header with User Info */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                    {user.displayName || 'Usuario Familiar'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {user.email || 'Conectado a la nube'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserMenu(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu options */}
            <div className="py-2.5 space-y-1.5 overflow-y-auto flex-1 min-h-0 text-xs">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenFamilyModal('list');
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2.5 font-medium transition"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-stone-800 dark:text-stone-200">Mis Hogares Familiares</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Cambiar o gestionar hogares</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenFamilyModal('invite');
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2.5 font-medium transition"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-stone-800 dark:text-stone-200">Invitar a este Hogar</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Compartir código con la familia</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenTips?.();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2.5 font-medium transition"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-stone-800 dark:text-stone-200">Consejos Financieros</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Guías de ahorro y presupuesto</span>
                </div>
              </button>

              {onOpenKnowledgeCenter && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenKnowledgeCenter();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2.5 font-medium transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold block text-stone-800 dark:text-stone-200">Centro de Conocimiento</span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">Guías interactivas de cada módulo</span>
                  </div>
                </button>
              )}

              <div onClick={() => setShowUserMenu(false)} className="pt-1">
                <PWAInstallButton variant="menu" />
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 shrink-0">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout?.();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Drawer / Slide-Over Navigation */}
      {showMobileMenu && createPortal(
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm h-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-stone-900 shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Home className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                    {familyName}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Menú y Herramientas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs overscroll-contain pb-8">
              
              {/* Actions List */}
              <div className="space-y-1 pt-1">
                <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Herramientas y Configuración
                </p>

                <div className="pb-1">
                  <PWAInstallButton variant="full" onInstalled={() => setShowMobileMenu(false)} />
                </div>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenTips?.();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">Consejos Financieros (Tips)</span>
                </button>

                {onOpenKnowledgeCenter && (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenKnowledgeCenter();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">Centro de Conocimiento (Guías)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenSecurityCurrency();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">Configuracion</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenPdfModal();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">Exportar Reporte PDF</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenBackupExport();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition font-medium"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left">Copia de Seguridad y CSV</span>
                </button>
              </div>

              {/* Family Actions Card */}
              <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                    {familyName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                    Espacio Seguro
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenFamilyModal('list');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-white dark:bg-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-200 font-medium text-[11px] flex items-center justify-center gap-1 border border-stone-200 dark:border-stone-600"
                  >
                    <Home className="w-3 h-3 text-indigo-500" />
                    <span>Mis Hogares</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenFamilyModal('invite');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-indigo-600 text-white font-medium text-[11px] flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Invitar</span>
                  </button>
                </div>
              </div>

              {/* User Account / Login Card */}
              {user ? (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {user.displayName || 'Usuario Familiar'}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                        {user.email || 'Conectado a la nube'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onLogout?.();
                    }}
                    className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold mb-1">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Colaboración en Familia</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed mb-3">
                    Inicia sesión para sincronizar automáticamente con otros familiares en tiempo real.
                  </p>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión / Registrarse</span>
                  </button>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 shrink-0">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 text-xs">
                <span>Modo de visualización</span>
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
                  <span>{isDarkMode ? 'Oscuro' : 'Claro'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
