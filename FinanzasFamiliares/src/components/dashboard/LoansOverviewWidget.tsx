import React, { useMemo } from 'react';
import {
  Landmark,
  EyeOff,
  Flame,
  ArrowRight,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Percent,
  ArrowUp,
  ArrowDown,
  GripVertical,
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
import { FamilyState, BankAccount } from '../../types';
import { formatMoney, formatNumber } from '../../utils/currencies';
import { getAccountNextDueDate } from '../../utils/bankUtils';

interface LoansOverviewWidgetProps {
  state: FamilyState;
  selectedMonth: string;
  onHideWidget?: () => void;
  onNavigateToDebts?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const LoansOverviewWidget: React.FC<LoansOverviewWidgetProps> = ({
  state,
  selectedMonth,
  onHideWidget,
  onNavigateToDebts,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  // Filter loan accounts (and credit accounts with debt)
  const loanAccounts = useMemo(() => {
    return (state.bankAccounts || []).filter(acc => acc.accountType === 'loan');
  }, [state.bankAccounts]);

  const allDebts = useMemo(() => {
    return (state.bankAccounts || []).filter(
      acc => acc.accountType === 'loan' || (acc.accountType === 'credit' && Math.abs(acc.balance) > 0)
    );
  }, [state.bankAccounts]);

  // Total outstanding loan principal
  const totalLoanDebt = useMemo(() => {
    return loanAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  }, [loanAccounts]);

  // Total monthly minimum payments / cuotas
  const totalMonthlyCommitment = useMemo(() => {
    return loanAccounts.reduce((sum, acc) => {
      const min = acc.minimumPayment || 0;
      return sum + min;
    }, 0);
  }, [loanAccounts]);

  // Monthly loan payments made during the selected month
  const monthLoanPayments = useMemo(() => {
    return state.transactions
      .filter(t => t.date.startsWith(selectedMonth))
      .filter(
        t =>
          (t.type === 'expense' &&
            (t.category.toLowerCase().includes('prestamo') ||
              t.category.toLowerCase().includes('préstamo') ||
              t.category.toLowerCase().includes('hipoteca') ||
              t.category.toLowerCase().includes('deuda'))) ||
          (t.type === 'transfer' &&
            loanAccounts.some(acc => acc.id === t.toBankAccountId))
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [state.transactions, selectedMonth, loanAccounts]);

  // Chart data: Loans ranked by balance
  const loansChartData = useMemo(() => {
    return loanAccounts
      .map(acc => {
        const holder = state.members.find(m => m.id === acc.holderMemberId);
        return {
          id: acc.id,
          name: acc.name.length > 18 ? acc.name.substring(0, 16) + '...' : acc.name,
          fullName: `${acc.bankName} - ${acc.name}`,
          titular: holder ? holder.name : 'Familiar / Mancomunada',
          balance: Math.abs(acc.balance),
          cuota: acc.minimumPayment || 0,
          tasa: acc.interestRate || 0,
          dueDay: acc.dueDay,
          dueDate: acc.dueDate,
          color: acc.color || '#0284c7',
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [loanAccounts, state.members]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xl text-xs space-y-1">
          <p className="font-bold text-stone-900 dark:text-stone-100">{data.fullName}</p>
          <p className="text-stone-500 dark:text-stone-400">Titular: <span className="font-semibold text-stone-700 dark:text-stone-300">{data.titular}</span></p>
          <div className="pt-1 border-t border-stone-100 dark:border-stone-800 flex justify-between gap-4">
            <span className="text-stone-500">Saldo Pendiente:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(data.balance, state.currency)}</span>
          </div>
          {data.cuota > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">Cuota Mensual:</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{formatMoney(data.cuota, state.currency)}</span>
            </div>
          )}
          {data.tasa > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">Tasa Interés Anual:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{data.tasa}%</span>
            </div>
          )}
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
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Monitor de Préstamos e Hipotecas</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {loanAccounts.length} {loanAccounts.length === 1 ? 'préstamo activo' : 'préstamos activos'}
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Consolidación de saldos deudores, compromisos de cuota mensual y abonos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onNavigateToDebts && (
            <button
              onClick={onNavigateToDebts}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 transition"
              title="Ir a simulador de amortización"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Plan de Amortización</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

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

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block">
            Saldo Total Adeudado
          </span>
          <span className="text-base sm:text-xl font-bold text-rose-900 dark:text-rose-100 mt-0.5 block">
            {formatMoney(totalLoanDebt, state.currency)}
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5 block">
            Principal pendiente de liquidación
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">
            Compromiso Mensual (Cuotas)
          </span>
          <span className="text-base sm:text-xl font-bold text-amber-900 dark:text-amber-100 mt-0.5 block">
            {formatMoney(totalMonthlyCommitment, state.currency)}
          </span>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5 block">
            Suma de cuotas mínimas exigidas
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
            Abonado en el Mes
          </span>
          <span className="text-base sm:text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 block">
            {formatMoney(monthLoanPayments, state.currency)}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5 block">
            Pagos y transferencias aplicados
          </span>
        </div>
      </div>

      {/* Main Content: Chart + List or Empty State */}
      {loanAccounts.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800">
          <Landmark className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            No tienes préstamos o hipotecas registrados
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            Puedes registrar un préstamo en la pestaña <strong>Bancos</strong> con su saldo inicial, tasa de interés y cuota mensual para que aparezca aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Bar Chart by Loan */}
          <div className="lg:col-span-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={loansChartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="balance" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {loansChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Loans Breakdown List */}
          <div className="lg:col-span-6 space-y-2 max-h-56 overflow-y-auto pr-1">
            {loansChartData.map(loan => (
              <div
                key={loan.id}
                className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: loan.color }}
                    />
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {loan.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                    <span>Titular: {loan.titular}</span>
                    {loan.tasa > 0 && <span>• Tasa: {loan.tasa}%</span>}
                    {(() => {
                      const dueInfo = getAccountNextDueDate({ dueDay: loan.dueDay, dueDate: loan.dueDate });
                      if (dueInfo) {
                        return (
                          <span
                            className="text-sky-700 dark:text-sky-300 font-medium"
                            title={`Próximo vencimiento: ${dueInfo.formattedLongDate}. (${dueInfo.dueDayDescription})`}
                          >
                            • Próx. vencimiento: <strong>{dueInfo.formattedDate}</strong> ({dueInfo.badgeText})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-xs text-rose-600 dark:text-rose-400 block">
                    {formatMoney(loan.balance, state.currency)}
                  </span>
                  {loan.cuota > 0 && (
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                      Cuota: {formatMoney(loan.cuota, state.currency)}/mes
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
