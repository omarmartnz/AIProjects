import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Sliders,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CalendarDays,
  Coins,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { FamilyState } from '../types';
import { formatMoney } from '../utils/currencies';
import { calculateTreasuryMetrics } from '../utils/bankUtils';

interface ScheduledEvent {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  monthOffset: number; // 1 to 12 (mes en el futuro)
  category?: string;
  isActive: boolean;
}

interface CashFlowForecastViewProps {
  state: FamilyState;
  onNavigateToRecurring?: () => void;
  onNavigateToBanks?: () => void;
  onOpenHelp?: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const CashFlowForecastView: React.FC<CashFlowForecastViewProps> = ({
  state,
  onNavigateToRecurring,
  onNavigateToBanks,
  onOpenHelp,
}) => {
  // 1. Time horizon: 3, 6 or 12 months
  const [horizonMonths, setHorizonMonths] = useState<3 | 6 | 12>(6);

  // 2. Base liquid balance configuration
  const actualBankLiquidity = useMemo(() => {
    if (!state.bankAccounts || state.bankAccounts.length === 0) return 0;
    return calculateTreasuryMetrics(state.bankAccounts, state.currencyCode || 'DOP').liquid;
  }, [state.bankAccounts, state.currencyCode]);

  const historicalNetTransactions = useMemo(() => {
    return state.transactions.reduce((acc, tx) => {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense') return acc - tx.amount;
      return acc;
    }, 0);
  }, [state.transactions]);

  // Default starting balance: bank accounts if any, otherwise positive historical net or 2500 fallback
  const initialCalculatedBase = actualBankLiquidity > 0
    ? actualBankLiquidity
    : Math.max(1000, historicalNetTransactions > 0 ? historicalNetTransactions : 2000);

  const [customStartingBalance, setCustomStartingBalance] = useState<number>(initialCalculatedBase);
  const [useCustomBalance, setUseCustomBalance] = useState<boolean>(false);

  const startingBalance = useCustomBalance ? customStartingBalance : initialCalculatedBase;

  // 3. Guaranteed Monthly Recurring Income
  const monthlyRecurringIncome = useMemo(() => {
    if (state.recurringIncomes && state.recurringIncomes.length > 0) {
      return state.recurringIncomes
        .filter(inc => inc.isActive)
        .reduce((sum, inc) => {
          let monthlyEquivalent = inc.amount;
          if (inc.frequency === 'biweekly') monthlyEquivalent = inc.amount; // total monthly amount in model
          if (inc.frequency === 'weekly') monthlyEquivalent = inc.amount * 4.33;
          if (inc.frequency === 'yearly') monthlyEquivalent = inc.amount / 12;
          return sum + monthlyEquivalent;
        }, 0);
    }
    // Fallback if no recurring incomes are configured: average income of last 3 months
    const last3MonthsIncome = state.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.round(last3MonthsIncome > 0 ? last3MonthsIncome / 3 : 2800);
  }, [state.recurringIncomes, state.transactions]);

  // 4. Guaranteed Monthly Recurring Expenses + Minimum Debt Payments from Linked Accounts
  const monthlyDebtMinimums = useMemo(() => {
    if (!state.bankAccounts || state.bankAccounts.length === 0) return 0;
    return state.bankAccounts
      .filter(acc => (acc.accountType === 'credit' || acc.accountType === 'loan') && (acc.minimumPayment || 0) > 0)
      .reduce((sum, acc) => sum + (acc.minimumPayment || 0), 0);
  }, [state.bankAccounts]);

  const monthlyRecurringExpense = useMemo(() => {
    let base = 0;
    if (state.recurringExpenses && state.recurringExpenses.length > 0) {
      base = state.recurringExpenses
        .filter(exp => exp.isActive)
        .reduce((sum, exp) => {
          let monthlyEquivalent = exp.amount;
          if (exp.frequency === 'yearly') monthlyEquivalent = exp.amount / 12;
          if (exp.frequency === 'weekly') monthlyEquivalent = exp.amount * 4.33;
          return sum + monthlyEquivalent;
        }, 0);
    }
    return base + monthlyDebtMinimums;
  }, [state.recurringExpenses, monthlyDebtMinimums]);

  // 5. Estimated Variable Expenses (based on actual past transactions minus recurring items)
  const baseVariableExpense = useMemo(() => {
    const totalExpenses = state.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const avgMonthly = totalExpenses > 0 ? totalExpenses / 3 : 1200;
    // Estimated variable = Total avg minus known recurring
    const estimatedVar = Math.max(300, avgMonthly - monthlyRecurringExpense);
    return Math.round(estimatedVar);
  }, [state.transactions, monthlyRecurringExpense]);

  // Interactive adjustment sliders
  const [variableExpenseAdjustmentPct, setVariableExpenseAdjustmentPct] = useState<number>(0); // -30% to +50%
  const [contingencyBufferPct, setContingencyBufferPct] = useState<number>(5); // 0% to 20%
  const [safetyThreshold] = useState<number>(Math.max(500, Math.round(monthlyRecurringExpense * 0.8)));

  const adjustedVariableExpense = useMemo(() => {
    const adjusted = baseVariableExpense * (1 + variableExpenseAdjustmentPct / 100);
    const withBuffer = adjusted * (1 + contingencyBufferPct / 100);
    return Math.round(withBuffer);
  }, [baseVariableExpense, variableExpenseAdjustmentPct, contingencyBufferPct]);

  // 6. Planned Extraordinary Events (What-if simulator)
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([
    {
      id: 'evt-1',
      name: 'Seguro / Mantenimiento Vehicular',
      amount: 450,
      type: 'expense',
      monthOffset: 2,
      category: 'Transporte',
      isActive: true,
    },
    {
      id: 'evt-2',
      name: 'Vacaciones / Escapada Familiar',
      amount: 950,
      type: 'expense',
      monthOffset: 4,
      category: 'Ocio / Viajes',
      isActive: true,
    },
    {
      id: 'evt-3',
      name: 'Bono Extraordinario / Regalía',
      amount: 1500,
      type: 'income',
      monthOffset: 5,
      category: 'Ingresos Extra',
      isActive: true,
    },
  ]);

  // New event form state
  const [newEventName, setNewEventName] = useState('');
  const [newEventAmount, setNewEventAmount] = useState('');
  const [newEventType, setNewEventType] = useState<'expense' | 'income'>('expense');
  const [newEventMonth, setNewEventMonth] = useState<number>(1);
  const [showEventForm, setShowEventForm] = useState(false);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newEventAmount);
    if (!newEventName.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const newEvt: ScheduledEvent = {
      id: `evt-${Date.now()}`,
      name: newEventName.trim(),
      amount: amountNum,
      type: newEventType,
      monthOffset: newEventMonth,
      isActive: true,
    };

    setScheduledEvents(prev => [...prev, newEvt]);
    setNewEventName('');
    setNewEventAmount('');
    setShowEventForm(false);
  };

  const handleToggleEvent = (id: string) => {
    setScheduledEvents(prev =>
      prev.map(ev => (ev.id === id ? { ...ev, isActive: !ev.isActive } : ev))
    );
  };

  const handleDeleteEvent = (id: string) => {
    setScheduledEvents(prev => prev.filter(ev => ev.id !== id));
  };

  // 7. Generate Forecast timeline month by month
  const forecastTimeline = useMemo(() => {
    const today = new Date();
    const timeline = [];
    let rollingBalance = startingBalance;

    for (let i = 1; i <= horizonMonths; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthIndex = forecastDate.getMonth();
      const year = forecastDate.getFullYear();
      const monthLabel = `${MONTH_SHORT[monthIndex]} ${year}`;
      const monthFullLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

      // Events for this month
      const monthEvents = scheduledEvents.filter(ev => ev.isActive && ev.monthOffset === i);
      const extraIncome = monthEvents
        .filter(ev => ev.type === 'income')
        .reduce((sum, ev) => sum + ev.amount, 0);
      const extraExpense = monthEvents
        .filter(ev => ev.type === 'expense')
        .reduce((sum, ev) => sum + ev.amount, 0);

      const totalIncome = monthlyRecurringIncome + extraIncome;
      const totalExpense = monthlyRecurringExpense + adjustedVariableExpense + extraExpense;
      const netMonthlyFlow = totalIncome - totalExpense;

      const openingBalance = rollingBalance;
      rollingBalance += netMonthlyFlow;
      const closingBalance = rollingBalance;

      let status: 'healthy' | 'tight' | 'critical' = 'healthy';
      if (closingBalance < 0) {
        status = 'critical';
      } else if (closingBalance < safetyThreshold) {
        status = 'tight';
      }

      timeline.push({
        monthOffset: i,
        monthLabel,
        monthFullLabel,
        openingBalance,
        recurringIncome: monthlyRecurringIncome,
        extraIncome,
        totalIncome,
        recurringExpense: monthlyRecurringExpense,
        variableExpense: adjustedVariableExpense,
        extraExpense,
        totalExpense,
        netMonthlyFlow,
        closingBalance,
        safetyThreshold,
        status,
        events: monthEvents,
      });
    }

    return timeline;
  }, [
    horizonMonths,
    startingBalance,
    monthlyRecurringIncome,
    monthlyRecurringExpense,
    adjustedVariableExpense,
    scheduledEvents,
    safetyThreshold,
  ]);

  // Overall key metrics
  const minProjectedBalance = useMemo(() => {
    if (forecastTimeline.length === 0) return 0;
    return Math.min(...forecastTimeline.map(m => m.closingBalance));
  }, [forecastTimeline]);

  const monthWithLowestBalance = useMemo(() => {
    if (forecastTimeline.length === 0) return null;
    return forecastTimeline.reduce((prev, curr) =>
      curr.closingBalance < prev.closingBalance ? curr : prev
    );
  }, [forecastTimeline]);

  const endProjectedBalance = useMemo(() => {
    if (forecastTimeline.length === 0) return 0;
    return forecastTimeline[forecastTimeline.length - 1].closingBalance;
  }, [forecastTimeline]);

  const totalCumulativeSavings = endProjectedBalance - startingBalance;

  return (
    <div id="cashflow-forecast-view" className="space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-emerald-950 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Predicción y Tesorería Familiar Prospectiva</span>
              </div>
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium backdrop-blur-md transition shadow-xs"
                  title="Ver explicación detallada de flujo de caja, beneficios y tips"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Ayuda & Guía del Módulo</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Proyección de Flujo de Caja y Liquidez
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Simula la evolución de tu dinero a futuro considerando ingresos recurrentes, facturas programadas,
              gastos promedio y eventos extraordinarios para anticipar cualquier riesgo de sobregiro.
            </p>
          </div>

          {/* Horizon Selector Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-black/30 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto shrink-0">
            <span className="text-[11px] font-semibold text-stone-300 px-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Horizonte:</span>
            </span>
            <div className="flex items-center gap-1">
              {[
                { months: 3 as const, label: '3 Meses (Inmediato)' },
                { months: 6 as const, label: '6 Meses (Semestral)' },
                { months: 12 as const, label: '12 Meses (Anual)' },
              ].map(opt => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setHorizonMonths(opt.months)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    horizonMonths === opt.months
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Baseline Financial Indicators (4 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Líquido Inicial */}
        <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm relative">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold">Saldo Inicial de Partida</span>
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100">
            {formatMoney(startingBalance, state.currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800">
            <span>{actualBankLiquidity > 0 ? 'Cuentas bancarias activas' : 'Estimación inicial'}</span>
            <button
              type="button"
              onClick={() => setUseCustomBalance(!useCustomBalance)}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              {useCustomBalance ? 'Restaurar' : 'Ajustar'}
            </button>
          </div>
          {useCustomBalance && (
            <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center gap-1.5 animate-in fade-in">
              <input
                type="number"
                value={customStartingBalance}
                onChange={e => setCustomStartingBalance(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                placeholder="Monto de partida..."
              />
            </div>
          )}
        </div>

        {/* 2. Flujo Neto Mensual Promedio */}
        <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold">Flujo Neto Base Mensual</span>
            {monthlyRecurringIncome - (monthlyRecurringExpense + adjustedVariableExpense) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-black ${
              monthlyRecurringIncome - (monthlyRecurringExpense + adjustedVariableExpense) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {monthlyRecurringIncome - (monthlyRecurringExpense + adjustedVariableExpense) >= 0 ? '+' : ''}
            {formatMoney(
              monthlyRecurringIncome - (monthlyRecurringExpense + adjustedVariableExpense),
              state.currency
            )}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span>+{formatMoney(monthlyRecurringIncome, state.currency)} ing.</span>
              <span>-{formatMoney(monthlyRecurringExpense + adjustedVariableExpense, state.currency)} gas.</span>
            </div>
            {monthlyDebtMinimums > 0 && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                Incluye {formatMoney(monthlyDebtMinimums, state.currency)}/mes de deudas vinculadas
              </div>
            )}
          </div>
        </div>

        {/* 3. Mínimo de Tesorería Proyectado */}
        <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold">Punto Mínimo de Liquidez</span>
            {minProjectedBalance >= safetyThreshold ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div
            className={`text-xl font-black ${
              minProjectedBalance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : minProjectedBalance < safetyThreshold
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatMoney(minProjectedBalance, state.currency)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800 flex justify-between">
            <span>Momento crítico:</span>
            <strong className="text-stone-700 dark:text-stone-300">
              {monthWithLowestBalance ? monthWithLowestBalance.monthLabel : '-'}
            </strong>
          </div>
        </div>

        {/* 4. Saldo Proyectado al Cierre del Periodo */}
        <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold">Saldo en {horizonMonths} Meses</span>
            <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div
            className={`text-xl font-black ${
              endProjectedBalance >= startingBalance
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatMoney(endProjectedBalance, state.currency)}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800 flex justify-between">
            <span>Variación patrimonial:</span>
            <strong className={totalCumulativeSavings >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {totalCumulativeSavings >= 0 ? '+' : ''}
              {formatMoney(totalCumulativeSavings, state.currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid: Chart on Left, Simulator Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: High-Resolution Visual Projection Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Curva Proyectada de Liquidez y Tesorería</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {horizonMonths} Meses
                  </span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Evolución del saldo disponible acumulado mes a mes vs. ingresos y gastos totales.
                </p>
              </div>

              {/* Chart Legend Summary */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Saldo Proyectado</span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <div className="w-3 h-1.5 rounded bg-indigo-500" />
                  <span>Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                  <div className="w-3 h-1.5 rounded bg-rose-400" />
                  <span>Gastos</span>
                </div>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecastTimeline}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#888888' }}
                    axisLine={{ stroke: '#88888830' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#888888' }}
                    axisLine={{ stroke: '#88888830' }}
                    tickFormatter={val => `${state.currency}${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-stone-900/95 text-white p-3 rounded-xl shadow-xl border border-stone-700 text-xs space-y-1.5 backdrop-blur-md">
                            <p className="font-bold text-sm text-emerald-400 border-b border-stone-700 pb-1">
                              {data.monthFullLabel}
                            </p>
                            <div className="flex justify-between gap-4">
                              <span className="text-stone-300">Saldo al Cierre:</span>
                              <strong className="text-emerald-400 font-bold">
                                {formatMoney(data.closingBalance, state.currency)}
                              </strong>
                            </div>
                            <div className="flex justify-between gap-4 text-indigo-300">
                              <span>Total Ingresos:</span>
                              <strong>+{formatMoney(data.totalIncome, state.currency)}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-rose-300">
                              <span>Total Gastos:</span>
                              <strong>-{formatMoney(data.totalExpense, state.currency)}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-stone-400 border-t border-stone-800 pt-1">
                              <span>Flujo Neto:</span>
                              <strong className={data.netMonthlyFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {data.netMonthlyFlow >= 0 ? '+' : ''}
                                {formatMoney(data.netMonthlyFlow, state.currency)}
                              </strong>
                            </div>
                            {data.events && data.events.length > 0 && (
                              <div className="pt-1.5 border-t border-stone-700/60 text-[10px] text-amber-300">
                                <span>Eventos: </span>
                                {data.events.map((e: ScheduledEvent) => `${e.name} (${e.type === 'income' ? '+' : '-'}${formatMoney(e.amount, state.currency)})`).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Safety Buffer Reference Line */}
                  <ReferenceLine
                    y={safetyThreshold}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Colchón Mínimo (${state.currency}${safetyThreshold})`,
                      fill: '#f59e0b',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  {/* Monthly Incomes and Expenses Bars */}
                  <Bar dataKey="totalIncome" name="Ingresos" fill="#6366f1" opacity={0.65} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="totalExpense" name="Gastos" fill="#f43f5e" opacity={0.65} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  {/* Projected Liquid Balance Area Curve */}
                  <Area
                    type="monotone"
                    dataKey="closingBalance"
                    name="Saldo Acumulado"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#balanceGradient)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Alert Banner based on forecast status */}
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
            {minProjectedBalance < 0 ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <strong className="font-bold block">Alerta de Déficit de Tesorería Proyectado:</strong>
                  <span>
                    El saldo proyectado cae por debajo de cero en{' '}
                    <strong>{monthWithLowestBalance?.monthFullLabel}</strong> ({formatMoney(minProjectedBalance, state.currency)}).
                    Se recomienda posponer gastos no esenciales o crear un fondo preventivo.
                  </span>
                </div>
              </div>
            ) : minProjectedBalance < safetyThreshold ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong className="font-bold block">Alerta de Margen Ajustado:</strong>
                  <span>
                    La liquidez caerá cerca del colchón mínimo de seguridad en{' '}
                    <strong>{monthWithLowestBalance?.monthFullLabel}</strong> ({formatMoney(minProjectedBalance, state.currency)}).
                    Conviene monitorear los gastos variables durante ese mes.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong className="font-bold block">Liquidez Saludable Proyectada:</strong>
                  <span>
                    Tu familia mantendrá un colchón financiero sólido en todo el horizonte de {horizonMonths} meses,
                    cerrando con un estimado de <strong>{formatMoney(endProjectedBalance, state.currency)}</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: What-If Simulator & Extraordinary Events */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Simulador "¿Qué Pasaría Si...?"
              </h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              Pruebas de Estrés
            </span>
          </div>

          {/* Sliders: Inflation / Variable Adjustment */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Ajuste de Gastos Variables:
                </label>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {variableExpenseAdjustmentPct > 0 ? `+${variableExpenseAdjustmentPct}%` : `${variableExpenseAdjustmentPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={variableExpenseAdjustmentPct}
                onChange={e => setVariableExpenseAdjustmentPct(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>-30% (Ahorro extremo)</span>
                <span>Base ({formatMoney(baseVariableExpense, state.currency)})</span>
                <span>+50% (Gastos altos)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Colchón de Imprevistos:
                </label>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  +{contingencyBufferPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="5"
                value={contingencyBufferPct}
                onChange={e => setContingencyBufferPct(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>0% (Sin colchón)</span>
                <span>10% (Recomendado)</span>
                <span>25% (Máxima prudencia)</span>
              </div>
            </div>
          </div>

          {/* Extraordinary Scheduled Events Section */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Eventos Extraordinarios ({scheduledEvents.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowEventForm(!showEventForm)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Evento</span>
              </button>
            </div>

            {/* Event Form */}
            {showEventForm && (
              <form
                onSubmit={handleAddEvent}
                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2 text-xs animate-in fade-in"
              >
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Descripción del evento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Matrícula escolar, Seguro anual, Bono..."
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Monto ({state.currency})
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="0.00"
                      value={newEventAmount}
                      onChange={e => setNewEventAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Tipo
                    </label>
                    <select
                      value={newEventType}
                      onChange={e => setNewEventType(e.target.value as 'expense' | 'income')}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    >
                      <option value="expense">Gasto extraordinario (-)</option>
                      <option value="income">Ingreso extraordinario (+)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                    ¿En qué mes ocurrirá?
                  </label>
                  <select
                    value={newEventMonth}
                    onChange={e => setNewEventMonth(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    {forecastTimeline.map(m => (
                      <option key={m.monthOffset} value={m.monthOffset}>
                        {m.monthFullLabel} (Mes {m.monthOffset})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEventForm(false)}
                    className="px-2.5 py-1 text-stone-500 hover:text-stone-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {/* List of Scheduled Events */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {scheduledEvents.length === 0 ? (
                <div className="text-center py-4 text-xs text-stone-400">
                  No hay eventos extraordinarios configurados. Añade uno para simular su impacto en la liquidez.
                </div>
              ) : (
                scheduledEvents.map(evt => {
                  const targetMonthData = forecastTimeline.find(m => m.monthOffset === evt.monthOffset);
                  return (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                        evt.isActive
                          ? 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700'
                          : 'bg-stone-100/50 dark:bg-stone-900/50 border-dashed border-stone-200 dark:border-stone-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={evt.isActive}
                          onChange={() => handleToggleEvent(evt.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className={`font-semibold block truncate ${evt.isActive ? 'text-stone-900 dark:text-stone-100' : 'line-through text-stone-400'}`}>
                            {evt.name}
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                            {targetMonthData ? targetMonthData.monthLabel : `Mes +${evt.monthOffset}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-bold text-xs ${
                            evt.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {evt.type === 'income' ? '+' : '-'}
                          {formatMoney(evt.amount, state.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Month-by-Month Detailed Forecast Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Desglose Cronológico de Tesorería ({horizonMonths} Meses)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Evolución detallada de saldo inicial, ingresos totales, egresos fijos y saldo final de cada período.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Saludable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Ajustado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Déficit
            </span>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-semibold">
                <th className="py-2.5 px-3">Mes Proyectado</th>
                <th className="py-2.5 px-3 text-right">Saldo Apertura</th>
                <th className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">Ingresos Totales</th>
                <th className="py-2.5 px-3 text-right text-stone-600 dark:text-stone-400">Gastos Fijos</th>
                <th className="py-2.5 px-3 text-right text-stone-600 dark:text-stone-400">Variables + Extra</th>
                <th className="py-2.5 px-3 text-right">Flujo Neto</th>
                <th className="py-2.5 px-3 text-right font-bold">Saldo al Cierre</th>
                <th className="py-2.5 px-3 text-center">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {forecastTimeline.map(month => {
                const isPositive = month.netMonthlyFlow >= 0;
                return (
                  <tr
                    key={month.monthOffset}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition"
                  >
                    <td className="py-3 px-3 font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      <div>
                        <span>{month.monthFullLabel}</span>
                        {month.events.length > 0 && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                            ★ {month.events.length} {month.events.length === 1 ? 'evento extra' : 'eventos extras'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-600 dark:text-stone-400">
                      {formatMoney(month.openingBalance, state.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(month.totalIncome, state.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-500 dark:text-stone-400">
                      -{formatMoney(month.recurringExpense, state.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-500 dark:text-stone-400">
                      -{formatMoney(month.variableExpense + month.extraExpense, state.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {isPositive ? '+' : ''}{formatMoney(month.netMonthlyFlow, state.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold whitespace-nowrap">
                      <span
                        className={
                          month.closingBalance < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : month.closingBalance < safetyThreshold
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-stone-900 dark:text-stone-100'
                        }
                      >
                        {formatMoney(month.closingBalance, state.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          month.status === 'healthy'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : month.status === 'tight'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {month.status === 'healthy' ? 'Saludable' : month.status === 'tight' ? 'Ajustado' : 'Sobregiro'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Treasury Recommendations Card */}
      <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-stone-900 dark:text-stone-100">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Estrategia de Liquidez Recomendada para la Familia</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              1. Ventana Óptima de Compras
            </span>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              El mes con mayor holgura de tesorería proyectada es{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {forecastTimeline.reduce((max, curr) => (curr.closingBalance > max.closingBalance ? curr : max), forecastTimeline[0])?.monthFullLabel}
              </strong>. Es la fecha idónea para programar inversiones domésticas o compras anuales sin recurrir a deuda.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              2. Punto de Alerta Preventiva
            </span>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              En{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {monthWithLowestBalance?.monthFullLabel}
              </strong>{' '}
              la tesorería alcanzará su punto más bajo ({formatMoney(minProjectedBalance, state.currency)}).
              Se aconseja congelar compras discrecionales el mes inmediatamente anterior.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              3. Potencial de Metas de Ahorro
            </span>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
              Se proyecta una acumulación neta de{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">
                {formatMoney(Math.max(0, totalCumulativeSavings), state.currency)}
              </strong>{' '}
              durante los próximos {horizonMonths} meses. Considera automatizar aportes mensuales a tus metas activas de ahorro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
