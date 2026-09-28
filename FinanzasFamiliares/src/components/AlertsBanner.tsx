import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, CalendarClock, Wallet, X } from 'lucide-react';
import { BudgetAlert } from '../types';
import { formatMoney } from '../utils/currencies';

interface AlertsBannerProps {
  alerts: BudgetAlert[];
  currency: string;
  onNavigateToBudgets: () => void;
  onNavigateToRecurring?: () => void;
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({
  alerts,
  currency,
  onNavigateToBudgets,
  onNavigateToRecurring,
}) => {
  const [dismissed, setDismissed] = React.useState(false);
  const safeAlerts = alerts.filter((a): a is BudgetAlert => Boolean(a));

  if (safeAlerts.length === 0 || dismissed) {
    return null;
  }

  const budgetAlerts = safeAlerts.filter(a => a.type !== 'recurring_due' && a.type !== 'member_no_accounts');
  const recurringAlerts = safeAlerts.filter(a => a.type === 'recurring_due');

  const dangerCount = safeAlerts.filter(a => a.level === 'danger').length;
  const isDanger = dangerCount > 0;

  // Alerts such as member_no_accounts are handled elsewhere in the UI.
  // Avoid falling into mixed/budget render paths with empty budget/recurring sets.
  if (budgetAlerts.length === 0 && recurringAlerts.length === 0) {
    return null;
  }

  // Case 1: Only recurring expenses / bills
  if (budgetAlerts.length === 0 && recurringAlerts.length > 0) {
    const overdueCount = recurringAlerts.filter(a => (a.daysUntilDue ?? 0) < 0).length;
    const totalRecurringAmount = recurringAlerts.reduce((sum, r) => sum + r.currentSpent, 0);
    const uniqueCategories = Array.from(new Set(recurringAlerts.map(r => r.categoryName).filter(Boolean)));
    const handleNavigate = onNavigateToRecurring || onNavigateToBudgets;

    const billsListText = recurringAlerts
      .slice(0, 2)
      .map(r => `${r.recurringTitle || r.title.replace(/^[^:]+:\s*/, '')} (${formatMoney(r.currentSpent, currency)})`)
      .join(', ') + (recurringAlerts.length > 2 ? ` y ${recurringAlerts.length - 2} más` : '');

    return (
      <div className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 pt-2 sm:pt-3">
        <div
          className={`w-full relative overflow-hidden rounded-xl border p-3 sm:p-3.5 shadow-xs transition-all ${
            overdueCount > 0
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            {/* Left / Main Content Block */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                className={`p-1.5 sm:p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                  overdueCount > 0
                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}
              >
                {overdueCount > 0 ? (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                ) : (
                  <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-xs sm:text-sm leading-tight">
                    {overdueCount > 0
                      ? `¡Atención! ${overdueCount} factura(s) vencida(s)`
                      : `Recordatorio: ${recurringAlerts.length} factura(s) próxima(s)`}
                  </span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-white/80 dark:bg-black/40 border border-current truncate max-w-full">
                    {uniqueCategories.length === 1
                      ? `${uniqueCategories[0]} • ${recurringAlerts.length} pago(s)`
                      : `${uniqueCategories.length} categorías • ${recurringAlerts.length} pagos`}
                  </span>
                </div>

                <p className="text-[11px] sm:text-xs mt-1 opacity-90 leading-snug break-words">
                  Total a pagar: <strong className="font-bold">{formatMoney(totalRecurringAmount, currency)}</strong>
                  <span className="hidden sm:inline"> • Detalle: {billsListText}</span>
                </p>
              </div>

              {/* Close button on mobile positioned top right */}
              <button
                onClick={() => setDismissed(true)}
                className="sm:hidden -mr-1 -mt-1 p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
                title="Cerrar aviso temporalmente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t border-black/5 dark:border-white/5 sm:border-0">
              <button
                onClick={handleNavigate}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-xs border border-stone-200 dark:border-stone-700 transition w-full sm:w-auto"
                title="Ir a gestionar facturas fijas y recurrentes"
              >
                <span>Ver Facturas</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
                title="Cerrar aviso temporalmente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Only budget categories limits
  if (budgetAlerts.length > 0 && recurringAlerts.length === 0) {
    const highestAlert = [...budgetAlerts].sort((a, b) => b.percentage - a.percentage)[0];
    const budgetDangerCount = budgetAlerts.filter(a => a.level === 'danger').length;

    return (
      <div className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 pt-2 sm:pt-3">
        <div
          className={`w-full relative overflow-hidden rounded-xl border p-3 sm:p-3.5 shadow-xs transition-all ${
            budgetDangerCount > 0
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                className={`p-1.5 sm:p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                  budgetDangerCount > 0
                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}
              >
                {budgetDangerCount > 0 ? (
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-xs sm:text-sm leading-tight">
                    {budgetDangerCount > 0
                      ? `¡Atención! ${budgetDangerCount} límite(s) excedido(s)`
                      : `Aviso: ${budgetAlerts.length} categoría(s) al límite`}
                  </span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-white/80 dark:bg-black/40 border border-current truncate max-w-full">
                    {highestAlert.categoryName}: {highestAlert.percentage.toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs mt-1 opacity-90 leading-snug break-words">
                  Gastado {formatMoney(highestAlert.currentSpent, currency)} de {formatMoney(highestAlert.budgetLimit, currency)} (tope mensual).
                </p>
              </div>

              <button
                onClick={() => setDismissed(true)}
                className="sm:hidden -mr-1 -mt-1 p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
                title="Cerrar aviso temporalmente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t border-black/5 dark:border-white/5 sm:border-0">
              <button
                onClick={onNavigateToBudgets}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-xs border border-stone-200 dark:border-stone-700 transition w-full sm:w-auto"
              >
                <span>Ver Presupuestos</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
                title="Cerrar aviso temporalmente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Mixed (both budget alerts and recurring alerts)
  const highestBudget = [...budgetAlerts].sort((a, b) => b.percentage - a.percentage)[0];
  const totalRecurring = recurringAlerts.reduce((sum, r) => sum + r.currentSpent, 0);

  return (
    <div className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 pt-2 sm:pt-3">
      <div
        className={`w-full relative overflow-hidden rounded-xl border p-3 sm:p-3.5 shadow-xs transition-all ${
          isDanger
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`p-1.5 sm:p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                isDanger
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                  : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-xs sm:text-sm leading-tight">
                  {`Aviso: ${budgetAlerts.length} límite(s) y ${recurringAlerts.length} factura(s)`}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-white/80 dark:bg-black/40 border border-current truncate max-w-full">
                  {highestBudget.categoryName}: {highestBudget.percentage.toFixed(0)}%
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-white/80 dark:bg-black/40 border border-current truncate max-w-full">
                  Facturas: {formatMoney(totalRecurring, currency)}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs mt-1 opacity-90 leading-snug break-words">
                Límite: {highestBudget.categoryName} ({highestBudget.percentage.toFixed(0)}%). Tienes {recurringAlerts.length} factura(s) por pagar ({formatMoney(totalRecurring, currency)}).
              </p>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="sm:hidden -mr-1 -mt-1 p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
              title="Cerrar aviso temporalmente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-black/5 dark:border-white/5 sm:border-0">
            <button
              onClick={onNavigateToBudgets}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-xs border border-stone-200 dark:border-stone-700 transition"
              title="Ver presupuestos"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Presupuestos</span>
            </button>
            {onNavigateToRecurring && (
              <button
                onClick={onNavigateToRecurring}
                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-xs border border-stone-200 dark:border-stone-700 transition"
                title="Ver facturas recurrentes"
              >
                <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Facturas</span>
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
              title="Cerrar aviso temporalmente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
