import React, { useMemo } from 'react';
import {
  Wallet,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
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
import { FamilyState } from '../../types';
import { formatMoney, formatNumber } from '../../utils/currencies';

interface NetWorthWidgetProps {
  state: FamilyState;
  onHideWidget?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const NetWorthWidget: React.FC<NetWorthWidgetProps> = ({
  state,
  onHideWidget,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const { totalAssets, totalLiabilities, netWorth, debtRatio, assetsList, debtsList } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    const aList: { name: string; amount: number; color: string }[] = [];
    const dList: { name: string; amount: number; color: string }[] = [];

    (state.bankAccounts || []).forEach(acc => {
      if (acc.accountType === 'loan' || acc.accountType === 'credit') {
        const debt = Math.abs(acc.balance);
        liabilities += debt;
        if (debt > 0) {
          dList.push({
            name: `${acc.bankName} - ${acc.name}`,
            amount: debt,
            color: acc.color || '#f43f5e',
          });
        }
      } else {
        const balance = Math.max(0, acc.balance);
        assets += balance;
        if (balance > 0) {
          aList.push({
            name: `${acc.bankName} - ${acc.name}`,
            amount: balance,
            color: acc.color || '#10b981',
          });
        }
      }
    });

    const nw = assets - liabilities;
    const ratio = assets > 0 ? (liabilities / assets) * 100 : liabilities > 0 ? 100 : 0;

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: nw,
      debtRatio: ratio,
      assetsList: aList,
      debtsList: dList,
    };
  }, [state.bankAccounts]);

  const chartData = useMemo(() => {
    return [
      {
        name: 'Activos Totales',
        monto: totalAssets,
        fill: '#10b981',
      },
      {
        name: 'Deudas (Pasivos)',
        monto: totalLiabilities,
        fill: '#f43f5e',
      },
      {
        name: 'Patrimonio Neto',
        monto: netWorth,
        fill: netWorth >= 0 ? '#6366f1' : '#f59e0b',
      },
    ];
  }, [totalAssets, totalLiabilities, netWorth]);

  // Solvency health assessment
  const healthBadge = useMemo(() => {
    if (totalAssets === 0 && totalLiabilities === 0) {
      return {
        label: 'Sin cuentas registradas',
        color: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
        icon: Scale,
      };
    }
    if (netWorth >= 0 && debtRatio <= 25) {
      return {
        label: 'Excelente Solvencia Patrimonial',
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        icon: ShieldCheck,
      };
    }
    if (netWorth >= 0 && debtRatio <= 50) {
      return {
        label: 'Patrimonio Estable y Moderado',
        color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
        icon: TrendingUp,
      };
    }
    if (netWorth >= 0) {
      return {
        label: 'Apalancamiento Alto',
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Patrimonio en Déficit (Deuda > Activos)',
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      icon: AlertTriangle,
    };
  }, [netWorth, debtRatio, totalAssets, totalLiabilities]);

  const BadgeIcon = healthBadge.icon;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xl text-xs">
          <p className="font-bold text-stone-900 dark:text-stone-100">{entry.payload.name}</p>
          <p className="mt-1 font-bold text-sm" style={{ color: entry.payload.fill }}>
            {formatMoney(entry.value, state.currency)}
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
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                Patrimonio Neto Familiar (Balance General)
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${healthBadge.color}`}>
                <BadgeIcon className="w-3 h-3" />
                <span>{healthBadge.label}</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Fotografía real de tus Activos (Ahorros e Inversiones) menos Pasivos (Préstamos y Tarjetas)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Activos Líquidos
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-base sm:text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 block">
            {formatMoney(totalAssets, state.currency)}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5 block">
            {assetsList.length} cuentas de ahorro / nómina
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              Pasivos (Deudas Totales)
            </span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-base sm:text-xl font-bold text-rose-900 dark:text-rose-100 mt-0.5 block">
            {formatMoney(totalLiabilities, state.currency)}
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5 block">
            {debtsList.length} compromisos (préstamos y tarjetas)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              Patrimonio Neto Real
            </span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <span className={`text-base sm:text-xl font-bold mt-0.5 block ${netWorth >= 0 ? 'text-indigo-900 dark:text-indigo-100' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatMoney(netWorth, state.currency)}
          </span>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 mt-0.5 block">
            Ratio de endeudamiento: {formatNumber(debtRatio, 1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="monto" radius={[6, 6, 0, 0]} maxBarSize={55}>
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
