import { BankAccount, Transaction } from '../types';
import { getEstimatedExchangeRate } from './currencies';

/**
 * Calculates the exact amount of a transaction in the target bank account's currency.
 */
export function getTxAmountInAccountCurrency(
  tx: { amount: number; originalAmount?: number; currency?: string; exchangeRate?: number },
  account: BankAccount,
  baseCurrencyCode: string
): number {
  const accCurrency = (account.currency || baseCurrencyCode || 'DOP').toUpperCase();
  const txCurrency = (tx.currency || baseCurrencyCode || 'DOP').toUpperCase();
  const baseCurrency = (baseCurrencyCode || 'DOP').toUpperCase();

  // 1. If transaction currency directly matches the account currency and has originalAmount
  if (txCurrency === accCurrency && tx.originalAmount !== undefined && tx.originalAmount > 0) {
    return Number(tx.originalAmount.toFixed(2));
  }

  // 2. If account is in base currency, tx.amount is already normalized in base currency
  if (accCurrency === baseCurrency) {
    return Number(tx.amount.toFixed(2));
  }

  // 3. If tx was in foreign currency with exchangeRate (tx.amount = originalAmount * exchangeRate)
  if (txCurrency === accCurrency) {
    return Number((tx.originalAmount ?? tx.amount).toFixed(2));
  }

  // 4. Convert using cross exchange rate
  const rate = getEstimatedExchangeRate(txCurrency, accCurrency);
  const srcAmount = tx.originalAmount !== undefined && tx.originalAmount > 0 ? tx.originalAmount : tx.amount;
  return Number((srcAmount * rate).toFixed(2));
}

/**
 * Applies a transaction to a bank account balance.
 * - For Checking, Savings, and Investment:
 *   - Expense / Transfer Origin: Decreases balance
 *   - Income / Transfer Destination: Increases balance
 * - For Credit Cards & Loans (where balance represents debt/outstanding balance):
 *   - Expense / Transfer Origin (cash advance): Increases debt (+balance)
 *   - Income / Transfer Destination (payment/abono): Decreases debt (-balance)
 */
export function applyTransactionToAccount(
  account: BankAccount,
  txType: 'income' | 'expense' | 'transfer',
  amountInAccCurrency: number,
  isTransferOrigin: boolean = false
): BankAccount {
  const isDebtProduct = account.accountType === 'credit' || account.accountType === 'loan';
  let newBalance = account.balance;

  if (txType === 'transfer') {
    if (isTransferOrigin) {
      // Outgoing from this account
      if (isDebtProduct) {
        // Cash advance / debt withdrawal: increases debt
        newBalance = Number((account.balance + amountInAccCurrency).toFixed(2));
      } else {
        // Liquid account: decreases funds
        newBalance = Number((account.balance - amountInAccCurrency).toFixed(2));
      }
    } else {
      // Incoming to this account
      if (isDebtProduct) {
        // Payment / abono applied to credit card or loan: decreases debt
        newBalance = Number((account.balance - amountInAccCurrency).toFixed(2));
      } else {
        // Liquid account: increases funds
        newBalance = Number((account.balance + amountInAccCurrency).toFixed(2));
      }
    }
  } else if (txType === 'expense') {
    if (isDebtProduct) {
      // Purchase with credit card / extra loan charge: increases debt
      newBalance = Number((account.balance + amountInAccCurrency).toFixed(2));
    } else {
      // Payment from checking/savings: decreases funds
      newBalance = Number((account.balance - amountInAccCurrency).toFixed(2));
    }
  } else if (txType === 'income') {
    if (isDebtProduct) {
      // Credit card refund or payment: decreases debt
      newBalance = Number((account.balance - amountInAccCurrency).toFixed(2));
    } else {
      // Deposit into checking/savings: increases funds
      newBalance = Number((account.balance + amountInAccCurrency).toFixed(2));
    }
  }

  return {
    ...account,
    balance: newBalance,
    lastSynced: 'Actualizado por movimiento',
  };
}

/**
 * Reverts the balance impact of a transaction from a bank account.
 */
export function revertTransactionFromAccount(
  account: BankAccount,
  txType: 'income' | 'expense' | 'transfer',
  amountInAccCurrency: number,
  isTransferOrigin: boolean = false
): BankAccount {
  if (txType === 'transfer') {
    return applyTransactionToAccount(account, 'transfer', amountInAccCurrency, !isTransferOrigin);
  }
  const oppositeType: 'income' | 'expense' = txType === 'income' ? 'expense' : 'income';
  return applyTransactionToAccount(account, oppositeType, amountInAccCurrency, false);
}

export interface AccountTransactionsSummary {
  linkedTransactions: Transaction[];
  totalIncomes: number;
  totalExpenses: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  netFlow: number;
  totalMovements: number;
}

/**
 * Converts any amount between currencies using current estimated rates.
 */
export function convertAmountToAccountCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  const rate = getEstimatedExchangeRate(fromCurrency, toCurrency);
  return Number((amount * rate).toFixed(2));
}

/**
 * Summarizes all transactions linked to a specific bank account.
 */
export function calculateAccountTransactionsSummary(
  account: BankAccount,
  transactions: Transaction[],
  baseCurrencyCode: string
): AccountTransactionsSummary {
  const linked = transactions.filter(
    tx => tx.bankAccountId === account.id || tx.toBankAccountId === account.id
  );

  let totalIncomes = 0;
  let totalExpenses = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;

  linked.forEach(tx => {
    const amt = getTxAmountInAccountCurrency(tx, account, baseCurrencyCode);
    if (tx.type === 'transfer') {
      if (tx.bankAccountId === account.id) {
        totalTransfersOut += amt;
      }
      if (tx.toBankAccountId === account.id) {
        totalTransfersIn += amt;
      }
    } else if (tx.type === 'income') {
      totalIncomes += amt;
    } else if (tx.type === 'expense') {
      totalExpenses += amt;
    }
  });

  const isDebtProduct = account.accountType === 'credit' || account.accountType === 'loan';
  // For liquid: Incomes + TransfersIn - Expenses - TransfersOut
  // For debt: Expenses + TransfersOut (increased debt) - Incomes - TransfersIn (reduced debt)
  const netFlow = isDebtProduct
    ? (totalExpenses + totalTransfersOut) - (totalIncomes + totalTransfersIn)
    : (totalIncomes + totalTransfersIn) - (totalExpenses + totalTransfersOut);

  return {
    linkedTransactions: linked,
    totalIncomes: Number(totalIncomes.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalTransfersIn: Number(totalTransfersIn.toFixed(2)),
    totalTransfersOut: Number(totalTransfersOut.toFixed(2)),
    netFlow: Number(netFlow.toFixed(2)),
    totalMovements: linked.length,
  };
}

export interface TreasuryMetrics {
  liquid: number;
  debt: number;
  investments: number;
  netWorth: number;
  totalAccounts: number;
}

/**
 * Computes consolidated treasury metrics converted into the family's base currency.
 */
export function calculateTreasuryMetrics(
  accounts: BankAccount[],
  baseCurrencyCode: string
): TreasuryMetrics {
  let liquid = 0;
  let debt = 0;
  let investments = 0;

  (accounts || []).forEach(acc => {
    const accCurrency = (acc.currency || baseCurrencyCode || 'DOP').toUpperCase();
    const rate = getEstimatedExchangeRate(accCurrency, baseCurrencyCode);
    const convertedBal = (acc.balance || 0) * rate;

    if (acc.accountType === 'checking' || acc.accountType === 'savings') {
      liquid += convertedBal;
    } else if (acc.accountType === 'credit') {
      // Credit card balance represents current debt/used credit
      debt += Math.abs(convertedBal);
    } else if (acc.accountType === 'loan') {
      // Loan balance represents outstanding debt
      debt += Math.abs(convertedBal);
    } else if (acc.accountType === 'investment') {
      investments += convertedBal;
    }
  });

  const netWorth = (liquid + investments) - debt;

  return {
    liquid: Number(liquid.toFixed(2)),
    debt: Number(debt.toFixed(2)),
    investments: Number(investments.toFixed(2)),
    netWorth: Number(netWorth.toFixed(2)),
    totalAccounts: (accounts || []).length,
  };
}

export interface AccountDueDateInfo {
  nextDateStr: string; // "YYYY-MM-DD"
  formattedDate: string; // e.g. "1 oct 2026"
  formattedLongDate: string; // e.g. "1 de octubre de 2026"
  formattedShortDate: string; // e.g. "1 oct"
  day: number;
  daysRemaining: number;
  status: 'today' | 'soon' | 'future' | 'overdue';
  badgeText: string;
  dueDayDescription: string;
}

const SPANISH_MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const SPANISH_MONTH_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Calculates the exact next upcoming due date for an account (loan or credit),
 * prioritizing explicit dueDate if provided and upcoming, or calculating the next
 * recurring monthly cycle date based on dueDay.
 */
export function getAccountNextDueDate(
  account?: { dueDay?: number; dueDate?: string },
  refDate: Date = new Date()
): AccountDueDateInfo | null {
  if (!account || (account.dueDay === undefined && !account.dueDate)) {
    return null;
  }

  const todayYear = refDate.getFullYear();
  const todayMonth = refDate.getMonth(); // 0-11
  const todayDay = refDate.getDate();
  const todayMidnight = new Date(todayYear, todayMonth, todayDay, 0, 0, 0, 0);

  let targetDate: Date | null = null;

  // 1. If explicit dueDate is defined (YYYY-MM-DD)
  if (account.dueDate && typeof account.dueDate === 'string' && account.dueDate.trim()) {
    const cleanDate = account.dueDate.trim().slice(0, 10);
    const parts = cleanDate.split('-');
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const explicitDate = new Date(y, m - 1, d, 0, 0, 0, 0);
        const diffDays = Math.round((explicitDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        // If the explicit dueDate is today or in the future, use it directly
        if (diffDays >= 0) {
          targetDate = explicitDate;
        }
      }
    }
  }

  // 2. If no future explicit dueDate was found, calculate the next monthly occurrence from dueDay
  if (!targetDate) {
    let dayNum = account.dueDay;
    // If dueDay was not explicitly given, try to extract it from dueDate
    if (dayNum === undefined && account.dueDate) {
      const parts = account.dueDate.slice(0, 10).split('-');
      if (parts.length >= 3) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d)) dayNum = d;
      }
    }

    if (dayNum === undefined || isNaN(dayNum)) {
      // If we only had an expired explicit dueDate with no recurring day info
      if (account.dueDate) {
        const parts = account.dueDate.slice(0, 10).split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        targetDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        return null;
      }
    } else {
      const clampedDay = Math.min(Math.max(1, dayNum), 31);
      const daysInThisMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
      const thisMonthTargetDay = Math.min(clampedDay, daysInThisMonth);

      if (todayDay <= thisMonthTargetDay) {
        // Due date hasn't passed yet in current month
        targetDate = new Date(todayYear, todayMonth, thisMonthTargetDay, 0, 0, 0, 0);
      } else {
        // Due date already passed in current month, calculate for the next month
        let nextYear = todayYear;
        let nextMonth = todayMonth + 1;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear += 1;
        }
        const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        const nextMonthTargetDay = Math.min(clampedDay, daysInNextMonth);
        targetDate = new Date(nextYear, nextMonth, nextMonthTargetDay, 0, 0, 0, 0);
      }
    }
  }

  const resY = targetDate.getFullYear();
  const resM = targetDate.getMonth(); // 0-11
  const resD = targetDate.getDate();
  const nextDateStr = `${resY}-${String(resM + 1).padStart(2, '0')}-${String(resD).padStart(2, '0')}`;

  const diffMs = targetDate.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let status: 'today' | 'soon' | 'future' | 'overdue' = 'future';
  let badgeText = '';

  if (daysRemaining < 0) {
    status = 'overdue';
    badgeText = daysRemaining === -1 ? 'Venció ayer' : `Venció hace ${Math.abs(daysRemaining)} días`;
  } else if (daysRemaining === 0) {
    status = 'today';
    badgeText = 'Vence hoy';
  } else if (daysRemaining === 1) {
    status = 'soon';
    badgeText = 'Vence mañana';
  } else if (daysRemaining <= 3) {
    status = 'soon';
    badgeText = `En ${daysRemaining} días`;
  } else {
    status = 'future';
    badgeText = `En ${daysRemaining} días`;
  }

  const formattedDate = `${resD} ${SPANISH_MONTH_SHORT[resM]} ${resY}`;
  const formattedLongDate = `${resD} de ${SPANISH_MONTH_LONG[resM]} de ${resY}`;
  const formattedShortDate = `${resD} ${SPANISH_MONTH_SHORT[resM]}`;
  const effectiveDueDay = account.dueDay !== undefined ? account.dueDay : resD;
  const dueDayDescription = `Día ${effectiveDueDay} de cada mes`;

  return {
    nextDateStr,
    formattedDate,
    formattedLongDate,
    formattedShortDate,
    day: effectiveDueDay,
    daysRemaining,
    status,
    badgeText,
    dueDayDescription,
  };
}
