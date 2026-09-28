import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Check, Tag as TagIcon, Coins, ArrowRightLeft, RotateCcw, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { FamilyState, Transaction } from '../types';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getEstimatedExchangeRate,
  fetchLiveExchangeRate,
  convertAmount,
  formatMoney,
} from '../utils/currencies';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onAddTag: (name: string, color: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  state,
  onAddTransaction,
  onAddTag,
}) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(state.categories[0]?.name || 'Alimentación & Supermercado');
  const [memberId, setMemberId] = useState(state.members[0]?.id || '');
  const [toMemberId, setToMemberId] = useState(state.members[1]?.id || state.members[0]?.id || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [toBankAccountId, setToBankAccountId] = useState('');
  const [transferCategory, setTransferCategory] = useState('Transferencia entre Cuentas');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Currency selection per transaction
  const baseCurrencyCode = state.currencyCode || 'USD';
  const [txCurrencyCode, setTxCurrencyCode] = useState(baseCurrencyCode);
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [rateStatus, setRateStatus] = useState<{
    isLive: boolean;
    date?: string;
    isLoading: boolean;
  }>({ isLive: false, isLoading: false });

  // Inline new tag state
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#10b981');

  const [incomeCategory, setIncomeCategory] = useState('Salario / Nómina');

  // Helper to obtain bank accounts belonging specifically to a member
  const getMemberBankAccounts = useCallback((targetMemberId: string) => {
    if (!targetMemberId) return [];
    return (state.bankAccounts || []).filter(b => {
      const holderId = b.holderMemberId || (b as any).memberId;
      return holderId ? holderId === targetMemberId : (targetMemberId === state.members[0]?.id || state.members.length <= 1);
    });
  }, [state.bankAccounts, state.members]);

  // Bank accounts of the active member for expense or income
  const activeMemberAccounts = useMemo(() => {
    const memberAccs = getMemberBankAccounts(memberId);
    if (type === 'expense') {
      return memberAccs.filter(b => b.accountType !== 'loan');
    }
    return memberAccs;
  }, [getMemberBankAccounts, memberId, type]);

  const originAccountsList = useMemo(() => {
    return getMemberBankAccounts(memberId);
  }, [getMemberBankAccounts, memberId]);

  const destAccountsList = useMemo(() => {
    return getMemberBankAccounts(toMemberId);
  }, [getMemberBankAccounts, toMemberId]);

  // Handler for changing member in expense/income
  const handleMemberChange = (newMemberId: string) => {
    setMemberId(newMemberId);
    setFormError(null);
    const memberAccs = getMemberBankAccounts(newMemberId);
    const validAccs = type === 'expense' ? memberAccs.filter(b => b.accountType !== 'loan') : memberAccs;
    setBankAccountId(validAccs[0]?.id || '');
  };

  const handleOriginMemberChange = (newMemberId: string) => {
    setMemberId(newMemberId);
    setTransferError(null);
    setFormError(null);
    const memberAccounts = getMemberBankAccounts(newMemberId);
    const newSrcAcc = memberAccounts[0];
    const newSrcId = newSrcAcc?.id || '';
    setBankAccountId(newSrcId);

    // If destination was using this exact same account, adjust destination account
    if (toBankAccountId === newSrcId) {
      const destAccounts = getMemberBankAccounts(toMemberId).filter(b => b.id !== newSrcId);
      setToBankAccountId(destAccounts[0]?.id || '');
    }
  };

  const handleOriginAccountChange = (newSrcId: string) => {
    setBankAccountId(newSrcId);
    setTransferError(null);
    setFormError(null);
    if (toBankAccountId === newSrcId) {
      const destAccounts = getMemberBankAccounts(toMemberId).filter(b => b.id !== newSrcId);
      setToBankAccountId(destAccounts[0]?.id || '');
    }
  };

  const handleDestMemberChange = (newMemberId: string) => {
    setToMemberId(newMemberId);
    setTransferError(null);
    setFormError(null);
    const memberAccounts = getMemberBankAccounts(newMemberId).filter(b => b.id !== bankAccountId);
    const newDestAcc = memberAccounts[0];
    setToBankAccountId(newDestAcc?.id || '');
  };

  const handleDestAccountChange = (newDestId: string) => {
    setToBankAccountId(newDestId);
    setTransferError(null);
    setFormError(null);
  };

  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    setType(newType);
    setTransferError(null);
    setFormError(null);

    if (newType === 'transfer') {
      const memberWithAcc = state.members.find(m => getMemberBankAccounts(m.id).length > 0) || state.members[0];
      const activeOriginId = memberId && state.members.some(m => m.id === memberId) ? memberId : (memberWithAcc?.id || '');
      setMemberId(activeOriginId);

      const originAccs = getMemberBankAccounts(activeOriginId);
      const validSrcId = originAccs.some(b => b.id === bankAccountId) ? bankAccountId : (originAccs[0]?.id || '');
      setBankAccountId(validSrcId);

      const otherMember = state.members.find(m => m.id !== activeOriginId && getMemberBankAccounts(m.id).length > 0)
        || state.members.find(m => m.id !== activeOriginId)
        || state.members[0];
      const activeDestId = toMemberId && state.members.some(m => m.id === toMemberId) ? toMemberId : (otherMember?.id || activeOriginId);
      setToMemberId(activeDestId);

      const destAccs = getMemberBankAccounts(activeDestId).filter(b => b.id !== validSrcId);
      const validDestId = destAccs.some(b => b.id === toBankAccountId) ? toBankAccountId : (destAccs[0]?.id || '');
      setToBankAccountId(validDestId);
    } else {
      const memberAccs = getMemberBankAccounts(memberId);
      const validAccs = newType === 'expense' ? memberAccs.filter(b => b.accountType !== 'loan') : memberAccs;
      if (!validAccs.some(b => b.id === bankAccountId)) {
        setBankAccountId(validAccs[0]?.id || '');
      }
    }
  };

  // Update defaults when modal opens or family currency changes
  useEffect(() => {
    if (isOpen) {
      setTxCurrencyCode(state.currencyCode || 'USD');
      setExchangeRate(1.0);
      setRateStatus({ isLive: false, isLoading: false });
      setTransferError(null);
      setFormError(null);

      if (!category && state.categories.length > 0) {
        setCategory(state.categories[0].name);
      }

      if (type === 'transfer') {
        const memberWithAcc = state.members.find(m => getMemberBankAccounts(m.id).length > 0) || state.members[0];
        const activeOriginId = memberId && state.members.some(m => m.id === memberId) ? memberId : (memberWithAcc?.id || '');
        setMemberId(activeOriginId);

        const originAccs = getMemberBankAccounts(activeOriginId);
        const validSrcId = originAccs.some(b => b.id === bankAccountId) ? bankAccountId : (originAccs[0]?.id || '');
        setBankAccountId(validSrcId);

        const otherMember = state.members.find(m => m.id !== activeOriginId && getMemberBankAccounts(m.id).length > 0)
          || state.members.find(m => m.id !== activeOriginId)
          || state.members[0];
        const activeDestId = toMemberId && state.members.some(m => m.id === toMemberId) ? toMemberId : (otherMember?.id || activeOriginId);
        setToMemberId(activeDestId);

        const destAccs = getMemberBankAccounts(activeDestId).filter(b => b.id !== validSrcId);
        const validDestId = destAccs.some(b => b.id === toBankAccountId) ? toBankAccountId : (destAccs[0]?.id || '');
        setToBankAccountId(validDestId);
      } else {
        let activeMemberId = memberId;
        if (!activeMemberId || !state.members.some(m => m.id === activeMemberId)) {
          const memberWithAcc = state.members.find(m => {
            const accs = getMemberBankAccounts(m.id);
            return type === 'expense' ? accs.some(b => b.accountType !== 'loan') : accs.length > 0;
          }) || state.members[0];
          activeMemberId = memberWithAcc?.id || '';
          setMemberId(activeMemberId);
        }

        const validAccs = getMemberBankAccounts(activeMemberId).filter(
          b => type !== 'expense' || b.accountType !== 'loan'
        );
        if (!validAccs.some(b => b.id === bankAccountId)) {
          setBankAccountId(validAccs[0]?.id || '');
        }
      }
    }
  }, [isOpen, state.currencyCode, state.members, state.categories, state.bankAccounts, type, getMemberBankAccounts]);

  // Si se cambia a gasto y la cuenta seleccionada era de préstamo, reajustar automáticamente
  useEffect(() => {
    if (type === 'expense' && bankAccountId) {
      const current = state.bankAccounts.find(b => b.id === bankAccountId);
      if (current && current.accountType === 'loan') {
        const memberAccs = getMemberBankAccounts(memberId).filter(b => b.accountType !== 'loan');
        setBankAccountId(memberAccs[0]?.id || '');
      }
    }
  }, [type, bankAccountId, memberId, state.bankAccounts, getMemberBankAccounts]);

  // Update exchange rate when transaction currency changes
  const handleCurrencyChange = async (newCode: string) => {
    const clean = newCode.toUpperCase();
    setTxCurrencyCode(clean);
    if (clean === baseCurrencyCode) {
      setExchangeRate(1.0);
      setRateStatus({ isLive: false, isLoading: false });
    } else {
      const immediateRate = getEstimatedExchangeRate(clean, baseCurrencyCode);
      setExchangeRate(immediateRate);
      setRateStatus({ isLive: false, isLoading: true });

      try {
        const res = await fetchLiveExchangeRate(clean, baseCurrencyCode);
        setExchangeRate(res.rate);
        setRateStatus({
          isLive: res.isLive,
          date: res.date,
          isLoading: false,
        });
      } catch {
        setRateStatus({ isLive: false, isLoading: false });
      }
    }
  };

  const handleRefreshLiveRate = async () => {
    if (txCurrencyCode === baseCurrencyCode) return;
    setRateStatus({ isLive: false, isLoading: true });
    try {
      const res = await fetchLiveExchangeRate(txCurrencyCode, baseCurrencyCode, true);
      setExchangeRate(res.rate);
      setRateStatus({
        isLive: res.isLive,
        date: res.date,
        isLoading: false,
      });
    } catch {
      setRateStatus({ isLive: false, isLoading: false });
    }
  };

  if (!isOpen) return null;

  const isDifferentCurrency = txCurrencyCode !== baseCurrencyCode;
  const parsedTxAmount = parseFloat(amountInput) || 0;
  // Converted amount into family default currency
  const convertedAmount = isDifferentCurrency
    ? convertAmount(parsedTxAmount, exchangeRate)
    : parsedTxAmount;

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      const clean = newTagName.trim().replace(/^#/, '');
      onAddTag(clean, newTagColor);
      setSelectedTags(prev => [...prev, clean]);
      setNewTagName('');
      setIsCreatingTag(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'transfer') {
      if (state.bankAccounts.length < 2) {
        setTransferError('Se requieren al menos 2 cuentas bancarias para transferir fondos.');
        return;
      }
      if (!bankAccountId || !toBankAccountId) {
        setTransferError('Debes seleccionar una cuenta de origen y una cuenta de destino.');
        return;
      }
      if (bankAccountId === toBankAccountId) {
        setTransferError('La cuenta de origen y de destino no pueden ser la misma.');
        return;
      }
    } else {
      if (!bankAccountId) {
        setFormError('Toda transacción debe tener una cuenta bancaria asignada.');
        return;
      }
      const fromAcc = state.bankAccounts.find(b => b.id === bankAccountId);
      if (!fromAcc) {
        setFormError('La cuenta bancaria seleccionada no es válida.');
        return;
      }
      if (type === 'expense' && fromAcc.accountType === 'loan') {
        setFormError('No se pueden pagar gastos directos desde una cuenta de tipo préstamo.');
        return;
      }
    }

    const fromAcc = state.bankAccounts.find(b => b.id === bankAccountId);
    const toAcc = state.bankAccounts.find(b => b.id === toBankAccountId);
    const fromMember = state.members.find(m => m.id === (memberId || state.members[0]?.id));

    let finalDescription = description.trim();
    if (type === 'transfer') {
      const senderName = fromMember?.name || fromAcc?.name || 'Emisor';
      if (!finalDescription) {
        finalDescription = `${senderName} - Transferencia: ${fromAcc ? fromAcc.name : 'Origen'} ➔ ${toAcc ? toAcc.name : 'Destino'}`;
      } else {
        const lowerDesc = finalDescription.toLowerCase();
        const lowerSender = senderName.toLowerCase();
        if (!lowerDesc.startsWith(lowerSender)) {
          finalDescription = `${senderName} - ${finalDescription}`;
        }
      }
    }

    if (!finalDescription || parsedTxAmount <= 0) {
      return;
    }

    onAddTransaction({
      description: finalDescription,
      amount: convertedAmount, // Normalized to base family currency for coherent budgets
      type,
      date,
      category: type === 'income' ? incomeCategory : type === 'transfer' ? transferCategory : category,
      memberId: memberId || (state.members[0]?.id ?? 'm-1'),
      toMemberId: type === 'transfer' ? (toMemberId || state.members[1]?.id || memberId) : undefined,
      tags: selectedTags,
      isBankSynced: false,
      currency: txCurrencyCode,
      originalAmount: parsedTxAmount,
      exchangeRate: isDifferentCurrency ? exchangeRate : 1.0,
      bankAccountId: bankAccountId,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(type === 'transfer' && toBankAccountId ? { toBankAccountId } : {}),
    });

    onClose();
    // Reset form
    setDescription('');
    setAmountInput('');
    setSelectedTags([]);
    setNotes('');
    setTransferError(null);
    setFormError(null);
  };

  const currentTxCurrencyObj = getCurrencyByCode(txCurrencyCode);

  const senderMemberObj = state.members.find(m => m.id === memberId) || state.members[0];
  const senderAccObj = state.bankAccounts.find(b => b.id === bankAccountId);
  const destAccObj = state.bankAccounts.find(b => b.id === toBankAccountId);
  const destMemberObj = state.members.find(m => m.id === toMemberId);
  const senderDisplayName = senderMemberObj?.name || senderAccObj?.name || 'Emisor';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      {/* Background backdrop click */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Modal Container with constrained max-height and flex-col */}
      <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col h-[90dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] overflow-hidden z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* Modal Header - Fixed at top with persistent Gasto / Ingreso / Transferencia Toggle */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate">
                Registrar Movimiento Familiar
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {type === 'expense'
                  ? 'Gasto familiar con categoría y presupuesto'
                  : type === 'income'
                  ? 'Ingreso o aporte económico al hogar'
                  : 'Transferencia de fondos entre cuentas y miembros'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type Toggle: Gasto vs Ingreso vs Transferencia */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              Aporte
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              Transferencia
            </button>
          </div>
        </div>

        {/* Form wrapping internal scrollable body and fixed footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Smooth touch scrolling on mobile with touch-pan-y */}
          <div 
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain touch-pan-y pb-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {type === 'expense'
                  ? 'Concepto o Comercio *'
                  : type === 'income'
                  ? 'Concepto o Fuente de Ingreso *'
                  : 'Concepto o Motivo de la Transferencia (Opcional)'}
              </label>
              <input
                type="text"
                required={type !== 'transfer'}
                placeholder={
                  type === 'expense'
                    ? 'Ej. Supermercado, Farmacia, Recibo Luz, Colegiatura...'
                    : type === 'income'
                    ? 'Ej. Nómina, Salario, Transferencia, Venta, Honorarios...'
                    : `Ej. Ahorro quincenal, Gastos compartidos (Se colocará "${senderDisplayName}" primero)...`
                }
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {type === 'transfer' && (
                <div className="mt-1.5 p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5">
                  <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                    <span>📌 Nombre registrado en cuenta origen y destino:</span>
                  </div>
                  <p className="font-medium text-stone-700 dark:text-stone-300 break-words">
                    <span className="font-bold text-blue-700 dark:text-blue-400">{senderDisplayName}</span>
                    {' - '}
                    <span>
                      {description.trim()
                        ? (description.trim().toLowerCase().startsWith(senderDisplayName.toLowerCase())
                            ? description.trim().slice(senderDisplayName.length).replace(/^[\s\-–—:]+/, '') || description.trim()
                            : description.trim())
                        : `Transferencia: ${senderAccObj ? senderAccObj.name : 'Origen'} ➔ ${destAccObj ? destAccObj.name : 'Destino'}`}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Currency and Amount Fields */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
              {/* Currency Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>Moneda de la Transacción</span>
                  </label>
                  {isDifferentCurrency ? (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                      Extranjera (Conversión a {baseCurrencyCode})
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Moneda base del hogar
                    </span>
                  )}
                </div>
                <select
                  value={txCurrencyCode}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {!SUPPORTED_CURRENCIES.some(c => c.code.toUpperCase() === baseCurrencyCode.toUpperCase()) && (
                    <option value={baseCurrencyCode}>
                      {baseCurrencyCode} ({state.currency}) - Moneda Base del Hogar ⭐
                    </option>
                  )}
                  {SUPPORTED_CURRENCIES.map(c => {
                    const isBase = c.code.toUpperCase() === baseCurrencyCode.toUpperCase();
                    return (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) - {c.name.split(' (')[0]}{isBase ? ' ⭐ (Base del Hogar)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Importe ({currentTxCurrencyObj.symbol}) *
                </label>
                <div className="flex items-center rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden shadow-xs">
                  <span className="px-3 py-2.5 bg-stone-100 dark:bg-stone-800 text-sm font-bold text-stone-700 dark:text-stone-200 border-r border-stone-200 dark:border-stone-700 select-none flex items-center justify-center shrink-0 min-w-[56px] text-center">
                    {currentTxCurrencyObj.symbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-transparent text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Exchange rate calculation if foreign currency */}
              {isDifferentCurrency && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold flex items-center gap-1">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Tipo de cambio a {baseCurrencyCode}:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-500">1 {txCurrencyCode} =</span>
                      <input
                        type="number"
                        step="any"
                        min="0.000001"
                        value={exchangeRate}
                        onChange={e => setExchangeRate(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-0.5 rounded bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-stone-900 dark:text-stone-100"
                      />
                      <span className="font-bold">{state.currency}</span>

                      <button
                        type="button"
                        onClick={handleRefreshLiveRate}
                        disabled={rateStatus.isLoading}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition disabled:opacity-50"
                        title="Actualizar tasa en vivo desde Frankfurter"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${rateStatus.isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/60">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-600 dark:text-stone-400">Total equivalente:</span>
                      {rateStatus.isLoading ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                          Consultando Frankfurter...
                        </span>
                      ) : rateStatus.isLive ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          En vivo ({rateStatus.date || 'hoy'})
                        </span>
                      ) : null}
                    </div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      {formatMoney(convertedAmount, state.currency)} ({baseCurrencyCode})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Specific Route & Accounts vs Regular Expense/Income */}
            {type === 'transfer' ? (
              <div className="space-y-4">
                {/* Date & Transfer Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Fecha de Transferencia
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Motivo o Tipo de Transferencia *
                    </label>
                    <select
                      value={transferCategory}
                      onChange={e => setTransferCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Transferencia entre Cuentas">Transferencia entre Cuentas</option>
                      <option value="Traspaso a Fondo de Ahorro">Traspaso a Fondo de Ahorro</option>
                      <option value="Aporte para Gastos Comunes">Aporte para Gastos Comunes</option>
                      <option value="Distribución de Ingresos">Distribución de Ingresos</option>
                      <option value="Fondo de Emergencia">Fondo de Emergencia</option>
                      <option value="Otro Traspaso">Otro Traspaso</option>
                    </select>
                  </div>
                </div>

                {/* Transfer Accounts Selection Box */}
                {state.bankAccounts.length < 2 ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Se requieren al menos 2 cuentas bancarias</span>
                    </div>
                    <p>
                      Para realizar transferencias entre cuentas o miembros necesitas tener registradas al menos dos cuentas bancarias en la sección <strong>Bancos</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Ruta de Transferencia Bancaria</span>
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        Actualiza saldos automáticamente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* ORIGEN */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                            <span>1. Origen (Débito)</span>
                          </span>
                          <span className="text-[10px] text-stone-400">Emisor y su cuenta</span>
                        </div>

                        {/* 1. SELECCIONAR PRIMERO EL MIEMBRO EMISOR */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">
                            Miembro Emisor *
                          </label>
                          <select
                            value={memberId}
                            onChange={e => handleOriginMemberChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {state.members.map(m => {
                              const accs = getMemberBankAccounts(m.id);
                              return (
                                <option key={m.id} value={m.id}>
                                  {m.avatar} {m.name} ({m.role}) {accs.length > 0 ? `• ${accs.length} cta${accs.length > 1 ? 's' : ''}` : '• (Sin cuentas)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 2. SELECCIONAR LUEGO LA CUENTA (SOLO BANCOS DEL MIEMBRO EMISOR) */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">
                            Cuenta Bancaria de Origen *
                          </label>
                          <select
                            value={bankAccountId}
                            onChange={e => handleOriginAccountChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {originAccountsList.length === 0 ? (
                              <option value="" disabled>
                                (Sin cuentas bancarias registradas para este miembro)
                              </option>
                            ) : (
                              originAccountsList.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} - {b.name} ({b.accountNumberMasked}) • Saldo: {formatMoney(b.balance, b.currencySymbol || state.currency)}
                                </option>
                              ))
                            )}
                          </select>
                          {originAccountsList.length === 0 && (
                            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              ⚠️ Este miembro no tiene cuentas bancarias asignadas. Selecciona otro emisor o asigna una cuenta en la sección <strong>Bancos</strong>.
                            </p>
                          )}
                        </div>

                        {(() => {
                          const srcAcc = state.bankAccounts.find(b => b.id === bankAccountId);
                          if (!srcAcc) return null;
                          return (
                            <div className="pt-2 text-[11px] border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-stone-500 dark:text-stone-400">
                              <span>Saldo actual:</span>
                              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                                {formatMoney(srcAcc.balance, srcAcc.currencySymbol || state.currency)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* DESTINO */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            <span>2. Destino (Crédito)</span>
                          </span>
                          <span className="text-[10px] text-stone-400">Receptor y su cuenta</span>
                        </div>

                        {/* 1. SELECCIONAR PRIMERO EL MIEMBRO RECEPTOR */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">
                            Miembro Receptor *
                          </label>
                          <select
                            value={toMemberId}
                            onChange={e => handleDestMemberChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {state.members.map(m => {
                              const accs = getMemberBankAccounts(m.id);
                              return (
                                <option key={m.id} value={m.id}>
                                  {m.avatar} {m.name} ({m.role}) {accs.length > 0 ? `• ${accs.length} cta${accs.length > 1 ? 's' : ''}` : '• (Sin cuentas)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 2. SELECCIONAR LUEGO LA CUENTA (SOLO BANCOS DEL MIEMBRO RECEPTOR) */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">
                            Cuenta Bancaria de Destino *
                          </label>
                          <select
                            value={toBankAccountId}
                            onChange={e => handleDestAccountChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {destAccountsList.length === 0 ? (
                              <option value="" disabled>
                                (Sin cuentas bancarias registradas para este miembro)
                              </option>
                            ) : (
                              destAccountsList.map(b => {
                                const isOrigin = b.id === bankAccountId;
                                return (
                                  <option key={b.id} value={b.id} disabled={isOrigin}>
                                    {b.bankName} - {b.name} ({b.accountNumberMasked}){isOrigin ? ' (Origen seleccionado)' : ` • Saldo: ${formatMoney(b.balance, b.currencySymbol || state.currency)}`}
                                  </option>
                                );
                              })
                            )}
                          </select>
                          {destAccountsList.length === 0 && (
                            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              ⚠️ Este miembro no tiene cuentas bancarias asignadas. Selecciona otro receptor o asigna una cuenta en la sección <strong>Bancos</strong>.
                            </p>
                          )}
                        </div>

                        {(() => {
                          const destAcc = state.bankAccounts.find(b => b.id === toBankAccountId);
                          if (!destAcc) return null;
                          return (
                            <div className="pt-2 text-[11px] border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-stone-500 dark:text-stone-400">
                              <span>Saldo actual:</span>
                              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                                {formatMoney(destAcc.balance, destAcc.currencySymbol || state.currency)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Transfer Summary Badge */}
                    {convertedAmount > 0 && bankAccountId && toBankAccountId && bankAccountId !== toBankAccountId && (
                      <div className="p-2.5 rounded-lg bg-white/90 dark:bg-stone-900/90 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-medium">
                          <span>Monto a transferir:</span>
                          <span className="font-bold">{formatMoney(convertedAmount, state.currency)}</span>
                        </div>
                        <span className="text-[11px] text-stone-600 dark:text-stone-300 flex items-center gap-1">
                          <strong className="text-blue-700 dark:text-blue-400">Emisor: {senderDisplayName}</strong>
                          <span>➔</span>
                          <span>Receptor: {destMemberObj?.name || 'Receptor'}</span>
                        </span>
                      </div>
                    )}

                    {transferError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{transferError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Date & Member */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Miembro de la Familia *
                    </label>
                    <select
                      value={memberId}
                      onChange={e => handleMemberChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {state.members.length === 0 && (
                        <option value="">(Sin miembros registrados)</option>
                      )}
                      {state.members.map(m => {
                        const accs = getMemberBankAccounts(m.id).filter(
                          b => type !== 'expense' || b.accountType !== 'loan'
                        );
                        return (
                          <option key={m.id} value={m.id}>
                            {m.avatar} {m.name} ({m.role}) {accs.length > 0 ? `• ${accs.length} cta${accs.length > 1 ? 's' : ''}` : '• (Sin cuentas)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Category / Source (Expense vs Income) */}
                {type === 'expense' ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Categoría de Presupuesto *
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {state.categories.length === 0 && (
                        <option value="">(Sin categorías definidas)</option>
                      )}
                      {state.categories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name} (Límite: {formatMoney(cat.budgetLimit, state.currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Categoría o Tipo de Ingreso *
                    </label>
                    <select
                      value={incomeCategory}
                      onChange={e => setIncomeCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Salario / Nómina">Salario / Nómina</option>
                      <option value="Negocio / Emprendimiento">Negocio / Emprendimiento</option>
                      <option value="Honorarios / Freelance">Honorarios / Freelance</option>
                      <option value="Inversiones / Dividendos">Inversiones / Dividendos</option>
                      <option value="Alquileres / Rentas">Alquileres / Rentas</option>
                      <option value="Pensión / Jubilación">Pensión / Jubilación</option>
                      <option value="Bono / Gratificación">Bono / Gratificación</option>
                      <option value="Ventas / Comisiones">Ventas / Comisiones</option>
                      <option value="Subsidios / Ayudas">Subsidios / Ayudas</option>
                      <option value="Otros Ingresos">Otros Ingresos</option>
                    </select>
                  </div>
                )}

                {/* Cuenta Bancaria del Miembro (Obligatoria) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>
                        {type === 'expense'
                          ? 'Cuenta Bancaria del Miembro (Origen del Débito) *'
                          : 'Cuenta Bancaria del Miembro (Destino del Crédito) *'}
                      </span>
                    </label>
                    {senderMemberObj && (
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        Cuentas de {senderMemberObj.name}
                      </span>
                    )}
                  </div>

                  {activeMemberAccounts.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900 dark:text-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Sin cuentas bancarias disponibles</span>
                      </div>
                      <p>
                        Toda transacción debe tener una cuenta bancaria asignada. <strong>{senderMemberObj?.name || 'Este miembro'}</strong> no tiene ninguna cuenta bancaria {type === 'expense' ? 'apta para pagos directos (las cuentas de préstamo no permiten gastos directos)' : 'asociada'}.
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        👉 Selecciona otro miembro con cuentas bancarias o vincula una cuenta a <strong>{senderMemberObj?.name}</strong> desde la pestaña <strong>Bancos</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        required
                        value={bankAccountId}
                        onChange={e => {
                          setBankAccountId(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      >
                        {activeMemberAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.name} ({b.accountNumberMasked}) • Saldo: {formatMoney(b.balance, b.currencySymbol || state.currency)}
                          </option>
                        ))}
                      </select>

                      {/* Selected Account Info Badge */}
                      {(() => {
                        const acc = state.bankAccounts.find(b => b.id === bankAccountId);
                        if (!acc) return null;
                        return (
                          <div className="p-2.5 rounded-lg bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: acc.color || '#10b981' }}
                              />
                              <span className="font-semibold text-stone-900 dark:text-stone-100">
                                {acc.bankName} • {acc.name}
                              </span>
                              <span className="text-[11px] text-stone-500">
                                ({acc.accountNumberMasked})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="text-stone-400">Saldo:</span>
                              <strong className="text-stone-900 dark:text-stone-100 font-bold">
                                {formatMoney(acc.balance, acc.currencySymbol || state.currency)}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}

                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {type === 'expense'
                          ? 'El saldo de la cuenta bancaria del miembro se descontará automáticamente.'
                          : 'El saldo de la cuenta bancaria del miembro se incrementará automáticamente.'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tags & Custom Tag creation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>Etiquetas Personalizadas (Tags)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingTag(!isCreatingTag)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear etiqueta</span>
                </button>
              </div>

              {/* Inline create new tag form */}
              {isCreatingTag && (
                <div className="p-3 mb-2 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nombre etiqueta (ej. Vacaciones, Mascota)"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      className="w-8 h-7 p-0.5 rounded cursor-pointer border border-stone-300 dark:border-stone-600"
                    />
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              {/* Tag pills */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50 overscroll-contain">
                {state.tags.length === 0 ? (
                  <span className="text-[11px] text-stone-400 italic p-1">No hay etiquetas creadas todavía.</span>
                ) : (
                  state.tags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span>#{tag.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Notas adicionales (opcional)
              </label>
              <input
                type="text"
                placeholder="Detalles sobre el ticket, garantía o motivo..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Sticky/Fixed Actions Footer - Always visible on mobile and desktop */}
          <div className="flex-shrink-0 px-5 sm:px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5">
            {formError ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </p>
            ) : <div />}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  (type === 'transfer' && (state.bankAccounts.length < 2 || !bankAccountId || !toBankAccountId || bankAccountId === toBankAccountId)) ||
                  (type !== 'transfer' && (!bankAccountId || activeMemberAccounts.length === 0))
                }
                className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white shadow-sm transition active:scale-[0.98] ${
                  type === 'expense'
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    : type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {type === 'expense'
                  ? 'Registrar Gasto'
                  : type === 'income'
                  ? 'Registrar Ingreso'
                  : 'Realizar Transferencia'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
