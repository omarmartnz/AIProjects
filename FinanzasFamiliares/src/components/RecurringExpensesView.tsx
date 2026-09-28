import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  X,
  CreditCard,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Coins,
  ArrowRightLeft,
  RotateCcw,
  TrendingUp,
  Receipt,
  Wallet,
  Building2,
  ArrowDownLeft,
  AlertCircle,
  Check,
  Zap,
} from 'lucide-react';
import { FamilyState, RecurringExpense, RecurringIncome, RecurringIncomeInstallment, RecurringTransfer } from '../types';
import { RecurringTransferModal } from './RecurringTransferModal';
import { RecurringTransfersSection } from './RecurringTransfersSection';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getEstimatedExchangeRate,
  fetchLiveExchangeRate,
  convertAmount,
  formatMoney,
  formatCurrencyAmount,
} from '../utils/currencies';
import {
  getRecurringExpenseSummary,
  formatFullDate,
  computeRecurringIncomeNextDueDate,
  getRecurringIncomeSummary,
} from '../utils/recurringUtils';

interface RecurringExpensesViewProps {
  state: FamilyState;
  onAddRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'nextDueDate'>) => void;
  onUpdateRecurringExpense?: (id: string, updates: Partial<RecurringExpense>) => void;
  onDeleteRecurringExpense: (id: string) => void;
  onToggleRecurringActive: (id: string) => void;
  onPayRecurringExpense: (expense: RecurringExpense) => void;
  onToggleRecurringExpenseAutoRegister?: (id: string) => void;
  // Recurring Incomes
  onAddRecurringIncome?: (income: Omit<RecurringIncome, 'id' | 'nextDueDate'>) => void;
  onUpdateRecurringIncome?: (id: string, updates: Partial<RecurringIncome>) => void;
  onDeleteRecurringIncome?: (id: string) => void;
  onToggleRecurringIncomeActive?: (id: string) => void;
  onToggleRecurringIncomeAutoRegister?: (id: string) => void;
  onCollectRecurringIncome?: (income: RecurringIncome, installment?: RecurringIncomeInstallment) => void;
  // Recurring Transfers
  onAddRecurringTransfer?: (transfer: Omit<RecurringTransfer, 'id' | 'nextDueDate'>) => void;
  onUpdateRecurringTransfer?: (id: string, updates: Partial<RecurringTransfer>) => void;
  onDeleteRecurringTransfer?: (id: string) => void;
  onToggleRecurringTransferActive?: (id: string) => void;
  onToggleRecurringTransferAutoRegister?: (id: string) => void;
  onExecuteRecurringTransfer?: (transfer: RecurringTransfer) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const INCOME_SOURCES = [
  'Nómina / Sueldo',
  'Honorarios Profesionales',
  'Alquiler Percibido',
  'Pensión / Jubilación',
  'Inversiones / Dividendos',
  'Remesas Familiares',
  'Negocio Propio / Ventas',
  'Otro Ingreso Fijo',
];

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case 'checking': return 'Cta. Corriente';
    case 'savings': return 'Cta. Ahorros';
    case 'credit': return 'Tarjeta Crédito';
    case 'investment': return 'Inversión';
    case 'loan': return 'Préstamo';
    default: return 'Cuenta';
  }
};

export const RecurringExpensesView: React.FC<RecurringExpensesViewProps> = ({
  state,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onToggleRecurringActive,
  onPayRecurringExpense,
  onToggleRecurringExpenseAutoRegister,
  onAddRecurringIncome,
  onUpdateRecurringIncome,
  onDeleteRecurringIncome,
  onToggleRecurringIncomeActive,
  onToggleRecurringIncomeAutoRegister,
  onCollectRecurringIncome,
  onAddRecurringTransfer,
  onUpdateRecurringTransfer,
  onDeleteRecurringTransfer,
  onToggleRecurringTransferActive,
  onToggleRecurringTransferAutoRegister,
  onExecuteRecurringTransfer,
}) => {
  // Main sub-tabs: Gastos vs Ingresos vs Transferencias
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'incomes' | 'transfers'>('expenses');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<RecurringTransfer | null>(null);

  const baseCurrencyCode = (state.currencyCode || 'USD').toUpperCase();
  const baseCurrencySymbol = state.currency || '$';

  // --- EXPENSE FORM STATE ---
  const [expTitle, setExpTitle] = useState('');
  const [expCurrencyCode, setExpCurrencyCode] = useState(baseCurrencyCode);
  const [expAmountInput, setExpAmountInput] = useState('');
  const [expExchangeRate, setExpExchangeRate] = useState<number>(1.0);
  const [expConvertedAmountInput, setExpConvertedAmountInput] = useState('');
  const [expCategory, setExpCategory] = useState(state.categories[0]?.name || 'Vivienda & Alquiler/Hipoteca');
  const [expMemberId, setExpMemberId] = useState(state.members[0]?.id || '');
  const [expPaymentAccountId, setExpPaymentAccountId] = useState('');
  const [expPaymentAccountError, setExpPaymentAccountError] = useState<string | null>(null);
  const [expFrequency, setExpFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [expDueDay, setExpDueDay] = useState('1');
  const [expAutoRegister, setExpAutoRegister] = useState(true);
  const [expNotes, setExpNotes] = useState('');

  const [expRateStatus, setExpRateStatus] = useState<{
    isLive: boolean;
    date?: string;
    isLoading: boolean;
    source?: 'frankfurter' | 'cache' | 'fallback';
  }>({ isLive: false, isLoading: false });

  // --- INCOME FORM STATE ---
  const [incTitle, setIncTitle] = useState('');
  const [incCategory, setIncCategory] = useState(INCOME_SOURCES[0]);
  const [incFrequency, setIncFrequency] = useState<'monthly' | 'biweekly' | 'yearly' | 'weekly'>('monthly');
  const [incCurrencyCode, setIncCurrencyCode] = useState(baseCurrencyCode);
  const [incExchangeRate, setIncExchangeRate] = useState<number>(1.0);

  // For monthly & yearly single amount
  const [incAmountInput, setIncAmountInput] = useState('');
  const [incDueDay, setIncDueDay] = useState('15');
  const [incDueMonth, setIncDueMonth] = useState('1'); // 1-12 for yearly

  // For biweekly (Quincena 1 y Quincena 2)
  const [incQ1Day, setIncQ1Day] = useState('15');
  const [incQ1Amount, setIncQ1Amount] = useState('');
  const [incQ2Day, setIncQ2Day] = useState('30');
  const [incQ2Amount, setIncQ2Amount] = useState('');

  // For weekly (4 semanas)
  const [incW1Day, setIncW1Day] = useState('7');
  const [incW1Amount, setIncW1Amount] = useState('');
  const [incW2Day, setIncW2Day] = useState('14');
  const [incW2Amount, setIncW2Amount] = useState('');
  const [incW3Day, setIncW3Day] = useState('21');
  const [incW3Amount, setIncW3Amount] = useState('');
  const [incW4Day, setIncW4Day] = useState('28');
  const [incW4Amount, setIncW4Amount] = useState('');

  const [incMemberId, setIncMemberId] = useState(state.members[0]?.id || '');
  const [incDestinationAccountId, setIncDestinationAccountId] = useState('');
  const [incNotes, setIncNotes] = useState('');
  const [incAutoRegister, setIncAutoRegister] = useState(true);

  const [incRateStatus, setIncRateStatus] = useState<{
    isLive: boolean;
    date?: string;
    isLoading: boolean;
    source?: 'frankfurter' | 'cache' | 'fallback';
  }>({ isLive: false, isLoading: false });

  // Quick collect modal for picking an installment or full month
  const [collectModalIncome, setCollectModalIncome] = useState<RecurringIncome | null>(null);

  // --- HELPER METRICS ---
  const getMonthlyEquivalent = (amount: number, freq: 'monthly' | 'yearly' | 'weekly' | 'biweekly'): number => {
    if (freq === 'monthly') return amount;
    if (freq === 'biweekly') return amount * 2;
    if (freq === 'weekly') return amount * 4.33;
    if (freq === 'yearly') return amount / 12;
    return amount;
  };

  const getMonthlyEquivalentIncome = (item: RecurringIncome): number => {
    if (item.frequency === 'yearly') return item.amount / 12;
    // For monthly, biweekly, and weekly, item.amount already stores the total monthly sum
    return item.amount;
  };

  // Expenses commitment
  const totalMonthlyExpenseCommitment = (state.recurringExpenses || [])
    .filter(r => r.isActive)
    .reduce((sum, r) => sum + getMonthlyEquivalent(r.amount, r.frequency), 0);

  const activeExpensesCount = (state.recurringExpenses || []).filter(r => r.isActive).length;

  // Incomes commitment
  const recurringIncomesList = state.recurringIncomes || [];
  const totalMonthlyIncomeCommitment = recurringIncomesList
    .filter(r => r.isActive)
    .reduce((sum, r) => sum + getMonthlyEquivalentIncome(r), 0);

  const activeIncomesCount = recurringIncomesList.filter(r => r.isActive).length;

  // Net fixed balance (Superávit / Déficit fijo)
  const netMonthlyMargin = totalMonthlyIncomeCommitment - totalMonthlyExpenseCommitment;

  // --- EXPENSE HANDLERS ---
  const handleOpenNewExpense = () => {
    setEditingExpenseId(null);
    setExpTitle('');
    setExpCurrencyCode(baseCurrencyCode);
    setExpAmountInput('');
    setExpExchangeRate(1.0);
    setExpConvertedAmountInput('');
    setExpCategory(state.categories[0]?.name || 'Vivienda & Alquiler/Hipoteca');
    // Solo miembros que tienen cuentas bancarias aptas para débito definidas
    const membersWithAccounts = (state.members || []).filter(m =>
      (state.bankAccounts || []).some(b => b.holderMemberId === m.id && b.accountType !== 'loan')
    );
    const defaultMember = membersWithAccounts[0]?.id || state.members[0]?.id || '';
    setExpMemberId(defaultMember);
    setExpFrequency('monthly');
    setExpDueDay('1');
    setExpAutoRegister(true);
    setExpNotes('');
    setExpRateStatus({ isLive: false, isLoading: false });
    setExpPaymentAccountError(null);

    // Cuentas del miembro responsable
    const memberAccounts = (state.bankAccounts || []).filter(
      b => b.holderMemberId === defaultMember && b.accountType !== 'loan'
    );
    setExpPaymentAccountId(memberAccounts[0]?.id || '');

    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (item: RecurringExpense) => {
    setEditingExpenseId(item.id);
    setExpTitle(item.title);
    const itemCurrency = (item.currency || baseCurrencyCode).toUpperCase();
    setExpCurrencyCode(itemCurrency);
    const origAmt = item.originalAmount !== undefined ? item.originalAmount : item.amount;
    setExpAmountInput(origAmt ? String(origAmt) : '');
    const rate = item.exchangeRate !== undefined ? item.exchangeRate : 1.0;
    setExpExchangeRate(rate);
    setExpConvertedAmountInput(String(item.amount || ''));
    setExpCategory(item.category);

    const membersWithAccounts = (state.members || []).filter(m =>
      (state.bankAccounts || []).some(b => b.holderMemberId === m.id && b.accountType !== 'loan')
    );
    const memberIdToUse = membersWithAccounts.some(m => m.id === item.memberId)
      ? item.memberId
      : (membersWithAccounts[0]?.id || item.memberId || '');
    setExpMemberId(memberIdToUse);

    setExpFrequency(item.frequency);
    setExpDueDay(String(item.dueDay));
    setExpAutoRegister(item.autoRegister ?? true);
    setExpNotes(item.notes || '');
    setExpRateStatus({ isLive: false, isLoading: false });
    setExpPaymentAccountError(null);

    const memberAccounts = (state.bankAccounts || []).filter(
      b => b.holderMemberId === memberIdToUse && b.accountType !== 'loan'
    );
    if (item.paymentAccountId && memberAccounts.some(b => b.id === item.paymentAccountId)) {
      setExpPaymentAccountId(item.paymentAccountId);
    } else {
      setExpPaymentAccountId(memberAccounts[0]?.id || '');
    }

    setIsExpenseModalOpen(true);

    if (itemCurrency !== baseCurrencyCode) {
      fetchLiveExchangeRate(itemCurrency, baseCurrencyCode).then(res => {
        setExpRateStatus({
          isLive: res.isLive,
          date: res.date,
          isLoading: false,
          source: res.source,
        });
      });
    }
  };

  const handleExpCurrencyChange = async (newCode: string) => {
    const upper = newCode.toUpperCase();
    setExpCurrencyCode(upper);
    if (upper === baseCurrencyCode) {
      setExpExchangeRate(1.0);
      setExpConvertedAmountInput(expAmountInput);
      setExpRateStatus({ isLive: false, isLoading: false });
    } else {
      const immediateRate = getEstimatedExchangeRate(upper, baseCurrencyCode);
      setExpExchangeRate(immediateRate);
      const parsed = parseFloat(expAmountInput);
      if (!isNaN(parsed) && parsed > 0) {
        setExpConvertedAmountInput(String(convertAmount(parsed, immediateRate)));
      } else {
        setExpConvertedAmountInput('');
      }

      setExpRateStatus({ isLive: false, isLoading: true });
      try {
        const res = await fetchLiveExchangeRate(upper, baseCurrencyCode);
        setExpExchangeRate(res.rate);
        setExpRateStatus({
          isLive: res.isLive,
          date: res.date,
          isLoading: false,
          source: res.source,
        });
        if (!isNaN(parsed) && parsed > 0) {
          setExpConvertedAmountInput(String(convertAmount(parsed, res.rate)));
        }
      } catch {
        setExpRateStatus({ isLive: false, isLoading: false, source: 'fallback' });
      }
    }
  };

  const handleExpRefreshLiveRate = async () => {
    if (expCurrencyCode === baseCurrencyCode) return;
    setExpRateStatus({ isLive: false, isLoading: true });
    try {
      const res = await fetchLiveExchangeRate(expCurrencyCode, baseCurrencyCode, true);
      setExpExchangeRate(res.rate);
      setExpRateStatus({
        isLive: res.isLive,
        date: res.date,
        isLoading: false,
        source: res.source,
      });
      const parsed = parseFloat(expAmountInput);
      if (!isNaN(parsed) && parsed > 0) {
        setExpConvertedAmountInput(String(convertAmount(parsed, res.rate)));
      }
    } catch {
      setExpRateStatus({ isLive: false, isLoading: false, source: 'fallback' });
    }
  };

  const handleExpAmountChange = (val: string) => {
    setExpAmountInput(val);
    const parsed = parseFloat(val);
    if (expCurrencyCode !== baseCurrencyCode) {
      if (!isNaN(parsed) && parsed > 0 && expExchangeRate > 0) {
        setExpConvertedAmountInput(String(convertAmount(parsed, expExchangeRate)));
      } else {
        setExpConvertedAmountInput('');
      }
    } else {
      setExpConvertedAmountInput(val);
    }
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpPaymentAccountError(null);

    const parsedOrig = parseFloat(expAmountInput);
    const parsedDay = parseInt(expDueDay, 10);
    if (!expTitle.trim() || isNaN(parsedOrig) || parsedOrig <= 0) return;

    // Directiva del usuario: al crear o editar un gasto recurrente se debe especificar a qué cuenta debitar
    // y no se puede asignar a cuentas de tipo préstamo
    if (!expPaymentAccountId) {
      setExpPaymentAccountError('Debes seleccionar la cuenta a debitar.');
      return;
    }

    const selectedAcc = (state.bankAccounts || []).find(b => b.id === expPaymentAccountId);
    if (!selectedAcc || selectedAcc.accountType === 'loan') {
      setExpPaymentAccountError('La cuenta seleccionada no es válida.');
      return;
    }

    let normalizedAmount = parsedOrig;
    if (expCurrencyCode !== baseCurrencyCode) {
      const parsedConv = parseFloat(expConvertedAmountInput);
      if (!isNaN(parsedConv) && parsedConv > 0) {
        normalizedAmount = parsedConv;
      } else if (expExchangeRate > 0) {
        normalizedAmount = convertAmount(parsedOrig, expExchangeRate);
      }
    }

    const payload = {
      title: expTitle.trim(),
      amount: normalizedAmount,
      category: expCategory,
      memberId: expMemberId || state.members[0]?.id || 'm-1',
      frequency: expFrequency,
      dueDay: isNaN(parsedDay) ? 1 : Math.min(31, Math.max(1, parsedDay)),
      isActive: true,
      autoRegister: expAutoRegister,
      currency: expCurrencyCode,
      originalAmount: parsedOrig,
      exchangeRate: expCurrencyCode !== baseCurrencyCode ? expExchangeRate : 1.0,
      paymentAccountId: expPaymentAccountId,
      ...(expNotes.trim() ? { notes: expNotes.trim() } : {}),
    };

    if (editingExpenseId && onUpdateRecurringExpense) {
      onUpdateRecurringExpense(editingExpenseId, payload);
    } else {
      onAddRecurringExpense(payload);
    }

    setIsExpenseModalOpen(false);
  };

  const handlePayExpense = (item: RecurringExpense) => {
    const acc = (state.bankAccounts || []).find(b => b.id === item.paymentAccountId);
    if (!item.paymentAccountId || !acc || acc.accountType === 'loan') {
      handleOpenEditExpense(item);
      setExpPaymentAccountError('Esta factura requiere seleccionar la cuenta a debitar antes de registrar el pago.');
      return;
    }
    onPayRecurringExpense(item);
  };

  // --- INCOME HANDLERS ---
  const handleOpenNewIncome = () => {
    setEditingIncomeId(null);
    setIncTitle('');
    setIncCategory(INCOME_SOURCES[0]);
    setIncFrequency('monthly');
    setIncCurrencyCode(baseCurrencyCode);
    setIncExchangeRate(1.0);
    setIncAmountInput('');
    setIncDueDay('15');
    setIncDueMonth('1');
    setIncQ1Day('15');
    setIncQ1Amount('');
    setIncQ2Day('30');
    setIncQ2Amount('');
    setIncW1Day('7');
    setIncW1Amount('');
    setIncW2Day('14');
    setIncW2Amount('');
    setIncW3Day('21');
    setIncW3Amount('');
    setIncW4Day('28');
    setIncW4Amount('');
    const defaultMemberId = state.members[0]?.id || '';
    const memberFirstAcc = state.bankAccounts.find(b => b.holderMemberId === defaultMemberId);
    setIncMemberId(defaultMemberId);
    setIncDestinationAccountId(memberFirstAcc?.id || state.bankAccounts[0]?.id || '');
    setIncNotes('');
    setIncAutoRegister(true);
    setIncRateStatus({ isLive: false, isLoading: false });
    setIsIncomeModalOpen(true);
  };

  const handleOpenEditIncome = (item: RecurringIncome) => {
    setEditingIncomeId(item.id);
    setIncTitle(item.title);
    setIncCategory(item.category || INCOME_SOURCES[0]);
    const itemCurrency = (item.currency || baseCurrencyCode).toUpperCase();
    setIncCurrencyCode(itemCurrency);
    const rate = item.exchangeRate !== undefined ? item.exchangeRate : 1.0;
    setIncExchangeRate(rate);
    setIncMemberId(item.memberId);
    setIncFrequency(item.frequency);
    setIncDestinationAccountId(item.destinationAccountId || '');
    setIncNotes(item.notes || '');
    setIncAutoRegister(item.autoRegister ?? false);
    setIncRateStatus({ isLive: false, isLoading: false });

    const origAmt = item.originalAmount !== undefined ? item.originalAmount : item.amount;
    setIncAmountInput(origAmt ? String(origAmt) : '');
    setIncDueDay(String(item.dueDay || 15));
    setIncDueMonth(String(item.dueMonth || 1));

    if (item.frequency === 'biweekly') {
      const q1 = item.installments?.[0];
      const q2 = item.installments?.[1];
      setIncQ1Day(String(q1?.day || 15));
      setIncQ1Amount(q1 ? String(q1.originalAmount !== undefined ? q1.originalAmount : q1.amount) : String(origAmt ? origAmt / 2 : ''));
      setIncQ2Day(String(q2?.day || 30));
      setIncQ2Amount(q2 ? String(q2.originalAmount !== undefined ? q2.originalAmount : q2.amount) : String(origAmt ? origAmt / 2 : ''));
    } else if (item.frequency === 'weekly') {
      const w1 = item.installments?.[0];
      const w2 = item.installments?.[1];
      const w3 = item.installments?.[2];
      const w4 = item.installments?.[3];
      setIncW1Day(String(w1?.day || 7));
      setIncW1Amount(w1 ? String(w1.originalAmount !== undefined ? w1.originalAmount : w1.amount) : String(origAmt ? origAmt / 4 : ''));
      setIncW2Day(String(w2?.day || 14));
      setIncW2Amount(w2 ? String(w2.originalAmount !== undefined ? w2.originalAmount : w2.amount) : String(origAmt ? origAmt / 4 : ''));
      setIncW3Day(String(w3?.day || 21));
      setIncW3Amount(w3 ? String(w3.originalAmount !== undefined ? w3.originalAmount : w3.amount) : String(origAmt ? origAmt / 4 : ''));
      setIncW4Day(String(w4?.day || 28));
      setIncW4Amount(w4 ? String(w4.originalAmount !== undefined ? w4.originalAmount : w4.amount) : String(origAmt ? origAmt / 4 : ''));
    }

    setIsIncomeModalOpen(true);

    if (itemCurrency !== baseCurrencyCode) {
      fetchLiveExchangeRate(itemCurrency, baseCurrencyCode).then(res => {
        setIncRateStatus({
          isLive: res.isLive,
          date: res.date,
          isLoading: false,
          source: res.source,
        });
      });
    }
  };

  const handleIncCurrencyChange = async (newCode: string) => {
    const upper = newCode.toUpperCase();
    setIncCurrencyCode(upper);
    if (upper === baseCurrencyCode) {
      setIncExchangeRate(1.0);
      setIncRateStatus({ isLive: false, isLoading: false });
    } else {
      const immediateRate = getEstimatedExchangeRate(upper, baseCurrencyCode);
      setIncExchangeRate(immediateRate);
      setIncRateStatus({ isLive: false, isLoading: true });
      try {
        const res = await fetchLiveExchangeRate(upper, baseCurrencyCode);
        setIncExchangeRate(res.rate);
        setIncRateStatus({
          isLive: res.isLive,
          date: res.date,
          isLoading: false,
          source: res.source,
        });
      } catch {
        setIncRateStatus({ isLive: false, isLoading: false, source: 'fallback' });
      }
    }
  };

  const handleIncRefreshLiveRate = async () => {
    if (incCurrencyCode === baseCurrencyCode) return;
    setIncRateStatus({ isLive: false, isLoading: true });
    try {
      const res = await fetchLiveExchangeRate(incCurrencyCode, baseCurrencyCode, true);
      setIncExchangeRate(res.rate);
      setIncRateStatus({
        isLive: res.isLive,
        date: res.date,
        isLoading: false,
        source: res.source,
      });
    } catch {
      setIncRateStatus({ isLive: false, isLoading: false, source: 'fallback' });
    }
  };

  const handleSubmitIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim()) return;

    let totalOriginal = 0;
    let totalNormalized = 0;
    let computedDueDay = 15;
    let installments: RecurringIncomeInstallment[] | undefined = undefined;

    const rate = incCurrencyCode !== baseCurrencyCode ? (incExchangeRate > 0 ? incExchangeRate : 1.0) : 1.0;

    if (incFrequency === 'biweekly') {
      const q1Val = parseFloat(incQ1Amount) || 0;
      const q2Val = parseFloat(incQ2Amount) || 0;
      const q1Day = Math.min(31, Math.max(1, parseInt(incQ1Day, 10) || 15));
      const q2Day = Math.min(31, Math.max(1, parseInt(incQ2Day, 10) || 30));

      if (q1Val <= 0 && q2Val <= 0) return;

      totalOriginal = q1Val + q2Val;
      totalNormalized = convertAmount(totalOriginal, rate);
      computedDueDay = q1Day;

      installments = [
        {
          id: 'q1',
          name: 'Quincena 1',
          day: q1Day,
          amount: convertAmount(q1Val, rate),
          originalAmount: q1Val,
        },
        {
          id: 'q2',
          name: 'Quincena 2',
          day: q2Day,
          amount: convertAmount(q2Val, rate),
          originalAmount: q2Val,
        },
      ];
    } else if (incFrequency === 'weekly') {
      const w1Val = parseFloat(incW1Amount) || 0;
      const w2Val = parseFloat(incW2Amount) || 0;
      const w3Val = parseFloat(incW3Amount) || 0;
      const w4Val = parseFloat(incW4Amount) || 0;
      const w1Day = Math.min(31, Math.max(1, parseInt(incW1Day, 10) || 7));
      const w2Day = Math.min(31, Math.max(1, parseInt(incW2Day, 10) || 14));
      const w3Day = Math.min(31, Math.max(1, parseInt(incW3Day, 10) || 21));
      const w4Day = Math.min(31, Math.max(1, parseInt(incW4Day, 10) || 28));

      totalOriginal = w1Val + w2Val + w3Val + w4Val;
      if (totalOriginal <= 0) return;

      totalNormalized = convertAmount(totalOriginal, rate);
      computedDueDay = w1Day;

      installments = [
        { id: 'w1', name: 'Semana 1', day: w1Day, amount: convertAmount(w1Val, rate), originalAmount: w1Val },
        { id: 'w2', name: 'Semana 2', day: w2Day, amount: convertAmount(w2Val, rate), originalAmount: w2Val },
        { id: 'w3', name: 'Semana 3', day: w3Day, amount: convertAmount(w3Val, rate), originalAmount: w3Val },
        { id: 'w4', name: 'Semana 4', day: w4Day, amount: convertAmount(w4Val, rate), originalAmount: w4Val },
      ];
    } else {
      // Monthly or Yearly
      const parsedOrig = parseFloat(incAmountInput);
      const parsedDay = parseInt(incDueDay, 10);
      if (isNaN(parsedOrig) || parsedOrig <= 0) return;

      totalOriginal = parsedOrig;
      totalNormalized = convertAmount(parsedOrig, rate);
      computedDueDay = isNaN(parsedDay) ? 15 : Math.min(31, Math.max(1, parsedDay));
    }

    const payload: Omit<RecurringIncome, 'id' | 'nextDueDate'> = {
      title: incTitle.trim(),
      amount: totalNormalized,
      category: incCategory,
      memberId: incMemberId || state.members[0]?.id || 'm-1',
      frequency: incFrequency,
      dueDay: computedDueDay,
      ...(incFrequency === 'yearly' ? { dueMonth: Math.min(12, Math.max(1, parseInt(incDueMonth, 10) || 1)) } : {}),
      installments,
      isActive: true,
      currency: incCurrencyCode,
      originalAmount: totalOriginal,
      exchangeRate: incCurrencyCode !== baseCurrencyCode ? rate : 1.0,
      destinationAccountId: incDestinationAccountId || undefined,
      autoRegister: incAutoRegister,
      ...(incNotes.trim() ? { notes: incNotes.trim() } : {}),
    };

    if (editingIncomeId && onUpdateRecurringIncome) {
      onUpdateRecurringIncome(editingIncomeId, payload);
    } else if (onAddRecurringIncome) {
      onAddRecurringIncome(payload);
    }

    setIsIncomeModalOpen(false);
  };

  // Sort lists by due day
  const sortedExpenses = [...(state.recurringExpenses || [])].sort((a, b) => a.dueDay - b.dueDay);
  const sortedIncomes = [...recurringIncomesList].sort((a, b) => a.dueDay - b.dueDay);

  const [expenseFilter, setExpenseFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const expensesWithSummary = useMemo(() => {
    return sortedExpenses.map(item => {
      const summary = getRecurringExpenseSummary(item, state.transactions);
      return { item, summary };
    });
  }, [sortedExpenses, state.transactions]);

  const paidExpensesCount = expensesWithSummary.filter(e => e.item.isActive && e.summary.isPaidThisMonth).length;
  const pendingExpensesCount = expensesWithSummary.filter(e => e.item.isActive && !e.summary.isPaidThisMonth).length;
  const overdueExpensesCount = expensesWithSummary.filter(e => e.item.isActive && e.summary.isOverdue).length;

  const filteredExpensesWithSummary = useMemo(() => {
    if (expenseFilter === 'paid') {
      return expensesWithSummary.filter(e => e.summary.isPaidThisMonth);
    }
    if (expenseFilter === 'pending') {
      return expensesWithSummary.filter(e => !e.summary.isPaidThisMonth);
    }
    return expensesWithSummary;
  }, [expensesWithSummary, expenseFilter]);

  const selectedExpCurrencyObj = getCurrencyByCode(expCurrencyCode);
  const selectedIncCurrencyObj = getCurrencyByCode(incCurrencyCode);

  const handleOpenNewTransfer = () => {
    setEditingTransfer(null);
    setIsTransferModalOpen(true);
  };

  const handleEditTransfer = (transfer: RecurringTransfer) => {
    setEditingTransfer(transfer);
    setIsTransferModalOpen(true);
  };

  const totalTransfersCount = (state.recurringTransfers || []).length;

  return (
    <div className="space-y-5">
      {/* Header and Subtabs Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Finanzas Recurrentes</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Gestiona tus gastos fijos (facturas, suscripciones), ingresos periódicos (salarios) y automatiza los traspasos entre cuentas familiares.
          </p>
        </div>

        {/* Action Button depending on subtab */}
        {activeSubTab === 'expenses' ? (
          <button
            onClick={handleOpenNewExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-600/20 transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Factura / Gasto Fijo</span>
          </button>
        ) : activeSubTab === 'incomes' ? (
          <button
            onClick={handleOpenNewIncome}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Ingreso Fijo</span>
          </button>
        ) : (
          <button
            onClick={handleOpenNewTransfer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-purple-600/20 transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Transferencia Programada</span>
          </button>
        )}
      </div>

      {/* Sub-tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-200/70 dark:bg-stone-900/90 rounded-2xl border border-stone-200 dark:border-stone-800 w-fit">
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Gastos</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
            {sortedExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('incomes')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeSubTab === 'incomes'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Ingresos</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
            {sortedIncomes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeSubTab === 'transfers'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Transferencias</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
            {totalTransfersCount}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GASTOS FIJOS / FACTURAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Compromiso Fijo Mensual</span>
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatMoney(totalMonthlyExpenseCommitment, state.currency)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {paidExpensesCount} pagada{paidExpensesCount === 1 ? '' : 's'} este mes
                </span>
                {pendingExpensesCount > 0 && (
                  <span className="text-stone-400 dark:text-stone-500">
                    • {pendingExpensesCount} pendiente{pendingExpensesCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Proyección Anual de Fijos</span>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
                {formatMoney(totalMonthlyExpenseCommitment * 12, state.currency)}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Estimado a 12 meses de recurrencia
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Impacto en Presupuesto</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
                {state.globalMonthlyBudget > 0
                  ? `${((totalMonthlyExpenseCommitment / state.globalMonthlyBudget) * 100).toFixed(0)}%`
                  : '0%'}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                del presupuesto mensual límite
              </p>
            </div>
          </div>

          {/* Quick Filter Chips & Overdue Alert */}
          {sortedExpenses.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700/60 text-xs">
                <button
                  onClick={() => setExpenseFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    expenseFilter === 'all'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Todas ({sortedExpenses.length})
                </button>
                <button
                  onClick={() => setExpenseFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1.5 ${
                    expenseFilter === 'pending'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <span>Pendientes</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    overdueExpensesCount > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-200'
                  }`}>
                    {pendingExpensesCount}
                  </span>
                </button>
                <button
                  onClick={() => setExpenseFilter('paid')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1.5 ${
                    expenseFilter === 'paid'
                      ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Pagadas este mes</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    {paidExpensesCount}
                  </span>
                </button>
              </div>

              {overdueExpensesCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{overdueExpensesCount} factura{overdueExpensesCount === 1 ? '' : 's'} vencida{overdueExpensesCount === 1 ? '' : 's'} sin pagar</span>
                </div>
              )}
            </div>
          )}

          {/* Expenses Cards / Schedule */}
          {sortedExpenses.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
              <CalendarClock className="w-12 h-12 mx-auto text-stone-400 mb-3" />
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                No has programado ningún gasto fijo o suscripción
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                Agrega recibos recurrentes como alquiler, luz, internet, suscripciones internacionales (Netflix, Spotify) o seguros para tener tu calendario organizado.
              </p>
              <button
                onClick={handleOpenNewExpense}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Primer Gasto Recurrente</span>
              </button>
            </div>
          ) : filteredExpensesWithSummary.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {expenseFilter === 'pending'
                  ? '¡Genial! No tienes facturas pendientes para este mes'
                  : 'No hay facturas en esta vista'}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {expenseFilter === 'pending'
                  ? 'Todas las facturas activas ya fueron pagadas o registradas.'
                  : 'Cambia el filtro para ver tus gastos fijos.'}
              </p>
              <button
                onClick={() => setExpenseFilter('all')}
                className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver todas las facturas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExpensesWithSummary.map(({ item, summary }) => {
                const member = state.members.find(m => m.id === item.memberId);
                const itemCurrency = (item.currency || baseCurrencyCode).toUpperCase();
                const hasForeignCurrency = itemCurrency !== baseCurrencyCode && item.originalAmount !== undefined;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      !item.isActive
                        ? 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/50 opacity-60'
                        : summary.isPaidThisMonth
                        ? 'bg-white dark:bg-stone-900 border-emerald-300 dark:border-emerald-800/70 shadow-xs'
                        : summary.isOverdue
                        ? 'bg-white dark:bg-stone-900 border-rose-300 dark:border-rose-800/80 shadow-xs ring-1 ring-rose-300/40'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              summary.isPaidThisMonth
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : summary.isOverdue
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                            }`}>
                              {item.dueDay}º
                            </span>
                            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                              {item.title}
                            </h4>
                          </div>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                            {item.category} • Día {item.dueDay} de cada mes
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditExpense(item)}
                            className="text-stone-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            title="Editar factura"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onToggleRecurringActive(item.id)}
                            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            title={item.isActive ? 'Pausar recordatorio' : 'Activar recordatorio'}
                          >
                            {item.isActive ? (
                              <ToggleRight className="w-5 h-5 text-blue-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-stone-400" />
                            )}
                          </button>
                          <button
                            onClick={() => onDeleteRecurringExpense(item.id)}
                            className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            title="Eliminar gasto recurrente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Amounts and Member */}
                      <div className="mt-4 flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
                              {formatMoney(item.amount, state.currency)}
                            </span>
                            <span className="text-xs font-normal text-stone-500">
                              /{item.frequency === 'monthly' ? 'mes' : item.frequency === 'yearly' ? 'año' : 'sem'}
                            </span>
                          </div>
                          {member && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {member.name}
                            </span>
                          )}
                        </div>

                        {hasForeignCurrency && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 font-mono text-[11px] font-bold border border-amber-200 dark:border-amber-900/60">
                              <Coins className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              {formatCurrencyAmount(
                                item.originalAmount || item.amount,
                                getCurrencyByCode(itemCurrency).symbol,
                                itemCurrency
                              )}
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">
                              (Tasa: 1 {itemCurrency} = {item.exchangeRate ?? 1} {state.currency})
                            </span>
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                            {item.notes}
                          </p>
                        )}

                        {/* Cuenta de débito asignada */}
                        {(() => {
                          const debitAccount = state.bankAccounts.find(b => b.id === item.paymentAccountId);
                          return (
                            <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-1.5 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {debitAccount?.accountType === 'credit' ? (
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                )}
                                <div className="min-w-0 truncate">
                                  <span className="text-[10px] text-stone-400 block leading-tight font-medium">
                                    Débito programado:
                                  </span>
                                  {debitAccount ? (
                                    <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block text-[11px]" title={`${debitAccount.bankName} - ${debitAccount.name}`}>
                                      {debitAccount.bankName} • {debitAccount.name} <span className="font-mono text-stone-400">({debitAccount.accountNumberMasked})</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 shrink-0" /> Sin cuenta de débito
                                    </span>
                                  )}
                                </div>
                              </div>
                              {debitAccount && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0 border border-blue-100 dark:border-blue-900/40">
                                  {getAccountTypeLabel(debitAccount.accountType)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom: Next Full Payment Date & Registration */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                      {/* Complete Date Box */}
                      <div className={`p-2.5 rounded-xl border transition-colors ${
                        summary.isPaidThisMonth
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50'
                          : summary.isOverdue
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50'
                          : 'bg-stone-50/80 dark:bg-stone-800/60 border-stone-100 dark:border-stone-700/50'
                      }`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight font-bold uppercase tracking-wider">
                            {summary.isPaidThisMonth ? 'Próximo Pago Programado' : 'Fecha de Vencimiento'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                            summary.isPaidThisMonth
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : summary.isOverdue
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-stone-200/70 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}>
                            {summary.relativeBadgeText}
                          </span>
                        </div>

                        <div className="flex items-start gap-2 pt-0.5">
                          <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
                            summary.isPaidThisMonth
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                              : summary.isOverdue
                              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400'
                              : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 leading-snug break-words">
                            {summary.formattedFullDateWithWeekday}
                          </span>
                        </div>
                      </div>

                      {/* Auto-registro status y switch para Gastos */}
                      <div className="p-2 rounded-xl border border-stone-200/70 dark:border-stone-700/60 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              item.autoRegister
                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                            }`}
                          >
                            <Zap className={`w-3.5 h-3.5 ${item.autoRegister ? 'fill-blue-600 dark:fill-blue-400' : ''}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                Auto-registro
                              </span>
                              {item.autoRegister ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Automático
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-stone-400">
                                  Manual
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                              {item.autoRegister
                                ? 'Se asienta solo en movimientos'
                                : 'Requiere pago manual'}
                            </p>
                          </div>
                        </div>

                        {onToggleRecurringExpenseAutoRegister && (
                          <button
                            type="button"
                            onClick={() => onToggleRecurringExpenseAutoRegister(item.id)}
                            className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition shrink-0"
                            title={
                              item.autoRegister
                                ? 'Desactivar registro automático (pasar a manual)'
                                : 'Activar registro automático'
                            }
                          >
                            {item.autoRegister ? (
                              <ToggleRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-stone-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {summary.isPaidThisMonth ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Pagada este mes</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 dark:text-stone-500">
                            {summary.isOverdue ? 'Atrasada' : 'Pendiente'}
                          </span>
                        )}

                        <button
                          onClick={() => handlePayExpense(item)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                            summary.isPaidThisMonth
                              ? 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs'
                          }`}
                          title={summary.isPaidThisMonth ? 'Registrar otro pago adicional para esta factura' : 'Registrar pago de esta factura en tus transacciones'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{summary.isPaidThisMonth ? 'Registrar otro pago' : 'Registrar Pago'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INGRESOS FIJOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'incomes' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Ingresos Fijos Mensuales</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalMonthlyIncomeCommitment, state.currency)}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                En {activeIncomesCount} ingreso(s) recurrente(s) activo(s)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Proyección Anual de Ingresos</span>
                <Calendar className="w-4 h-4 text-teal-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
                {formatMoney(totalMonthlyIncomeCommitment * 12, state.currency)}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Total estimado a 12 meses
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
                <span>Margen Fijo Neto Mensual</span>
                <TrendingUp className={`w-4 h-4 ${netMonthlyMargin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>
              <div
                className={`mt-2 text-2xl font-bold font-mono ${
                  netMonthlyMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatMoney(netMonthlyMargin, state.currency)}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                {netMonthlyMargin >= 0 ? 'Superávit tras gastos fijos' : 'Déficit frente a compromisos fijos'}
              </p>
            </div>
          </div>

          {/* Incomes Cards / Schedule */}
          {sortedIncomes.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
              <TrendingUp className="w-12 h-12 mx-auto text-stone-400 mb-3" />
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                No has programado ningún ingreso fijo recurrente
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                Registra salarios mensuales o quincenales, alquileres de propiedades, honorarios periódicos o pensiones para conocer tu flujo garantizado y cobertura familiar.
              </p>
              <button
                onClick={handleOpenNewIncome}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Primer Ingreso Fijo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedIncomes.map(item => {
                const member = state.members.find(m => m.id === item.memberId);
                const bank = state.bankAccounts.find(b => b.id === item.destinationAccountId);
                const itemCurrency = (item.currency || baseCurrencyCode).toUpperCase();
                const currencyObj = getCurrencyByCode(itemCurrency);
                const hasForeignCurrency = itemCurrency !== baseCurrencyCode && item.originalAmount !== undefined;

                // Frequency badge info
                let freqLabel = 'Mensual';
                if (item.frequency === 'biweekly') {
                  freqLabel = 'Quincenal (2 cobros)';
                } else if (item.frequency === 'weekly') {
                  freqLabel = 'Semanal (4 cobros)';
                } else if (item.frequency === 'yearly') {
                  freqLabel = 'Anual';
                }

                const incomeNextInfo = computeRecurringIncomeNextDueDate(item);
                const formattedIncomeFullDate = formatFullDate(incomeNextInfo.nextDueDate, { withWeekday: true });
                const incSummary = getRecurringIncomeSummary(item, state.transactions);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      item.isActive
                        ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                        : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                              {item.frequency === 'biweekly'
                                ? '2Q'
                                : item.frequency === 'weekly'
                                ? '4S'
                                : item.frequency === 'yearly'
                                ? `${item.dueDay}/${item.dueMonth || 1}`
                                : `${item.dueDay}º`}
                            </span>
                            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                              {item.title}
                            </h4>
                          </div>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-1">
                            {item.category || 'Ingreso'} • {freqLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditIncome(item)}
                            className="text-stone-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            title="Editar ingreso fijo"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {onToggleRecurringIncomeActive && (
                            <button
                              onClick={() => onToggleRecurringIncomeActive(item.id)}
                              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                              title={item.isActive ? 'Pausar ingreso' : 'Activar ingreso'}
                            >
                              {item.isActive ? (
                                <ToggleRight className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-stone-400" />
                              )}
                            </button>
                          )}
                          {onDeleteRecurringIncome && (
                            <button
                              onClick={() => onDeleteRecurringIncome(item.id)}
                              className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                              title="Eliminar ingreso fijo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              +{formatMoney(item.amount, state.currency)}
                            </span>
                            <span className="text-xs font-normal text-stone-500">
                              /{item.frequency === 'yearly' ? 'año' : 'mes'}
                            </span>
                          </div>
                          {member && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {member.name}
                            </span>
                          )}
                        </div>

                        {/* Foreign currency tag */}
                        {hasForeignCurrency && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 font-mono text-[11px] font-bold border border-amber-200 dark:border-amber-900/60">
                              <Coins className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              {formatCurrencyAmount(
                                item.originalAmount || item.amount,
                                currencyObj.symbol,
                                itemCurrency
                              )}
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">
                              (Tasa: 1 {itemCurrency} = {item.exchangeRate ?? 1} {state.currency})
                            </span>
                          </div>
                        )}

                        {/* Installments schedule preview for biweekly & weekly */}
                        {item.installments && item.installments.length > 0 && (
                          <div className="mt-2 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-[11px] space-y-1">
                            <div className="font-semibold text-stone-600 dark:text-stone-300 flex items-center justify-between pb-1 border-b border-stone-200/60 dark:border-stone-700/60">
                              <span>Plan de Cobros:</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Total: {formatCurrencyAmount(item.originalAmount || item.amount, currencyObj.symbol, itemCurrency)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              {item.installments.map(inst => (
                                <div
                                  key={inst.id}
                                  className="flex items-center justify-between px-2 py-1 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
                                >
                                  <span className="text-stone-600 dark:text-stone-400 font-medium">
                                    {inst.name} (Día {inst.day}):
                                  </span>
                                  <span className="font-bold font-mono text-stone-900 dark:text-stone-100">
                                    {formatCurrencyAmount(
                                      inst.originalAmount !== undefined ? inst.originalAmount : inst.amount,
                                      currencyObj.symbol
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {bank && (
                          <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                            <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">Destino: {bank.bankName} - {bank.name} ({bank.accountNumberMasked})</span>
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                      <div className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-700/50 bg-stone-50/80 dark:bg-stone-800/60">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight font-bold uppercase tracking-wider">
                            Próximo Cobro Programado
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                            {incomeNextInfo.daysUntil === 0
                              ? 'Cobra hoy'
                              : incomeNextInfo.daysUntil === 1
                              ? 'Cobra mañana'
                              : `En ${incomeNextInfo.daysUntil} días`}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 pt-0.5">
                          <div className="mt-0.5 p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 leading-snug break-words">
                            {formattedIncomeFullDate}
                          </span>
                        </div>
                      </div>

                      {/* Auto-registro status y switch */}
                      <div className="p-2 rounded-xl border border-stone-200/70 dark:border-stone-700/60 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              item.autoRegister
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                            }`}
                          >
                            <Zap className={`w-3.5 h-3.5 ${item.autoRegister ? 'fill-emerald-600 dark:fill-emerald-400' : ''}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                Auto-registro
                              </span>
                              {item.autoRegister ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Automático
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-stone-400">
                                  Manual
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                              {item.autoRegister
                                ? 'Se asienta solo en movimientos'
                                : 'Requiere cobro manual'}
                            </p>
                          </div>
                        </div>

                        {onToggleRecurringIncomeAutoRegister && (
                          <button
                            type="button"
                            onClick={() => onToggleRecurringIncomeAutoRegister(item.id)}
                            className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition shrink-0"
                            title={
                              item.autoRegister
                                ? 'Desactivar registro automático (pasar a manual)'
                                : 'Activar registro automático'
                            }
                          >
                            {item.autoRegister ? (
                              <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-stone-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {onCollectRecurringIncome && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          {incSummary.isFullyRegisteredThisPeriod ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Cobrado este período</span>
                            </span>
                          ) : item.autoRegister ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                              <span>Programado</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">
                              Pendiente
                            </span>
                          )}

                          <button
                            onClick={() => {
                              if (item.installments && item.installments.length > 0) {
                                setCollectModalIncome(item);
                              } else {
                                onCollectRecurringIncome(item);
                              }
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 transition shadow-2xs"
                            title="Registrar cobro de este ingreso en los movimientos del mes"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>
                              {incSummary.isFullyRegisteredThisPeriod
                                ? 'Cobro Extra'
                                : item.autoRegister
                                ? 'Registrar Ahora'
                                : 'Registrar Ingreso'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRANSFERENCIAS RECURRENTES ENTRE CUENTAS FAMILIARES */}
      {/* ========================================================================= */}
      {activeSubTab === 'transfers' && (
        <RecurringTransfersSection
          state={state}
          onOpenNewTransfer={handleOpenNewTransfer}
          onEditTransfer={handleEditTransfer}
          onDeleteTransfer={onDeleteRecurringTransfer || (() => {})}
          onToggleActive={onToggleRecurringTransferActive || (() => {})}
          onToggleAutoRegister={onToggleRecurringTransferAutoRegister || (() => {})}
          onExecuteTransfer={onExecuteRecurringTransfer || (() => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / EDITAR GASTO FIJO */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          {/* Background backdrop click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsExpenseModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col h-[90dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] overflow-hidden z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Modal Header - Pinned at top */}
            <div className="flex-shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>
                  {editingExpenseId
                    ? 'Modificar Gasto Fijo o Suscripción'
                    : 'Programar Gasto Fijo o Factura'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div
                className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain touch-pan-y pb-8"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Nombre de la Factura o Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Netflix, Gimnasio, Fibra Óptica, Alquiler"
                    value={expTitle}
                    onChange={e => setExpTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>

              {/* Currency & Amount Block */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Moneda del Gasto</span>
                    </label>
                    {expCurrencyCode !== baseCurrencyCode ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                        Moneda extranjera (Conversión a {baseCurrencyCode})
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        Moneda base del hogar
                      </span>
                    )}
                  </div>

                  <select
                    value={expCurrencyCode}
                    onChange={e => handleExpCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {!SUPPORTED_CURRENCIES.some(
                      c => c.code.toUpperCase() === baseCurrencyCode
                    ) && (
                      <option value={baseCurrencyCode}>
                        {baseCurrencyCode} ({baseCurrencySymbol}) - Moneda Base del Hogar ⭐
                      </option>
                    )}
                    {SUPPORTED_CURRENCIES.map(c => {
                      const isBase = c.code.toUpperCase() === baseCurrencyCode;
                      return (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name.split(' (')[0]}
                          {isBase ? ' ⭐ (Base del Hogar)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Importe en {selectedExpCurrencyObj.code} ({selectedExpCurrencyObj.symbol}) *
                    </label>
                    <div className="flex items-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden shadow-xs">
                      <span className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0 min-w-[48px] text-center">
                        {selectedExpCurrencyObj.symbol}
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        placeholder="Ej. 14.99"
                        value={expAmountInput}
                        onChange={e => handleExpAmountChange(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Día de Cobro (1-31) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={expDueDay}
                      onChange={e => setExpDueDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {expCurrencyCode !== baseCurrencyCode && (
                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-blue-900 dark:text-blue-200 pb-1.5 border-b border-blue-200/60 dark:border-blue-900/60">
                      <span className="font-bold flex items-center gap-1.5 text-xs">
                        <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Conversión a Moneda Base ({baseCurrencyCode})</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {expRateStatus.isLoading ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Consultando Frankfurter...
                          </span>
                        ) : expRateStatus.isLive ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            En vivo ({expRateStatus.date || 'hoy'})
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                            Tasa estimada
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={handleExpRefreshLiveRate}
                          disabled={expRateStatus.isLoading}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition disabled:opacity-50"
                          title="Actualizar tasa en vivo desde Frankfurter"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${expRateStatus.isLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Tasa de Cambio (1 {expCurrencyCode} =)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0.000001"
                            required
                            value={expExchangeRate}
                            onChange={e => setExpExchangeRate(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-700 font-mono font-bold text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="font-bold text-stone-700 dark:text-stone-300 shrink-0">
                            {baseCurrencySymbol}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Valor Convertido ({baseCurrencyCode}) *
                        </label>
                        <div className="flex items-center rounded-lg bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-700 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                          <span className="px-2.5 py-1.5 bg-blue-100/60 dark:bg-blue-900/60 text-xs font-bold text-blue-900 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800 shrink-0">
                            {baseCurrencySymbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            placeholder="0.00"
                            value={expConvertedAmountInput}
                            onChange={e => setExpConvertedAmountInput(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-transparent font-mono font-bold text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Categoría Presupuestaria *
                  </label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Frecuencia de Facturación *
                  </label>
                  <select
                    value={expFrequency}
                    onChange={e => setExpFrequency(e.target.value as 'monthly' | 'yearly' | 'weekly')}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>
              </div>

              {/* Miembro Responsable & Cuenta Bancaria de Débito */}
              {(() => {
                const membersWithAccounts = (state.members || []).filter(m =>
                  (state.bankAccounts || []).some(b => b.holderMemberId === m.id && b.accountType !== 'loan')
                );
                const selectedMember = state.members.find(m => m.id === expMemberId);
                const memberAccounts = (state.bankAccounts || []).filter(
                  b => b.holderMemberId === expMemberId && b.accountType !== 'loan'
                );
                const selectedAccount = (state.bankAccounts || []).find(b => b.id === expPaymentAccountId);

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Miembro Responsable *
                        </label>
                        <select
                          value={expMemberId}
                          onChange={e => {
                            const newMemberId = e.target.value;
                            setExpMemberId(newMemberId);
                            setExpPaymentAccountError(null);
                            const accountsOfMember = (state.bankAccounts || []).filter(
                              b => b.holderMemberId === newMemberId && b.accountType !== 'loan'
                            );
                            setExpPaymentAccountId(accountsOfMember[0]?.id || '');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {membersWithAccounts.length > 0 ? (
                            membersWithAccounts.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.role})
                              </option>
                            ))
                          ) : (
                            <option value="">(No hay miembros con cuentas disponibles)</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1 flex items-center justify-between">
                          <span>Cuenta a Debitar *</span>
                          <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">Requerido</span>
                        </label>
                        <select
                          required
                          value={expPaymentAccountId}
                          onChange={e => {
                            setExpPaymentAccountId(e.target.value);
                            setExpPaymentAccountError(null);
                          }}
                          className={`w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 ${
                            expPaymentAccountError
                              ? 'border-rose-500 focus:ring-rose-500'
                              : 'border-stone-200 dark:border-stone-700 focus:ring-blue-500'
                          }`}
                        >
                          <option value="">-- Selecciona cuenta a debitar * --</option>
                          {memberAccounts.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} - {b.name} ({getAccountTypeLabel(b.accountType)} • {b.accountNumberMasked} • {b.currency || baseCurrencyCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Alerta si no hay miembros con cuentas bancarias aptas para débito */}
                    {membersWithAccounts.length === 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">No hay miembros familiares con cuentas bancarias registradas</p>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                            Para programar un gasto recurrente debes vincular al menos una cuenta bancaria a un miembro familiar.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mensaje de error de validación de cuenta */}
                    {expPaymentAccountError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{expPaymentAccountError}</span>
                      </div>
                    )}

                    {/* Previsualización detallada de la cuenta seleccionada */}
                    {selectedAccount && selectedAccount.accountType !== 'loan' && (
                      <div className="p-2.5 rounded-lg border bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {selectedAccount.accountType === 'credit' ? (
                            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100">
                              <span className="truncate">{selectedAccount.bankName}</span>
                              <span className="text-stone-400">•</span>
                              <span className="truncate text-blue-700 dark:text-blue-300">{selectedAccount.name}</span>
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
                              <span>{getAccountTypeLabel(selectedAccount.accountType)}</span>
                              <span>•</span>
                              <span className="font-mono">{selectedAccount.accountNumberMasked}</span>
                              {selectedAccount.holderMemberId && (
                                <>
                                  <span>•</span>
                                  <span>Titular: {state.members.find(m => m.id === selectedAccount.holderMemberId)?.name || 'Familiar'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-stone-400 block">
                            {selectedAccount.accountType === 'credit' ? 'Saldo Deudor / Cupo' : 'Saldo Disponible'}
                          </span>
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {formatMoney(selectedAccount.balance, selectedAccount.currencySymbol || state.currency)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas o Detalles (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Domiciliado en tarjeta Visa, suscripción compartida"
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Automation Toggle */}
              <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expAutoRegister}
                    onChange={e => setExpAutoRegister(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300 dark:border-stone-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                      <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-500/20" />
                      <span>Automatizar registro de pago en la fecha programada</span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                      El sistema asentará automáticamente el gasto en tus movimientos y debitará la cuenta indicada el día previsto de pago.
                    </p>
                  </div>
                </label>
              </div>

              </div>

              {/* Modal Footer - Fixed at bottom */}
              <div className="flex-shrink-0 px-5 sm:px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition font-medium text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold transition shadow-sm text-xs sm:text-sm"
                >
                  {editingExpenseId ? 'Actualizar Factura' : 'Guardar Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / EDITAR INGRESO FIJO */}
      {/* ========================================================================= */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          {/* Background backdrop click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsIncomeModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col h-[90dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] overflow-hidden z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Modal Header - Pinned at top */}
            <div className="flex-shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>
                  {editingIncomeId
                    ? 'Modificar Ingreso Fijo'
                    : 'Programar Ingreso Fijo o Recurrente'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIncome} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body - Smooth touch scrolling on mobile with touch-pan-y */}
              <div
                className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain touch-pan-y pb-8"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Concepto o Nombre del Ingreso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nómina Principal, Renta Alquiler Departamento, Pensión"
                    value={incTitle}
                    onChange={e => setIncTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>

              {/* Source category */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Fuente o Tipo de Ingreso *
                </label>
                <select
                  value={incCategory}
                  onChange={e => setIncCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {INCOME_SOURCES.map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frecuencia de cobro (inmediatamente después del tipo de ingreso) */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Frecuencia de Cobro *
                </label>
                <select
                  value={incFrequency}
                  onChange={e => setIncFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="monthly">Mensual (1 monto y día fijo al mes)</option>
                  <option value="biweekly">Quincenal (2 montos y 2 días: Quincena 1 y Quincena 2)</option>
                  <option value="weekly">Semanal (4 montos y 4 días al mes)</option>
                  <option value="yearly">Anual (1 monto y fecha concreta al año)</option>
                </select>
              </div>

              {/* Currency & Amount Block */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Moneda del Ingreso</span>
                    </label>
                    {incCurrencyCode !== baseCurrencyCode ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                        Moneda extranjera (Conversión a {baseCurrencyCode})
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Moneda base del hogar
                      </span>
                    )}
                  </div>

                  <select
                    value={incCurrencyCode}
                    onChange={e => handleIncCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {!SUPPORTED_CURRENCIES.some(
                      c => c.code.toUpperCase() === baseCurrencyCode
                    ) && (
                      <option value={baseCurrencyCode}>
                        {baseCurrencyCode} ({baseCurrencySymbol}) - Moneda Base del Hogar ⭐
                      </option>
                    )}
                    {SUPPORTED_CURRENCIES.map(c => {
                      const isBase = c.code.toUpperCase() === baseCurrencyCode;
                      return (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name.split(' (')[0]}
                          {isBase ? ' ⭐ (Base del Hogar)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Conditional Amount & Days Configuration */}
                {/* 1. MENSUAL */}
                {incFrequency === 'monthly' && (
                  <div className="space-y-2 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Monto Mensual ({selectedIncCurrencyObj.symbol}) *
                        </label>
                        <div className="flex items-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden shadow-xs">
                          <span className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0 min-w-[44px] text-center">
                            {selectedIncCurrencyObj.symbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            placeholder="Ej. 1500"
                            value={incAmountInput}
                            onChange={e => setIncAmountInput(e.target.value)}
                            className="w-full px-3 py-2 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Día de Cobro del Mes (1-31) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          required
                          value={incDueDay}
                          onChange={e => setIncDueDay(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50">
                      <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Total mensual registrado:</span>
                      <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyAmount(parseFloat(incAmountInput) || 0, selectedIncCurrencyObj.symbol, incCurrencyCode)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. ANUAL */}
                {incFrequency === 'yearly' && (
                  <div className="space-y-2 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Monto Anual ({selectedIncCurrencyObj.symbol}) *
                        </label>
                        <div className="flex items-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden shadow-xs">
                          <span className="px-2.5 py-2 bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0 text-center">
                            {selectedIncCurrencyObj.symbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            placeholder="Ej. 12000"
                            value={incAmountInput}
                            onChange={e => setIncAmountInput(e.target.value)}
                            className="w-full px-2.5 py-2 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Mes de Cobro *
                        </label>
                        <select
                          value={incDueMonth}
                          onChange={e => setIncDueMonth(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {MONTH_NAMES.map((name, idx) => (
                            <option key={idx} value={idx + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Día (1-31) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          required
                          value={incDueDay}
                          onChange={e => setIncDueDay(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50">
                      <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Equivalente mensual:</span>
                      <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyAmount((parseFloat(incAmountInput) || 0) / 12, selectedIncCurrencyObj.symbol, incCurrencyCode)} / mes
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. QUINCENAL */}
                {incFrequency === 'biweekly' && (
                  <div className="space-y-3 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      Ingresa el día de cobro y el monto para cada una de las dos quincenas en {incCurrencyCode}. Se calculará el total mensual automáticamente.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Quincena 1 */}
                      <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 block">
                          Quincena 1
                        </span>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                            Día de Cobro (1-31) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            value={incQ1Day}
                            onChange={e => setIncQ1Day(e.target.value)}
                            placeholder="15"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                            Monto Quincena 1 ({selectedIncCurrencyObj.symbol}) *
                          </label>
                          <div className="flex items-center rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden">
                            <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0">
                              {selectedIncCurrencyObj.symbol}
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              placeholder="Ej. 200"
                              value={incQ1Amount}
                              onChange={e => setIncQ1Amount(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quincena 2 */}
                      <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 block">
                          Quincena 2
                        </span>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                            Día de Cobro (1-31) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            value={incQ2Day}
                            onChange={e => setIncQ2Day(e.target.value)}
                            placeholder="30"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                            Monto Quincena 2 ({selectedIncCurrencyObj.symbol}) *
                          </label>
                          <div className="flex items-center rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden">
                            <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0">
                              {selectedIncCurrencyObj.symbol}
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              placeholder="Ej. 400"
                              value={incQ2Amount}
                              onChange={e => setIncQ2Amount(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Presentar el Total */}
                    {(() => {
                      const q1 = parseFloat(incQ1Amount) || 0;
                      const q2 = parseFloat(incQ2Amount) || 0;
                      const sumTotal = q1 + q2;
                      const convTotal = convertAmount(sumTotal, incCurrencyCode !== baseCurrencyCode ? incExchangeRate : 1.0);
                      return (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                              Total Mensual (Quincena 1 + Quincena 2):
                            </span>
                            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrencyAmount(sumTotal, selectedIncCurrencyObj.symbol, incCurrencyCode)}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                            {formatCurrencyAmount(q1, selectedIncCurrencyObj.symbol)} (día {incQ1Day || '15'}) + {formatCurrencyAmount(q2, selectedIncCurrencyObj.symbol)} (día {incQ2Day || '30'}) = <strong>{formatCurrencyAmount(sumTotal, selectedIncCurrencyObj.symbol, incCurrencyCode)}</strong>
                          </p>
                          {incCurrencyCode !== baseCurrencyCode && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                              ≈ {formatMoney(convTotal, state.currency)} en moneda base del hogar
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. SEMANAL */}
                {incFrequency === 'weekly' && (
                  <div className="space-y-3 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      Configura 4 días de cobro y 4 montos en {incCurrencyCode} para el mes. El sistema sumará los 4 montos para mostrar el total mensual.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Semana 1 */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Semana 1</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Día</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={incW1Day}
                              onChange={e => setIncW1Day(e.target.value)}
                              placeholder="7"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Monto ({selectedIncCurrencyObj.symbol})</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={incW1Amount}
                              onChange={e => setIncW1Amount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Semana 2 */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Semana 2</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Día</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={incW2Day}
                              onChange={e => setIncW2Day(e.target.value)}
                              placeholder="14"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Monto ({selectedIncCurrencyObj.symbol})</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={incW2Amount}
                              onChange={e => setIncW2Amount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Semana 3 */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Semana 3</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Día</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={incW3Day}
                              onChange={e => setIncW3Day(e.target.value)}
                              placeholder="21"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Monto ({selectedIncCurrencyObj.symbol})</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={incW3Amount}
                              onChange={e => setIncW3Amount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Semana 4 */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Semana 4</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Día</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={incW4Day}
                              onChange={e => setIncW4Day(e.target.value)}
                              placeholder="28"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-500 font-semibold block">Monto ({selectedIncCurrencyObj.symbol})</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={incW4Amount}
                              onChange={e => setIncW4Amount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1 rounded bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Presentar el Total Semanal */}
                    {(() => {
                      const w1 = parseFloat(incW1Amount) || 0;
                      const w2 = parseFloat(incW2Amount) || 0;
                      const w3 = parseFloat(incW3Amount) || 0;
                      const w4 = parseFloat(incW4Amount) || 0;
                      const sumTotal = w1 + w2 + w3 + w4;
                      const convTotal = convertAmount(sumTotal, incCurrencyCode !== baseCurrencyCode ? incExchangeRate : 1.0);
                      return (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                              Total Mensual (4 Semanas):
                            </span>
                            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatCurrencyAmount(sumTotal, selectedIncCurrencyObj.symbol, incCurrencyCode)}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                            Sem 1: {formatCurrencyAmount(w1, selectedIncCurrencyObj.symbol)} + Sem 2: {formatCurrencyAmount(w2, selectedIncCurrencyObj.symbol)} + Sem 3: {formatCurrencyAmount(w3, selectedIncCurrencyObj.symbol)} + Sem 4: {formatCurrencyAmount(w4, selectedIncCurrencyObj.symbol)} = <strong>{formatCurrencyAmount(sumTotal, selectedIncCurrencyObj.symbol, incCurrencyCode)}</strong>
                          </p>
                          {incCurrencyCode !== baseCurrencyCode && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                              ≈ {formatMoney(convTotal, state.currency)} en moneda base del hogar
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Foreign currency exchange rate converter */}
                {incCurrencyCode !== baseCurrencyCode && (
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-emerald-900 dark:text-emerald-200 pb-1.5 border-b border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="font-bold flex items-center gap-1.5 text-xs">
                        <ArrowRightLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Conversión a Moneda Base ({baseCurrencyCode})</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {incRateStatus.isLoading ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Consultando Frankfurter...
                          </span>
                        ) : incRateStatus.isLive ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            En vivo ({incRateStatus.date || 'hoy'})
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                            Tasa estimada
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={handleIncRefreshLiveRate}
                          disabled={incRateStatus.isLoading}
                          className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition disabled:opacity-50"
                          title="Actualizar tasa en vivo desde Frankfurter"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${incRateStatus.isLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Tasa de Cambio (1 {incCurrencyCode} =)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          min="0.000001"
                          required
                          value={incExchangeRate}
                          onChange={e => setIncExchangeRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-stone-700 dark:text-stone-300 shrink-0">
                          {baseCurrencySymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Miembro perceptor & Cuenta Bancaria */}
              {(() => {
                const selectedMember = state.members.find(m => m.id === incMemberId);
                const memberAccounts = state.bankAccounts.filter(b => b.holderMemberId === incMemberId);
                const otherAccounts = state.bankAccounts.filter(b => b.holderMemberId !== incMemberId);
                const selectedAccount = state.bankAccounts.find(b => b.id === incDestinationAccountId);

                const getAccountTypeLabel = (type: string) => {
                  switch (type) {
                    case 'checking': return 'Cta. Corriente';
                    case 'savings': return 'Cta. Ahorros';
                    case 'credit': return 'Tarjeta Crédito';
                    case 'investment': return 'Inversión';
                    case 'loan': return 'Préstamo';
                    default: return 'Cuenta';
                  }
                };

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Miembro Perceptor *
                        </label>
                        <select
                          value={incMemberId}
                          onChange={e => {
                            const newMemberId = e.target.value;
                            setIncMemberId(newMemberId);
                            // Si el nuevo miembro tiene cuentas asociadas, preseleccionamos su primera cuenta
                            const accountsOfNewMember = state.bankAccounts.filter(b => b.holderMemberId === newMemberId);
                            if (accountsOfNewMember.length > 0) {
                              setIncDestinationAccountId(accountsOfNewMember[0].id);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {state.members.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                          Cuenta Bancaria Destino (Opcional)
                        </label>
                        <select
                          value={incDestinationAccountId}
                          onChange={e => setIncDestinationAccountId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Sin cuenta asignada específica --</option>
                          {memberAccounts.length > 0 && (
                            <optgroup label={`⭐ Cuentas de ${selectedMember ? selectedMember.name : 'este miembro'}`}>
                              {memberAccounts.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} - {b.name} ({getAccountTypeLabel(b.accountType)} • {b.accountNumberMasked} • {b.currency || baseCurrencyCode})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {otherAccounts.length > 0 && (
                            <optgroup label={memberAccounts.length > 0 ? "Otras cuentas de la familia" : "Cuentas bancarias registradas"}>
                              {otherAccounts.map(b => {
                                const holder = state.members.find(m => m.id === b.holderMemberId);
                                return (
                                  <option key={b.id} value={b.id}>
                                    {b.bankName} - {b.name} ({holder ? `Titular: ${holder.name} • ` : ''}{getAccountTypeLabel(b.accountType)} • {b.accountNumberMasked} • {b.currency || baseCurrencyCode})
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Previsualización detallada de la cuenta seleccionada */}
                    {selectedAccount && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100">
                              <span className="truncate">{selectedAccount.bankName}</span>
                              <span className="text-stone-400">•</span>
                              <span className="truncate text-emerald-700 dark:text-emerald-300">{selectedAccount.name}</span>
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
                              <span>{getAccountTypeLabel(selectedAccount.accountType)}</span>
                              <span>•</span>
                              <span className="font-mono">{selectedAccount.accountNumberMasked}</span>
                              {selectedAccount.holderMemberId && (
                                <>
                                  <span>•</span>
                                  <span>Titular: {state.members.find(m => m.id === selectedAccount.holderMemberId)?.name || 'Familiar'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-stone-400 block">Saldo Actual</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            {formatMoney(selectedAccount.balance, selectedAccount.currencySymbol || state.currency)}
                          </span>
                        </div>
                      </div>
                    )}
                    {memberAccounts.length === 0 && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        ℹ️ {selectedMember?.name || 'El miembro seleccionado'} no tiene cuentas registradas a su nombre como titular aún (puedes seleccionar otra cuenta de la familia).
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas o Detalles (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cobro los días 15 y 30 de cada mes"
                  value={incNotes}
                  onChange={e => setIncNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Opción con Check de Registro Automático */}
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="inc-auto-register-check"
                    checked={incAutoRegister}
                    onChange={e => setIncAutoRegister(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 cursor-pointer accent-emerald-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                        Registro automático de ingreso
                      </span>
                      {incAutoRegister ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                          Automático
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                      Si está marcada, el ingreso se registrará de forma automática en los movimientos del hogar en sus fechas correspondientes sin tener que registrarlo manual.
                    </p>
                  </div>
                </label>
              </div>

              </div>

              {/* Modal Footer - Fixed at bottom */}
              <div className="flex-shrink-0 px-5 sm:px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition font-medium text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold transition shadow-sm text-xs sm:text-sm"
                >
                  {editingIncomeId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR COBRO ESPECÍFICO DE CUOTA / QUINCENA / SEMANA */}
      {/* ========================================================================= */}
      {collectModalIncome && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          {/* Background backdrop click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setCollectModalIncome(null)}
            aria-hidden="true"
          />

          <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90dvh] sm:max-h-[88vh] overflow-hidden z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex-shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  Registrar Cobro de Ingreso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalIncome(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3 text-xs overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <p className="text-stone-600 dark:text-stone-300">
                Selecciona la entrega o quincena que deseas asentar como movimiento cobrado para <strong>{collectModalIncome.title}</strong>:
              </p>

              <div className="space-y-2">
                {collectModalIncome.installments?.map(inst => {
                  const instCurrency = (collectModalIncome.currency || baseCurrencyCode).toUpperCase();
                  const instSym = getCurrencyByCode(instCurrency).symbol;
                  return (
                    <button
                      key={inst.id}
                      onClick={() => {
                        onCollectRecurringIncome?.(collectModalIncome, inst);
                        setCollectModalIncome(null);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition text-left group"
                    >
                      <div>
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {inst.name}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Día habitual: {inst.day} de cada mes
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 block">
                          +{formatCurrencyAmount(inst.originalAmount !== undefined ? inst.originalAmount : inst.amount, instSym, instCurrency)}
                        </span>
                        {instCurrency !== baseCurrencyCode && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            ≈ {formatMoney(inst.amount, state.currency)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Opción de registrar el mes completo */}
                <button
                  onClick={() => {
                    onCollectRecurringIncome?.(collectModalIncome);
                    setCollectModalIncome(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition text-left"
                >
                  <div>
                    <span className="font-bold text-stone-800 dark:text-stone-200 text-xs block">
                      Registrar Total del Mes Completo
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Asienta la suma de todas las cuotas en una sola transacción
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-700 dark:text-stone-300 text-xs">
                    +{formatMoney(collectModalIncome.amount, state.currency)}
                  </span>
                </button>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-5 sm:px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setCollectModalIncome(null)}
                className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition font-medium text-xs sm:text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Programar / Editar Transferencia Recurrente */}
      <RecurringTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        onSave={(transferData) => {
          if (editingTransfer && onUpdateRecurringTransfer) {
            onUpdateRecurringTransfer(editingTransfer.id, transferData);
          } else if (onAddRecurringTransfer) {
            onAddRecurringTransfer(transferData);
          }
        }}
        state={state}
        initialTransfer={editingTransfer}
      />
    </div>
  );
};
