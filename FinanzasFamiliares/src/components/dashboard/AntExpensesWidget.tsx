import React, { useMemo, useState } from 'react';
import {
  Coffee,
  EyeOff,
  AlertCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Flame,
  PiggyBank,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FamilyState, Transaction } from '../../types';
import { formatMoney, formatNumber } from '../../utils/currencies';

interface AntExpensesWidgetProps {
  state: FamilyState;
  selectedMonth: string;
  onHideWidget?: () => void;
  onNavigateToTransactions?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const AntExpensesWidget: React.FC<AntExpensesWidgetProps> = ({
  state,
  selectedMonth,
  onHideWidget,
  onNavigateToTransactions,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  // Threshold default based on currency
  const defaultThreshold = useMemo(() => {
    const code = state.currencyCode || 'DOP';
    if (code === 'USD' || code === 'EUR') return 10;
    return 400; // ~400 DOP or standard equivalent
  }, [state.currencyCode]);

  const [threshold, setThreshold] = useState<number>(defaultThreshold);

  // Filter month transactions
  const monthTransactions = useMemo(() => {
    return state.transactions.filter(
      t => t.date.startsWith(selectedMonth) && t.type === 'expense'
    );
  }, [state.transactions, selectedMonth]);

  const totalExpense = useMemo(() => {
    return monthTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Ant expenses criteria:
  // 1. Amount <= threshold
  // 2. OR description/category matches typical ant keywords (café, delivery, snack, uber, taxi, propina, antojito, refresco, dulce)
  const antKeywords = ['cafe', 'café', 'snack', 'delivery', 'uber', 'taxi', 'propina', 'antojo', 'refresco', 'dulce', 'golosina', 'estacionamiento', 'parqueo'];

  const antExpenses = useMemo(() => {
    return monthTransactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const isLowAmount = t.amount <= threshold;
      const isKeywordMatch = antKeywords.some(k => desc.includes(k) || cat.includes(k));
      return isLowAmount || isKeywordMatch;
    });
  }, [monthTransactions, threshold]);

  const totalAntAmount = useMemo(() => {
    return antExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [antExpenses]);

  const antPct = totalExpense > 0 ? (totalAntAmount / totalExpense) * 100 : 0;
  const yearlyProjected = totalAntAmount * 12;

  // Breakdown by category
  const categoriesBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    antExpenses.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => {
        const cat = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
        return {
          name: name.length > 15 ? name.substring(0, 13) + '...' : name,
          fullName: name,
          monto: amount,
          color: cat?.color || '#f97316',
        };
      })
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [antExpenses, state.categories]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xl text-xs space-y-1">
          <p className="font-bold text-stone-900 dark:text-stone-100">{data.fullName}</p>
          <p className="text-orange-600 dark:text-orange-400 font-bold">
            {formatMoney(data.monto, state.currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Fugas de Dinero y Gastos Hormiga</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                {antExpenses.length} micropagos detectados
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Compras pequeñas de bajo importe que en conjunto representan una fuga importante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500">
            <span>Tope:</span>
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(Math.max(1, Number(e.target.value) || 0))}
              className="w-16 px-1.5 py-0.5 text-xs font-semibold rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-center"
            />
          </div>

          {onMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
              title="Mover arriba"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}

          {onMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
              title="Mover abajo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}

          {onHideWidget && (
            <button
              onClick={onHideWidget}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              title="Ocultar esta gráfica del dashboard"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
          <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-300 block">
            Fuga Acumulada del Mes
          </span>
          <span className="text-base sm:text-xl font-bold text-orange-900 dark:text-orange-100 mt-0.5 block">
            {formatMoney(totalAntAmount, state.currency)}
          </span>
          <span className="text-[10px] text-orange-600/80 dark:text-orange-400 mt-0.5 block">
            Representa el {formatNumber(antPct, 1)}% de tus gastos mensuales
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">
            Proyección a 12 Meses
          </span>
          <span className="text-base sm:text-xl font-bold text-amber-900 dark:text-amber-100 mt-0.5 block">
            ~{formatMoney(yearlyProjected, state.currency)}
          </span>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5 block">
            Gasto anualizado si se mantiene este ritmo
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
            Potencial de Ahorro
          </span>
          <span className="text-base sm:text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 block">
            +{formatMoney(Math.round(yearlyProjected * 0.7), state.currency)}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5 block">
            Ahorro anual reduciendo el 70% de compras impulsivas
          </span>
        </div>
      </div>

      {/* Chart & Breakdown */}
      {antExpenses.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
          No se detectaron compras pequeñas menores a {formatMoney(threshold, state.currency)} en este mes.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-7 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoriesBreakdown} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="monto" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {categoriesBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
              Mayores Fugas por Rubro:
            </span>
            {categoriesBreakdown.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 rounded bg-stone-50 dark:bg-stone-800/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate text-stone-800 dark:text-stone-200">{cat.fullName}</span>
                </div>
                <span className="font-bold text-stone-900 dark:text-stone-100 shrink-0 ml-2">
                  {formatMoney(cat.monto, state.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
