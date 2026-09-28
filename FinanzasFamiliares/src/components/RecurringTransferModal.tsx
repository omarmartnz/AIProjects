import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  ArrowRight,
  Coins,
  Building2,
  Calendar,
  Sparkles,
  Zap,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { FamilyState, RecurringTransfer, RecurringTransferInstallment, BankAccount } from '../types';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getEstimatedExchangeRate,
  fetchLiveExchangeRate,
  convertAmount,
  formatMoney,
  formatCurrencyAmount,
} from '../utils/currencies';

interface RecurringTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transfer: Omit<RecurringTransfer, 'id' | 'nextDueDate'>) => void;
  state: FamilyState;
  initialTransfer?: RecurringTransfer | null;
}

const TRANSFER_CATEGORIES = [
  'Ahorro Programado',
  'Fondo de Emergencia',
  'Traspaso Familiar',
  'Inversión Periódica',
  'Amortización / Pago Préstamo',
  'Manutención / Asignación',
  'Caja Chica',
  'Otro Traspaso',
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
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

export const RecurringTransferModal: React.FC<RecurringTransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  state,
  initialTransfer,
}) => {
  const baseCurrencyCode = (state.currencyCode || 'USD').toUpperCase();
  const baseCurrencySymbol = state.currency || '$';

  // State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(TRANSFER_CATEGORIES[0]);
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode);
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'yearly' | 'weekly'>('monthly');

  // For monthly & yearly single amount
  const [amountInput, setAmountInput] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [dueMonth, setDueMonth] = useState('1'); // 1-12 for yearly

  // For biweekly (Quincena 1 y Quincena 2)
  const [q1Day, setQ1Day] = useState('15');
  const [q1Amount, setQ1Amount] = useState('');
  const [q2Day, setQ2Day] = useState('30');
  const [q2Amount, setQ2Amount] = useState('');

  // For weekly (4 semanas)
  const [w1Day, setW1Day] = useState('7');
  const [w1Amount, setW1Amount] = useState('');
  const [w2Day, setW2Day] = useState('14');
  const [w2Amount, setW2Amount] = useState('');
  const [w3Day, setW3Day] = useState('21');
  const [w3Amount, setW3Amount] = useState('');
  const [w4Day, setW4Day] = useState('28');
  const [w4Amount, setW4Amount] = useState('');

  const [fromMemberId, setFromMemberId] = useState('');
  const [fromBankAccountId, setFromBankAccountId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [toBankAccountId, setToBankAccountId] = useState('');
  const [autoRegister, setAutoRegister] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [rateStatus, setRateStatus] = useState<{
    isLive: boolean;
    date?: string;
    isLoading: boolean;
    source?: 'frankfurter' | 'cache' | 'fallback';
  }>({ isLive: false, isLoading: false });

  const selectedCurrencyObj = useMemo(() => {
    return getCurrencyByCode(currencyCode) || {
      code: currencyCode,
      symbol: currencyCode,
      name: currencyCode,
    };
  }, [currencyCode]);

  const accountBelongsToMember = useMemo(() => {
    return (acc: BankAccount, memberId: string): boolean => {
      const holder = acc.holderMemberId || (acc as any).memberId;
      if (holder) return holder === memberId;
      return true;
    };
  }, []);

  // Members who have valid debit bank accounts (excluding loan accounts)
  const membersWithDebitAccounts = useMemo(() => {
    return state.members.filter(member => {
      return (state.bankAccounts || []).some(
        acc => {
          const belongs = accountBelongsToMember(acc, member.id);
          return belongs && acc.accountType !== 'loan';
        }
      );
    });
  }, [state.members, state.bankAccounts, accountBelongsToMember]);

  // Members who have any bank account (for destination)
  const membersWithAnyAccounts = useMemo(() => {
    return state.members.filter(member => {
      return (state.bankAccounts || []).some(
        acc => {
          return accountBelongsToMember(acc, member.id);
        }
      );
    });
  }, [state.members, state.bankAccounts, accountBelongsToMember]);

  // Filter accounts for Origin (excluding loan accounts)
  const availableOriginAccounts = useMemo(() => {
    return (state.bankAccounts || []).filter(acc => {
      if (acc.accountType === 'loan') return false;
      if (!fromMemberId) return true;
      return accountBelongsToMember(acc, fromMemberId);
    });
  }, [state.bankAccounts, fromMemberId, accountBelongsToMember]);

  // Filter accounts for Destination (excluding the chosen origin account)
  const availableDestinationAccounts = useMemo(() => {
    return (state.bankAccounts || []).filter(acc => {
      if (acc.id === fromBankAccountId) return false;
      if (!toMemberId) return true;
      return accountBelongsToMember(acc, toMemberId);
    });
  }, [state.bankAccounts, fromBankAccountId, toMemberId, accountBelongsToMember]);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (initialTransfer) {
      setTitle(initialTransfer.title);
      setCategory(initialTransfer.category || TRANSFER_CATEGORIES[0]);
      const freq = initialTransfer.frequency || 'monthly';
      setFrequency(freq);
      setDueDay(String(initialTransfer.dueDay || 1));
      setDueMonth(String(initialTransfer.dueMonth || 1));
      setFromMemberId(initialTransfer.fromMemberId || '');
      setFromBankAccountId(initialTransfer.fromBankAccountId);
      setToMemberId(initialTransfer.toMemberId || '');
      setToBankAccountId(initialTransfer.toBankAccountId);
      setAutoRegister(initialTransfer.autoRegister ?? true);
      setNotes(initialTransfer.notes || '');

      const tCurr = initialTransfer.currency || baseCurrencyCode;
      setCurrencyCode(tCurr);
      setExchangeRate(initialTransfer.exchangeRate || 1.0);

      const baseAmountVal = initialTransfer.originalAmount !== undefined
        ? initialTransfer.originalAmount
        : initialTransfer.amount;

      if (freq === 'monthly' || freq === 'yearly') {
        setAmountInput(String(baseAmountVal));
      } else if (freq === 'biweekly') {
        const q1 = initialTransfer.installments?.[0];
        const q2 = initialTransfer.installments?.[1];
        setQ1Day(String(q1?.day || 15));
        setQ1Amount(String(q1?.originalAmount ?? q1?.amount ?? (baseAmountVal / 2)));
        setQ2Day(String(q2?.day || 30));
        setQ2Amount(String(q2?.originalAmount ?? q2?.amount ?? (baseAmountVal / 2)));
      } else if (freq === 'weekly') {
        const insts = initialTransfer.installments || [];
        setW1Day(String(insts[0]?.day || 7));
        setW1Amount(String(insts[0]?.originalAmount ?? insts[0]?.amount ?? (baseAmountVal / 4)));
        setW2Day(String(insts[1]?.day || 14));
        setW2Amount(String(insts[1]?.originalAmount ?? insts[1]?.amount ?? (baseAmountVal / 4)));
        setW3Day(String(insts[2]?.day || 21));
        setW3Amount(String(insts[2]?.originalAmount ?? insts[2]?.amount ?? (baseAmountVal / 4)));
        setW4Day(String(insts[3]?.day || 28));
        setW4Amount(String(insts[3]?.originalAmount ?? insts[3]?.amount ?? (baseAmountVal / 4)));
      }
    } else {
      // New transfer defaults
      setTitle('');
      setCategory(TRANSFER_CATEGORIES[0]);
      setFrequency('monthly');
      setCurrencyCode(baseCurrencyCode);
      setExchangeRate(1.0);
      setAmountInput('');
      setDueDay('1');
      setDueMonth('1');
      setQ1Day('15');
      setQ1Amount('');
      setQ2Day('30');
      setQ2Amount('');
      setW1Day('7');
      setW1Amount('');
      setW2Day('14');
      setW2Amount('');
      setW3Day('21');
      setW3Amount('');
      setW4Day('28');
      setW4Amount('');
      setAutoRegister(true);
      setNotes('');

      // Auto-select origin member and account
      const defaultFromMember = membersWithDebitAccounts[0]?.id || state.members[0]?.id || '';
      setFromMemberId(defaultFromMember);

      const defaultOriginAcc = (state.bankAccounts || []).find(
        b => {
          const belongs = accountBelongsToMember(b, defaultFromMember);
          return belongs && b.accountType !== 'loan';
        }
      );
      setFromBankAccountId(defaultOriginAcc?.id || '');

      // Auto-select destination member and account
      const defaultToMember =
        membersWithAnyAccounts.find(m => m.id !== defaultFromMember)?.id ||
        state.members[0]?.id || '';
      setToMemberId(defaultToMember);

      const defaultDestAcc = (state.bankAccounts || []).find(
        b => {
          const belongs = accountBelongsToMember(b, defaultToMember);
          return b.id !== defaultOriginAcc?.id && belongs;
        }
      );
      setToBankAccountId(defaultDestAcc?.id || '');
    }
    setFormError(null);
  }, [isOpen, initialTransfer, baseCurrencyCode, membersWithDebitAccounts, membersWithAnyAccounts, state.members, state.bankAccounts, accountBelongsToMember]);

  const handleFromMemberChange = (newMemberId: string) => {
    setFromMemberId(newMemberId);
    const validAccounts = (state.bankAccounts || []).filter(
      acc => {
        const belongs = accountBelongsToMember(acc, newMemberId);
        return belongs && acc.accountType !== 'loan';
      }
    );
    if (validAccounts.length > 0) {
      setFromBankAccountId(validAccounts[0].id);
      if (toBankAccountId === validAccounts[0].id) {
        const otherDest = (state.bankAccounts || []).find(
          b => {
            const belongs = accountBelongsToMember(b, toMemberId);
            return b.id !== validAccounts[0].id && belongs;
          }
        );
        if (otherDest) setToBankAccountId(otherDest.id);
      }
    } else {
      setFromBankAccountId('');
    }
  };

  const handleToMemberChange = (newMemberId: string) => {
    setToMemberId(newMemberId);
    const validAccounts = (state.bankAccounts || []).filter(
      acc => {
        const belongs = accountBelongsToMember(acc, newMemberId);
        return acc.id !== fromBankAccountId && belongs;
      }
    );
    if (validAccounts.length > 0) {
      setToBankAccountId(validAccounts[0].id);
    } else {
      setToBankAccountId('');
    }
  };

  // Currency exchange rate update
  useEffect(() => {
    if (!isOpen) return;

    if (currencyCode === baseCurrencyCode) {
      setExchangeRate(1.0);
      setRateStatus({ isLive: false, isLoading: false });
      return;
    }

    let isMounted = true;
    const updateRate = async () => {
      setRateStatus(prev => ({ ...prev, isLoading: true }));
      const liveRes = await fetchLiveExchangeRate(currencyCode, baseCurrencyCode);

      if (!isMounted) return;

      if (liveRes.rate > 0) {
        setExchangeRate(liveRes.rate);
        setRateStatus({
          isLive: liveRes.isLive,
          date: liveRes.date,
          isLoading: false,
          source: liveRes.source,
        });
      } else {
        const estRate = getEstimatedExchangeRate(currencyCode, baseCurrencyCode);
        setExchangeRate(estRate);
        setRateStatus({ isLive: false, isLoading: false, source: 'fallback' });
      }
    };

    updateRate();
    return () => {
      isMounted = false;
    };
  }, [currencyCode, baseCurrencyCode, isOpen]);

  const handleManualRateChange = (rateVal: string) => {
    const r = parseFloat(rateVal);
    if (!isNaN(r) && r > 0) {
      setExchangeRate(r);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Por favor ingresa un concepto o nombre para la transferencia');
      return;
    }

    if (!fromBankAccountId) {
      setFormError('Selecciona la cuenta bancaria de origen (débito)');
      return;
    }

    if (!toBankAccountId) {
      setFormError('Selecciona la cuenta bancaria de destino (crédito)');
      return;
    }

    if (fromBankAccountId === toBankAccountId) {
      setFormError('La cuenta de origen y de destino no pueden ser la misma');
      return;
    }

    const rate = exchangeRate > 0 ? exchangeRate : 1.0;
    const isForeign = currencyCode !== baseCurrencyCode;

    let computedAmount = 0;
    let computedDueDay = 1;
    let computedDueMonth: number | undefined = undefined;
    let installments: RecurringTransferInstallment[] | undefined = undefined;
    let originalAmountTotal: number | undefined = undefined;

    if (frequency === 'monthly') {
      const parsed = parseFloat(amountInput);
      if (isNaN(parsed) || parsed <= 0) {
        setFormError('Ingresa un monto mensual válido');
        return;
      }
      const day = parseInt(dueDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        setFormError('El día de cobro debe ser entre 1 y 31');
        return;
      }
      computedDueDay = day;
      originalAmountTotal = isForeign ? parsed : undefined;
      computedAmount = convertAmount(parsed, rate);
    } else if (frequency === 'yearly') {
      const parsed = parseFloat(amountInput);
      if (isNaN(parsed) || parsed <= 0) {
        setFormError('Ingresa un monto anual válido');
        return;
      }
      const day = parseInt(dueDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        setFormError('El día de ejecución debe ser entre 1 y 31');
        return;
      }
      const m = parseInt(dueMonth, 10);
      computedDueDay = day;
      computedDueMonth = isNaN(m) ? 1 : Math.max(1, Math.min(12, m));
      originalAmountTotal = isForeign ? parsed : undefined;
      computedAmount = convertAmount(parsed, rate);
    } else if (frequency === 'biweekly') {
      const q1Val = parseFloat(q1Amount);
      const q2Val = parseFloat(q2Amount);
      if (isNaN(q1Val) || q1Val < 0 || isNaN(q2Val) || q2Val < 0 || (q1Val + q2Val <= 0)) {
        setFormError('Ingresa los montos válidos para ambas quincenas');
        return;
      }
      const q1D = Math.max(1, Math.min(31, parseInt(q1Day, 10) || 15));
      const q2D = Math.max(1, Math.min(31, parseInt(q2Day, 10) || 30));
      computedDueDay = q1D;
      const totalOrig = q1Val + q2Val;
      originalAmountTotal = isForeign ? totalOrig : undefined;
      computedAmount = convertAmount(totalOrig, rate);

      installments = [
        {
          id: 'q1',
          name: 'Quincena 1',
          label: 'Quincena 1',
          day: q1D,
          amount: convertAmount(q1Val, rate),
          originalAmount: isForeign ? q1Val : undefined,
        },
        {
          id: 'q2',
          name: 'Quincena 2',
          label: 'Quincena 2',
          day: q2D,
          amount: convertAmount(q2Val, rate),
          originalAmount: isForeign ? q2Val : undefined,
        },
      ];
    } else if (frequency === 'weekly') {
      const w1Val = parseFloat(w1Amount) || 0;
      const w2Val = parseFloat(w2Amount) || 0;
      const w3Val = parseFloat(w3Amount) || 0;
      const w4Val = parseFloat(w4Amount) || 0;
      const totalW = w1Val + w2Val + w3Val + w4Val;
      if (totalW <= 0) {
        setFormError('Ingresa montos válidos para las semanas del mes');
        return;
      }
      const w1D = Math.max(1, Math.min(31, parseInt(w1Day, 10) || 7));
      const w2D = Math.max(1, Math.min(31, parseInt(w2Day, 10) || 14));
      const w3D = Math.max(1, Math.min(31, parseInt(w3Day, 10) || 21));
      const w4D = Math.max(1, Math.min(31, parseInt(w4Day, 10) || 28));
      computedDueDay = w1D;
      originalAmountTotal = isForeign ? totalW : undefined;
      computedAmount = convertAmount(totalW, rate);

      installments = [
        { id: 'w1', name: 'Semana 1', label: 'Semana 1', day: w1D, amount: convertAmount(w1Val, rate), originalAmount: isForeign ? w1Val : undefined },
        { id: 'w2', name: 'Semana 2', label: 'Semana 2', day: w2D, amount: convertAmount(w2Val, rate), originalAmount: isForeign ? w2Val : undefined },
        { id: 'w3', name: 'Semana 3', label: 'Semana 3', day: w3D, amount: convertAmount(w3Val, rate), originalAmount: isForeign ? w3Val : undefined },
        { id: 'w4', name: 'Semana 4', label: 'Semana 4', day: w4D, amount: convertAmount(w4Val, rate), originalAmount: isForeign ? w4Val : undefined },
      ];
    }

    onSave({
      title: title.trim(),
      amount: computedAmount,
      category,
      frequency,
      dueDay: computedDueDay,
      dueMonth: computedDueMonth,
      installments,
      fromMemberId: fromMemberId || undefined,
      fromBankAccountId,
      toMemberId: toMemberId || undefined,
      toBankAccountId,
      isActive: true,
      autoRegister,
      notes: notes.trim() || undefined,
      currency: currencyCode,
      originalAmount: originalAmountTotal,
      exchangeRate: isForeign ? rate : undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {initialTransfer ? 'Editar Transferencia Recurrente' : 'Programar Transferencia Recurrente'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Traspaso automático o periódico entre cuentas de la familia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title / Concept */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Concepto o Nombre de la Transferencia *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Ahorro mensual fondo de retiro, Traspaso a cuenta de ahorro"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category & Frequency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Finalidad / Categoría
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                {TRANSFER_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Frecuencia de Traspaso *
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                <option value="monthly">Mensual (1 monto y día fijo al mes)</option>
                <option value="biweekly">Quincenal (2 montos y 2 días: Q1 y Q2)</option>
                <option value="weekly">Semanal (4 montos y 4 días al mes)</option>
                <option value="yearly">Anual (1 monto y fecha concreta al año)</option>
              </select>
            </div>
          </div>

          {/* Amount & Currency Row */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-purple-500" />
                <span>Importe y Moneda</span>
              </span>
              <span className="text-[11px] text-stone-500 font-normal">
                Moneda base: <strong>{baseCurrencyCode} ({baseCurrencySymbol})</strong>
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-stone-500 mb-0.5">Moneda del Traspaso</label>
              <select
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                {!SUPPORTED_CURRENCIES.some(c => c.code.toUpperCase() === baseCurrencyCode) && (
                  <option value={baseCurrencyCode}>
                    {baseCurrencyCode} ({baseCurrencySymbol}) - Moneda Base del Hogar ⭐
                  </option>
                )}
                {SUPPORTED_CURRENCIES.map(curr => {
                  const isBase = curr.code.toUpperCase() === baseCurrencyCode;
                  return (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) - {curr.name.split(' (')[0]}
                      {isBase ? ' ⭐ (Base del Hogar)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Currency conversion info if foreign */}
            {currencyCode !== baseCurrencyCode && (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tasa de cambio aplicada:</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>1 {currencyCode} =</span>
                    <input
                      type="number"
                      step="any"
                      min="0.000001"
                      value={exchangeRate}
                      onChange={e => handleManualRateChange(e.target.value)}
                      className="w-24 px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-right font-bold text-stone-900 dark:text-stone-100"
                    />
                    <span className="text-stone-500">{baseCurrencyCode}</span>
                  </div>
                </div>

                <div className="text-[10px] text-stone-500 flex items-center justify-between">
                  <span>
                    {rateStatus.isLoading
                      ? 'Actualizando tasa en vivo...'
                      : rateStatus.isLive
                      ? `Tasa en vivo BCE (${rateStatus.date || 'hoy'})`
                      : 'Tasa estimada / manual'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchLiveExchangeRate(currencyCode, baseCurrencyCode).then(res => {
                        if (res.rate > 0) setExchangeRate(res.rate);
                      });
                    }}
                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Recargar tasa</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- 1. MENSUAL --- */}
            {frequency === 'monthly' && (
              <div className="space-y-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Monto Mensual ({selectedCurrencyObj.symbol}) *
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 focus-within:ring-2 focus-within:ring-purple-500 overflow-hidden">
                      <span className="px-3 py-2 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0 min-w-[44px] text-center">
                        {selectedCurrencyObj.symbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Ej. 500"
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Día del Mes (1 a 31) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={dueDay}
                      onChange={e => setDueDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50">
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Total mensual registrado:</span>
                  <span className="text-sm font-mono font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrencyAmount(parseFloat(amountInput) || 0, selectedCurrencyObj.symbol, currencyCode)}
                    {currencyCode !== baseCurrencyCode && (
                      <span className="text-xs font-normal text-stone-500 ml-1.5">
                        (≈ {formatMoney(convertAmount(parseFloat(amountInput) || 0, exchangeRate), baseCurrencySymbol)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* --- 2. ANUAL --- */}
            {frequency === 'yearly' && (
              <div className="space-y-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/70">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Monto Anual ({selectedCurrencyObj.symbol}) *
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 focus-within:ring-2 focus-within:ring-purple-500 overflow-hidden">
                      <span className="px-2.5 py-2 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0 text-center">
                        {selectedCurrencyObj.symbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Ej. 6000"
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        className="w-full px-2.5 py-2 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Mes de Ejecución *
                    </label>
                    <select
                      value={dueMonth}
                      onChange={e => setDueMonth(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Día (1-31) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={dueDay}
                      onChange={e => setDueDay(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50">
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Equivalente mensual:</span>
                  <span className="text-sm font-mono font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrencyAmount((parseFloat(amountInput) || 0) / 12, selectedCurrencyObj.symbol, currencyCode)} / mes
                    {currencyCode !== baseCurrencyCode && (
                      <span className="text-xs font-normal text-stone-500 ml-1.5">
                        (≈ {formatMoney(convertAmount((parseFloat(amountInput) || 0) / 12, exchangeRate), baseCurrencySymbol)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* --- 3. QUINCENAL --- */}
            {frequency === 'biweekly' && (
              <div className="space-y-3 pt-2 border-t border-stone-200/70 dark:border-stone-700/70">
                <div className="text-[11px] text-stone-600 dark:text-stone-400 bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  Ingresa el día del mes y monto para cada quincena en {currencyCode}. Se calculará el total mensual y se programará cada cuota de forma independiente.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Quincena 1 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">
                      Quincena 1
                    </span>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                        Día del Mes (1-31) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={q1Day}
                        onChange={e => setQ1Day(e.target.value)}
                        placeholder="15"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                        Monto Quincena 1 ({selectedCurrencyObj.symbol}) *
                      </label>
                      <div className="flex items-center rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-purple-500 overflow-hidden">
                        <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0">
                          {selectedCurrencyObj.symbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Ej. 250"
                          value={q1Amount}
                          onChange={e => setQ1Amount(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quincena 2 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">
                      Quincena 2
                    </span>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                        Día del Mes (1-31) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={q2Day}
                        onChange={e => setQ2Day(e.target.value)}
                        placeholder="30"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                        Monto Quincena 2 ({selectedCurrencyObj.symbol}) *
                      </label>
                      <div className="flex items-center rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-purple-500 overflow-hidden">
                        <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none shrink-0">
                          {selectedCurrencyObj.symbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Ej. 250"
                          value={q2Amount}
                          onChange={e => setQ2Amount(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-transparent text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50">
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Total mensual traspasado:</span>
                  <span className="text-sm font-mono font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrencyAmount((parseFloat(q1Amount) || 0) + (parseFloat(q2Amount) || 0), selectedCurrencyObj.symbol, currencyCode)}
                    {currencyCode !== baseCurrencyCode && (
                      <span className="text-xs font-normal text-stone-500 ml-1.5">
                        (≈ {formatMoney(convertAmount((parseFloat(q1Amount) || 0) + (parseFloat(q2Amount) || 0), exchangeRate), baseCurrencySymbol)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* --- 4. SEMANAL --- */}
            {frequency === 'weekly' && (
              <div className="space-y-3 pt-2 border-t border-stone-200/70 dark:border-stone-700/70">
                <div className="text-[11px] text-stone-600 dark:text-stone-400 bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  Ingresa el día del mes y monto para las 4 semanas en {currencyCode}.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Semana 1 */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">Semana 1</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={w1Day}
                        onChange={e => setW1Day(e.target.value)}
                        placeholder="Día (ej. 7)"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={w1Amount}
                        onChange={e => setW1Amount(e.target.value)}
                        placeholder="Monto"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Semana 2 */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">Semana 2</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={w2Day}
                        onChange={e => setW2Day(e.target.value)}
                        placeholder="Día (ej. 14)"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={w2Amount}
                        onChange={e => setW2Amount(e.target.value)}
                        placeholder="Monto"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Semana 3 */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">Semana 3</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={w3Day}
                        onChange={e => setW3Day(e.target.value)}
                        placeholder="Día (ej. 21)"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={w3Amount}
                        onChange={e => setW3Amount(e.target.value)}
                        placeholder="Monto"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Semana 4 */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-1.5">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 block">Semana 4</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={w4Day}
                        onChange={e => setW4Day(e.target.value)}
                        placeholder="Día (ej. 28)"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={w4Amount}
                        onChange={e => setW4Amount(e.target.value)}
                        placeholder="Monto"
                        className="px-2 py-1 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50">
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Total mensual traspasado:</span>
                  <span className="text-sm font-mono font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrencyAmount(
                      (parseFloat(w1Amount) || 0) + (parseFloat(w2Amount) || 0) + (parseFloat(w3Amount) || 0) + (parseFloat(w4Amount) || 0),
                      selectedCurrencyObj.symbol,
                      currencyCode
                    )}
                    {currencyCode !== baseCurrencyCode && (
                      <span className="text-xs font-normal text-stone-500 ml-1.5">
                        (≈ {formatMoney(convertAmount(
                          (parseFloat(w1Amount) || 0) + (parseFloat(w2Amount) || 0) + (parseFloat(w3Amount) || 0) + (parseFloat(w4Amount) || 0),
                          exchangeRate
                        ), baseCurrencySymbol)})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Route: Origin -> Destination */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-500" />
                <span>Ruta de Cuentas (Origen ➔ Destino)</span>
              </span>
            </div>

            {/* Origin (Débito) */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <span>1. CUENTA ORIGEN (SE DEBITA / RESTA)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Miembro Titular</label>
                  <select
                    value={fromMemberId}
                    onChange={e => handleFromMemberChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  >
                    {membersWithDebitAccounts.length > 0 ? (
                      membersWithDebitAccounts.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))
                    ) : (
                      state.members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Cuenta Bancaria de Débito *</label>
                  <select
                    required
                    value={fromBankAccountId}
                    onChange={e => setFromBankAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  >
                    <option value="">Selecciona cuenta de origen...</option>
                    {availableOriginAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - {getAccountTypeLabel(acc.accountType)} ({formatMoney(acc.balance, state.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Visual Arrow */}
            <div className="flex justify-center -my-1">
              <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Destination (Crédito) */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span>2. CUENTA DESTINO (SE ACREDITA / SUMA)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Miembro Destino</label>
                  <select
                    value={toMemberId}
                    onChange={e => handleToMemberChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  >
                    {state.members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-0.5">Cuenta Bancaria de Crédito *</label>
                  <select
                    required
                    value={toBankAccountId}
                    onChange={e => setToBankAccountId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  >
                    <option value="">Selecciona cuenta de destino...</option>
                    {availableDestinationAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - {getAccountTypeLabel(acc.accountType)} ({formatMoney(acc.balance, state.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Register / Automation Switch */}
          <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Zap className="w-4 h-4 fill-purple-600 dark:fill-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Ejecutar Automáticamente
                </div>
                <div className="text-[11px] text-stone-500">
                  Asentar y actualizar saldos en las fechas programadas
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRegister}
                onChange={e => setAutoRegister(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
              Notas u Observaciones (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Instrucciones especiales o motivo de este traspaso..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold transition shadow-md shadow-purple-500/20"
            >
              {initialTransfer ? 'Guardar Cambios' : 'Programar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
