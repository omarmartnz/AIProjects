import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Landmark,
  Plus,
  ArrowRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  Flame,
  SlidersHorizontal,
  EyeOff,
  LayoutGrid,
  Scale,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { FamilyState, Transaction } from '../types';
import { formatMoney, formatNumber } from '../utils/currencies';
import { DashboardCustomizerModal } from './DashboardCustomizerModal';
import {
  DASHBOARD_WIDGETS,
  loadSavedWidgetVisibility,
  saveWidgetVisibility,
  loadSavedWidgetOrder,
  saveWidgetOrder,
  getDefaultWidgetOrder,
} from './dashboardWidgets';
import { LoansOverviewWidget } from './dashboard/LoansOverviewWidget';
import { NetWorthWidget } from './dashboard/NetWorthWidget';
import { AntExpensesWidget } from './dashboard/AntExpensesWidget';
import { MemberEquityWidget } from './dashboard/MemberEquityWidget';

interface DashboardViewProps {
  state: FamilyState;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onNavigateToBudgets: () => void;
  onNavigateToTransactions: () => void;
  onOpenNewTransaction?: () => void;
  onNavigateToCashFlow?: () => void;
  onNavigateToDebts?: () => void;
  onNavigateToBanks?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  selectedMonth,
  setSelectedMonth,
  onNavigateToBudgets,
  onNavigateToTransactions,
  onOpenNewTransaction,
  onNavigateToCashFlow,
  onNavigateToDebts,
  onNavigateToBanks,
}) => {
  // Widget customization and ordering state
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() =>
    loadSavedWidgetVisibility()
  );
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() =>
    loadSavedWidgetOrder()
  );
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<'visibility' | 'order'>('visibility');
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Drag and Drop state on the dashboard
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  const handleUpdateVisibility = (updated: Record<string, boolean>) => {
    setWidgetVisibility(updated);
    saveWidgetVisibility(updated);
  };

  const handleUpdateOrder = (newOrder: string[]) => {
    setWidgetOrder(newOrder);
    saveWidgetOrder(newOrder);
  };

  const hideWidget = (id: string) => {
    handleUpdateVisibility({
      ...widgetVisibility,
      [id]: false,
    });
  };

  // Active widgets list in the user's customized order
  const activeOrderedWidgets = useMemo(() => {
    return widgetOrder.filter(id => widgetVisibility[id] !== false);
  }, [widgetOrder, widgetVisibility]);

  const activeWidgetsCount = activeOrderedWidgets.length;

  // Move an active widget up one visible slot
  const moveActiveWidgetUp = (id: string) => {
    const activeIdx = activeOrderedWidgets.indexOf(id);
    if (activeIdx <= 0) return;
    const prevId = activeOrderedWidgets[activeIdx - 1];

    const newOrder = [...widgetOrder];
    const idxA = newOrder.indexOf(id);
    const idxB = newOrder.indexOf(prevId);
    if (idxA !== -1 && idxB !== -1) {
      newOrder[idxA] = prevId;
      newOrder[idxB] = id;
      handleUpdateOrder(newOrder);
    }
  };

  // Move an active widget down one visible slot
  const moveActiveWidgetDown = (id: string) => {
    const activeIdx = activeOrderedWidgets.indexOf(id);
    if (activeIdx < 0 || activeIdx >= activeOrderedWidgets.length - 1) return;
    const nextId = activeOrderedWidgets[activeIdx + 1];

    const newOrder = [...widgetOrder];
    const idxA = newOrder.indexOf(id);
    const idxB = newOrder.indexOf(nextId);
    if (idxA !== -1 && idxB !== -1) {
      newOrder[idxA] = nextId;
      newOrder[idxB] = id;
      handleUpdateOrder(newOrder);
    }
  };

  // Dashboard Drag and Drop handlers
  const handleDashboardDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDashboardDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedWidgetId === null || draggedWidgetId === id) return;
    setDragOverWidgetId(id);
  };

  const handleDashboardDragLeave = () => {
    setDragOverWidgetId(null);
  };

  const handleDashboardDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === dropTargetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    const newOrder = [...widgetOrder];
    const dragIdx = newOrder.indexOf(draggedWidgetId);
    const dropIdx = newOrder.indexOf(dropTargetId);

    if (dragIdx !== -1 && dropIdx !== -1) {
      const [removed] = newOrder.splice(dragIdx, 1);
      newOrder.splice(dropIdx, 0, removed);
      handleUpdateOrder(newOrder);
    }

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // 1. Current Month Transactions & Totals
  const monthTransactions = useMemo(() => {
    return state.transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [state.transactions, selectedMonth]);

  const totalIncome = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const totalExpense = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const globalSpentPct =
    state.globalMonthlyBudget > 0 ? (totalExpense / state.globalMonthlyBudget) * 100 : 0;

  // Loan/Préstamo specific metrics
  const loanExpense = useMemo(() => {
    return monthTransactions
      .filter(
        t =>
          t.type === 'expense' &&
          (t.category.toLowerCase().includes('prestamo') ||
            t.category.toLowerCase().includes('préstamo'))
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // 2. Data for Chart 1: Last 6 Months Historical Evolution
  const historicalData = useMemo(() => {
    const months: string[] = [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const currentYear = parseInt(yearStr, 10);
    const currentMonthNum = parseInt(monthStr, 10);

    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonthNum - i;
      let targetYear = currentYear;
      if (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const mStr = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;
      months.push(`${targetYear}-${mStr}`);
    }

    return months.map(m => {
      const txs = state.transactions.filter(t => t.date.startsWith(m));
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const net = inc - exp;

      const dateObj = new Date(`${m}-02T00:00:00`);
      const label = dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

      return {
        month: m,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        Ingresos: inc,
        Gastos: exp,
        Ahorro: net,
      };
    });
  }, [state.transactions, selectedMonth]);

  // 3. Data for Chart 2: Category Breakdown Donut Chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Otros';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    const colors = [
      '#6366f1',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
      '#8b5cf6',
      '#14b8a6',
      '#f97316',
      '#84cc16',
      '#64748b',
    ];

    return Object.entries(map)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // 4. Data for Chart 3: Cumulative Daily Spending vs Ideal Budget Pace
  const dailyPaceData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month;
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const dailyExpenses: number[] = Array(daysInMonth).fill(0);
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = parseInt(t.date.split('-')[2], 10);
        if (day >= 1 && day <= daysInMonth) {
          dailyExpenses[day - 1] += t.amount;
        }
      });

    let cumulative = 0;
    const result = [];
    const dailyBudgetRate = state.globalMonthlyBudget > 0 ? state.globalMonthlyBudget / daysInMonth : 0;

    for (let d = 1; d <= daysInMonth; d++) {
      if (d <= currentDay) {
        cumulative += dailyExpenses[d - 1];
        result.push({
          day: `${d}`,
          GastoAcumulado: cumulative,
          RitmoPresupuesto: state.globalMonthlyBudget > 0 ? Math.round(dailyBudgetRate * d) : null,
        });
      } else {
        result.push({
          day: `${d}`,
          GastoAcumulado: null,
          RitmoPresupuesto: state.globalMonthlyBudget > 0 ? Math.round(dailyBudgetRate * d) : null,
        });
      }
    }
    return result;
  }, [selectedMonth, monthTransactions, state.globalMonthlyBudget]);

  // 5. Data for Chart 4: 50/30/20 Rule Breakdown
  const rule503020Data = useMemo(() => {
    let needs = 0;
    let wants = 0;
    let savings = Math.max(0, netSavings);

    const needsKeywords = [
      'casa', 'alquiler', 'hipoteca', 'super', 'comida', 'salud', 'medico',
      'medicina', 'servicios', 'luz', 'agua', 'gas', 'prestamo', 'préstamo',
      'educacion', 'educación', 'colegio', 'transporte', 'gasolina', 'seguro'
    ];

    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const isNeed = needsKeywords.some(kw => cat.includes(kw) || desc.includes(kw));
        if (isNeed) {
          needs += t.amount;
        } else {
          wants += t.amount;
        }
      });

    const totalCalculated = needs + wants + savings;
    const base = totalCalculated > 0 ? totalCalculated : 1;

    return [
      {
        name: 'Necesidades (50%)',
        Ideal: 50,
        Real: Math.round((needs / base) * 100),
        monto: needs,
      },
      {
        name: 'Deseos (30%)',
        Ideal: 30,
        Real: Math.round((wants / base) * 100),
        monto: wants,
      },
      {
        name: 'Ahorro (20%)',
        Ideal: 20,
        Real: Math.round((savings / base) * 100),
        monto: savings,
      },
    ];
  }, [monthTransactions, netSavings]);

  // 6. Data for Chart 5: Member Spending and Income Breakdown
  const memberExpensesData = useMemo(() => {
    return state.members.map(member => {
      const mExpenses = monthTransactions
        .filter(t => t.memberId === member.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const mIncome = monthTransactions
        .filter(t => t.memberId === member.id && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: member.name,
        gastos: mExpenses,
        ingresos: mIncome,
      };
    });
  }, [state.members, monthTransactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xl text-xs space-y-1">
          <p className="font-bold text-stone-900 dark:text-stone-100">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {entry.value !== null ? formatMoney(entry.value, state.currency) : '-'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Reusable header controls for standard widget cards
  const renderWidgetHeaderControls = (widgetId: string, isFirst: boolean, isLast: boolean, positionIndex: number) => {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {isReorderMode && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mr-1">
            Posición #{positionIndex + 1}
          </span>
        )}

        <div
          className="cursor-grab active:cursor-grabbing p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Arrastra para reubicar este bloque"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <button
          type="button"
          onClick={() => moveActiveWidgetUp(widgetId)}
          disabled={isFirst}
          className="p-1.5 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
          title="Mover arriba"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => moveActiveWidgetDown(widgetId)}
          disabled={isLast}
          className="p-1.5 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
          title="Mover abajo"
        >
          <ArrowDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => hideWidget(widgetId)}
          className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Ocultar esta gráfica del dashboard"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Render individual widget content based on its unique ID
  const renderWidgetContent = (widgetId: string, index: number, isFirst: boolean, isLast: boolean) => {
    switch (widgetId) {
      case 'kpi_cards':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Métricas Clave del Mes
                </span>
                {isReorderMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Posición #{index + 1}
                  </span>
                )}
              </div>
              {renderWidgetHeaderControls('kpi_cards', isFirst, isLast, index)}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Ingresos */}
              <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                    Ingresos del Mes
                  </span>
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
                  {monthTransactions.filter(t => t.type === 'income').length} aportes registrados
                </p>
              </div>

              {/* Gastos Realizados */}
              <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                    Gastos del Mes
                  </span>
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
                  {state.globalMonthlyBudget > 0 ? `${formatNumber(globalSpentPct, 1)}% consumido` : 'Sin límite global'}
                </p>
              </div>

              {/* Tasa de Ahorro */}
              <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                    Tasa de Ahorro
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <span className={`text-base sm:text-2xl font-bold block truncate ${netSavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatNumber(savingsRate, 1)}%
                  </span>
                </div>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
                  {netSavings >= 0 ? `+${formatMoney(netSavings, state.currency)} netos` : `${formatMoney(netSavings, state.currency)} déficit`}
                </p>
              </div>

              {/* Categoría Préstamos / Deudas */}
              <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                    Pagos de Préstamo
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="mt-1.5 sm:mt-2">
                  <span className="text-base sm:text-2xl font-bold text-stone-900 dark:text-stone-100 block truncate">
                    {formatMoney(loanExpense, state.currency)}
                  </span>
                </div>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate">
                  Compromisos crediticios del mes
                </p>
              </div>
            </div>
          </div>
        );

      case 'loans_overview':
        return (
          <LoansOverviewWidget
            state={state}
            selectedMonth={selectedMonth}
            onHideWidget={() => hideWidget('loans_overview')}
            onNavigateToDebts={onNavigateToDebts}
            onMoveUp={() => moveActiveWidgetUp('loans_overview')}
            onMoveDown={() => moveActiveWidgetDown('loans_overview')}
            isFirst={isFirst}
            isLast={isLast}
          />
        );

      case 'net_worth':
        return (
          <NetWorthWidget
            state={state}
            onHideWidget={() => hideWidget('net_worth')}
            onMoveUp={() => moveActiveWidgetUp('net_worth')}
            onMoveDown={() => moveActiveWidgetDown('net_worth')}
            isFirst={isFirst}
            isLast={isLast}
          />
        );

      case 'historical_evolution':
        return (
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Evolución Semestral (Ingresos vs Gastos)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Últimos 6 meses
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Tendencia histórica mensual comparada de entradas, salidas y ahorro neto
                  </p>
                </div>
              </div>
              {renderWidgetHeaderControls('historical_evolution', isFirst, isLast, index)}
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="Ahorro" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'category_distribution':
        return (
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Distribución por Categoría</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {categoryData.length} categorías
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Desglose proporcional de gastos del mes seleccionado
                  </p>
                </div>
              </div>
              {renderWidgetHeaderControls('category_distribution', isFirst, isLast, index)}
            </div>

            {categoryData.length === 0 ? (
              <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center p-4">
                <Layers className="w-10 h-10 text-stone-300 dark:text-stone-700 mb-2" />
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  No hay gastos registrados en este período.
                </p>
                {onOpenNewTransaction && (
                  <button
                    onClick={onOpenNewTransaction}
                    className="mt-3 text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Registrar primer gasto</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="h-44 sm:h-full w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {categoryData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend List */}
                <div className="w-full sm:w-1/2 max-h-40 sm:max-h-60 overflow-y-auto no-scrollbar space-y-1.5 pr-2">
                  {categoryData.map((cat, idx) => {
                    const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate text-stone-700 dark:text-stone-300 font-medium">
                            {cat.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {formatMoney(cat.value, state.currency)}
                          </span>
                          <span className="text-[10px] text-stone-400 block">{formatNumber(pct, 1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'daily_pace':
        return (
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Ritmo de Gasto Diario Acumulado</span>
                    {state.globalMonthlyBudget > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Tope: {formatMoney(state.globalMonthlyBudget, state.currency)}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Velocidad de gasto acumulado día por día frente al límite sugerido
                  </p>
                </div>
              </div>
              {renderWidgetHeaderControls('daily_pace', isFirst, isLast, index)}
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPaceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDailySpendDynamic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="GastoAcumulado"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDailySpendDynamic)"
                    name="Gasto Acumulado"
                  />
                  {state.globalMonthlyBudget > 0 && (
                    <Line
                      type="linear"
                      dataKey="RitmoPresupuesto"
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                      name="Tope Ideal Diario"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'rule_503020':
        return (
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Estructura 50/30/20 (Ideal vs Real)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Regla Financiera
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    50% Necesidades básicas • 30% Deseos y ocio • 20% Ahorro e inversión
                  </p>
                </div>
              </div>
              {renderWidgetHeaderControls('rule_503020', isFirst, isLast, index)}
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rule503020Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% (${formatMoney(item.payload.monto || 0, state.currency)})`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Ideal" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={28} name="% Meta Ideal" />
                  <Bar dataKey="Real" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} name="% Real Consumido" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'ant_expenses':
        return (
          <AntExpensesWidget
            state={state}
            selectedMonth={selectedMonth}
            onHideWidget={() => hideWidget('ant_expenses')}
            onNavigateToTransactions={onNavigateToTransactions}
            onMoveUp={() => moveActiveWidgetUp('ant_expenses')}
            onMoveDown={() => moveActiveWidgetDown('ant_expenses')}
            isFirst={isFirst}
            isLast={isLast}
          />
        );

      case 'member_equity':
        return (
          <MemberEquityWidget
            state={state}
            selectedMonth={selectedMonth}
            onHideWidget={() => hideWidget('member_equity')}
            onMoveUp={() => moveActiveWidgetUp('member_equity')}
            onMoveDown={() => moveActiveWidgetDown('member_equity')}
            isFirst={isFirst}
            isLast={isLast}
          />
        );

      case 'member_expenses':
        return (
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Aportes y Gastos por Miembro del Hogar</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {state.members.length} integrantes
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Distribución de ingresos generados y gastos realizados por cada persona
                  </p>
                </div>
              </div>
              {renderWidgetHeaderControls('member_expenses', isFirst, isLast, index)}
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberExpensesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} name="Ingresos" />
                  <Bar dataKey="gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'quick_access':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Accesos Rápidos del Hogar
                </span>
                {isReorderMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Posición #{index + 1}
                  </span>
                )}
              </div>
              {renderWidgetHeaderControls('quick_access', isFirst, isLast, index)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Presupuestos
                  </span>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                    Límites por categoría
                  </p>
                </div>
                <button
                  onClick={onNavigateToBudgets}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 shrink-0"
                >
                  <span>Ir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Movimientos
                  </span>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    Historial y filtros
                  </p>
                </div>
                <button
                  onClick={onNavigateToTransactions}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 shrink-0"
                >
                  <span>Ver</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {onNavigateToCashFlow && (
                <div className="bg-gradient-to-br from-stone-900 to-emerald-950 p-4 rounded-xl border border-emerald-800/40 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Flujo de Caja
                    </span>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Proyección futura
                    </p>
                  </div>
                  <button
                    onClick={onNavigateToCashFlow}
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Ver</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {onNavigateToDebts && (
                <div className="bg-gradient-to-br from-stone-900 to-amber-950 p-4 rounded-xl border border-amber-800/40 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Plan de Deudas
                    </span>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Bola de nieve
                    </p>
                  </div>
                  <button
                    onClick={onNavigateToDebts}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Ver</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {onNavigateToBanks && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4 rounded-xl border border-indigo-700/40 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                      Cuentas Bancarias
                    </span>
                    <p className="text-xs text-stone-300 mt-0.5">
                      {state.bankAccounts.length} {state.bankAccounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
                    </p>
                  </div>
                  <button
                    onClick={onNavigateToBanks}
                    className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Gestionar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Bar: Month Selector & Dashboard Customizer & Reorder Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300">
            Período Activo:
          </span>
          <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 uppercase">
            {new Date(`${selectedMonth}-02T00:00:00`).toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold bg-transparent text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Reorganize/Reorder Mode Toggle Button */}
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition whitespace-nowrap shrink-0 active:scale-[0.98] ${
              isReorderMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
            title={isReorderMode ? 'Terminar modo de reordenación' : 'Activar modo de reubicación rápida de gráficas'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{isReorderMode ? 'Terminar Reubicación' : 'Reubicar Gráficas'}</span>
          </button>

          {/* Customizer Button */}
          <button
            onClick={() => {
              setCustomizerTab('visibility');
              setIsCustomizerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition whitespace-nowrap shrink-0 active:scale-[0.98]"
            title="Quitar o poner las gráficas y cambiar su orden"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Personalizar Gráficos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
              {activeWidgetsCount}
            </span>
          </button>

          <button
            onClick={onNavigateToBudgets}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition whitespace-nowrap shrink-0"
          >
            <span>Presupuestos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onOpenNewTransaction && (
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Movimiento</span>
            </button>
          )}
        </div>
      </div>

      {/* Reorder Mode Banner */}
      {isReorderMode && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-100">
                Modo de Reubicación de Gráficas Activo
              </h4>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                Arrastra cualquier bloque por su tirador o pulsa las flechas ▲ y ▼ en su cabecera para moverlo de lugar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCustomizerTab('order');
                setIsCustomizerOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
            >
              Ver Lista de Prioridades
            </button>
            <button
              onClick={() => handleUpdateOrder(getDefaultWidgetOrder())}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              title="Restablecer el orden original predeterminado"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Orden Inicial</span>
            </button>
            <button
              onClick={() => setIsReorderMode(false)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 shadow-xs transition"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* When all widgets are hidden, show friendly banner */}
      {activeWidgetsCount === 0 && (
        <div className="bg-stone-50 dark:bg-stone-900/60 p-8 sm:p-12 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
          <LayoutGrid className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm sm:text-base">
            Has ocultado todos los módulos del Dashboard
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Puedes seleccionar qué gráficas, métricas y secciones deseas visualizar en cualquier momento abriendo la configuración.
          </p>
          <button
            onClick={() => {
              setCustomizerTab('visibility');
              setIsCustomizerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Elegir Gráficos a Mostrar</span>
          </button>
        </div>
      )}

      {/* Dynamically Rendered Widgets in User's Customized Order */}
      <div className="space-y-4 sm:space-y-6">
        {activeOrderedWidgets.map((widgetId, index) => {
          const isFirst = index === 0;
          const isLast = index === activeOrderedWidgets.length - 1;
          const isDragging = draggedWidgetId === widgetId;
          const isOver = dragOverWidgetId === widgetId;

          return (
            <div
              key={widgetId}
              draggable
              onDragStart={e => handleDashboardDragStart(e, widgetId)}
              onDragOver={e => handleDashboardDragOver(e, widgetId)}
              onDragLeave={handleDashboardDragLeave}
              onDrop={e => handleDashboardDrop(e, widgetId)}
              className={`transition-all duration-200 relative ${
                isDragging ? 'opacity-30 scale-[0.99]' : ''
              } ${
                isOver
                  ? 'ring-2 ring-indigo-500 ring-offset-4 dark:ring-offset-stone-950 rounded-2xl'
                  : ''
              } ${
                isReorderMode
                  ? 'ring-1 ring-dashed ring-indigo-300 dark:ring-indigo-800/80 rounded-2xl p-1 bg-indigo-50/15 dark:bg-indigo-950/10'
                  : ''
              }`}
            >
              {renderWidgetContent(widgetId, index, isFirst, isLast)}
            </div>
          );
        })}
      </div>

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        visibility={widgetVisibility}
        onChangeVisibility={handleUpdateVisibility}
        order={widgetOrder}
        onChangeOrder={handleUpdateOrder}
        initialTab={customizerTab}
      />
    </div>
  );
};
