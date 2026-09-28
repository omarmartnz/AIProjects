import {
  RecurringExpense,
  RecurringIncome,
  RecurringIncomeInstallment,
  RecurringTransfer,
  RecurringTransferInstallment,
  Transaction,
  FamilyState,
} from '../types';
import { applyTransactionToAccount, getTxAmountInAccountCurrency } from './bankUtils';

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const SPANISH_MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

const SPANISH_WEEKDAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Safely parses YYYY-MM-DD string into local year, month (1-12), day without UTC timezone shifting.
 */
export function parseDateParts(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Formats a YYYY-MM-DD date string into a complete Spanish readable date.
 * E.g.: "5 de octubre de 2026" or with weekday "Lunes, 5 de octubre de 2026"
 */
export function formatFullDate(
  dateStr?: string,
  options: { withWeekday?: boolean; shortMonth?: boolean; withYear?: boolean } = {}
): string {
  if (!dateStr) return 'Fecha no definida';
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr;

  const { year, month, day } = parts;
  const monthName = options.shortMonth
    ? SPANISH_MONTHS_SHORT[month - 1] || ''
    : SPANISH_MONTHS[month - 1] || '';

  const includeYear = options.withYear !== false;
  const dateFormatted = includeYear
    ? `${day} de ${monthName} de ${year}`
    : `${day} de ${monthName}`;

  if (options.withWeekday) {
    // Local date object to get correct day of week
    const d = new Date(year, month - 1, day);
    const weekday = SPANISH_WEEKDAYS[d.getDay()];
    return `${weekday}, ${dateFormatted}`;
  }

  return dateFormatted;
}

/**
 * Returns the calendar days difference between today and the target date (target - today).
 * Negative means past due, 0 means today, positive means future.
 */
export function getDaysUntil(dateStr?: string, refDate: Date = new Date()): number {
  if (!dateStr) return 0;
  const parts = parseDateParts(dateStr);
  if (!parts) return 0;

  const target = new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface RecurringPaymentCheckResult {
  isPaid: boolean;
  paymentTransaction?: Transaction;
  paidDate?: string;
  paidAmount?: number;
}

/**
 * Checks if a recurring expense has been paid for the current active period (month/cycle).
 * Checks both explicit lastPaidDate/lastPaidMonth and matching transactions in state.transactions.
 */
export function isRecurringExpensePaidForCurrentCycle(
  expense: RecurringExpense,
  transactions: Transaction[] = [],
  refDate: Date = new Date()
): RecurringPaymentCheckResult {
  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  // 1. Check direct flags on expense
  if (expense.lastPaidMonth === currentMonthKey) {
    return {
      isPaid: true,
      paidDate: expense.lastPaidDate || `${currentMonthKey}-${String(expense.dueDay).padStart(2, '0')}`,
      paidAmount: expense.amount,
    };
  }

  if (expense.lastPaidDate && expense.lastPaidDate.startsWith(currentMonthKey)) {
    return {
      isPaid: true,
      paidDate: expense.lastPaidDate,
      paidAmount: expense.amount,
    };
  }

  // 2. Scan transactions in current month
  const normalizedTitle = (expense.title || '').trim().toLowerCase();
  if (!normalizedTitle) {
    return { isPaid: false };
  }

  // Find all expense transactions in the current month
  const currentMonthTxs = transactions.filter(tx => {
    if (tx.type !== 'expense') return false;
    return tx.date && tx.date.startsWith(currentMonthKey);
  });

  // A. Exact recurringExpenseId match
  const byIdMatch = currentMonthTxs.find(tx => tx.recurringExpenseId === expense.id);
  if (byIdMatch) {
    return {
      isPaid: true,
      paymentTransaction: byIdMatch,
      paidDate: byIdMatch.date,
      paidAmount: byIdMatch.amount,
    };
  }

  // B. Exact "Pago factura: [title]" or description contains title match
  const byDescExact = currentMonthTxs.find(tx => {
    const desc = (tx.description || '').toLowerCase().trim();
    return (
      desc === `pago factura: ${normalizedTitle}` ||
      desc.includes(`pago factura: ${normalizedTitle}`) ||
      desc === normalizedTitle
    );
  });
  if (byDescExact) {
    return {
      isPaid: true,
      paymentTransaction: byDescExact,
      paidDate: byDescExact.date,
      paidAmount: byDescExact.amount,
    };
  }

  // C. Title substring match or matching category + Fijo/Recurrente tag + similar amount
  const byFuzzy = currentMonthTxs.find(tx => {
    const desc = (tx.description || '').toLowerCase();
    if (desc.includes(normalizedTitle)) {
      return true;
    }
    const isTaggedRecurring = (tx.tags || []).some(t => t.toLowerCase().includes('recurrente') || t.toLowerCase().includes('fijo'));
    const isSameCategory = tx.category === expense.category;
    if (isTaggedRecurring && isSameCategory) {
      // If amount is within 5% or exact
      if (Math.abs(tx.amount - expense.amount) < Math.max(1, expense.amount * 0.05)) {
        return true;
      }
    }
    return false;
  });

  if (byFuzzy) {
    return {
      isPaid: true,
      paymentTransaction: byFuzzy,
      paidDate: byFuzzy.date,
      paidAmount: byFuzzy.amount,
    };
  }

  return { isPaid: false };
}

/**
 * Computes the real, effective next due date for a recurring expense.
 * - If it's already paid this month: the next payment due date is in the NEXT month (e.g. October 5, not September 5).
 * - If it's not paid yet: the due date is this month's date (which may be in the past, meaning it is overdue).
 */
export function computeEffectiveNextDueDate(
  expense: RecurringExpense,
  isPaidThisCycle: boolean,
  refDate: Date = new Date()
): string {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1; // 1-12

  if (expense.frequency === 'yearly') {
    let targetYear = currentYear;
    if (isPaidThisCycle) {
      targetYear = currentYear + 1;
    }
    const targetMonth = 1; // default or from dueMonth if added in future
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(maxDays, Math.max(1, expense.dueDay || 1));
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  }

  if (expense.frequency === 'weekly') {
    const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const dayOffset = isPaidThisCycle ? 7 : 0;
    const nextDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    const d = String(nextDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Standard Monthly frequency
  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (isPaidThisCycle) {
    // Advanced to next month because current month is already paid!
    if (targetMonth === 12) {
      targetYear += 1;
      targetMonth = 1;
    } else {
      targetMonth += 1;
    }
  }

  const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(maxDaysInTargetMonth, Math.max(1, expense.dueDay || 1));

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

export interface RecurringExpenseSummary {
  expense: RecurringExpense;
  isPaidThisMonth: boolean;
  paymentTransaction?: Transaction;
  paidDate?: string;
  paidAmount?: number;
  effectiveNextDueDate: string; // YYYY-MM-DD
  formattedFullDate: string; // e.g. "5 de octubre de 2026"
  formattedFullDateWithWeekday: string; // e.g. "Lunes, 5 de octubre de 2026"
  daysUntilDue: number;
  isOverdue: boolean;
  isDueToday: boolean;
  status: 'paid' | 'overdue' | 'due_today' | 'upcoming' | 'paused';
  statusLabel: string;
  relativeBadgeText: string;
  fullNextPaymentLabel: string;
}

/**
 * Calculates a complete summary of an expense's payment status, true next due date,
 * and friendly Spanish labels for cards, badges, and alerts.
 */
export function getRecurringExpenseSummary(
  expense: RecurringExpense,
  transactions: Transaction[] = [],
  refDate: Date = new Date()
): RecurringExpenseSummary {
  if (!expense.isActive) {
    const effectiveDate = expense.nextDueDate || computeEffectiveNextDueDate(expense, false, refDate);
    const formatted = formatFullDate(effectiveDate);
    return {
      expense,
      isPaidThisMonth: false,
      effectiveNextDueDate: effectiveDate,
      formattedFullDate: formatted,
      formattedFullDateWithWeekday: formatFullDate(effectiveDate, { withWeekday: true }),
      daysUntilDue: getDaysUntil(effectiveDate, refDate),
      isOverdue: false,
      isDueToday: false,
      status: 'paused',
      statusLabel: 'Pausada',
      relativeBadgeText: 'Pausada',
      fullNextPaymentLabel: `Programada para: ${formatted}`,
    };
  }

  const paymentCheck = isRecurringExpensePaidForCurrentCycle(expense, transactions, refDate);
  const isPaidThisMonth = paymentCheck.isPaid;

  const effectiveNextDueDate = computeEffectiveNextDueDate(expense, isPaidThisMonth, refDate);
  const formattedFullDate = formatFullDate(effectiveNextDueDate);
  const formattedFullDateWithWeekday = formatFullDate(effectiveNextDueDate, { withWeekday: true });
  const daysUntilDue = getDaysUntil(effectiveNextDueDate, refDate);

  let status: 'paid' | 'overdue' | 'due_today' | 'upcoming' = 'upcoming';
  let statusLabel = 'Próximo pago';
  let relativeBadgeText = `En ${daysUntilDue} días`;
  let fullNextPaymentLabel = `Próximo pago: ${formattedFullDate}`;

  if (isPaidThisMonth) {
    status = 'paid';
    statusLabel = 'Pagada este mes';
    const paidDateFormatted = paymentCheck.paidDate
      ? formatFullDate(paymentCheck.paidDate, { shortMonth: true, withYear: false })
      : '';
    relativeBadgeText = paidDateFormatted ? `Pagada (${paidDateFormatted})` : 'Pagada este mes';
    fullNextPaymentLabel = `Próximo pago: ${formattedFullDate} (en ${daysUntilDue} días)`;
  } else if (daysUntilDue < 0) {
    status = 'overdue';
    statusLabel = 'Vencida';
    const absDays = Math.abs(daysUntilDue);
    relativeBadgeText = absDays === 1 ? 'Venció ayer' : `Venció hace ${absDays} días`;
    fullNextPaymentLabel = `Venció el ${formattedFullDate} (${absDays}d de atraso)`;
  } else if (daysUntilDue === 0) {
    status = 'due_today';
    statusLabel = 'Vence hoy';
    relativeBadgeText = 'Vence hoy';
    fullNextPaymentLabel = `Vence hoy (${formattedFullDate})`;
  } else if (daysUntilDue === 1) {
    status = 'upcoming';
    statusLabel = 'Vence mañana';
    relativeBadgeText = 'Vence mañana';
    fullNextPaymentLabel = `Vence mañana: ${formattedFullDate}`;
  } else {
    status = 'upcoming';
    statusLabel = `En ${daysUntilDue} días`;
    relativeBadgeText = `En ${daysUntilDue} días`;
    fullNextPaymentLabel = `Próximo pago: ${formattedFullDate}`;
  }

  return {
    expense,
    isPaidThisMonth,
    paymentTransaction: paymentCheck.paymentTransaction,
    paidDate: paymentCheck.paidDate,
    paidAmount: paymentCheck.paidAmount,
    effectiveNextDueDate,
    formattedFullDate,
    formattedFullDateWithWeekday,
    daysUntilDue,
    isOverdue: status === 'overdue',
    isDueToday: status === 'due_today',
    status,
    statusLabel,
    relativeBadgeText,
    fullNextPaymentLabel,
  };
}

/**
 * Computes next collection date for recurring incomes with full date formatting.
 */
export function computeRecurringIncomeNextDueDate(
  income: RecurringIncome,
  refDate: Date = new Date()
): { nextDueDate: string; formattedFullDate: string; daysUntil: number } {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1;

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (income.frequency === 'yearly') {
    targetMonth = income.dueMonth || 1;
    const thisYearDate = new Date(currentYear, targetMonth - 1, income.dueDay || 1);
    if (thisYearDate.getTime() < refDate.getTime()) {
      targetYear += 1;
    }
  } else if (income.frequency === 'biweekly') {
    const q1Day = income.installments?.[0]?.day || 15;
    const q2Day = income.installments?.[1]?.day || 30;
    const todayDay = refDate.getDate();

    if (todayDay <= q1Day) {
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q1Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    } else if (todayDay <= q2Day) {
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q2Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    } else {
      // Next month Q1
      if (targetMonth === 12) {
        targetYear += 1;
        targetMonth = 1;
      } else {
        targetMonth += 1;
      }
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q1Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    }
  } else {
    // Monthly
    const day = income.dueDay || 15;
    if (refDate.getDate() > day) {
      if (targetMonth === 12) {
        targetYear += 1;
        targetMonth = 1;
      } else {
        targetMonth += 1;
      }
    }
  }

  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(maxDays, Math.max(1, income.dueDay || 15));
  const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

  return {
    nextDueDate: dateStr,
    formattedFullDate: formatFullDate(dateStr),
    daysUntil: getDaysUntil(dateStr, refDate),
  };
}

export interface RecurringIncomeInstallmentStatus {
  installment: RecurringIncomeInstallment;
  index: number;
  label: string;
  isRegistered: boolean;
  registeredDate?: string;
  isDue: boolean;
  dueDate: string;
  formattedDueDate: string;
  daysUntil: number;
  periodKey: string;
}

export interface RecurringIncomeSummary {
  income: RecurringIncome;
  isFullyRegisteredThisPeriod: boolean;
  isPartiallyRegisteredThisPeriod: boolean;
  registeredCount: number;
  totalInstallmentsCount: number;
  nextDueDate: string;
  formattedNextDueDate: string;
  daysUntilNextDue: number;
  installmentsStatus?: RecurringIncomeInstallmentStatus[];
  isDueNow: boolean;
  hasAutoRegister: boolean;
  statusBadgeText: string;
  lastRegisteredDate?: string;
}

/**
 * Returns comprehensive registration status for a recurring income and its installments.
 */
export function getRecurringIncomeSummary(
  income: RecurringIncome,
  transactions: Transaction[] = [],
  refDate: Date = new Date()
): RecurringIncomeSummary {
  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonthStr}`;
  const todayDay = refDate.getDate();

  const nextDueInfo = computeRecurringIncomeNextDueDate(income, refDate);
  const normalizedTitle = (income.title || '').trim().toLowerCase();

  // Helper to check if a specific transaction matches this income
  const isTxMatchingIncome = (tx: Transaction) => {
    if (tx.type !== 'income') return false;
    if (tx.recurringIncomeId === income.id) return true;
    const desc = (tx.description || '').toLowerCase();
    const hasTag = tx.tags && tx.tags.includes('Fijo/Recurrente');
    return hasTag && desc.includes(normalizedTitle);
  };

  if (income.frequency === 'biweekly' || income.frequency === 'weekly') {
    const rawInsts = income.installments && income.installments.length > 0
      ? income.installments
      : income.frequency === 'biweekly'
      ? [
          { id: 'q1', name: 'Quincena 1', label: 'Quincena 1', day: 15, amount: income.amount / 2 },
          { id: 'q2', name: 'Quincena 2', label: 'Quincena 2', day: 30, amount: income.amount / 2 },
        ]
      : [
          { id: 'w1', name: 'Semana 1', label: 'Semana 1', day: 7, amount: income.amount / 4 },
          { id: 'w2', name: 'Semana 2', label: 'Semana 2', day: 14, amount: income.amount / 4 },
          { id: 'w3', name: 'Semana 3', label: 'Semana 3', day: 21, amount: income.amount / 4 },
          { id: 'w4', name: 'Semana 4', label: 'Semana 4', day: 28, amount: income.amount / 4 },
        ];

    const installmentsStatus: RecurringIncomeInstallmentStatus[] = rawInsts.map((inst, idx) => {
      const subKey = income.frequency === 'biweekly' ? `Q${idx + 1}` : `W${idx + 1}`;
      const periodKey = `${currentMonthKey}-${subKey}`;
      const label = inst.label || inst.name || `Cuota ${idx + 1}`;

      const maxDays = new Date(currentYear, currentMonthNum, 0).getDate();
      const actualDay = Math.min(maxDays, Math.max(1, inst.day));
      const dueDate = `${currentYear}-${currentMonthStr}-${String(actualDay).padStart(2, '0')}`;
      const isDue = todayDay >= actualDay;

      // Find matching transaction
      const matchTx = transactions.find(tx => {
        if (!isTxMatchingIncome(tx)) return false;
        if (!tx.date || !tx.date.startsWith(currentMonthKey)) return false;
        if (tx.recurringInstallmentId === inst.id || tx.recurringInstallmentId === subKey) return true;
        const desc = (tx.description || '').toLowerCase();
        const hasSubName = desc.includes(label.toLowerCase()) || desc.includes(subKey.toLowerCase());
        const hasTag = tx.tags && (tx.tags.includes(label) || tx.tags.includes(subKey));
        return hasSubName || hasTag;
      });

      const isRegistered = Boolean(matchTx || inst.lastRegisteredPeriod === periodKey);

      return {
        installment: inst,
        index: idx,
        label,
        isRegistered,
        registeredDate: matchTx?.date || inst.lastRegisteredDate,
        isDue,
        dueDate,
        formattedDueDate: formatFullDate(dueDate),
        daysUntil: getDaysUntil(dueDate, refDate),
        periodKey,
      };
    });

    const registeredCount = installmentsStatus.filter(i => i.isRegistered).length;
    const totalInstallmentsCount = installmentsStatus.length;
    const isFullyRegisteredThisPeriod = registeredCount === totalInstallmentsCount && totalInstallmentsCount > 0;
    const isPartiallyRegisteredThisPeriod = registeredCount > 0 && registeredCount < totalInstallmentsCount;

    let statusBadgeText = 'Pendiente de cobro';
    if (isFullyRegisteredThisPeriod) {
      statusBadgeText = 'Completamente cobrado este mes';
    } else if (isPartiallyRegisteredThisPeriod) {
      statusBadgeText = `${registeredCount}/${totalInstallmentsCount} cobros registrados`;
    } else if (nextDueInfo.daysUntil === 0) {
      statusBadgeText = 'Cobra hoy';
    } else if (nextDueInfo.daysUntil === 1) {
      statusBadgeText = 'Cobra mañana';
    } else if (nextDueInfo.daysUntil > 0) {
      statusBadgeText = `En ${nextDueInfo.daysUntil} días`;
    }

    return {
      income,
      isFullyRegisteredThisPeriod,
      isPartiallyRegisteredThisPeriod,
      registeredCount,
      totalInstallmentsCount,
      nextDueDate: nextDueInfo.nextDueDate,
      formattedNextDueDate: nextDueInfo.formattedFullDate,
      daysUntilNextDue: nextDueInfo.daysUntil,
      installmentsStatus,
      isDueNow: nextDueInfo.daysUntil <= 0,
      hasAutoRegister: Boolean(income.autoRegister),
      statusBadgeText,
      lastRegisteredDate: income.lastRegisteredDate,
    };
  }

  // Monthly or Yearly single perception
  let periodKey = currentMonthKey;
  let isDue = todayDay >= (income.dueDay || 15);

  if (income.frequency === 'yearly') {
    periodKey = String(currentYear);
    const dueMonth = income.dueMonth || 1;
    isDue = currentMonthNum > dueMonth || (currentMonthNum === dueMonth && todayDay >= (income.dueDay || 15));
  }

  const matchTx = transactions.find(tx => {
    if (!isTxMatchingIncome(tx)) return false;
    if (income.frequency === 'yearly') {
      return tx.date && tx.date.startsWith(String(currentYear));
    }
    return tx.date && tx.date.startsWith(currentMonthKey);
  });

  const isRegistered = Boolean(matchTx || income.lastRegisteredPeriod === periodKey);

  let statusBadgeText = 'Pendiente de cobro';
  if (isRegistered) {
    statusBadgeText = income.frequency === 'yearly' ? 'Cobrado este año' : 'Cobrado este mes';
  } else if (nextDueInfo.daysUntil === 0) {
    statusBadgeText = 'Cobra hoy';
  } else if (nextDueInfo.daysUntil === 1) {
    statusBadgeText = 'Cobra mañana';
  } else if (nextDueInfo.daysUntil > 0) {
    statusBadgeText = `En ${nextDueInfo.daysUntil} días`;
  }

  return {
    income,
    isFullyRegisteredThisPeriod: isRegistered,
    isPartiallyRegisteredThisPeriod: false,
    registeredCount: isRegistered ? 1 : 0,
    totalInstallmentsCount: 1,
    nextDueDate: nextDueInfo.nextDueDate,
    formattedNextDueDate: nextDueInfo.formattedFullDate,
    daysUntilNextDue: nextDueInfo.daysUntil,
    isDueNow: isDue,
    hasAutoRegister: Boolean(income.autoRegister),
    statusBadgeText,
    lastRegisteredDate: matchTx?.date || income.lastRegisteredDate,
  };
}

export interface AutoRegisteredIncomeResult {
  incomeId: string;
  title: string;
  amount: number;
  currency?: string;
  label?: string;
  date: string;
}

/**
 * Scans active recurring incomes with autoRegister enabled and registers any due perceptions
 * that have not yet been recorded for the current period.
 */
export function processAutoRecurringIncomes(
  state: FamilyState,
  refDate: Date = new Date()
): { updatedState: FamilyState; registeredItems: AutoRegisteredIncomeResult[] } {
  if (!state || !Array.isArray(state.recurringIncomes) || state.recurringIncomes.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonthStr}`;
  const todayDay = refDate.getDate();

  const newTransactions: Transaction[] = [];
  const registeredItems: AutoRegisteredIncomeResult[] = [];
  let updatedBankAccounts = [...(state.bankAccounts || [])];

  const updatedRecurringIncomes = state.recurringIncomes.map(income => {
    if (!income.isActive || !income.autoRegister) {
      return income;
    }

    const normalizedTitle = (income.title || '').trim().toLowerCase();

    // Helper to check existing transaction
    const existsTx = (periodPrefix: string, subId?: string, label?: string) => {
      return (
        state.transactions.some(tx => {
          if (tx.type !== 'income') return false;
          if (!tx.date || !tx.date.startsWith(periodPrefix)) return false;
          if (tx.recurringIncomeId === income.id) {
            if (subId && tx.recurringInstallmentId && tx.recurringInstallmentId !== subId) return false;
            return true;
          }
          const desc = (tx.description || '').toLowerCase();
          const hasTag = tx.tags && tx.tags.includes('Fijo/Recurrente');
          if (hasTag && desc.includes(normalizedTitle)) {
            if (label && !desc.includes(label.toLowerCase()) && !(tx.tags && tx.tags.includes(label))) {
              return false;
            }
            return true;
          }
          return false;
        }) ||
        newTransactions.some(tx => {
          if (tx.recurringIncomeId === income.id) {
            if (subId && tx.recurringInstallmentId && tx.recurringInstallmentId !== subId) return false;
            return true;
          }
          return false;
        })
      );
    };

    if (income.frequency === 'biweekly' || income.frequency === 'weekly') {
      const rawInsts = income.installments && income.installments.length > 0
        ? income.installments
        : income.frequency === 'biweekly'
        ? [
            { id: 'q1', name: 'Quincena 1', label: 'Quincena 1', day: 15, amount: income.amount / 2 },
            { id: 'q2', name: 'Quincena 2', label: 'Quincena 2', day: 30, amount: income.amount / 2 },
          ]
        : [
            { id: 'w1', name: 'Semana 1', label: 'Semana 1', day: 7, amount: income.amount / 4 },
            { id: 'w2', name: 'Semana 2', label: 'Semana 2', day: 14, amount: income.amount / 4 },
            { id: 'w3', name: 'Semana 3', label: 'Semana 3', day: 21, amount: income.amount / 4 },
            { id: 'w4', name: 'Semana 4', label: 'Semana 4', day: 28, amount: income.amount / 4 },
          ];

      let anyInstRegistered = false;
      const updatedInstallments = rawInsts.map((inst, idx) => {
        const subKey = income.frequency === 'biweekly' ? `Q${idx + 1}` : `W${idx + 1}`;
        const periodKey = `${currentMonthKey}-${subKey}`;
        const label = inst.label || inst.name || `Cuota ${idx + 1}`;

        const maxDays = new Date(currentYear, currentMonthNum, 0).getDate();
        const actualDay = Math.min(maxDays, Math.max(1, inst.day));
        const isDue = todayDay >= actualDay;

        const isAlreadyRegistered = inst.lastRegisteredPeriod === periodKey || existsTx(currentMonthKey, inst.id || subKey, label);

        if (isDue && !isAlreadyRegistered) {
          anyInstRegistered = true;
          const targetDayStr = String(actualDay).padStart(2, '0');
          const txDate = `${currentMonthKey}-${targetDayStr}`;

          const txAmount = inst.amount;
          const txOrigAmount = inst.originalAmount !== undefined ? inst.originalAmount : inst.amount;

          const newTx: Transaction = {
            id: `tx-rec-inc-auto-${income.id}-${subKey}-${Date.now()}-${idx}`,
            date: txDate,
            description: `Ingreso fijo (${label}) [Auto]: ${income.title}`,
            amount: txAmount,
            type: 'income',
            category: income.category || 'Nómina / Sueldo',
            memberId: income.memberId,
            bankAccountId: income.destinationAccountId,
            tags: ['Fijo/Recurrente', 'Ingreso', 'Automático', label],
            currency: income.currency,
            originalAmount: txOrigAmount,
            exchangeRate: income.exchangeRate,
            createdAt: Date.now(),
            recurringIncomeId: income.id,
            recurringInstallmentId: inst.id || subKey,
            isAutoLogged: true,
          };

          newTransactions.push(newTx);
          registeredItems.push({
            incomeId: income.id,
            title: income.title,
            amount: txAmount,
            currency: income.currency,
            label,
            date: txDate,
          });

          // Credit bank account if configured
          if (income.destinationAccountId) {
            updatedBankAccounts = updatedBankAccounts.map(b => {
              if (b.id === income.destinationAccountId) {
                const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
                return applyTransactionToAccount(b, 'income', amtInAcc, false);
              }
              return b;
            });
          }

          return {
            ...inst,
            lastRegisteredDate: txDate,
            lastRegisteredPeriod: periodKey,
          };
        }

        return inst;
      });

      if (anyInstRegistered) {
        return {
          ...income,
          installments: updatedInstallments,
          lastRegisteredDate: refDate.toISOString().slice(0, 10),
          lastRegisteredPeriod: currentMonthKey,
        };
      }

      return income;
    }

    // Monthly or Yearly
    let periodKey = currentMonthKey;
    let isDue = todayDay >= (income.dueDay || 15);
    let targetDay = income.dueDay || 15;

    if (income.frequency === 'yearly') {
      periodKey = String(currentYear);
      const dueMonth = income.dueMonth || 1;
      isDue = currentMonthNum > dueMonth || (currentMonthNum === dueMonth && todayDay >= (income.dueDay || 15));
    }

    const isAlreadyRegistered =
      income.lastRegisteredPeriod === periodKey ||
      existsTx(income.frequency === 'yearly' ? String(currentYear) : currentMonthKey);

    if (isDue && !isAlreadyRegistered) {
      const maxDays = new Date(currentYear, currentMonthNum, 0).getDate();
      const actualDay = Math.min(maxDays, Math.max(1, targetDay));
      const targetDayStr = String(actualDay).padStart(2, '0');
      const txDate = income.frequency === 'yearly'
        ? `${currentYear}-${String(income.dueMonth || 1).padStart(2, '0')}-${targetDayStr}`
        : `${currentMonthKey}-${targetDayStr}`;

      const newTx: Transaction = {
        id: `tx-rec-inc-auto-${income.id}-${Date.now()}`,
        date: txDate,
        description: `Ingreso fijo [Auto]: ${income.title}`,
        amount: income.amount,
        type: 'income',
        category: income.category || 'Nómina / Sueldo',
        memberId: income.memberId,
        bankAccountId: income.destinationAccountId,
        tags: ['Fijo/Recurrente', 'Ingreso', 'Automático'],
        currency: income.currency,
        originalAmount: income.originalAmount,
        exchangeRate: income.exchangeRate,
        createdAt: Date.now(),
        recurringIncomeId: income.id,
        isAutoLogged: true,
      };

      newTransactions.push(newTx);
      registeredItems.push({
        incomeId: income.id,
        title: income.title,
        amount: income.amount,
        currency: income.currency,
        date: txDate,
      });

      if (income.destinationAccountId) {
        updatedBankAccounts = updatedBankAccounts.map(b => {
          if (b.id === income.destinationAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'income', amtInAcc, false);
          }
          return b;
        });
      }

      return {
        ...income,
        lastRegisteredDate: txDate,
        lastRegisteredPeriod: periodKey,
      };
    }

    return income;
  });

  if (newTransactions.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const updatedState: FamilyState = {
    ...state,
    transactions: [...newTransactions, ...state.transactions],
    bankAccounts: updatedBankAccounts,
    recurringIncomes: updatedRecurringIncomes,
    updatedAt: Date.now(),
  };

  return { updatedState, registeredItems };
}

/**
 * Computes next execution date for a recurring transfer based on frequency, dueDay, dueMonth, and installments.
 */
export function computeRecurringTransferNextDueDate(
  transfer: RecurringTransfer,
  refDate?: Date
): { nextDueDate: string; formattedFullDate: string; daysUntil: number };
export function computeRecurringTransferNextDueDate(
  dueDay: number,
  frequencyParam?: 'monthly' | 'biweekly' | 'yearly' | 'weekly',
  refDateParam?: Date,
  dueMonthParam?: number,
  installmentsParam?: RecurringTransferInstallment[]
): { nextDueDate: string; formattedFullDate: string; daysUntil: number };
export function computeRecurringTransferNextDueDate(
  transferOrDueDay: RecurringTransfer | number,
  frequencyParamOrRefDate?: 'monthly' | 'biweekly' | 'yearly' | 'weekly' | Date,
  refDateParam: Date = new Date(),
  dueMonthParam?: number,
  installmentsParam?: RecurringTransferInstallment[]
): { nextDueDate: string; formattedFullDate: string; daysUntil: number } {
  const isObj = typeof transferOrDueDay === 'object' && transferOrDueDay !== null;
  const transfer = isObj ? (transferOrDueDay as RecurringTransfer) : null;
  const dueDay = transfer ? (transfer.dueDay || 1) : (transferOrDueDay as number);
  const frequency: 'monthly' | 'biweekly' | 'yearly' | 'weekly' = transfer
    ? (transfer.frequency || 'monthly')
    : (typeof frequencyParamOrRefDate === 'string' ? frequencyParamOrRefDate : 'monthly');
  const refDate: Date = transfer
    ? (frequencyParamOrRefDate instanceof Date ? frequencyParamOrRefDate : new Date())
    : refDateParam;
  const dueMonth = transfer ? (transfer.dueMonth || 1) : (dueMonthParam || 1);
  const installments = transfer ? transfer.installments : installmentsParam;

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1; // 1-indexed
  const todayDay = refDate.getDate();

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (frequency === 'yearly') {
    targetMonth = dueMonth || 1;
    const thisYearDate = new Date(currentYear, targetMonth - 1, dueDay || 1);
    if (thisYearDate.getTime() < refDate.getTime()) {
      targetYear += 1;
    }
  } else if (frequency === 'biweekly') {
    const q1Day = installments?.[0]?.day || Math.min(dueDay, 15);
    const q2Day = installments?.[1]?.day || Math.max(dueDay, 30);

    if (todayDay <= q1Day) {
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q1Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    } else if (todayDay <= q2Day) {
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q2Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    } else {
      if (targetMonth === 12) {
        targetYear += 1;
        targetMonth = 1;
      } else {
        targetMonth += 1;
      }
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, q1Day);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    }
  } else if (frequency === 'weekly') {
    const weeklyDays = installments && installments.length > 0
      ? installments.map(i => i.day)
      : [7, 14, 21, 28];
    const nextDay = weeklyDays.find(d => todayDay <= d);
    if (nextDay !== undefined) {
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, nextDay);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    } else {
      if (targetMonth === 12) {
        targetYear += 1;
        targetMonth = 1;
      } else {
        targetMonth += 1;
      }
      const firstDay = weeklyDays[0] || 7;
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const d = Math.min(maxDays, firstDay);
      const str = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        nextDueDate: str,
        formattedFullDate: formatFullDate(str),
        daysUntil: getDaysUntil(str, refDate),
      };
    }
  } else {
    // Monthly
    const day = dueDay || 1;
    if (refDate.getDate() > day) {
      if (targetMonth === 12) {
        targetYear += 1;
        targetMonth = 1;
      } else {
        targetMonth += 1;
      }
    }
  }

  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(maxDays, Math.max(1, dueDay || 1));
  const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

  return {
    nextDueDate: dateStr,
    formattedFullDate: formatFullDate(dateStr),
    daysUntil: getDaysUntil(dateStr, refDate),
  };
}

export interface RecurringTransferInstallmentStatus {
  installment: RecurringTransferInstallment;
  index: number;
  label: string;
  isExecuted: boolean;
  executedDate?: string;
  isDue: boolean;
  dueDate: string;
  formattedDueDate: string;
  daysUntil: number;
  periodKey: string;
}

export interface RecurringTransferCheckResult {
  isExecuted: boolean;
  transferTransaction?: Transaction;
  executedDate?: string;
}

/**
 * Checks if a recurring transfer has already been executed for the current cycle.
 */
export function isRecurringTransferExecutedForCurrentCycle(
  transfer: RecurringTransfer,
  transactions: Transaction[] = [],
  refDate: Date = new Date()
): RecurringTransferCheckResult {
  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  // Yearly check
  if (transfer.frequency === 'yearly') {
    const yearKey = String(currentYear);
    if (transfer.lastTransferredPeriod === yearKey) {
      return {
        isExecuted: true,
        executedDate: transfer.lastTransferredDate || `${yearKey}-${String(transfer.dueMonth || 1).padStart(2, '0')}-${String(transfer.dueDay).padStart(2, '0')}`,
      };
    }
    if (transfer.lastTransferredDate && transfer.lastTransferredDate.startsWith(yearKey)) {
      return {
        isExecuted: true,
        executedDate: transfer.lastTransferredDate,
      };
    }
    const matchingYearTx = transactions.find(t => {
      if (t.type !== 'transfer') return false;
      if (!t.date || !t.date.startsWith(yearKey)) return false;
      if (t.recurringTransferId === transfer.id) return true;
      if (
        t.bankAccountId === transfer.fromBankAccountId &&
        t.toBankAccountId === transfer.toBankAccountId &&
        Math.abs(t.amount - transfer.amount) < 0.01
      ) {
        return true;
      }
      return false;
    });
    if (matchingYearTx) {
      return {
        isExecuted: true,
        transferTransaction: matchingYearTx,
        executedDate: matchingYearTx.date,
      };
    }
    return { isExecuted: false };
  }

  // 1. Direct flags for monthly / biweekly / weekly
  if (transfer.lastTransferredPeriod === currentMonthKey) {
    return {
      isExecuted: true,
      executedDate: transfer.lastTransferredDate || `${currentMonthKey}-${String(transfer.dueDay).padStart(2, '0')}`,
    };
  }

  if (transfer.lastTransferredDate && transfer.lastTransferredDate.startsWith(currentMonthKey)) {
    return {
      isExecuted: true,
      executedDate: transfer.lastTransferredDate,
    };
  }

  // 2. Matching transactions in state
  const matchingTx = transactions.find(t => {
    if (t.type !== 'transfer') return false;
    if (!t.date || !t.date.startsWith(currentMonthKey)) return false;
    if (t.recurringTransferId === transfer.id) return true;
    if (
      t.bankAccountId === transfer.fromBankAccountId &&
      t.toBankAccountId === transfer.toBankAccountId &&
      Math.abs(t.amount - transfer.amount) < 0.01
    ) {
      return true;
    }
    return false;
  });

  if (matchingTx) {
    return {
      isExecuted: true,
      transferTransaction: matchingTx,
      executedDate: matchingTx.date,
    };
  }

  return { isExecuted: false };
}

export interface RecurringTransferSummary {
  totalMonthlyAmount: number;
  activeCount: number;
  automatedCount: number;
  executedCount: number;
  pendingCount: number;
  pendingAmount: number;
}

/**
 * Computes summary statistics for recurring transfers.
 */
export function getRecurringTransferSummary(
  transfers: RecurringTransfer[] = [],
  transactions: Transaction[] = [],
  refDate: Date = new Date()
): RecurringTransferSummary {
  let totalMonthlyAmount = 0;
  let activeCount = 0;
  let automatedCount = 0;
  let executedCount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;

  transfers.forEach(transfer => {
    if (!transfer.isActive) return;

    activeCount += 1;
    if (transfer.autoRegister) {
      automatedCount += 1;
    }

    let monthlyEquivalent = transfer.amount;
    if (transfer.frequency === 'yearly') {
      monthlyEquivalent = transfer.amount / 12;
    } else if (transfer.frequency === 'biweekly' || transfer.frequency === 'weekly') {
      if (transfer.installments && transfer.installments.length > 0) {
        monthlyEquivalent = transfer.installments.reduce((sum, i) => sum + i.amount, 0);
      } else {
        monthlyEquivalent = transfer.amount;
      }
    }
    totalMonthlyAmount += monthlyEquivalent;

    const check = isRecurringTransferExecutedForCurrentCycle(transfer, transactions, refDate);
    if (check.isExecuted) {
      executedCount += 1;
    } else {
      pendingCount += 1;
      pendingAmount += monthlyEquivalent;
    }
  });

  return {
    totalMonthlyAmount,
    activeCount,
    automatedCount,
    executedCount,
    pendingCount,
    pendingAmount,
  };
}

export interface AutoRegisteredTransferResult {
  transferId: string;
  title: string;
  amount: number;
  currency?: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  date: string;
  installmentName?: string;
}

/**
 * Scans active recurring transfers with autoRegister enabled and registers any due transfers
 * that have not yet been executed in the current period.
 */
export function processAutoRecurringTransfers(
  state: FamilyState,
  refDate: Date = new Date()
): { updatedState: FamilyState; registeredItems: AutoRegisteredTransferResult[] } {
  if (!state || !Array.isArray(state.recurringTransfers) || state.recurringTransfers.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonthStr}`;
  const todayDay = refDate.getDate();

  const newTransactions: Transaction[] = [];
  const registeredItems: AutoRegisteredTransferResult[] = [];
  let updatedBankAccounts = [...(state.bankAccounts || [])];

  const updatedRecurringTransfers = state.recurringTransfers.map(transfer => {
    if (!transfer.isActive || !transfer.autoRegister) {
      return transfer;
    }

    const maxDays = new Date(currentYear, currentMonthNum, 0).getDate();

    // Frequency: biweekly or weekly with installments
    if ((transfer.frequency === 'biweekly' || transfer.frequency === 'weekly') && transfer.installments && transfer.installments.length > 0) {
      let updatedInstallments = [...transfer.installments];
      let didExecuteAny = false;

      updatedInstallments = updatedInstallments.map((inst, idx) => {
        const subKey = transfer.frequency === 'biweekly' ? `Q${idx + 1}` : `W${idx + 1}`;
        const periodKey = `${currentMonthKey}-${subKey}`;
        const actualDueDay = Math.min(maxDays, Math.max(1, inst.day || 1));
        const isDue = todayDay >= actualDueDay;

        const isAlreadyExecuted = inst.lastRegisteredPeriod === periodKey || newTransactions.some(
          t => t.recurringTransferId === transfer.id && t.date?.startsWith(currentMonthKey) && t.description?.includes(subKey)
        );

        if (isDue && !isAlreadyExecuted) {
          const targetDayStr = String(actualDueDay).padStart(2, '0');
          const txDate = `${currentMonthKey}-${targetDayStr}`;
          const instLabel = inst.name || inst.label || subKey;

          const fromMember = state.members.find(m => m.id === transfer.fromMemberId);
          const fromAcc = state.bankAccounts.find(b => b.id === transfer.fromBankAccountId);
          const senderName = fromMember?.name || fromAcc?.name || 'Emisor';

          const newTx: Transaction = {
            id: `tx-rec-trans-auto-${transfer.id}-${subKey}-${Date.now()}`,
            date: txDate,
            description: `${senderName} - Transferencia programada [Auto]: ${transfer.title} (${instLabel})`,
            amount: inst.amount,
            type: 'transfer',
            category: transfer.category || 'Transferencia Interna',
            memberId: transfer.fromMemberId || state.members[0]?.id || '',
            toMemberId: transfer.toMemberId,
            bankAccountId: transfer.fromBankAccountId,
            toBankAccountId: transfer.toBankAccountId,
            tags: ['Fijo/Recurrente', 'Transferencia', 'Automático', instLabel, subKey],
            currency: transfer.currency,
            originalAmount: inst.originalAmount,
            exchangeRate: transfer.exchangeRate,
            createdAt: Date.now(),
            recurringTransferId: transfer.id,
            isAutoLogged: true,
          };

          newTransactions.push(newTx);
          registeredItems.push({
            transferId: transfer.id,
            title: transfer.title,
            amount: inst.amount,
            currency: transfer.currency,
            fromBankAccountId: transfer.fromBankAccountId,
            toBankAccountId: transfer.toBankAccountId,
            date: txDate,
            installmentName: instLabel,
          });

          // Update balances
          updatedBankAccounts = updatedBankAccounts.map(b => {
            if (b.id === transfer.fromBankAccountId) {
              const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
              return applyTransactionToAccount(b, 'transfer', amtInAcc, true);
            }
            if (b.id === transfer.toBankAccountId) {
              const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
              return applyTransactionToAccount(b, 'transfer', amtInAcc, false);
            }
            return b;
          });

          didExecuteAny = true;
          return {
            ...inst,
            lastRegisteredDate: txDate,
            lastRegisteredPeriod: periodKey,
          };
        }

        return inst;
      });

      if (didExecuteAny) {
        return {
          ...transfer,
          installments: updatedInstallments,
          lastTransferredDate: newTransactions[newTransactions.length - 1]?.date || transfer.lastTransferredDate,
          lastTransferredPeriod: currentMonthKey,
        };
      }

      return transfer;
    }

    // Yearly check
    if (transfer.frequency === 'yearly') {
      const transferDueMonth = transfer.dueMonth || 1;
      const isDueThisMonth = currentMonthNum === transferDueMonth;
      const actualDueDay = Math.min(maxDays, Math.max(1, transfer.dueDay || 1));
      const isDue = isDueThisMonth && todayDay >= actualDueDay;
      const yearKey = String(currentYear);

      const check = isRecurringTransferExecutedForCurrentCycle(transfer, state.transactions, refDate);
      const isAlreadyExecuted = check.isExecuted || newTransactions.some(t => t.recurringTransferId === transfer.id && t.date?.startsWith(yearKey));

      if (isDue && !isAlreadyExecuted) {
        const targetDayStr = String(actualDueDay).padStart(2, '0');
        const txDate = `${currentMonthKey}-${targetDayStr}`;

        const fromMember = state.members.find(m => m.id === transfer.fromMemberId);
        const fromAcc = state.bankAccounts.find(b => b.id === transfer.fromBankAccountId);
        const senderName = fromMember?.name || fromAcc?.name || 'Emisor';

        const newTx: Transaction = {
          id: `tx-rec-trans-auto-${transfer.id}-${Date.now()}`,
          date: txDate,
          description: `${senderName} - Transferencia anual programada [Auto]: ${transfer.title}`,
          amount: transfer.amount,
          type: 'transfer',
          category: transfer.category || 'Transferencia Interna',
          memberId: transfer.fromMemberId || state.members[0]?.id || '',
          toMemberId: transfer.toMemberId,
          bankAccountId: transfer.fromBankAccountId,
          toBankAccountId: transfer.toBankAccountId,
          tags: ['Fijo/Recurrente', 'Transferencia', 'Automático', 'Anual'],
          currency: transfer.currency,
          originalAmount: transfer.originalAmount,
          exchangeRate: transfer.exchangeRate,
          createdAt: Date.now(),
          recurringTransferId: transfer.id,
          isAutoLogged: true,
        };

        newTransactions.push(newTx);
        registeredItems.push({
          transferId: transfer.id,
          title: transfer.title,
          amount: transfer.amount,
          currency: transfer.currency,
          fromBankAccountId: transfer.fromBankAccountId,
          toBankAccountId: transfer.toBankAccountId,
          date: txDate,
        });

        updatedBankAccounts = updatedBankAccounts.map(b => {
          if (b.id === transfer.fromBankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'transfer', amtInAcc, true);
          }
          if (b.id === transfer.toBankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'transfer', amtInAcc, false);
          }
          return b;
        });

        return {
          ...transfer,
          lastTransferredDate: txDate,
          lastTransferredPeriod: yearKey,
        };
      }

      return transfer;
    }

    // Monthly check
    const actualDueDay = Math.min(maxDays, Math.max(1, transfer.dueDay || 1));
    const isDue = todayDay >= actualDueDay;

    const check = isRecurringTransferExecutedForCurrentCycle(transfer, state.transactions, refDate);
    const isAlreadyExecuted = check.isExecuted || newTransactions.some(t => t.recurringTransferId === transfer.id && t.date?.startsWith(currentMonthKey));

    if (isDue && !isAlreadyExecuted) {
      const targetDayStr = String(actualDueDay).padStart(2, '0');
      const txDate = `${currentMonthKey}-${targetDayStr}`;

      const fromMember = state.members.find(m => m.id === transfer.fromMemberId);
      const fromAcc = state.bankAccounts.find(b => b.id === transfer.fromBankAccountId);
      const senderName = fromMember?.name || fromAcc?.name || 'Emisor';

      const newTx: Transaction = {
        id: `tx-rec-trans-auto-${transfer.id}-${Date.now()}`,
        date: txDate,
        description: `${senderName} - Transferencia programada [Auto]: ${transfer.title}`,
        amount: transfer.amount,
        type: 'transfer',
        category: transfer.category || 'Transferencia Interna',
        memberId: transfer.fromMemberId || state.members[0]?.id || '',
        toMemberId: transfer.toMemberId,
        bankAccountId: transfer.fromBankAccountId,
        toBankAccountId: transfer.toBankAccountId,
        tags: ['Fijo/Recurrente', 'Transferencia', 'Automático'],
        currency: transfer.currency,
        originalAmount: transfer.originalAmount,
        exchangeRate: transfer.exchangeRate,
        createdAt: Date.now(),
        recurringTransferId: transfer.id,
        isAutoLogged: true,
      };

      newTransactions.push(newTx);
      registeredItems.push({
        transferId: transfer.id,
        title: transfer.title,
        amount: transfer.amount,
        currency: transfer.currency,
        fromBankAccountId: transfer.fromBankAccountId,
        toBankAccountId: transfer.toBankAccountId,
        date: txDate,
      });

      // Update bank account balances
      updatedBankAccounts = updatedBankAccounts.map(b => {
        if (b.id === transfer.fromBankAccountId) {
          const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
          return applyTransactionToAccount(b, 'transfer', amtInAcc, true);
        }
        if (b.id === transfer.toBankAccountId) {
          const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
          return applyTransactionToAccount(b, 'transfer', amtInAcc, false);
        }
        return b;
      });

      return {
        ...transfer,
        lastTransferredDate: txDate,
        lastTransferredPeriod: currentMonthKey,
      };
    }

    return transfer;
  });

  if (newTransactions.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const updatedState: FamilyState = {
    ...state,
    transactions: [...newTransactions, ...state.transactions],
    bankAccounts: updatedBankAccounts,
    recurringTransfers: updatedRecurringTransfers,
    updatedAt: Date.now(),
  };

  return { updatedState, registeredItems };
}

export interface AutoRegisteredExpenseResult {
  expenseId: string;
  title: string;
  amount: number;
  currency?: string;
  date: string;
}

/**
 * Scans active recurring expenses with autoLogTransaction or autoRegister enabled
 * and registers any due expenses that have not yet been paid for the current period.
 */
export function processAutoRecurringExpenses(
  state: FamilyState,
  refDate: Date = new Date()
): { updatedState: FamilyState; registeredItems: AutoRegisteredExpenseResult[] } {
  if (!state || !Array.isArray(state.recurringExpenses) || state.recurringExpenses.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const currentYear = refDate.getFullYear();
  const currentMonthNum = refDate.getMonth() + 1;
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonthStr}`;
  const todayDay = refDate.getDate();

  const newTransactions: Transaction[] = [];
  const registeredItems: AutoRegisteredExpenseResult[] = [];
  let updatedBankAccounts = [...(state.bankAccounts || [])];

  const updatedRecurringExpenses = state.recurringExpenses.map(expense => {
    const isAuto = expense.isActive && (expense.autoLogTransaction || (expense as any).autoRegister);
    if (!isAuto) {
      return expense;
    }

    const maxDays = new Date(currentYear, currentMonthNum, 0).getDate();
    const actualDueDay = Math.min(maxDays, Math.max(1, expense.dueDay || 1));
    const isDue = todayDay >= actualDueDay;

    const check = isRecurringExpensePaidForCurrentCycle(expense, state.transactions, refDate);
    const isAlreadyPaid = check.isPaid || newTransactions.some(t => t.recurringExpenseId === expense.id);

    if (isDue && !isAlreadyPaid) {
      const targetDayStr = String(actualDueDay).padStart(2, '0');
      const txDate = `${currentMonthKey}-${targetDayStr}`;

      const newTx: Transaction = {
        id: `tx-rec-exp-auto-${expense.id}-${Date.now()}`,
        date: txDate,
        description: `Gasto fijo [Auto]: ${expense.title}`,
        amount: expense.amount,
        type: 'expense',
        category: expense.category,
        memberId: expense.memberId,
        bankAccountId: expense.paymentAccountId,
        tags: ['Fijo/Recurrente', 'Gasto', 'Automático'],
        currency: expense.currency,
        originalAmount: expense.originalAmount,
        exchangeRate: expense.exchangeRate,
        createdAt: Date.now(),
        recurringExpenseId: expense.id,
        isAutoLogged: true,
      };

      newTransactions.push(newTx);
      registeredItems.push({
        expenseId: expense.id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        date: txDate,
      });

      if (expense.paymentAccountId) {
        updatedBankAccounts = updatedBankAccounts.map(b => {
          if (b.id === expense.paymentAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, state.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'expense', amtInAcc, false);
          }
          return b;
        });
      }

      return {
        ...expense,
        lastPaidDate: txDate,
        lastPaidMonth: currentMonthKey,
      };
    }

    return expense;
  });

  if (newTransactions.length === 0) {
    return { updatedState: state, registeredItems: [] };
  }

  const updatedState: FamilyState = {
    ...state,
    transactions: [...newTransactions, ...state.transactions],
    bankAccounts: updatedBankAccounts,
    recurringExpenses: updatedRecurringExpenses,
    updatedAt: Date.now(),
  };

  return { updatedState, registeredItems };
}
