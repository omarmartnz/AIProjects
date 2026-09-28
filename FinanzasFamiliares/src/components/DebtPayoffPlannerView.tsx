import React, { useState, useMemo } from 'react';
import {
  Flame,
  Snowflake,
  TrendingDown,
  ShieldAlert,
  CreditCard,
  Home,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
  Sliders,
  RefreshCw,
  Edit2,
  ChevronDown,
  ChevronUp,
  Landmark,
  User,
  Info,
  Layers,
  Award,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { FamilyState, BankAccount, BankProductType } from '../types';
import { formatMoney } from '../utils/currencies';
import { getAccountNextDueDate } from '../utils/bankUtils';

interface DebtPayoffPlannerViewProps {
  state: FamilyState;
  onUpdateBankAccount: (id: string, bank: Partial<BankAccount>) => void;
  onAddBankAccount?: (bank: Omit<BankAccount, 'id' | 'lastSynced'>) => void;
  onNavigateToBanks: () => void;
  onOpenNewTransaction?: () => void;
  onOpenHelp?: () => void;
}

export type PayoffStrategy = 'avalanche' | 'snowball';

interface DebtItem {
  id: string;
  name: string;
  bankName: string;
  accountType: BankProductType;
  color: string;
  currency: string;
  currencySymbol: string;
  balance: number; // positive outstanding debt amount
  interestRate: number; // annual APR %
  hasConfiguredRate: boolean;
  minimumPayment: number; // monthly minimum payment
  hasConfiguredMin: boolean;
  dueDay: number;
  dueDate?: string;
  holderMemberId?: string;
  accountNumberMasked?: string;
}

interface SimulationResult {
  strategy: PayoffStrategy;
  totalMonths: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalPaid: number;
  firstDebtPaidMonth: number;
  firstDebtPaidName: string;
  individualDebtPayoff: {
    debtId: string;
    paidInMonth: number;
    payoffDate: string;
    totalInterestPaid: number;
  }[];
  monthlyTimeline: {
    monthIndex: number;
    monthLabel: string;
    totalBalance: number;
    totalInterestMonth: number;
    totalPrincipalMonth: number;
    totalPaymentMonth: number;
    activePriorityName: string;
  }[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const DebtPayoffPlannerView: React.FC<DebtPayoffPlannerViewProps> = ({
  state,
  onUpdateBankAccount,
  onAddBankAccount,
  onNavigateToBanks,
  onOpenNewTransaction,
  onOpenHelp,
}) => {
  // Strategy toggle: 'avalanche' or 'snowball'
  const [activeStrategy, setActiveStrategy] = useState<PayoffStrategy>('avalanche');

  // Monthly accelerator amount (extra payment applied to the priority debt)
  const [acceleratorAmount, setAcceleratorAmount] = useState<number>(150);

  // Month-by-month table view toggle
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(false);

  // Editing debt parameters modal
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [editInterestRate, setEditInterestRate] = useState<string>('');
  const [editMinPayment, setEditMinPayment] = useState<string>('');
  const [editDueDay, setEditDueDay] = useState<string>('');
  const [editBalance, setEditBalance] = useState<string>('');

  // 1. Extract and normalize debts from state.bankAccounts
  const normalizedDebts: DebtItem[] = useMemo(() => {
    if (!state.bankAccounts) return [];

    return state.bankAccounts
      .filter(acc => acc.accountType === 'credit' || acc.accountType === 'loan')
      .map(acc => {
        // Outstanding balance: if entered as negative (e.g. -2500) or positive (e.g. 2500 debt)
        const rawBal = acc.balance;
        const debtBal = Math.abs(rawBal);

        // Annual interest rate: use configured rate or smart defaults
        const hasRate = acc.interestRate !== undefined && acc.interestRate > 0;
        const rate = hasRate
          ? acc.interestRate!
          : acc.accountType === 'credit'
          ? 26.0
          : 12.5;

        // Minimum payment: use configured payment or estimated ~3.5%
        const hasMin = acc.minimumPayment !== undefined && acc.minimumPayment > 0;
        const minPay = hasMin
          ? acc.minimumPayment!
          : Math.max(30, Math.round(debtBal * 0.035));

        return {
          id: acc.id,
          name: acc.name,
          bankName: acc.bankName,
          accountType: acc.accountType,
          color: acc.color || (acc.accountType === 'credit' ? '#9333ea' : '#d97706'),
          currency: acc.currency || state.currencyCode || 'DOP',
          currencySymbol: acc.currencySymbol || state.currency,
          balance: debtBal,
          interestRate: rate,
          hasConfiguredRate: hasRate,
          minimumPayment: minPay,
          hasConfiguredMin: hasMin,
          dueDay: acc.dueDay || 15,
          dueDate: acc.dueDate,
          holderMemberId: acc.holderMemberId,
          accountNumberMasked: acc.accountNumberMasked,
        };
      })
      .filter(d => d.balance > 0);
  }, [state.bankAccounts, state.currency, state.currencyCode]);

  // Total current debt balance
  const totalDebtBalance = useMemo(() => {
    return normalizedDebts.reduce((sum, d) => sum + d.balance, 0);
  }, [normalizedDebts]);

  // Total baseline minimum payments
  const totalBaseMinimums = useMemo(() => {
    return normalizedDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  }, [normalizedDebts]);

  // 2. Mathematical Simulation Engine
  const runSimulation = (
    debtsList: DebtItem[],
    strategy: PayoffStrategy,
    extraMonthly: number
  ): SimulationResult => {
    if (debtsList.length === 0) {
      return {
        strategy,
        totalMonths: 0,
        debtFreeDate: 'Sin deudas',
        totalInterestPaid: 0,
        totalPaid: 0,
        firstDebtPaidMonth: 0,
        firstDebtPaidName: '-',
        individualDebtPayoff: [],
        monthlyTimeline: [],
      };
    }

    // Clone debts for month-by-month tracking
    let currentDebts = debtsList.map(d => ({
      ...d,
      currentBalance: d.balance,
      initialBalance: d.balance,
      totalInterestPaid: 0,
      paidInMonth: 0,
      isPaid: false,
    }));

    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();

    const monthlyTimeline: SimulationResult['monthlyTimeline'] = [];
    let totalAccumulatedInterest = 0;
    let totalAccumulatedPaid = 0;
    let firstPaidMonth = 0;
    let firstPaidName = '';

    const MAX_MONTHS = 360; // 30 years safety cap
    let month = 0;

    while (month < MAX_MONTHS && currentDebts.some(d => !d.isPaid)) {
      month++;
      const targetDate = new Date(startYear, startMonth + month, 1);
      const mLabel = `${MONTH_SHORT[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

      // 1. Sort active debts by strategy:
      // Snowball: lowest current balance first
      // Avalanche: highest annual interest rate first
      const activeDebts = currentDebts.filter(d => !d.isPaid);
      if (activeDebts.length === 0) break;

      activeDebts.sort((a, b) => {
        if (strategy === 'snowball') {
          return a.currentBalance - b.currentBalance;
        } else {
          return b.interestRate - a.interestRate;
        }
      });

      const priorityDebt = activeDebts[0];

      // 2. Accrue monthly interest on each active debt
      let monthTotalInterest = 0;
      activeDebts.forEach(d => {
        const monthlyRate = (d.interestRate / 100) / 12;
        const interest = d.currentBalance * monthlyRate;
        d.currentBalance += interest;
        d.totalInterestPaid += interest;
        monthTotalInterest += interest;
      });
      totalAccumulatedInterest += monthTotalInterest;

      // 3. Pool calculation:
      // Minimum payments for all original debts + extra accelerator
      // In snowball/avalanche, once a debt is paid, its minimum payment remains in the pool
      let monthTotalPaid = 0;
      let availableExtra = extraMonthly;

      // Apply minimums first to all active debts
      activeDebts.forEach(d => {
        const minDue = Math.min(d.currentBalance, d.minimumPayment);
        d.currentBalance -= minDue;
        monthTotalPaid += minDue;
        if (d.currentBalance <= 0.01) {
          d.currentBalance = 0;
          d.isPaid = true;
          d.paidInMonth = month;
          if (!firstPaidName) {
            firstPaidMonth = month;
            firstPaidName = d.name;
          }
        }
      });

      // Add minimum payments of already liquidated debts into the extra accelerator pool!
      const liquidatedDebts = currentDebts.filter(d => d.isPaid && d.paidInMonth < month);
      liquidatedDebts.forEach(d => {
        availableExtra += d.minimumPayment;
      });

      // 4. Apply all available extra pool to the highest priority active debt!
      if (priorityDebt && !priorityDebt.isPaid && availableExtra > 0) {
        const extraToApply = Math.min(priorityDebt.currentBalance, availableExtra);
        priorityDebt.currentBalance -= extraToApply;
        monthTotalPaid += extraToApply;

        if (priorityDebt.currentBalance <= 0.01) {
          priorityDebt.currentBalance = 0;
          priorityDebt.isPaid = true;
          priorityDebt.paidInMonth = month;
          if (!firstPaidName) {
            firstPaidMonth = month;
            firstPaidName = priorityDebt.name;
          }

          // If extra remained and there is another active debt, cascade it
          const leftover = availableExtra - extraToApply;
          const nextActive = currentDebts.filter(d => !d.isPaid).sort((a, b) =>
            strategy === 'snowball' ? a.currentBalance - b.currentBalance : b.interestRate - a.interestRate
          );
          if (nextActive.length > 0 && leftover > 0) {
            const cascadeApply = Math.min(nextActive[0].currentBalance, leftover);
            nextActive[0].currentBalance -= cascadeApply;
            monthTotalPaid += cascadeApply;
            if (nextActive[0].currentBalance <= 0.01) {
              nextActive[0].currentBalance = 0;
              nextActive[0].isPaid = true;
              nextActive[0].paidInMonth = month;
            }
          }
        }
      }

      totalAccumulatedPaid += monthTotalPaid;
      const monthRemainingBalance = currentDebts.reduce((sum, d) => sum + d.currentBalance, 0);

      monthlyTimeline.push({
        monthIndex: month,
        monthLabel: mLabel,
        totalBalance: Math.round(monthRemainingBalance),
        totalInterestMonth: Math.round(monthTotalInterest),
        totalPrincipalMonth: Math.round(Math.max(0, monthTotalPaid - monthTotalInterest)),
        totalPaymentMonth: Math.round(monthTotalPaid),
        activePriorityName: priorityDebt ? priorityDebt.name : 'Todas liquidadas',
      });
    }

    const finishDate = new Date(startYear, startMonth + month, 1);
    const debtFreeDate = `${MONTH_NAMES[finishDate.getMonth()]} ${finishDate.getFullYear()}`;

    const individualDebtPayoff = currentDebts.map(d => {
      const dFinish = new Date(startYear, startMonth + (d.paidInMonth || month), 1);
      return {
        debtId: d.id,
        paidInMonth: d.paidInMonth || month,
        payoffDate: `${MONTH_SHORT[dFinish.getMonth()]} ${dFinish.getFullYear()}`,
        totalInterestPaid: Math.round(d.totalInterestPaid),
      };
    });

    return {
      strategy,
      totalMonths: month,
      debtFreeDate,
      totalInterestPaid: Math.round(totalAccumulatedInterest),
      totalPaid: Math.round(totalAccumulatedPaid),
      firstDebtPaidMonth: firstPaidMonth || month,
      firstDebtPaidName: firstPaidName || debtsList[0]?.name || '-',
      individualDebtPayoff,
      monthlyTimeline,
    };
  };

  // Run simulation for Avalanche, Snowball, and Minimums only (baseline)
  const avalancheSimulation = useMemo(() => {
    return runSimulation(normalizedDebts, 'avalanche', acceleratorAmount);
  }, [normalizedDebts, acceleratorAmount]);

  const snowballSimulation = useMemo(() => {
    return runSimulation(normalizedDebts, 'snowball', acceleratorAmount);
  }, [normalizedDebts, acceleratorAmount]);

  const minimumOnlySimulation = useMemo(() => {
    return runSimulation(normalizedDebts, 'avalanche', 0);
  }, [normalizedDebts]);

  // Selected simulation
  const currentSimulation = activeStrategy === 'avalanche' ? avalancheSimulation : snowballSimulation;

  // Comparison metrics
  const interestDifference = Math.round(snowballSimulation.totalInterestPaid - avalancheSimulation.totalInterestPaid);
  const monthsSavedVsMinimum = Math.max(0, minimumOnlySimulation.totalMonths - currentSimulation.totalMonths);
  const interestSavedVsMinimum = Math.max(0, minimumOnlySimulation.totalInterestPaid - currentSimulation.totalInterestPaid);

  // Sorted debts display according to active strategy
  const sortedDebtsForDisplay = useMemo(() => {
    const list = [...normalizedDebts];
    if (activeStrategy === 'snowball') {
      return list.sort((a, b) => a.balance - b.balance);
    } else {
      return list.sort((a, b) => b.interestRate - a.interestRate);
    }
  }, [normalizedDebts, activeStrategy]);

  // Consolidated Chart Data: Combine timelines up to the longest finish month
  const chartData = useMemo(() => {
    if (normalizedDebts.length === 0) return [];
    const maxMonths = Math.min(
      72, // cap chart at 6 years for visual clarity
      Math.max(avalancheSimulation.totalMonths, snowballSimulation.totalMonths, 12)
    );

    const data: {
      monthLabel: string;
      Avalancha?: number;
      BolaDeNieve?: number;
      SoloMinimos?: number;
    }[] = [];

    // Starting point
    const now = new Date();
    data.push({
      monthLabel: 'Hoy',
      Avalancha: Math.round(totalDebtBalance),
      BolaDeNieve: Math.round(totalDebtBalance),
      SoloMinimos: Math.round(totalDebtBalance),
    });

    for (let m = 1; m <= maxMonths; m++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const label = `${MONTH_SHORT[targetDate.getMonth()]} '${String(targetDate.getFullYear()).slice(-2)}`;

      const avPoint = avalancheSimulation.monthlyTimeline.find(t => t.monthIndex === m);
      const snPoint = snowballSimulation.monthlyTimeline.find(t => t.monthIndex === m);
      const minPoint = minimumOnlySimulation.monthlyTimeline.find(t => t.monthIndex === m);

      data.push({
        monthLabel: label,
        Avalancha: avPoint ? avPoint.totalBalance : 0,
        BolaDeNieve: snPoint ? snPoint.totalBalance : 0,
        SoloMinimos: minPoint ? minPoint.totalBalance : 0,
      });
    }

    return data;
  }, [normalizedDebts, totalDebtBalance, avalancheSimulation, snowballSimulation, minimumOnlySimulation]);

  // Open Edit Modal for a Debt
  const handleOpenEdit = (debt: DebtItem) => {
    setEditingDebt(debt);
    setEditInterestRate(debt.interestRate.toString());
    setEditMinPayment(debt.minimumPayment.toString());
    setEditDueDay(debt.dueDay.toString());
    setEditBalance(debt.balance.toString());
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;

    const parsedRate = parseFloat(editInterestRate);
    const parsedMin = parseFloat(editMinPayment);
    const parsedDueDay = parseInt(editDueDay, 10);
    const parsedBal = parseFloat(editBalance);

    onUpdateBankAccount(editingDebt.id, {
      ...(isNaN(parsedRate) ? {} : { interestRate: parsedRate }),
      ...(isNaN(parsedMin) ? {} : { minimumPayment: parsedMin }),
      ...(isNaN(parsedDueDay) ? {} : { dueDay: parsedDueDay }),
      ...(isNaN(parsedBal) ? {} : { balance: parsedBal }),
      lastSynced: `Modificado en Plan de Deudas`,
    });

    setEditingDebt(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-indigo-950 p-6 text-white shadow-xl border border-stone-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Estrategia de Desendeudamiento Acelerado</span>
              </div>
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium backdrop-blur-md transition shadow-xs"
                  title="Ver explicación detallada del módulo, beneficios y tips"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ayuda & Guía del Módulo</span>
                </button>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              Planificador de Deudas: Avalancha vs. Bola de Nieve
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Compara matemáticamente cómo liquidar tus tarjetas y préstamos en tiempo récord.
              Aplica el <strong>efecto rollover</strong>: cuando pagas una deuda, transfieres su cuota
              a la siguiente para acelerar tu libertad financiera.
            </p>
          </div>

          {/* Selector de Estrategia Activa */}
          <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shrink-0 self-start md:self-auto">
            <div className="text-[11px] font-semibold text-stone-400 px-2 pb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Método de Priorización:</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setActiveStrategy('avalanche')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                  activeStrategy === 'avalanche'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Flame className="w-4 h-4 text-stone-950" />
                <span>Avalancha (APR)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStrategy('snowball')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                  activeStrategy === 'snowball'
                    ? 'bg-sky-400 text-stone-950 shadow-md'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Snowflake className="w-4 h-4 text-stone-950" />
                <span>Bola de Nieve</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Si no hay deudas registradas */}
      {normalizedDebts.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              No tienes tarjetas ni préstamos vinculados con deuda activa
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              Este módulo toma directamente los datos de tus cuentas bancarias de tipo <strong>Tarjeta de Crédito</strong> y <strong>Préstamo</strong> (tasa de interés, cuota mínima y saldo) para simular tu ruta hacia cero deudas.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToBanks}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Landmark className="w-4 h-4" />
              <span>Ir a Cuentas Bancarias y Vincular</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Duelo Comparativo: Avalancha vs. Bola de Nieve (Head-to-Head Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Avalancha */}
            <div
              onClick={() => setActiveStrategy('avalanche')}
              className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                activeStrategy === 'avalanche'
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300'
              }`}
            >
              {activeStrategy === 'avalanche' && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] uppercase tracking-wider">
                  Activa
                </span>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Método Avalancha Financiera
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Prioriza deudas con mayor tasa de interés (APR)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Libre de Deudas</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 block truncate">
                    {avalancheSimulation.debtFreeDate}
                  </span>
                  <span className="text-[10px] text-stone-500">{avalancheSimulation.totalMonths} meses</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Intereses Totales</span>
                  <span className="text-sm font-black text-stone-900 dark:text-stone-100 mt-0.5 block truncate">
                    {formatMoney(avalancheSimulation.totalInterestPaid, state.currency)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {interestDifference > 0 ? `Ahorra ${formatMoney(interestDifference, state.currency)}` : 'Máximo ahorro'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">1ª Deuda Pagada</span>
                  <span className="text-sm font-black text-stone-800 dark:text-stone-200 mt-0.5 block">
                    Mes {avalancheSimulation.firstDebtPaidMonth}
                  </span>
                  <span className="text-[10px] text-stone-400 truncate block max-w-[90px] mx-auto" title={avalancheSimulation.firstDebtPaidName}>
                    {avalancheSimulation.firstDebtPaidName}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Bola de Nieve */}
            <div
              onClick={() => setActiveStrategy('snowball')}
              className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                activeStrategy === 'snowball'
                  ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-sky-300'
              }`}
            >
              {activeStrategy === 'snowball' && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-sky-500 text-stone-950 font-black text-[10px] uppercase tracking-wider">
                  Activa
                </span>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Método Bola de Nieve
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Prioriza deudas con menor saldo para victorias rápidas
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Libre de Deudas</span>
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400 mt-0.5 block truncate">
                    {snowballSimulation.debtFreeDate}
                  </span>
                  <span className="text-[10px] text-stone-500">{snowballSimulation.totalMonths} meses</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Intereses Totales</span>
                  <span className="text-sm font-black text-stone-900 dark:text-stone-100 mt-0.5 block truncate">
                    {formatMoney(snowballSimulation.totalInterestPaid, state.currency)}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {interestDifference > 0 ? `+${formatMoney(interestDifference, state.currency)} vs Aval.` : 'Similar'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">1ª Deuda Pagada</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    Mes {snowballSimulation.firstDebtPaidMonth}
                  </span>
                  <span className="text-[10px] text-stone-400 truncate block max-w-[90px] mx-auto" title={snowballSimulation.firstDebtPaidName}>
                    {snowballSimulation.firstDebtPaidName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Acelerador de Pagos Interactivo */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Acelerador Mensual de Amortización (Pago Extra)
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  ¿Cuánto dinero extra puedes apartar cada mes para atacar la deuda prioritaria?
                </p>
              </div>

              {/* Selector de montos predefinidos */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 50, 100, 150, 250, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAcceleratorAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      acceleratorAmount === val
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    +{formatMoney(val, state.currency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider de control continuo */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div className="sm:col-span-3 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Abono adicional:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    +{formatMoney(acceleratorAmount, state.currency)} / mes
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={acceleratorAmount}
                  onChange={e => setAcceleratorAmount(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-stone-200 dark:bg-stone-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>$0 (Solo cuotas mínimas)</span>
                  <span>+$500 / mes</span>
                  <span>+$1,000 / mes</span>
                </div>
              </div>

              {/* Resumen del impacto del acelerador */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1 text-center sm:text-left">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider block">
                  Impacto del Acelerador
                </span>
                <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                  {monthsSavedVsMinimum > 0 ? `${monthsSavedVsMinimum} meses antes` : 'Mismo plazo'}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Ahorras {formatMoney(interestSavedVsMinimum, state.currency)} en intereses
                </p>
              </div>
            </div>
          </div>

          {/* 4. Lista de Deudas Ordenadas por Prioridad de Amortización */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Orden de Liquidación Prioritaria ({activeStrategy === 'avalanche' ? 'Avalancha: Mayor APR' : 'Bola de Nieve: Menor Saldo'})
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Abona las cuotas mínimas en todas las deudas y concentra todo el excedente en el Objetivo #1.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToBanks}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Vincular Otra Cuenta</span>
                </button>
                {onOpenNewTransaction && (
                  <button
                    onClick={onOpenNewTransaction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Registrar Pago</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid de Deudas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sortedDebtsForDisplay.map((debt, index) => {
                const isPriorityTarget = index === 0;
                const payoffInfo = currentSimulation.individualDebtPayoff.find(p => p.debtId === debt.id);
                const holder = state.members.find(m => m.id === debt.holderMemberId);

                // For the priority target, calculate the suggested payment this month:
                // minimum payment + accelerator
                const suggestedPayment = isPriorityTarget
                  ? debt.minimumPayment + acceleratorAmount
                  : debt.minimumPayment;

                return (
                  <div
                    key={debt.id}
                    className={`rounded-xl border p-4 transition relative flex flex-col justify-between ${
                      isPriorityTarget
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    {/* Priority Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                            isPriorityTarget
                              ? 'bg-amber-500 text-stone-950 shadow-xs'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate max-w-[150px]">
                            {debt.name}
                          </h4>
                          <span className="text-[10px] text-stone-400 block truncate">
                            {debt.bankName} {debt.accountNumberMasked}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(debt)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition"
                          title="Editar condiciones financieras de esta deuda"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Saldo y Tasa */}
                    <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-stone-700/60 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                          Saldo Deuda
                        </span>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400">
                          {formatMoney(debt.balance, debt.currencySymbol)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                          Tasa Anual (APR)
                        </span>
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                          {debt.interestRate}%
                        </span>
                      </div>
                    </div>

                    {/* Cuota Mínima y Cuota Sugerida */}
                    <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-1">
                      <div className="flex justify-between items-center text-stone-500">
                        <span>Cuota mínima base:</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {formatMoney(debt.minimumPayment, debt.currencySymbol)}/mes
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-stone-100 dark:border-stone-800">
                        <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                          <span>Pago este mes:</span>
                          {isPriorityTarget && (
                            <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                              Acelerado
                            </span>
                          )}
                        </span>
                        <span className={`font-black ${isPriorityTarget ? 'text-amber-600 dark:text-amber-400 text-sm' : 'text-stone-800 dark:text-stone-200'}`}>
                          {formatMoney(suggestedPayment, debt.currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Proyección de liquidación estimada */}
                    <div className="mt-3 pt-2 border-t border-stone-200/50 dark:border-stone-700/50 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Fecha liquidada:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {payoffInfo ? `${payoffInfo.payoffDate} (Mes ${payoffInfo.paidInMonth})` : 'En proceso'}
                      </strong>
                    </div>

                    {/* Vencimiento y Titular */}
                    <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400">
                      {(() => {
                        const dueInfo = getAccountNextDueDate({ dueDay: debt.dueDay, dueDate: debt.dueDate });
                        if (dueInfo) {
                          return (
                            <span title={`Próximo vencimiento: ${dueInfo.formattedLongDate}. (${dueInfo.dueDayDescription})`}>
                              Próx. vencimiento: <strong className="text-stone-700 dark:text-stone-300 font-semibold">{dueInfo.formattedDate}</strong> ({dueInfo.badgeText})
                            </span>
                          );
                        }
                        return <span>Vence día: {debt.dueDay} de c/mes</span>;
                      })()}
                      {holder && <span>Titular: {holder.name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Gráfico de Evolución del Saldo Deudor */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  <span>Trayectoria de Desendeudamiento Mes a Mes</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Observa cómo se desploma la deuda con el efecto multiplicador de la cuota rodante.
                </p>
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-amber-600">
                  <div className="w-3 h-0.5 bg-amber-500 rounded" />
                  <span>Avalancha (Mayor APR)</span>
                </div>
                <div className="flex items-center gap-1.5 text-sky-600">
                  <div className="w-3 h-0.5 bg-sky-500 rounded" />
                  <span>Bola de Nieve (Menor saldo)</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-400">
                  <div className="w-3 h-0.5 bg-stone-400 rounded" />
                  <span>Solo Mínimos</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={val => `${state.currency}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatMoney(val, state.currency), 'Saldo Restante']}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Avalancha"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="BolaDeNieve"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="SoloMinimos"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Cronograma Mes a Mes Expandible */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Cronograma Detallado de Pagos y Amortización</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Desglose mensual de aportes, intereses devengados y amortización efectiva a capital.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-200 transition"
              >
                <span>{showFullSchedule ? 'Ocultar' : 'Ver Detalle Mes a Mes'}</span>
                {showFullSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showFullSchedule && (
              <div className="overflow-x-auto no-scrollbar pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold">
                      <th className="py-2 px-3">Mes</th>
                      <th className="py-2 px-3">Deuda Acelerada (Objetivo)</th>
                      <th className="py-2 px-3 text-right">Pago Mensual Total</th>
                      <th className="py-2 px-3 text-right">Intereses Mes</th>
                      <th className="py-2 px-3 text-right">Amortización Capital</th>
                      <th className="py-2 px-3 text-right">Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {currentSimulation.monthlyTimeline.slice(0, 36).map(row => (
                      <tr key={row.monthIndex} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                        <td className="py-2 px-3 font-semibold text-stone-800 dark:text-stone-200">
                          {row.monthLabel} (Mes {row.monthIndex})
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium text-stone-700 dark:text-stone-300 truncate inline-block max-w-[180px]">
                            {row.activePriorityName}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-stone-900 dark:text-stone-100">
                          {formatMoney(row.totalPaymentMonth, state.currency)}
                        </td>
                        <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">
                          {formatMoney(row.totalInterestMonth, state.currency)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatMoney(row.totalPrincipalMonth, state.currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-stone-900 dark:text-stone-100">
                          {formatMoney(row.totalBalance, state.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Edición Rápida de Parámetros de Deuda */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Editar Condiciones: {editingDebt.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingDebt(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Saldo Deudor Actual ({editingDebt.currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editBalance}
                  onChange={e => setEditBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tasa de Interés Anual (% APR / TAE)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editInterestRate}
                    onChange={e => setEditInterestRate(e.target.value)}
                    placeholder="Ej. 24.5 o 12.0"
                    className="w-full pl-3 pr-8 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Cuota Mínima Mensual Obligatoria ({editingDebt.currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editMinPayment}
                  onChange={e => setEditMinPayment(e.target.value)}
                  placeholder="Ej. 120.00"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Día de Vencimiento del Mes (1 al 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={editDueDay}
                  onChange={e => setEditDueDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Internal icon helper to avoid missing import
const ReceiptIcon: React.FC<{ className?: string }> = ({ className }) => {
  return <CreditCard className={className} />;
};
