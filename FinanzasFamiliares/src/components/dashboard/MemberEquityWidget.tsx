import React, { useMemo } from 'react';
import {
  Scale,
  EyeOff,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Users,
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
  ReferenceLine,
} from 'recharts';
import { FamilyState } from '../../types';
import { formatMoney, formatNumber } from '../../utils/currencies';

interface MemberEquityWidgetProps {
  state: FamilyState;
  selectedMonth: string;
  onHideWidget?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const MemberEquityWidget: React.FC<MemberEquityWidgetProps> = ({
  state,
  selectedMonth,
  onHideWidget,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const monthTransactions = useMemo(() => {
    return state.transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [state.transactions, selectedMonth]);

  const totalHouseholdIncome = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const equityData = useMemo(() => {
    if (!state.members || state.members.length === 0) return [];

    const map: Record<
      string,
      { id: string; name: string; avatar?: string; color: string; ingresos: number; gastos: number }
    > = {};

    state.members.forEach((m, idx) => {
      const colors = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];
      map[m.id] = {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        color: colors[idx % colors.length],
        ingresos: 0,
        gastos: 0,
      };
    });

    monthTransactions.forEach(t => {
      if (t.memberId && map[t.memberId]) {
        if (t.type === 'income') map[t.memberId].ingresos += t.amount;
        if (t.type === 'expense') map[t.memberId].gastos += t.amount;
      }
    });

    return Object.values(map).map(m => {
      const neto = m.ingresos - m.gastos;
      const pctIncome = totalHouseholdIncome > 0 ? (m.ingresos / totalHouseholdIncome) * 100 : 0;
      return {
        ...m,
        neto,
        pctIncome,
      };
    });
  }, [state.members, monthTransactions, totalHouseholdIncome]);

  const chartData = useMemo(() => {
    return equityData.map(m => ({
      name: m.name,
      balanceNeto: m.neto,
      fill: m.neto >= 0 ? '#10b981' : '#f43f5e',
    }));
  }, [equityData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const isPositive = entry.value >= 0;
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xl text-xs space-y-1">
          <p className="font-bold text-stone-900 dark:text-stone-100">{entry.payload.name}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Aporte Neto:</span>
            <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '+' : ''}{formatMoney(entry.value, state.currency)}
            </span>
          </div>
          <p className="text-[10px] text-stone-400">
            {isPositive ? 'Aportó más de lo que consumió' : 'Consumió más de lo aportado al fondo'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (state.members.length === 0) return null;

  return (
    <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Balance y Equidad por Miembro</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {state.members.length} miembros
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Contribución neta de cada integrante: Ingresos aportados menos gastos consumidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Grid of Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {equityData.map(m => {
          const isPositive = m.neto >= 0;
          return (
            <div
              key={m.id}
              className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{m.avatar || '👤'}</span>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block truncate">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Aporta el {formatNumber(m.pctIncome, 1)}% del ingreso total
                    </span>
                  </div>
                </div>

                <div
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isPositive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {isPositive ? 'Superávit' : 'Déficit'}
                </div>
              </div>

              <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800/70 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 block">Ingresó:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(m.ingresos, state.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">Gastó:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -{formatMoney(m.gastos, state.currency)}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-stone-100 dark:border-stone-800/70 flex items-center justify-between text-xs font-bold">
                <span className="text-[10px] text-stone-500">Saldo Neto:</span>
                <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {isPositive ? '+' : ''}{formatMoney(m.neto, state.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparative Net Balance Bar Chart */}
      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ReferenceLine y={0} stroke="#78716c" strokeWidth={1} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="balanceNeto" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
