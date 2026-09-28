import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Tags,
} from 'lucide-react';
import { FamilyState, Category } from '../types';
import { formatNumber, formatMoney } from '../utils/currencies';

interface OverviewBudgetsProps {
  state: FamilyState;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onUpdateCategoryBudget: (id: string, budgetLimit: number, alertThreshold: number) => void;
  onUpdateGlobalBudget: (limit: number, threshold: number) => void;
  onOpenNewCategoryModal: () => void;
  onSelectCategoryFilter: (categoryName: string) => void;
  onOpenNewTransaction?: () => void;
}

export const OverviewBudgets: React.FC<OverviewBudgetsProps> = ({
  state,
  selectedMonth,
  setSelectedMonth,
  onUpdateCategoryBudget,
  onUpdateGlobalBudget,
  onOpenNewCategoryModal,
  onSelectCategoryFilter,
  onOpenNewTransaction,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [tempLimit, setTempLimit] = useState<number>(0);
  const [tempThreshold, setTempThreshold] = useState<number>(80);

  const [isEditingGlobal, setIsEditingGlobal] = useState<boolean>(false);
  const [tempGlobalLimit, setTempGlobalLimit] = useState<number>(state.globalMonthlyBudget);
  const [tempGlobalThreshold, setTempGlobalThreshold] = useState<number>(state.globalAlertThreshold);

  // Filter transactions for the selected month
  const monthTransactions = state.transactions.filter(t => t.date.startsWith(selectedMonth));
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const globalRemaining = state.globalMonthlyBudget - totalExpense;
  const globalSpentPct = state.globalMonthlyBudget > 0
    ? (totalExpense / state.globalMonthlyBudget) * 100
    : 0;

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setTempLimit(cat.budgetLimit);
    setTempThreshold(cat.alertThreshold || 80);
  };

  const handleSaveCategoryBudget = () => {
    if (editingCategory) {
      onUpdateCategoryBudget(editingCategory.id, Number(tempLimit), Number(tempThreshold));
      setEditingCategory(null);
    }
  };

  const handleSaveGlobalBudget = () => {
    onUpdateGlobalBudget(Number(tempGlobalLimit), Number(tempGlobalThreshold));
    setIsEditingGlobal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Controls: Month Selector & Budget Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Período:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-xs text-stone-500 dark:text-stone-400 hidden md:inline">
            {monthTransactions.length} movimientos registrados
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => {
              setTempGlobalLimit(state.globalMonthlyBudget);
              setTempGlobalThreshold(state.globalAlertThreshold);
              setIsEditingGlobal(true);
            }}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition whitespace-nowrap shrink-0"
            title="Ajustar límite de gasto mensual global de la familia"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Presupuesto</span>
            <span>Global</span>
          </button>
          <button
            onClick={onOpenNewCategoryModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Nueva</span>
            <span>Categoría</span>
          </button>
          {onOpenNewTransaction && (
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition whitespace-nowrap shrink-0"
              title="Registrar nuevo ingreso o gasto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Movimiento</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Main KPI Cards: 2x2 grid on mobile, 4 columns on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Ingresos */}
        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">Ingresos Totales</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-bold text-stone-900 dark:text-stone-100 block truncate">
              +{formatMoney(totalIncome, state.currency)}
            </span>
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
            Aportes familiares y salarios
          </p>
        </div>

        {/* Total Gastos */}
        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">Gastos Realizados</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-bold text-stone-900 dark:text-stone-100 block truncate">
              -{formatMoney(totalExpense, state.currency)}
            </span>
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
            {formatNumber(globalSpentPct, 1)}% del presupuesto
          </p>
        </div>

        {/* Balance Neto */}
        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">Balance Neto</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className={`text-base sm:text-2xl font-bold block truncate ${netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netSavings >= 0 ? '+' : '-'}{formatMoney(Math.abs(netSavings), state.currency)}
            </span>
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
            {netSavings >= 0 ? 'Ahorro acumulado' : 'Déficit este mes'}
          </p>
        </div>

        {/* Presupuesto Restante */}
        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">Margen Disponible</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className={`text-base sm:text-2xl font-bold block truncate ${globalRemaining >= 0 ? 'text-stone-900 dark:text-stone-100' : 'text-rose-600 dark:text-rose-400'}`}>
              {globalRemaining >= 0 ? '' : '-'}{formatMoney(Math.abs(globalRemaining), state.currency)}
            </span>
          </div>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
            De {formatMoney(state.globalMonthlyBudget, state.currency, 0)} asignados
          </p>
        </div>
      </div>

      {/* Global Budget Progress Bar */}
      <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Presupuesto Mensual Familiar</span>
              {globalSpentPct >= 100 ? (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold">
                  Excedido
                </span>
              ) : globalSpentPct >= state.globalAlertThreshold ? (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Alerta: {globalSpentPct.toFixed(0)}%
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Bajo control
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Tope mensual: {formatMoney(state.globalMonthlyBudget, state.currency)} | Umbral de alerta temprana: {state.globalAlertThreshold}%
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {formatMoney(totalExpense, state.currency)}
            </span>
            <span className="text-xs text-stone-400"> / {formatMoney(state.globalMonthlyBudget, state.currency)}</span>
          </div>
        </div>

        {/* Bar */}
        <div className="relative mt-3 w-full h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              globalSpentPct >= 100
                ? 'bg-rose-600'
                : globalSpentPct >= state.globalAlertThreshold
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, globalSpentPct)}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-2 text-[11px] text-stone-500 dark:text-stone-400">
          <span>0%</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            Aviso en {state.globalAlertThreshold}%
          </span>
          <span>100% ({formatMoney(state.globalMonthlyBudget, state.currency, 0)})</span>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Presupuestos por Categoría
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Supervisión de topes mensuales con avisos personalizados
            </p>
          </div>

          <button
            onClick={onOpenNewCategoryModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-xs transition self-start sm:self-auto border border-stone-200 dark:border-stone-700"
            title="Abrir panel de administración de categorías"
          >
            <Tags className="w-3.5 h-3.5 text-blue-500" />
            <span>Gestionar y Editar Categorías</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.categories.map(category => {
            const spent = monthTransactions
              .filter(t => t.type === 'expense' && t.category === category.name)
              .reduce((sum, t) => sum + t.amount, 0);

            const limit = category.budgetLimit;
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const remaining = limit - spent;
            const isAlert = pct >= category.alertThreshold && pct < 100;
            const isExceeded = pct >= 100;

            return (
              <div
                key={category.id}
                className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm text-xs font-bold"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => onSelectCategoryFilter(category.name)}
                          className="font-bold text-sm text-stone-900 dark:text-stone-100 hover:text-emerald-600 dark:hover:text-emerald-400 text-left truncate block max-w-[170px]"
                          title="Filtrar transacciones de esta categoría"
                        >
                          {category.name}
                        </button>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                          Alerta al {category.alertThreshold}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEditCategory(category)}
                      className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                      title="Ajustar límite y umbral"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                        {formatMoney(spent, state.currency)}
                      </span>
                      <span className="text-xs text-stone-400"> / {formatMoney(limit, state.currency)}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isExceeded
                          ? '#ffe4e6'
                          : isAlert
                          ? '#fef3c7'
                          : '#ecfdf5',
                        color: isExceeded
                          ? '#be123c'
                          : isAlert
                          ? '#b45309'
                          : '#047857',
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="mt-2 w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: isExceeded ? '#e11d48' : isAlert ? '#f59e0b' : category.color,
                      }}
                    />
                  </div>
                </div>

                {/* Footer status */}
                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  {isExceeded ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Superado por {formatMoney(Math.abs(remaining), state.currency)}
                    </span>
                  ) : isAlert ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Quedan {formatMoney(remaining, state.currency)}
                    </span>
                  ) : limit === 0 ? (
                    <span className="text-stone-400 dark:text-stone-500 italic text-[11px]">
                      Límite mensual: 0 {state.currency} (Sin asignar)
                    </span>
                  ) : (
                    <span className="text-stone-500 dark:text-stone-400">
                      Disponible: <strong className="text-stone-700 dark:text-stone-300">{formatMoney(remaining, state.currency)}</strong>
                    </span>
                  )}

                  <button
                    onClick={() => onSelectCategoryFilter(category.name)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Ver</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Ajustar Presupuesto: {editingCategory.name}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Define el límite mensual máximo y cuándo quieres recibir la alerta preventiva.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Límite Mensual ({state.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tempLimit}
                  onChange={e => setTempLimit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Umbral de Alerta Temprana
                  </label>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {tempThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={tempThreshold}
                  onChange={e => setTempThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Te avisaremos en cuanto el gasto alcance los {formatMoney((tempLimit * tempThreshold) / 100, state.currency)}.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategoryBudget}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Guardar Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Global Budget Modal */}
      {isEditingGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Configurar Presupuesto Global Familiar
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Establece el tope de gastos para toda la familia durante el mes.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Presupuesto Global Mensual ({state.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tempGlobalLimit}
                  onChange={e => setTempGlobalLimit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Porcentaje para Alerta General
                  </label>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {tempGlobalThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={tempGlobalThreshold}
                  onChange={e => setTempGlobalThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  La familia recibirá una alerta al alcanzar {formatMoney((tempGlobalLimit * tempGlobalThreshold) / 100, state.currency)}.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsEditingGlobal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGlobalBudget}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Guardar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
