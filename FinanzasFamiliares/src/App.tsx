import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Wallet,
  LayoutDashboard,
  Receipt,
  Users,
  Landmark,
  Tags,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  PiggyBank,
  CalendarClock,
  Baby,
  PieChart,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { useFamilyStore } from './hooks/useFamilyStore';
import { Header } from './components/Header';
import { AlertsBanner } from './components/AlertsBanner';
import { DashboardView } from './components/DashboardView';
import { CashFlowForecastView } from './components/CashFlowForecastView';
import { DebtPayoffPlannerView } from './components/DebtPayoffPlannerView';
import { OverviewBudgets } from './components/OverviewBudgets';
import { TransactionsList } from './components/TransactionsList';
import { FamilyMembersView } from './components/FamilyMembersView';
import { BankIntegrationView } from './components/BankIntegrationView';
import { TagsCategoriesView } from './components/TagsCategoriesView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { RecurringExpensesView } from './components/RecurringExpensesView';
import { ChildAllowancesView } from './components/ChildAllowancesView';
import { BudgetRule503020View } from './components/BudgetRule503020View';
import { TransactionModal } from './components/TransactionModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { PdfExportModal } from './components/PdfExportModal';
import { SecurityCurrencyModal } from './components/SecurityCurrencyModal';
import { BackupExportModal } from './components/BackupExportModal';
import { AuthModal } from './components/AuthModal';
import { FamilyWorkspaceModal } from './components/FamilyWorkspaceModal';
import { AuthGateScreen } from './components/AuthGateScreen';
import { FamilyFinancialTipsModal } from './components/FamilyFinancialTipsModal';
import { MemberNoAccountsReminder } from './components/MemberNoAccountsReminder';
import { ModuleHelpModal, HelpModuleId } from './components/ModuleHelpModal';
import { DesktopSidebar, NavTabId } from './components/desktop/DesktopSidebar';
import { DesktopQuickPanel } from './components/desktop/DesktopQuickPanel';
import { useAuth } from './context/AuthContext';
import { cloudSecurityMode } from './config/securityMode';
import { BudgetAlert } from './types';

export default function App() {
  const { user, loading: isAuthLoading, activeFamily, userFamilies, logOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyModalDefaultTab, setFamilyModalDefaultTab] = useState<'list' | 'create' | 'join' | 'invite'>('list');
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [helpModalModule, setHelpModalModule] = useState<HelpModuleId | null>(null);

  // Desktop layout controls: Sidebar and Quick Summary Panel
  const [isDesktopRightPanelOpen, setIsDesktopRightPanelOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('family_finances_desktop_right_panel');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' ? window.innerWidth >= 1440 : true;
    } catch {
      return true;
    }
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('family_finances_desktop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('family_finances_desktop_right_panel', String(isDesktopRightPanelOpen));
    } catch {}
  }, [isDesktopRightPanelOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('family_finances_desktop_sidebar_collapsed', String(isDesktopSidebarCollapsed));
    } catch {}
  }, [isDesktopSidebarCollapsed]);

  const {
    state,
    isDarkMode,
    toggleDarkMode,
    passphrase,
    updatePassphrase,
    updateDefaultCurrency,
    loadAnonymousDemo,
    clearAllLocalData,
    cloudStatus,
    lastSyncText,
    isBankSyncing,
    alerts,
    toastMessage,
    showToast,
    syncBankAccounts,
    addTransaction,
    deleteTransaction,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    updateCategoryBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    removeTag,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addCustomBank,
    deleteCustomBank,
    toggleBankAutoSync,
    updateGlobalBudget,
    switchFamilyCode,
    pushToCloud,
    pullFromCloud,
    currentMonthKey,
    // 6 Recommended features actions
    addSavingsGoal,
    contributeToGoal,
    deleteSavingsGoal,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringActive,
    payRecurringExpense,
    toggleRecurringExpenseAutoRegister,
    addRecurringIncome,
    updateRecurringIncome,
    deleteRecurringIncome,
    toggleRecurringIncomeActive,
    toggleRecurringIncomeAutoRegister,
    collectRecurringIncome,
    addRecurringTransfer,
    updateRecurringTransfer,
    deleteRecurringTransfer,
    toggleRecurringTransferActive,
    toggleRecurringTransferAutoRegister,
    executeRecurringTransfer,
    addChildAllowance,
    payAllowance,
    deleteChildAllowance,
    addTaskToAllowance,
    removeTaskFromAllowance,
    updateCategoryBucket,
    restoreState,
    updateAlertSettings,
    sendTestNotification,
  } = useFamilyStore();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'cashflow' | 'debts' | 'budgets' | 'transactions' | 'goals' | 'recurring' | 'rule503020' | 'allowances' | 'members' | 'banks' | 'tags'
  >('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);

  // Navigation scroll controls
  const navTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);
  const [canScrollNavRight, setCanScrollNavRight] = useState(false);

  // Check if family unit has children defined
  const hasChildren = state.members.some(
    m => m.role === 'Hijo/a' || m.role?.toLowerCase().includes('hijo') || Boolean(m.isDependent)
  );

  // Fallback to dashboard if currently on allowances and no children defined
  useEffect(() => {
    if (activeTab === 'allowances' && !hasChildren) {
      setActiveTab('dashboard');
    }
  }, [activeTab, hasChildren]);

  const checkNavScroll = useCallback(() => {
    const el = navTabsRef.current;
    if (el) {
      setCanScrollNavLeft(el.scrollLeft > 6);
      setCanScrollNavRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
    }
  }, []);

  useEffect(() => {
    checkNavScroll();
    const el = navTabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkNavScroll, { passive: true });
    window.addEventListener('resize', checkNavScroll);
    return () => {
      el.removeEventListener('scroll', checkNavScroll);
      window.removeEventListener('resize', checkNavScroll);
    };
  }, [checkNavScroll]);

  const handleNavScroll = (direction: 'left' | 'right') => {
    if (navTabsRef.current) {
      navTabsRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  // Ensure active tab is comfortably in view
  useEffect(() => {
    const activeBtn = document.getElementById(`nav-tab-${activeTab}`);
    if (activeBtn && navTabsRef.current) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityModalInitialTab, setSecurityModalInitialTab] = useState<'currency' | 'security' | 'family' | 'alerts'>('currency');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupTriggeredByShortcut, setBackupTriggeredByShortcut] = useState(false);

  // Intercept Ctrl+S / Cmd+S to prevent unencrypted DOM HTML dump to disk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        setBackupTriggeredByShortcut(true);
        setIsBackupModalOpen(true);
        showToast(
          'Guardado Seguro Protegido (Ctrl+S)',
          'Se bloqueó la descarga de HTML en texto plano para proteger tu privacidad. Usa la Bóveda Cifrada AES-256.',
          'warning'
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showToast]);

  const handleOpenSecurityModal = (tab: 'currency' | 'security' | 'family' | 'alerts' = 'currency') => {
    setSecurityModalInitialTab(tab);
    setIsSecurityModalOpen(true);
  };

  const handleManualCloudSync = useCallback(async () => {
    const hasDecryptError = cloudStatus === 'offline' && (lastSyncText || '').toLowerCase().includes('descifrado');

    if (hasDecryptError) {
      const recovered = await pullFromCloud();
      if (recovered) {
        showToast('Sincronización Recuperada', 'Se restauró el acceso al estado cifrado en la nube.');
      } else {
        showToast('Error de Cifrado', 'No se pudo recuperar el estado cloud. Verifica tu passphrase actual.', 'warning');
      }
      return;
    }

    await pushToCloud(state);
    showToast('Sincronización en la Nube', 'Datos sincronizados exitosamente con la nube.');
  }, [cloudStatus, lastSyncText, pullFromCloud, pushToCloud, state, showToast]);

  const handleOpenKnowledgeCenter = (moduleId?: HelpModuleId) => {
    if (moduleId) {
      setHelpModalModule(moduleId);
      return;
    }
    const tabToModule: Record<string, HelpModuleId> = {
      dashboard: 'dashboard',
      cashflow: 'cashflow',
      debts: 'debts',
      budgets: 'budgets',
      transactions: 'transactions',
      recurring: 'recurring',
      goals: 'goals',
      rule503020: 'rule503020',
      allowances: 'allowances',
      members: 'members',
      banks: 'banks',
      tags: 'budgets',
    };
    setHelpModalModule(tabToModule[activeTab] || 'dashboard');
  };

  // Navigate to filtered transactions
  const handleFilterByCategory = (categoryName: string) => {
    setSelectedCategoryFilter(categoryName);
    setActiveTab('transactions');
  };

  const handleFilterByMember = (_memberId: string) => {
    setActiveTab('transactions');
  };

  // Auto-present financial tips carousel upon signing in (if not marked "no volver a mostrar")
  useEffect(() => {
    if (user && (activeFamily || userFamilies.length > 0)) {
      try {
        const storageKey = `family_finances_hide_tips_${user.uid || 'default'}`;
        const isDismissed = localStorage.getItem(storageKey) === 'true';
        if (!isDismissed) {
          const timer = setTimeout(() => {
            setIsTipsModalOpen(true);
          }, 600);
          return () => clearTimeout(timer);
        }
      } catch (_) {}
    }
  }, [user?.uid, activeFamily?.id]);

  // Resolve the logged-in / active member
  const currentMember = useMemo(() => {
    if (user) {
      const byEmailOrId = state.members.find(
        (m) =>
          (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
          m.id === `mem-${user.uid.slice(0, 8)}`
      );
      if (byEmailOrId) return byEmailOrId;
    }
    return state.members[0] || null;
  }, [user, state.members]);

  const memberAccounts = useMemo(() => {
    if (!currentMember) return [];
    return (state.bankAccounts || []).filter(
      (b) => (b.holderMemberId || (b as any).memberId) === currentMember.id
    );
  }, [currentMember, state.bankAccounts]);

  const memberHasNoAccounts = Boolean(currentMember && memberAccounts.length === 0);

  // Reminder dismissed state (per-session dismissibility)
  const [isDismissedNoAccountReminder, setIsDismissedNoAccountReminder] = useState(false);

  useEffect(() => {
    if (currentMember) {
      try {
        const isDismissed = sessionStorage.getItem(`dismissed_bank_reminder_${currentMember.id}`) === 'true';
        setIsDismissedNoAccountReminder(isDismissed);
      } catch (_) {
        setIsDismissedNoAccountReminder(false);
      }
    }
  }, [currentMember?.id]);

  // Recordatorio al entrar: si el miembro no tiene cuentas al entrar le sale un recordatorio
  useEffect(() => {
    if (user && currentMember && memberHasNoAccounts) {
      try {
        const toastSessionKey = `bank_reminder_toast_${user.uid}_${currentMember.id}`;
        const hasShownInSession = sessionStorage.getItem(toastSessionKey) === 'true';
        if (!hasShownInSession) {
          const timer = setTimeout(() => {
            showToast(
              'Recordatorio: Cuentas Bancarias',
              `${currentMember.name}, aún no tienes cuentas registradas a tu nombre. Accede al módulo de Cuentas Bancarias para configurarlas.`,
              'warning'
            );
            sessionStorage.setItem(toastSessionKey, 'true');
          }, 1200);
          return () => clearTimeout(timer);
        }
      } catch (_) {}
    }
  }, [user?.uid, currentMember?.id, memberHasNoAccounts, showToast]);

  // Combined alerts including pending bank accounts reminder for header notifications
  const combinedAlerts = useMemo<BudgetAlert[]>(() => {
    if (!memberHasNoAccounts || !currentMember) return alerts;
    const hasFamilyAccounts = (state.bankAccounts || []).length > 0;
    const bankAlert: BudgetAlert = {
      id: `alert-no-bank-account-${currentMember.id}`,
      type: 'member_no_accounts',
      title: 'Cuentas Bancarias pendientes',
      categoryName: 'Cuentas Bancarias',
      currentSpent: 0,
      budgetLimit: 0,
      percentage: 0,
      threshold: 0,
      level: 'warning',
      date: new Date().toLocaleDateString('es-ES'),
      description: hasFamilyAccounts
        ? `${currentMember.name}, no tienes cuentas asignadas como titular a tu nombre.`
        : `${currentMember.name}, tu hogar aún no tiene cuentas bancarias configuradas.`,
    };
    return [bankAlert, ...alerts];
  }, [alerts, memberHasNoAccounts, currentMember, state.bankAccounts]);

  const hasCloudDecryptError = cloudStatus === 'offline' && (lastSyncText || '').toLowerCase().includes('descifrado');

  // 1. Loading authentication state (continúa el splash screen con el gradiente del icono)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#090D16] via-[#1E1B4B] to-[#064E3B] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-indigo-500/25 blur-xl animate-pulse" />
            <img
              src="/icon.svg"
              alt="Finanzas Familiares"
              className="relative w-24 h-24 rounded-3xl shadow-2xl shadow-black/60 object-cover"
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white/95">
              Finanzas Familiares
            </h1>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-200 tracking-wide">
                Cargando espacio familiar seguro...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: If user has not signed in, show AuthGateScreen
  if (!user) {
    return (
      <AuthGateScreen
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  // 3. Workspace Gate: If user is signed in but has no family created or selected, guide onboarding
  if (!activeFamily && userFamilies.length === 0) {
    return (
      <AuthGateScreen
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. Top Navigation Bar */}
      <Header
        familyName={state.familyName}
        familyCode={state.familyCode}
        currency={state.currency}
        currencyCode={state.currencyCode}
        cloudStatus={cloudStatus}
        lastSyncText={lastSyncText}
        isBankSyncing={isBankSyncing}
        alerts={combinedAlerts}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenSecurityCurrency={handleOpenSecurityModal}
        onOpenBackupExport={() => setIsBackupModalOpen(true)}
        onSyncBank={syncBankAccounts}
        onOpenBanks={() => setActiveTab('banks')}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenFamilyModal={(tab = 'list') => {
          setFamilyModalDefaultTab(tab);
          setIsFamilyModalOpen(true);
        }}
        onLogout={logOut}
        onOpenTips={() => setIsTipsModalOpen(true)}
        onOpenKnowledgeCenter={() => handleOpenKnowledgeCenter()}
        onNavigateToTab={(tab) => setActiveTab(tab as any)}
        isDesktopRightPanelOpen={isDesktopRightPanelOpen}
        onToggleDesktopRightPanel={() => setIsDesktopRightPanelOpen(prev => !prev)}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(prev => !prev)}
      />

      {hasCloudDecryptError && (
        <div className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 pt-2 sm:pt-3">
          <div className="w-full rounded-xl border border-rose-300/80 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 p-3 sm:p-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 mt-0.5 sm:mt-0">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm leading-tight">
                    Error de descifrado cloud: clave de seguridad incorrecta
                  </p>
                  <p className="text-[11px] sm:text-xs mt-1 opacity-90 leading-snug">
                    La app está en modo local y no puede leer los datos cifrados de la nube. Verifica tu passphrase y vuelve a sincronizar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenSecurityModal('security')}
                className="inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800 transition"
              >
                Revisar Clave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dynamic Alerts Banner (Limits Warning & Due Bills) */}
      <AlertsBanner
        alerts={combinedAlerts}
        currency={state.currency}
        onNavigateToBudgets={() => setActiveTab('budgets')}
        onNavigateToRecurring={() => setActiveTab('recurring')}
      />

      {/* 2.1 Reminder if active/logged member has no bank accounts */}
      {memberHasNoAccounts && !isDismissedNoAccountReminder && (
        <MemberNoAccountsReminder
          member={currentMember}
          hasFamilyAccounts={(state.bankAccounts || []).length > 0}
          isCurrentTabBanks={activeTab === 'banks'}
          onNavigateToBanks={() => {
            setActiveTab('banks');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDismiss={() => {
            setIsDismissedNoAccountReminder(true);
            if (currentMember) {
              try {
                sessionStorage.setItem(`dismissed_bank_reminder_${currentMember.id}`, 'true');
              } catch (_) {}
            }
          }}
        />
      )}

      {/* 3. Main Desktop & Mobile Layout Shell */}
      <div className="flex-1 w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 py-3.5 sm:py-6 flex gap-5 2xl:gap-6 items-start">
        {/* Left Column: Desktop Navigation Sidebar & Family Command Center (>= xl) */}
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'transactions') {
              setSelectedCategoryFilter(undefined);
            }
            setActiveTab(tab);
          }}
          hasChildren={hasChildren}
          state={state}
          onOpenNewTransaction={() => setIsTxModalOpen(true)}
          isCollapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => setIsDesktopSidebarCollapsed(prev => !prev)}
          onOpenFamilyModal={(tab = 'list') => {
            setFamilyModalDefaultTab(tab);
            setIsFamilyModalOpen(true);
          }}
          onOpenKnowledgeCenter={() => handleOpenKnowledgeCenter()}
          cloudStatus={cloudStatus}
          lastSyncText={lastSyncText}
        />

        {/* Central Column: Main Workspace */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* Navigation Tabs with scroll controls (visible on mobile/tablets < xl) */}
          <div className="xl:hidden relative flex items-center">
          {/* Scroll Left Button */}
          {canScrollNavLeft && (
            <button
              onClick={() => handleNavScroll('left')}
              className="absolute left-1 z-10 p-1.5 rounded-full bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 shadow-md border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition"
              title="Desplazar a la izquierda"
              aria-label="Desplazar a la izquierda"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            ref={navTabsRef}
            onWheel={e => {
              if (navTabsRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                navTabsRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex-1 flex items-center gap-1 p-1 pr-10 sm:pr-4 bg-stone-200/60 dark:bg-stone-900/80 rounded-xl overflow-x-auto border border-stone-200 dark:border-stone-800 no-scrollbar touch-pan-x scroll-smooth"
          >
            {/* Dashboard (Tab por defecto con gráficos clave) */}
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Proyección de Flujo de Caja y Tesorería */}
            <button
              id="nav-tab-cashflow"
              onClick={() => setActiveTab('cashflow')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'cashflow'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Flujo de Caja</span>
            </button>

            {/* Plan de Deudas: Avalancha vs Bola de Nieve */}
            <button
              id="nav-tab-debts"
              onClick={() => setActiveTab('debts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'debts'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Plan de Deudas</span>
              {(state.bankAccounts || []).filter(a => a.accountType === 'credit' || a.accountType === 'loan').length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                  {(state.bankAccounts || []).filter(a => a.accountType === 'credit' || a.accountType === 'loan').length}
                </span>
              )}
            </button>

            {/* Presupuestos */}
            <button
              id="nav-tab-budgets"
              onClick={() => setActiveTab('budgets')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'budgets'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Presupuestos</span>
            </button>

            {/* Transacciones */}
            <button
              id="nav-tab-transactions"
              onClick={() => {
                setSelectedCategoryFilter(undefined);
                setActiveTab('transactions');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Transacciones</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-bold">
                {state.transactions.length}
              </span>
            </button>

            {/* Recurrentes (Gastos e Ingresos Fijos) */}
            <button
              id="nav-tab-recurring"
              onClick={() => setActiveTab('recurring')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'recurring'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Recurrentes</span>
              {((state.recurringExpenses || []).length > 0 || (state.recurringIncomes || []).length > 0) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  {(state.recurringExpenses || []).length + (state.recurringIncomes || []).length}
                </span>
              )}
            </button>

            {/* Metas de Ahorro */}
            <button
              id="nav-tab-goals"
              onClick={() => setActiveTab('goals')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Metas</span>
              {(state.savingsGoals || []).length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                  {state.savingsGoals.length}
                </span>
              )}
            </button>

            {/* Regla 50/30/20 */}
            <button
              id="nav-tab-rule503020"
              onClick={() => setActiveTab('rule503020')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'rule503020'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Regla 50/30/20</span>
            </button>

            {/* Hijos (Solo si en la unidad familiar hay hijos definidos) */}
            {hasChildren && (
              <button
                id="nav-tab-allowances"
                onClick={() => setActiveTab('allowances')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'allowances'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Baby className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Hijos</span>
                {(state.childAllowances || []).length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    {state.childAllowances.length}
                  </span>
                )}
              </button>
            )}

            {/* Miembros Familia */}
            <button
              id="nav-tab-members"
              onClick={() => setActiveTab('members')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'members'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Miembros</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-bold">
                {state.members.length}
              </span>
            </button>

            {/* Cuentas Bancarias */}
            <button
              id="nav-tab-banks"
              onClick={() => setActiveTab('banks')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'banks'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Cuentas Bancarias</span>
              {(state.bankAccounts || []).length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  {state.bankAccounts.length}
                </span>
              )}
            </button>

            {/* Categorías */}
            <button
              id="nav-tab-tags"
              onClick={() => setActiveTab('tags')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                activeTab === 'tags'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Tags className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
              <span>Categorías</span>
            </button>
          </div>

          {/* Scroll Right Button */}
          {canScrollNavRight && (
            <button
              onClick={() => handleNavScroll('right')}
              className="absolute right-1 z-10 p-1.5 rounded-full bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 shadow-md border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition"
              title="Desplazar a la derecha"
              aria-label="Desplazar a la derecha"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab View Contents */}
        {activeTab === 'dashboard' && (
          <DashboardView
            state={state}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            onNavigateToBudgets={() => setActiveTab('budgets')}
            onNavigateToTransactions={() => {
              setSelectedCategoryFilter(undefined);
              setActiveTab('transactions');
            }}
            onOpenNewTransaction={() => setIsTxModalOpen(true)}
            onNavigateToCashFlow={() => setActiveTab('cashflow')}
            onNavigateToDebts={() => setActiveTab('debts')}
            onNavigateToBanks={() => setActiveTab('banks')}
          />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowForecastView
            state={state}
            onNavigateToRecurring={() => setActiveTab('recurring')}
            onNavigateToBanks={() => setActiveTab('banks')}
            onOpenHelp={() => setHelpModalModule('cashflow')}
          />
        )}

        {activeTab === 'debts' && (
          <DebtPayoffPlannerView
            state={state}
            onUpdateBankAccount={updateBankAccount}
            onAddBankAccount={addBankAccount}
            onNavigateToBanks={() => setActiveTab('banks')}
            onOpenNewTransaction={() => setIsTxModalOpen(true)}
            onOpenHelp={() => setHelpModalModule('debts')}
          />
        )}

        {activeTab === 'budgets' && (
          <OverviewBudgets
            state={state}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            onUpdateCategoryBudget={updateCategoryBudget}
            onUpdateGlobalBudget={updateGlobalBudget}
            onOpenNewCategoryModal={() => setActiveTab('tags')}
            onSelectCategoryFilter={handleFilterByCategory}
            onOpenNewTransaction={() => setIsTxModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsList
            state={state}
            selectedMonth={selectedMonth}
            categoryFilter={selectedCategoryFilter}
            onClearCategoryFilter={() => setSelectedCategoryFilter(undefined)}
            onDeleteTransaction={deleteTransaction}
            onOpenNewTransaction={() => setIsTxModalOpen(true)}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringExpensesView
            state={state}
            onAddRecurringExpense={addRecurringExpense}
            onUpdateRecurringExpense={updateRecurringExpense}
            onDeleteRecurringExpense={deleteRecurringExpense}
            onToggleRecurringActive={toggleRecurringActive}
            onPayRecurringExpense={payRecurringExpense}
            onToggleRecurringExpenseAutoRegister={toggleRecurringExpenseAutoRegister}
            onAddRecurringIncome={addRecurringIncome}
            onUpdateRecurringIncome={updateRecurringIncome}
            onDeleteRecurringIncome={deleteRecurringIncome}
            onToggleRecurringIncomeActive={toggleRecurringIncomeActive}
            onToggleRecurringIncomeAutoRegister={toggleRecurringIncomeAutoRegister}
            onCollectRecurringIncome={collectRecurringIncome}
            onAddRecurringTransfer={addRecurringTransfer}
            onUpdateRecurringTransfer={updateRecurringTransfer}
            onDeleteRecurringTransfer={deleteRecurringTransfer}
            onToggleRecurringTransferActive={toggleRecurringTransferActive}
            onToggleRecurringTransferAutoRegister={toggleRecurringTransferAutoRegister}
            onExecuteRecurringTransfer={executeRecurringTransfer}
          />
        )}

        {activeTab === 'goals' && (
          <SavingsGoalsView
            state={state}
            onAddSavingsGoal={addSavingsGoal}
            onContributeToGoal={contributeToGoal}
            onDeleteSavingsGoal={deleteSavingsGoal}
          />
        )}

        {activeTab === 'rule503020' && (
          <BudgetRule503020View
            state={state}
            selectedMonth={selectedMonth}
            onUpdateCategoryBucket={updateCategoryBucket}
          />
        )}

        {activeTab === 'allowances' && hasChildren && (
          <ChildAllowancesView
            state={state}
            onAddChildAllowance={addChildAllowance}
            onPayAllowance={payAllowance}
            onDeleteChildAllowance={deleteChildAllowance}
            onAddTaskToAllowance={addTaskToAllowance}
            onRemoveTaskFromAllowance={removeTaskFromAllowance}
          />
        )}

        {activeTab === 'members' && (
          <FamilyMembersView
            state={state}
            selectedMonth={selectedMonth}
            onAddMember={addFamilyMember}
            onUpdateMember={updateFamilyMember}
            onRemoveMember={removeFamilyMember}
            onFilterMemberTransactions={handleFilterByMember}
            onNavigateToBanks={() => setActiveTab('banks')}
          />
        )}

        {activeTab === 'banks' && (
          <BankIntegrationView
            state={state}
            onAddBankAccount={addBankAccount}
            onUpdateBankAccount={updateBankAccount}
            onDeleteBankAccount={deleteBankAccount}
            onAddCustomBank={addCustomBank}
            onDeleteCustomBank={deleteCustomBank}
            onOpenTransactionModal={() => setIsTxModalOpen(true)}
            onOpenHelp={() => setHelpModalModule('banks')}
          />
        )}

        {activeTab === 'tags' && (
          <TagsCategoriesView
            state={state}
            selectedMonth={selectedMonth}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onAddCategory={addCategory}
            onUpdateCategoryBudget={updateCategoryBudget}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
          />
        )}
        </main>

        {/* Right Column: Live Financial Snapshot & Quick Actions Panel (>= xl when enabled) */}
        {isDesktopRightPanelOpen && (
          <DesktopQuickPanel
            state={state}
            alerts={alerts}
            onClose={() => setIsDesktopRightPanelOpen(false)}
            onNavigateToRecurring={() => setActiveTab('recurring')}
            onNavigateToGoals={() => setActiveTab('goals')}
            onNavigateToBudgets={() => setActiveTab('budgets')}
            onNavigateToBanks={() => setActiveTab('banks')}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onOpenBackupExport={() => setIsBackupModalOpen(true)}
            onSyncBank={syncBankAccounts}
            isBankSyncing={isBankSyncing}
            onOpenTips={() => setIsTipsModalOpen(true)}
          />
        )}
      </div>

      {/* 4. Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        state={state}
        onAddTransaction={addTransaction}
        onAddTag={addTag}
      />

      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        state={state}
        passphrase={passphrase}
        cloudStatus={cloudStatus}
        lastSyncText={lastSyncText}
        onForceSync={handleManualCloudSync}
        onSwitchFamilyCode={switchFamilyCode}
        onOpenSecurityModal={() => {
          setIsCloudModalOpen(false);
          setIsSecurityModalOpen(true);
        }}
      />

      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        state={state}
        selectedMonth={selectedMonth}
      />

      <SecurityCurrencyModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        state={state}
        passphrase={passphrase}
        initialTab={securityModalInitialTab}
        cloudStatus={cloudStatus}
        lastSyncText={lastSyncText}
        alerts={alerts}
        onForceSync={handleManualCloudSync}
        onSwitchFamilyCode={switchFamilyCode}
        onUpdatePassphrase={updatePassphrase}
        onUpdateCurrency={updateDefaultCurrency}
        onClearAllData={clearAllLocalData}
        onShowToast={showToast}
        onUpdateAlertSettings={updateAlertSettings}
        onUpdateGlobalAlertThreshold={(threshold) => updateGlobalBudget(state.globalMonthlyBudget, threshold)}
        onSendTestNotification={sendTestNotification}
        onOpenBackupExport={() => setIsBackupModalOpen(true)}
      />

      <BackupExportModal
        isOpen={isBackupModalOpen}
        onClose={() => {
          setIsBackupModalOpen(false);
          setBackupTriggeredByShortcut(false);
        }}
        state={state}
        passphrase={passphrase}
        onRestoreState={restoreState}
        onShowToast={showToast}
        triggeredByShortcut={backupTriggeredByShortcut}
      />

      {/* Multi-Family & Auth Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <FamilyWorkspaceModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        defaultTab={familyModalDefaultTab}
      />

      {/* Financial Tips Carousel Modal */}
      <FamilyFinancialTipsModal
        isOpen={isTipsModalOpen}
        onClose={() => setIsTipsModalOpen(false)}
        userId={user?.uid}
        onOpenRuleTab={() => setActiveTab('rule503020')}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          setIsTipsModalOpen(false);
        }}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenKnowledgeCenter={() => handleOpenKnowledgeCenter('debts')}
      />

      {/* Reusable Module Help & Education Modal */}
      <ModuleHelpModal
        isOpen={helpModalModule !== null}
        onClose={() => setHelpModalModule(null)}
        initialModule={helpModalModule || 'dashboard'}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          setHelpModalModule(null);
        }}
        onOpenPdfModal={() => {
          setHelpModalModule(null);
          setIsPdfModalOpen(true);
        }}
        onOpenSecurityModal={(tab) => {
          setHelpModalModule(null);
          handleOpenSecurityModal(tab);
        }}
        onOpenBackupExport={() => {
          setHelpModalModule(null);
          setIsBackupModalOpen(true);
        }}
        onOpenFamilyModal={(tab) => {
          setHelpModalModule(null);
          setFamilyModalDefaultTab(tab || 'list');
          setIsFamilyModalOpen(true);
        }}
      />

      {/* 5. Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl p-4 shadow-xl border border-stone-800 dark:border-stone-200 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="p-1 rounded-lg bg-white/10 dark:bg-stone-900/10 shrink-0">
            {toastMessage.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <h5 className="font-bold text-xs sm:text-sm">{toastMessage.title}</h5>
            <p className="text-xs opacity-80 mt-0.5">{toastMessage.desc}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 py-4 px-4 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="font-semibold text-stone-700 dark:text-stone-300">Finanzas Familiares</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>Cifrado E2EE AES-GCM 256-bit</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>
            Modo nube: {cloudSecurityMode === 'strict'
              ? (import.meta.env.PROD ? 'Producción Estricto' : 'Desarrollo Estricto')
              : 'Desarrollo Compatibilidad'}
          </span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>Privacidad & Seguridad Garantizada</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
            <span>Hogar:</span>
            <strong className="font-semibold text-stone-800 dark:text-stone-200">
              {activeFamily?.familyName || state.familyName || 'Mi Hogar'}
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
