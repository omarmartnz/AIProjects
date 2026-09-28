import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Flame,
  PieChart,
  Wallet,
  Receipt,
  CalendarClock,
  PiggyBank,
  Baby,
  Users,
  Landmark,
  Tags,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Cloud,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { FamilyState } from '../../types';
import { formatMoney } from '../../utils/currencies';

export type NavTabId =
  | 'dashboard'
  | 'cashflow'
  | 'debts'
  | 'budgets'
  | 'transactions'
  | 'goals'
  | 'recurring'
  | 'rule503020'
  | 'allowances'
  | 'members'
  | 'banks'
  | 'tags';

interface DesktopSidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  hasChildren: boolean;
  state: FamilyState;
  onOpenNewTransaction: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenFamilyModal: (tab?: 'list' | 'create' | 'join' | 'invite') => void;
  onOpenKnowledgeCenter: () => void;
  cloudStatus: 'synced' | 'syncing' | 'offline';
  lastSyncText: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  hasChildren,
  state,
  onOpenNewTransaction,
  isCollapsed,
  onToggleCollapse,
  onOpenFamilyModal,
  onOpenKnowledgeCenter,
  cloudStatus,
  lastSyncText,
}) => {
  const hasDecryptError = cloudStatus === 'offline' && (lastSyncText || '').toLowerCase().includes('descifrado');

  // Counts and badges
  const debtsCount = (state.bankAccounts || []).filter(
    a => a.accountType === 'credit' || a.accountType === 'loan'
  ).length;
  const recurringCount =
    (state.recurringExpenses || []).length + (state.recurringIncomes || []).length;
  const goalsCount = (state.savingsGoals || []).length;
  const txCount = state.transactions.length;
  const membersCount = state.members.length;
  const banksCount = (state.bankAccounts || []).length;
  const allowancesCount = (state.childAllowances || []).length;

  // Navigation sections
  const navSections = [
    {
      title: 'Resumen & Estrategia',
      items: [
        {
          id: 'dashboard' as NavTabId,
          label: 'Dashboard',
          icon: BarChart3,
          color: 'text-indigo-600 dark:text-indigo-400',
          badge: null,
        },
        {
          id: 'cashflow' as NavTabId,
          label: 'Flujo de Caja',
          icon: TrendingUp,
          color: 'text-emerald-600 dark:text-emerald-400',
          badge: null,
        },
        {
          id: 'debts' as NavTabId,
          label: 'Plan de Deudas',
          icon: Flame,
          color: 'text-amber-500 dark:text-amber-400',
          badge: debtsCount > 0 ? debtsCount : null,
          badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
        },
        {
          id: 'rule503020' as NavTabId,
          label: 'Regla 50/30/20',
          icon: PieChart,
          color: 'text-rose-500 dark:text-rose-400',
          badge: null,
        },
      ],
    },
    {
      title: 'Operaciones Diarias',
      items: [
        {
          id: 'budgets' as NavTabId,
          label: 'Presupuestos',
          icon: Wallet,
          color: 'text-emerald-600 dark:text-emerald-400',
          badge: null,
        },
        {
          id: 'transactions' as NavTabId,
          label: 'Transacciones',
          icon: Receipt,
          color: 'text-emerald-600 dark:text-emerald-400',
          badge: txCount,
          badgeColor: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
        },
        {
          id: 'recurring' as NavTabId,
          label: 'Recurrentes & Fijos',
          icon: CalendarClock,
          color: 'text-blue-600 dark:text-blue-400',
          badge: recurringCount > 0 ? recurringCount : null,
          badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
        },
        {
          id: 'goals' as NavTabId,
          label: 'Metas de Ahorro',
          icon: PiggyBank,
          color: 'text-teal-600 dark:text-teal-400',
          badge: goalsCount > 0 ? goalsCount : null,
          badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300',
        },
      ],
    },
    {
      title: 'Familia & Configuración',
      items: [
        ...(hasChildren
          ? [
              {
                id: 'allowances' as NavTabId,
                label: 'Mesadas Hijos',
                icon: Baby,
                color: 'text-purple-600 dark:text-purple-400',
                badge: allowancesCount > 0 ? allowancesCount : null,
                badgeColor:
                  'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
              },
            ]
          : []),
        {
          id: 'members' as NavTabId,
          label: 'Miembros',
          icon: Users,
          color: 'text-amber-600 dark:text-amber-400',
          badge: membersCount,
          badgeColor: 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
        },
        {
          id: 'banks' as NavTabId,
          label: 'Cuentas Bancarias',
          icon: Landmark,
          color: 'text-blue-600 dark:text-blue-400',
          badge: banksCount > 0 ? banksCount : null,
          badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
        },
        {
          id: 'tags' as NavTabId,
          label: 'Categorías & Etiquetas',
          icon: Tags,
          color: 'text-stone-500 dark:text-stone-400',
          badge: null,
        },
      ],
    },
  ];

  // Quick total balance calculation for footer
  const totalBalance = (state.bankAccounts || []).reduce((acc, account) => {
    if (account.accountType === 'credit' || account.accountType === 'loan') {
      return acc - Math.abs(account.balance);
    }
    return acc + account.balance;
  }, 0);

  return (
    <aside
      id="desktop-navigation-sidebar"
      className={`hidden xl:flex flex-col shrink-0 transition-all duration-300 sticky top-20 ${
        isCollapsed ? 'w-18' : 'w-64 2xl:w-72'
      } bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-3 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar select-none`}
    >
      {/* 1. Header: Family Workspace & Collapse Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
        {!isCollapsed && (
          <button
            onClick={() => onOpenFamilyModal('list')}
            className="flex items-center gap-2.5 min-w-0 text-left group hover:opacity-80 transition"
            title="Cambiar o Administrar Hogar"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {state.familyName?.charAt(0).toUpperCase() || 'F'}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {state.familyName}
              </h2>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                {state.members.length} {state.members.length === 1 ? 'miembro' : 'miembros'}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Primary Action: + Nueva Transacción */}
      <div className="py-3">
        <button
          onClick={onOpenNewTransaction}
          className={`w-full flex items-center justify-center gap-2 font-bold text-xs rounded-xl py-2.5 transition active:scale-98 shadow-xs ${
            isCollapsed
              ? 'p-2 bg-emerald-600 text-white hover:bg-emerald-700'
              : 'px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
          }`}
          title="Registrar Transacción"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Nueva Transacción</span>}
        </button>
      </div>

      {/* 3. Navigation Sections & Links */}
      <nav className="flex-1 space-y-4 py-1">
        {navSections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition group ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border-l-2 border-indigo-600 dark:border-indigo-400 shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? item.color : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          item.badgeColor || 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 4. Footer: Mini Financial Status & Sync */}
      {!isCollapsed ? (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span>Liquidez Total</span>
              <span
                className={`text-[10px] font-semibold ${
                  hasDecryptError
                    ? 'text-rose-600 dark:text-rose-400'
                    : cloudStatus === 'synced'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : cloudStatus === 'syncing'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {hasDecryptError ? 'Cifrado Falló' : cloudStatus === 'synced' ? 'En Vivo' : cloudStatus === 'syncing' ? 'Sincronizando' : 'Local'}
              </span>
            </div>
            <p
              className={`text-sm font-bold mt-0.5 truncate ${
                totalBalance >= 0
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(totalBalance, state.currency)}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
            <div className="flex items-center gap-1.5 truncate">
              {hasDecryptError ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              ) : null}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  cloudStatus === 'synced'
                    ? 'bg-emerald-500'
                    : cloudStatus === 'syncing'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-stone-400'
                }`}
              />
              <span className="truncate">{lastSyncText || 'Firestore'}</span>
            </div>
            <button
              onClick={onOpenKnowledgeCenter}
              className="p-1 rounded-lg text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              title="Centro de Conocimiento Financiero"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-col items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              cloudStatus === 'synced'
                ? 'bg-emerald-500'
                : cloudStatus === 'syncing'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-stone-400'
            }`}
            title={`Nube: ${lastSyncText || 'Sincronizado'}`}
          />
        </div>
      )}
    </aside>
  );
};
