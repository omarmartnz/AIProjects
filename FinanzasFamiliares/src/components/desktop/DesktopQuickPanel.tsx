import React from 'react';
import {
  CalendarClock,
  PiggyBank,
  AlertTriangle,
  FileDown,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Landmark,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { FamilyState, BudgetAlert } from '../../types';
import { formatMoney, formatNumber } from '../../utils/currencies';

interface DesktopQuickPanelProps {
  state: FamilyState;
  alerts: BudgetAlert[];
  onClose: () => void;
  onNavigateToRecurring: () => void;
  onNavigateToGoals: () => void;
  onNavigateToBudgets: () => void;
  onNavigateToBanks: () => void;
  onOpenPdfModal: () => void;
  onOpenBackupExport: () => void;
  onSyncBank: () => void;
  isBankSyncing: boolean;
  onOpenTips: () => void;
}

export const DesktopQuickPanel: React.FC<DesktopQuickPanelProps> = ({
  state,
  alerts,
  onClose,
  onNavigateToRecurring,
  onNavigateToGoals,
  onNavigateToBudgets,
  onNavigateToBanks,
  onOpenPdfModal,
  onOpenBackupExport,
  onSyncBank,
  isBankSyncing,
  onOpenTips,
}) => {
  // 1. Calculate Upcoming Recurring Bills (next 7 days or overdue)
  const today = new Date();
  const currentDay = today.getDate();

  const upcomingBills = (state.recurringExpenses || [])
    .filter(r => r.isActive)
    .map(r => {
      let daysDiff = r.dueDay - currentDay;
      return {
        ...r,
        daysDiff,
      };
    })
    .filter(r => r.daysDiff >= -2 && r.daysDiff <= 10)
    .sort((a, b) => a.daysDiff - b.daysDiff)
    .slice(0, 3);

  // 2. Active Savings Goals
  const activeGoals = (state.savingsGoals || [])
    .filter(g => g.currentAmount < g.targetAmount)
    .slice(0, 3);

  // 3. High-risk budget alerts
  const criticalAlerts = alerts
    .filter(a => a.type !== 'recurring_due' && (a.level === 'danger' || a.level === 'warning'))
    .slice(0, 2);

  // 4. Liquid Balance Breakdown
  const assetsTotal = (state.bankAccounts || [])
    .filter(a => a.accountType !== 'credit' && a.accountType !== 'loan')
    .reduce((sum, a) => sum + a.balance, 0);

  const debtsTotal = (state.bankAccounts || [])
    .filter(a => a.accountType === 'credit' || a.accountType === 'loan')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  return (
    <aside
      id="desktop-quick-summary-panel"
      className="hidden 2xl:flex flex-col w-72 3xl:w-80 shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar select-none"
    >
      {/* Container Box */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-3.5 space-y-4">
        
        {/* Header with Title and Close button */}
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Monitoreo en Vivo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Ocultar panel lateral"
            aria-label="Ocultar panel lateral"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1. Liquidez & Cuentas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-blue-500" />
              <span>Cuentas & Liquidez</span>
            </span>
            <button
              onClick={onNavigateToBanks}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>Ver</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {state.bankAccounts.length === 0 ? (
            <div
              onClick={onNavigateToBanks}
              className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Sin cuentas registradas</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                Pulsa aquí para vincular las cuentas bancarias de la familia.
              </p>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 inline-block underline">
                Ir a Cuentas Bancarias →
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Activos en Cuentas</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(assetsTotal, state.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Compromisos / Créditos</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  -{formatMoney(debtsTotal, state.currency)}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs font-bold">
                <span className="text-stone-700 dark:text-stone-300">Posición Neta</span>
                <span
                  className={
                    assetsTotal - debtsTotal >= 0
                      ? 'text-stone-900 dark:text-stone-100'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {formatMoney(assetsTotal - debtsTotal, state.currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Próximos Vencimientos (Recurrentes) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
              <span>Próximas Facturas</span>
            </span>
            <button
              onClick={onNavigateToRecurring}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>{upcomingBills.length > 0 ? `${upcomingBills.length} pendientes` : 'Ver'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingBills.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingBills.map(bill => {
                const isOverdue = bill.daysDiff < 0;
                const isToday = bill.daysDiff === 0;
                return (
                  <div
                    key={bill.id}
                    onClick={onNavigateToRecurring}
                    className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {bill.title}
                      </p>
                      <p className="text-[10px] mt-0.5">
                        {isToday ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">Vence hoy</span>
                        ) : isOverdue ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            Vencido ({Math.abs(bill.daysDiff)}d)
                          </span>
                        ) : (
                          <span className="text-stone-500 dark:text-stone-400">
                            Día {bill.dueDay} (en {bill.daysDiff}d)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 shrink-0">
                      {formatMoney(bill.amount, state.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Al día con tus pagos
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Sin compromisos para los próximos días
              </p>
            </div>
          )}
        </div>

        {/* 3. Metas de Ahorro en Curso */}
        {activeGoals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-teal-500" />
                <span>Metas en Progreso</span>
              </span>
              <button
                onClick={onNavigateToGoals}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>Ver todas</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {activeGoals.map(goal => {
                const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div
                    key={goal.id}
                    onClick={onNavigateToGoals}
                    className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {goal.title}
                      </span>
                      <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                      <span>{formatMoney(goal.currentAmount, state.currency)}</span>
                      <span>de {formatMoney(goal.targetAmount, state.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Alertas de Presupuesto */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Límites en Riesgo</span>
              </span>
              <button
                onClick={onNavigateToBudgets}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>Ajustar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {criticalAlerts.map((alert, idx) => {
                const isBankAlert = alert.type === 'member_no_accounts';
                return (
                  <div
                    key={idx}
                    onClick={isBankAlert ? onNavigateToBanks : onNavigateToBudgets}
                    className={`p-2 rounded-xl text-xs cursor-pointer transition ${
                      isBankAlert
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                        : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                    }`}
                  >
                    <p className={`font-bold truncate ${isBankAlert ? 'text-indigo-800 dark:text-indigo-300' : 'text-rose-800 dark:text-rose-300'}`}>
                      {alert.categoryName || alert.title}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isBankAlert ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {alert.description || (alert.percentage ? `${formatNumber(alert.percentage, 0)}% consumido` : alert.title)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Acciones Rápidas */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Herramientas Rápidas
          </span>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenPdfModal}
              className="flex items-center gap-1.5 p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[11px] font-semibold transition"
              title="Descargar Informe Ejecutivo PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Informe PDF</span>
            </button>

            <button
              onClick={onOpenBackupExport}
              className="flex items-center gap-1.5 p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[11px] font-semibold transition"
              title="Bóveda Segura AES-256"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Bóveda AES</span>
            </button>

            <button
              onClick={onSyncBank}
              disabled={isBankSyncing}
              className="flex items-center gap-1.5 p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[11px] font-semibold transition disabled:opacity-50"
              title="Sincronizar Bancos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 shrink-0 ${isBankSyncing ? 'animate-spin' : ''}`} />
              <span className="truncate">Sincronizar</span>
            </button>

            <button
              onClick={onOpenTips}
              className="flex items-center gap-1.5 p-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[11px] font-semibold transition"
              title="Consejos Financieros Familiares"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Consejos</span>
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
};
