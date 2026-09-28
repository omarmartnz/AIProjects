import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  CreditCard,
  Building2,
  Wallet,
  PiggyBank,
  TrendingUp,
  Home,
  CheckCircle2,
  Edit2,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Sparkles,
  User,
  Info,
  DollarSign,
  Receipt,
  X,
  ChevronDown,
  Globe2,
  HelpCircle,
  ArrowRightLeft,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { FamilyState, BankAccount, BankProductType, BankEntity } from '../types';
import { formatMoney, SUPPORTED_CURRENCIES, getCurrencyByCode } from '../utils/currencies';
import { DOMINICAN_BANKS, DominicanBank } from '../data/dominicanBanks';
import {
  calculateTreasuryMetrics,
  calculateAccountTransactionsSummary,
  convertAmountToAccountCurrency,
  getAccountNextDueDate,
} from '../utils/bankUtils';

interface BankIntegrationViewProps {
  state: FamilyState;
  onAddBankAccount: (bank: Omit<BankAccount, 'id' | 'lastSynced'>) => void;
  onUpdateBankAccount: (id: string, bank: Partial<BankAccount>) => void;
  onDeleteBankAccount: (id: string) => void;
  onAddCustomBank?: (bank: { name: string; shortName?: string; color?: string; categoryLabel?: string }) => void;
  onDeleteCustomBank?: (id: string) => void;
  onOpenTransactionModal?: () => void;
  onOpenHelp?: () => void;
  // Propiedades retrocompatibles opcionales
  isBankSyncing?: boolean;
  onSyncBank?: () => void;
  onToggleAutoSync?: (id: string) => void;
}

const PRODUCT_TYPE_LABELS: Record<BankProductType, { label: string; icon: any; badgeClass: string }> = {
  checking: {
    label: 'Cuenta Corriente / Nómina',
    icon: Landmark,
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  },
  savings: {
    label: 'Cuenta de Ahorro / Depósito',
    icon: PiggyBank,
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  },
  credit: {
    label: 'Tarjeta de Crédito / Débito',
    icon: CreditCard,
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
  },
  loan: {
    label: 'Préstamo / Hipoteca',
    icon: Home,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  },
  investment: {
    label: 'Inversión / Fondos',
    icon: TrendingUp,
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
  },
};

// Monedas recomendadas para República Dominicana al inicio del selector
const PRIORITY_CURRENCY_CODES = ['DOP', 'USD', 'EUR'];

export const BankIntegrationView: React.FC<BankIntegrationViewProps> = ({
  state,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  onAddCustomBank,
  onDeleteCustomBank,
  onOpenTransactionModal,
  onOpenHelp,
}) => {
  // Modal de añadir / editar producto bancario
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Modal para agregar bancos personalizados
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankShortName, setNewBankShortName] = useState('');
  const [newBankCategory, setNewBankCategory] = useState('Banco Múltiple');
  const [newBankColor, setNewBankColor] = useState('#004b87');

  // Modal de ajuste rápido de saldo
  const [adjustBalanceAccount, setAdjustBalanceAccount] = useState<BankAccount | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [adjustNoteInput, setAdjustNoteInput] = useState('');

  // Modal de auditoría y movimientos de una cuenta
  const [inspectingAccount, setInspectingAccount] = useState<BankAccount | null>(null);
  const [inspectingTypeFilter, setInspectingTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Confirmación de eliminación de cuenta
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

  // Copiado al portapapeles
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtros de la vista de cuentas
  const [typeFilter, setTypeFilter] = useState<'all' | BankProductType>('all');
  const [holderFilter, setHolderFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del formulario de vinculación
  const [accountName, setAccountName] = useState('');
  const [selectedBankName, setSelectedBankName] = useState('Banreservas (Banco de Reservas)');
  const [bankSearchFilter, setBankSearchFilter] = useState('');
  const [accountType, setAccountType] = useState<BankProductType>('checking');
  const [balance, setBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [holderMemberId, setHolderMemberId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [cardColor, setCardColor] = useState('#004b87');

  // Parámetros para Tarjetas de Crédito y Préstamos
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Moneda específica de la cuenta
  const defaultCurrencyCode = state.currencyCode || 'DOP';
  const [accountCurrencyCode, setAccountCurrencyCode] = useState(defaultCurrencyCode);

  // Moneda actual seleccionada para la cuenta
  const currentCurrencyInfo = useMemo(() => {
    return getCurrencyByCode(accountCurrencyCode);
  }, [accountCurrencyCode]);

  // Lista unificada de bancos: República Dominicana + bancos agregados por el usuario, organizada alfabéticamente
  const allAvailableBanks = useMemo(() => {
    const customList: DominicanBank[] = (state.customBanks || []).map(cb => ({
      id: cb.id,
      name: cb.name,
      shortName: cb.shortName || cb.name,
      color: cb.color || '#004b87',
      category: 'multiple' as const,
      categoryLabel: cb.categoryLabel || 'Banco Agregado',
      isCustom: true,
    }));
    return [...DOMINICAN_BANKS, ...customList].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
  }, [state.customBanks]);

  // Bancos filtrados en el buscador del formulario, ordenados alfabéticamente
  const filteredBanksForSelect = useMemo(() => {
    if (!bankSearchFilter.trim()) {
      return [...allAvailableBanks].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
    }
    const term = bankSearchFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allAvailableBanks
      .filter(bank => {
        const nameNorm = bank.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const shortNorm = bank.shortName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const catNorm = (bank.categoryLabel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameNorm.includes(term) || shortNorm.includes(term) || catNorm.includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [allAvailableBanks, bankSearchFilter]);

  // Monedas ordenadas para el selector de cuentas (DOP, USD, EUR al inicio)
  const currencyOptions = useMemo(() => {
    const priority = PRIORITY_CURRENCY_CODES.map(code => getCurrencyByCode(code));
    const others = SUPPORTED_CURRENCIES.filter(c => !PRIORITY_CURRENCY_CODES.includes(c.code));
    return [...priority, ...others];
  }, []);

  // Abrir modal para crear cuenta
  const handleOpenCreateModal = () => {
    setEditingAccountId(null);
    setAccountName('');
    setSelectedBankName('Banreservas (Banco de Reservas)');
    setBankSearchFilter('');
    setAccountType('checking');
    setBalance('0');
    setCreditLimit('');
    setHolderMemberId(state.members[0]?.id || '');
    setAccountNumber('');
    setNotes('');
    setCardColor('#004b87');
    setInterestRate('');
    setMinimumPayment('');
    setDueDay('');
    setDueDate('');
    setAccountCurrencyCode(state.currencyCode === 'USD' ? 'USD' : 'DOP');
    setIsFormModalOpen(true);
  };

  // Abrir modal para editar cuenta
  const handleOpenEditModal = (acc: BankAccount) => {
    setEditingAccountId(acc.id);
    setAccountName(acc.name);
    setSelectedBankName(acc.bankName);
    setBankSearchFilter('');
    setAccountType(acc.accountType || 'checking');
    setBalance(acc.balance.toString());
    setCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : '');
    setHolderMemberId(acc.holderMemberId || state.members[0]?.id || '');
    setAccountNumber(acc.accountNumberMasked || acc.iban || '');
    setNotes(acc.notes || '');
    setCardColor(acc.color || '#004b87');
    setInterestRate(acc.interestRate !== undefined ? acc.interestRate.toString() : '');
    setMinimumPayment(acc.minimumPayment !== undefined ? acc.minimumPayment.toString() : '');
    setDueDay(acc.dueDay !== undefined ? acc.dueDay.toString() : '');
    const computedNextDue = getAccountNextDueDate(acc);
    setDueDate(acc.dueDate || (computedNextDue ? computedNextDue.nextDateStr : ''));
    setAccountCurrencyCode(acc.currency || state.currencyCode || 'DOP');
    setIsFormModalOpen(true);
  };

  // Abrir modal de ajuste rápido de saldo
  const handleOpenAdjustBalance = (acc: BankAccount) => {
    setAdjustBalanceAccount(acc);
    setNewBalanceInput(acc.balance.toString());
    setAdjustNoteInput('');
  };

  const handleSaveAdjustBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBalanceAccount) return;
    const parsed = parseFloat(newBalanceInput);
    if (isNaN(parsed)) return;

    onUpdateBankAccount(adjustBalanceAccount.id, {
      balance: parsed,
      lastSynced: adjustNoteInput.trim()
        ? `Ajuste: ${adjustNoteInput.trim()}`
        : `Ajuste manual a las ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
    setAdjustBalanceAccount(null);
  };

  // Copiar número de cuenta
  const handleCopyNumber = (acc: BankAccount) => {
    const textToCopy = acc.accountNumberMasked || acc.iban || acc.name;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Guardar formulario de producto bancario
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = selectedBankName.trim() || 'Banco';
    const rawNumber = accountNumber.trim();
    const masked = rawNumber.length > 4
      ? `•••• ${rawNumber.slice(-4)}`
      : rawNumber || `•••• ${Math.floor(1000 + Math.random() * 9000)}`;

    const cur = getCurrencyByCode(accountCurrencyCode);

    const payload: Omit<BankAccount, 'id' | 'lastSynced'> = {
      name: accountName.trim() || `Cuenta ${finalBankName}`,
      bankName: finalBankName,
      accountType,
      balance: parseFloat(balance) || 0,
      currency: cur.code,
      currencySymbol: cur.symbol,
      accountNumberMasked: masked,
      color: cardColor,
      status: 'connected',
      ...(creditLimit ? { creditLimit: parseFloat(creditLimit) } : {}),
      ...(holderMemberId ? { holderMemberId } : {}),
      ...(rawNumber ? { iban: rawNumber } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...((accountType === 'credit' || accountType === 'loan') ? {
        ...(interestRate ? { interestRate: parseFloat(interestRate) } : {}),
        ...(minimumPayment ? { minimumPayment: parseFloat(minimumPayment) } : {}),
        ...(dueDay ? { dueDay: parseInt(dueDay, 10) } : {}),
        ...(dueDate ? { dueDate: dueDate.trim() } : {}),
      } : {}),
    };

    if (editingAccountId) {
      onUpdateBankAccount(editingAccountId, {
        ...payload,
        lastSynced: `Modificado ${new Date().toLocaleDateString()}`,
      });
    } else {
      onAddBankAccount(payload);
    }

    setIsFormModalOpen(false);
  };

  // Manejar creación rápida de banco desde el buscador
  const handleQuickAddBankFromSearch = () => {
    const nameToAdd = bankSearchFilter.trim();
    if (!nameToAdd) return;

    const newColor = cardColor || '#004b87';
    if (onAddCustomBank) {
      onAddCustomBank({
        name: nameToAdd,
        shortName: nameToAdd,
        color: newColor,
        categoryLabel: 'Banco Agregado',
      });
    }
    setSelectedBankName(nameToAdd);
    setCardColor(newColor);
    setBankSearchFilter('');
  };

  // Guardar nuevo banco desde el modal de administración de bancos
  const handleSaveCustomBank = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBankName.trim();
    if (!trimmed) return;

    if (onAddCustomBank) {
      onAddCustomBank({
        name: trimmed,
        shortName: newBankShortName.trim() || trimmed,
        color: newBankColor,
        categoryLabel: newBankCategory,
      });
    }

    setNewBankName('');
    setNewBankShortName('');
    setIsAddBankModalOpen(false);
  };

  // Confirmar eliminación de cuenta
  const handleConfirmDelete = () => {
    if (!deletingAccount) return;
    onDeleteBankAccount(deletingAccount.id);
    setDeletingAccount(null);
  };

  // Cálculos de tesorería precisos con conversión cambiaria y separación estricta de deuda
  const metrics = useMemo(() => {
    return calculateTreasuryMetrics(state.bankAccounts || [], state.currencyCode || 'DOP');
  }, [state.bankAccounts, state.currencyCode]);

  // Cuentas filtradas en la vista principal
  const filteredAccounts = useMemo(() => {
    return (state.bankAccounts || []).filter(acc => {
      if (typeFilter !== 'all' && acc.accountType !== typeFilter) {
        return false;
      }
      if (holderFilter !== 'all' && acc.holderMemberId !== holderFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = acc.name.toLowerCase().includes(term);
        const matchesBank = acc.bankName.toLowerCase().includes(term);
        const matchesNumber = (acc.accountNumberMasked || '').toLowerCase().includes(term);
        if (!matchesName && !matchesBank && !matchesNumber) return false;
      }
      return true;
    });
  }, [state.bankAccounts, typeFilter, holderFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. Encabezado y Resumen de Cuentas y Tesorería Familiar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Banca & Tesorería Familiar</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
              Cuentas y Productos Bancarios
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
              Gestiona cuentas corrientes, de ahorro, nómina, préstamos y tarjetas bancarias con soporte multi-moneda para toda la familia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón de Ayuda del Módulo */}
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs transition shadow-2xs"
                title="Ver explicación detallada del módulo, beneficios y tips"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Ayuda</span>
              </button>
            )}

            {/* Botón para Administrar / Agregar Bancos */}
            <button
              onClick={() => setIsAddBankModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Agregar Banco</span>
            </button>

            {/* Botón para Vincular Producto Bancario */}
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Cuenta / Tarjeta</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas de Tesorería */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-5">
          {/* Saldo Líquido */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-xs font-semibold mb-1">
              <span>Saldo Líquido</span>
              <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatMoney(metrics.liquid, state.currency)}
            </div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
              Cuentas corrientes y ahorro
            </p>
          </div>

          {/* Deuda / Préstamos / Tarjetas */}
          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-semibold mb-1">
              <span>Deuda / Créditos</span>
              <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatMoney(metrics.debt, state.currency)}
            </div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Préstamos o crédito dispuesto
            </p>
          </div>

          {/* Inversiones */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">
              <span>Inversiones / Fondos</span>
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatMoney(metrics.investments, state.currency)}
            </div>
            <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
              Certificados y depósitos a plazo
            </p>
          </div>

          {/* Patrimonio Neto Familiar */}
          <div className={`p-4 rounded-xl border ${
            metrics.netWorth >= 0
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50'
              : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'
          }`}>
            <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${
              metrics.netWorth >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              <span>Patrimonio Neto</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className={`text-lg sm:text-2xl font-bold ${
              metrics.netWorth >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {formatMoney(metrics.netWorth, state.currency)}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Líquido + Inversiones - Deuda ({metrics.totalAccounts} cuentas)
            </p>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
        {/* Filtros por Tipo de Producto */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Todos ({state.bankAccounts.length})
          </button>
          <button
            onClick={() => setTypeFilter('checking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'checking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Corrientes
          </button>
          <button
            onClick={() => setTypeFilter('savings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'savings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Ahorro
          </button>
          <button
            onClick={() => setTypeFilter('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'credit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setTypeFilter('loan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'loan'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Préstamos
          </button>
          <button
            onClick={() => setTypeFilter('investment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'investment'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Inversiones
          </button>
        </div>

        {/* Filtro por Miembro Titular y Buscador */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Selector de Titular */}
          <select
            value={holderFilter}
            onChange={e => setHolderFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            <option value="all">Todos los titulares</option>
            {state.members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>

          {/* Buscador */}
          <div className="relative flex-1 sm:w-44 min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar cuenta..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Lista / Cuadrícula de Cuentas Bancarias */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center">
          <Landmark className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            No hay productos bancarios que coincidan
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            {state.bankAccounts.length === 0
              ? 'Comienza vinculando tu cuenta corriente, caja de ahorros, tarjeta de crédito o préstamo.'
              : 'Prueba a cambiar los filtros de tipo o titular para encontrar el producto buscado.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Vincular Primer Producto Bancario</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map(account => {
            const productTypeInfo = PRODUCT_TYPE_LABELS[account.accountType || 'checking'] || PRODUCT_TYPE_LABELS.checking;
            const ProductIcon = productTypeInfo.icon;
            const holderMember = state.members.find(m => m.id === account.holderMemberId);
            const isCopied = copiedId === account.id;
            const accCurrencySymbol = account.currencySymbol || (account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : 'RD$');
            const accCurrencyCode = account.currency || 'DOP';

            return (
              <div
                key={account.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                {/* Header de la Tarjeta con acento de color del Banco */}
                <div>
                  <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 mt-0.5"
                          style={{ backgroundColor: account.color || '#004b87' }}
                        >
                          {account.bankName.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 break-words leading-snug">
                            {account.name}
                          </h4>
                          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="font-medium text-stone-600 dark:text-stone-300">{account.bankName}</span>
                            <span>•</span>
                            <button
                              onClick={() => handleCopyNumber(account)}
                              className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[11px] group"
                              title="Copiar número de cuenta"
                            >
                              <span>{account.accountNumberMasked || '•••• 0000'}</span>
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-stone-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Badges de Tipo y Moneda adaptados a móvil: se alinean limpiamente sin cortarse */}
                      <div className="flex items-center sm:flex-col sm:items-end gap-1.5 flex-wrap shrink-0 pl-13 sm:pl-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${productTypeInfo.badgeClass}`}>
                          <ProductIcon className="w-3 h-3 shrink-0" />
                          <span>{account.accountType === 'checking' ? 'Corriente' : account.accountType === 'savings' ? 'Ahorro' : account.accountType === 'credit' ? 'Tarjeta' : account.accountType === 'loan' ? 'Préstamo' : 'Inversión'}</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 whitespace-nowrap">
                          {accCurrencyCode} ({accCurrencySymbol})
                        </span>
                      </div>
                    </div>

                    {/* Saldo Destacado según Naturaleza del Producto Financiero */}
                    {(() => {
                      const txSummary = calculateAccountTransactionsSummary(account, state.transactions, state.currencyCode || 'DOP');
                      const isCredit = account.accountType === 'credit';
                      const isLoan = account.accountType === 'loan';
                      const isForeignCurrency = accCurrencyCode !== (state.currencyCode || 'DOP');
                      const debtAmount = (isCredit || isLoan) ? Math.abs(account.balance) : 0;
                      const limitVal = account.creditLimit || 0;
                      const availableCredit = isCredit && limitVal > 0 ? Math.max(0, limitVal - debtAmount) : 0;
                      const usagePercent = isCredit && limitVal > 0 ? Math.min(100, Math.round((debtAmount / limitVal) * 100)) : 0;
                      const convertedBase = isForeignCurrency
                        ? convertAmountToAccountCurrency(account.balance, accCurrencyCode, state.currencyCode || 'DOP')
                        : account.balance;

                      return (
                        <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                                {isCredit ? 'Consumo / Deuda Tarjeta' : isLoan ? 'Saldo Pendiente (Deuda)' : 'Saldo Real Disponible'}
                              </span>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className={`text-xl sm:text-2xl font-extrabold ${
                                  isCredit || isLoan
                                    ? debtAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-100'
                                    : account.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100'
                                }`}>
                                  {formatMoney(isCredit || isLoan ? debtAmount : account.balance, accCurrencySymbol)}
                                </span>
                                {isForeignCurrency && (
                                  <span className="text-[11px] font-medium text-stone-400 whitespace-nowrap">
                                    (≈ {formatMoney(convertedBase, state.currency)})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Límite o Crédito */}
                            {limitVal > 0 && (
                              <div className="sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800/60">
                                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                                  {isCredit ? 'Límite Tarjeta' : isLoan ? 'Monto Préstamo' : 'Límite/Sobregiro'}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300">
                                  {formatMoney(limitVal, accCurrencySymbol)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Línea de Crédito Disponible para Tarjetas */}
                          {isCredit && limitVal > 0 && (
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-stone-500 dark:text-stone-400">
                                  Disponible: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(availableCredit, accCurrencySymbol)}</strong>
                                </span>
                                <span className={`font-bold ${usagePercent > 80 ? 'text-rose-600' : usagePercent > 50 ? 'text-amber-600' : 'text-stone-500'}`}>
                                  {usagePercent}% usado
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    usagePercent > 80
                                      ? 'bg-rose-500'
                                      : usagePercent > 50
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Botón rápido a los movimientos auditados */}
                          <div className="flex items-center justify-between pt-1 text-[11px] gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setInspectingAccount(account)}
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              <Receipt className="w-3 h-3 shrink-0" />
                              <span>{txSummary.totalMovements} {txSummary.totalMovements === 1 ? 'movimiento' : 'movimientos'} registrados</span>
                            </button>
                            <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                              {account.lastSynced || 'Actual'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Detalles adicionales: Titular y Notas */}
                  <div className="px-4 sm:px-5 py-3 bg-stone-50/70 dark:bg-stone-950/40 text-xs space-y-1.5">
                    {/* Titular */}
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                      <span className="text-stone-400 text-[11px]">Titular:</span>
                      {holderMember ? (
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span>{holderMember.avatar}</span>
                          <span>{holderMember.name}</span>
                          <span className="text-[10px] text-stone-400 font-normal">({holderMember.role})</span>
                        </span>
                      ) : (
                        <span className="text-stone-500 font-medium">Familiar Compartida</span>
                      )}
                    </div>

                    {/* Notas */}
                    {account.notes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 italic truncate" title={account.notes}>
                        "{account.notes}"
                      </p>
                    )}

                    {/* Parámetros de Deuda / Préstamo / Tarjeta */}
                    {(account.accountType === 'credit' || account.accountType === 'loan') && (account.interestRate !== undefined || account.minimumPayment !== undefined || account.dueDay !== undefined || account.dueDate) && (
                      <div className="pt-2 mt-1 border-t border-stone-200/60 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                        {account.interestRate !== undefined && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            <span>Tasa:</span>
                            <span>{account.interestRate}%</span>
                          </span>
                        )}
                        {account.minimumPayment !== undefined && (
                          <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300 bg-stone-200/50 dark:bg-stone-800 px-1.5 py-0.5 rounded font-medium">
                            <span className="text-stone-400">Cuota:</span>
                            <span>{formatMoney(account.minimumPayment, accCurrencySymbol)}/m</span>
                          </span>
                        )}
                        {(() => {
                          const dueInfo = getAccountNextDueDate(account);
                          if (!dueInfo) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
                                dueInfo.status === 'today'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900'
                                  : dueInfo.status === 'soon'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                              }`}
                              title={`Próximo vencimiento: ${dueInfo.formattedLongDate}. (${dueInfo.dueDayDescription})`}
                            >
                              <Calendar className="w-3 h-3 text-stone-400 dark:text-stone-500 shrink-0" />
                              <span className="text-stone-500 dark:text-stone-400">Próx. vencimiento:</span>
                              <span className="font-bold text-stone-900 dark:text-stone-100">
                                {dueInfo.formattedDate}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1 rounded ${
                                  dueInfo.status === 'today'
                                    ? 'bg-rose-600 text-white'
                                    : dueInfo.status === 'soon'
                                    ? 'bg-amber-600/20 text-amber-800 dark:text-amber-200'
                                    : 'text-stone-400 dark:text-stone-500'
                                }`}
                              >
                                {dueInfo.badgeText}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleOpenAdjustBalance(account)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 font-semibold text-[11px] transition whitespace-nowrap"
                      title="Ajustar saldo real según el banco"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Ajustar Saldo</span>
                    </button>
                    <button
                      onClick={() => setInspectingAccount(account)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold text-[11px] transition whitespace-nowrap"
                      title="Ver todos los movimientos vinculados"
                    >
                      <Receipt className="w-3.5 h-3.5 text-stone-500" />
                      <span>Movimientos</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <button
                      onClick={() => handleOpenEditModal(account)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingAccount(account)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Desvincular cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal de Creación / Edición de Producto Bancario */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Fijo */}
            <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {editingAccountId ? 'Editar Producto Bancario' : 'Vincular Cuenta o Producto Bancario'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con Scroll Vertical Suave e Independiente */}
            <form id="bank-account-form" onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
              {/* Entidad Bancaria: Lista con Buscador / Filtro en tiempo real */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Entidad Bancaria
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar otro banco</span>
                  </button>
                </div>

                {/* Buscador / Filtro de Bancos */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={bankSearchFilter}
                    onChange={e => setBankSearchFilter(e.target.value)}
                    placeholder="Buscar o filtrar entidad bancaria..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {bankSearchFilter && (
                    <button
                      type="button"
                      onClick={() => setBankSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista de Bancos Seleccionables con overscroll-contain */}
                <div className="max-h-40 overflow-y-auto p-1.5 border rounded-xl border-stone-200 dark:border-stone-700 space-y-1 overscroll-contain">
                  {filteredBanksForSelect.map(bank => {
                    const isSelected = selectedBankName === bank.name;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => {
                          setSelectedBankName(bank.name);
                          setCardColor(bank.color);
                        }}
                        className={`w-full p-2.5 rounded-lg text-xs font-medium text-left transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-500 text-blue-900 dark:text-blue-100'
                            : 'border border-transparent text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: bank.color }}
                          />
                          <div className="min-w-0 text-left">
                            <div className="font-semibold text-xs truncate">
                              {bank.name}
                            </div>
                            <div className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
                              <span>{bank.categoryLabel}</span>
                              {bank.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                  Personalizado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {filteredBanksForSelect.length === 0 && (
                    <div className="p-3 text-center">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        No se encontró ningún banco con "{bankSearchFilter}".
                      </p>
                      <button
                        type="button"
                        onClick={handleQuickAddBankFromSearch}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar "{bankSearchFilter.trim()}" como nuevo banco</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Banco Seleccionado Actual */}
                <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs">
                  <span className="text-stone-500 dark:text-stone-400">Banco seleccionado:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cardColor }} />
                    {selectedBankName}
                  </span>
                </div>
              </div>

              {/* Especificación de Moneda y Nombre o Alias */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Moneda de la Cuenta */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Moneda</span>
                  </label>
                  <select
                    value={accountCurrencyCode}
                    onChange={e => setAccountCurrencyCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currencyOptions.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nombre descriptivo del producto */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nombre o Alias de la Cuenta
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Ej. Cuenta Nómina Principal, Tarjeta Compras, Hucha..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tipo de Producto y Titular Familiar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Tipo de Producto
                  </label>
                  <select
                    value={accountType}
                    onChange={e => setAccountType(e.target.value as BankProductType)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="checking">🏦 Cuenta Corriente / Nómina</option>
                    <option value="savings">💰 Cuenta de Ahorro / Depósito</option>
                    <option value="credit">💳 Tarjeta de Crédito / Débito</option>
                    <option value="loan">🏠 Préstamo / Hipoteca</option>
                    <option value="investment">📈 Inversión / Certificado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Titular Familiar
                  </label>
                  <select
                    value={holderMemberId}
                    onChange={e => setHolderMemberId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {state.members.length === 0 ? (
                      <option value="" disabled>No hay miembros registrados</option>
                    ) : (
                      state.members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.avatar} {m.name} ({m.role})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Saldo Actual adaptado a la Moneda */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {accountType === 'credit' || accountType === 'loan'
                    ? `Saldo Deudor Actual (${currentCurrencyInfo.symbol} ${currentCurrencyInfo.code})`
                    : `Saldo Actual Disponible (${currentCurrencyInfo.symbol} ${currentCurrencyInfo.code})`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  {accountType === 'credit' || accountType === 'loan'
                    ? 'Indica el monto que adeudas actualmente a la fecha.'
                    : 'Fondos disponibles en la cuenta.'}
                </p>
              </div>

              {/* Campos para Tarjetas de Crédito y Préstamos: Condiciones Financieras */}
              {(accountType === 'credit' || accountType === 'loan') && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Condiciones Financieras ({accountType === 'credit' ? 'Tarjeta de Crédito' : 'Préstamo / Hipoteca'})</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                    Estos datos alimentan automáticamente el <strong>Planificador de Deudas (Bola de Nieve vs. Avalancha)</strong> y la proyección de flujo de caja familiar.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Límite de Crédito o Monto Total del Préstamo */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {accountType === 'credit' ? 'Límite de Crédito' : 'Monto Total Préstamo'} ({currentCurrencyInfo.symbol})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={creditLimit}
                        onChange={e => setCreditLimit(e.target.value)}
                        placeholder={accountType === 'credit' ? 'Ej: 3000.00' : 'Ej: 10000.00'}
                        className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Tasa de interés */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Tasa Interés (APR)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={interestRate}
                          onChange={e => setInterestRate(e.target.value)}
                          placeholder="Ej: 18.5"
                          className="w-full pl-2.5 pr-7 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* Cuota mínima / mensual */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {accountType === 'credit' ? 'Cuota Mínima' : 'Cuota Mensual'} ({currentCurrencyInfo.symbol})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={minimumPayment}
                        onChange={e => setMinimumPayment(e.target.value)}
                        placeholder="Ej: 120.00"
                        className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Día de vencimiento */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        {accountType === 'credit' ? 'Día Corte / Pago' : 'Día de Pago'} (1-31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={e => {
                          const val = e.target.value;
                          setDueDay(val);
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
                            const info = getAccountNextDueDate({ dueDay: parsed });
                            if (info) {
                              setDueDate(info.nextDateStr);
                            }
                          }
                        }}
                        placeholder="Día (1-31)"
                        className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Próxima Fecha de Vencimiento */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Próx. Vencimiento
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => {
                          const val = e.target.value;
                          setDueDate(val);
                          if (val) {
                            const parts = val.split('-');
                            if (parts.length === 3) {
                              const d = parseInt(parts[2], 10);
                              if (!isNaN(d) && d >= 1 && d <= 31 && !dueDay) {
                                setDueDay(d.toString());
                              }
                            }
                          }
                        }}
                        className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Resumen dinámico del próximo vencimiento */}
                  {(() => {
                    const parsedDay = dueDay ? parseInt(dueDay, 10) : undefined;
                    const previewInfo = getAccountNextDueDate({
                      dueDay: !isNaN(parsedDay as number) ? parsedDay : undefined,
                      dueDate: dueDate || undefined,
                    });
                    if (previewInfo) {
                      return (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>
                              Próxima fecha de vencimiento:{' '}
                              <strong className="font-bold text-stone-900 dark:text-stone-100">
                                {previewInfo.formattedLongDate}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white">
                              {previewInfo.badgeText}
                            </span>
                            <span className="text-stone-500 dark:text-stone-400 text-[11px]">
                              ({previewInfo.dueDayDescription})
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Número de cuenta / Enmascarado */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Número de Cuenta o Últimos 4 dígitos (Opcional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Ej: 960 •••• •••• 4821 o 4821"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notas y color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Notas adicionales (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Cuenta de nómina, corte los días 15..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Color de Tarjeta
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={cardColor}
                      onChange={e => setCardColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-stone-300 dark:border-stone-700 cursor-pointer p-0.5 bg-transparent"
                    />
                    <span className="text-xs font-mono text-stone-500">{cardColor}</span>
                  </div>
                </div>
              </div>

            </form>

            {/* Footer Fijo con Botones de Acción */}
            <div className="p-3.5 sm:p-4 bg-stone-50/80 dark:bg-stone-900/90 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="bank-account-form"
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                {editingAccountId ? 'Guardar Cambios' : 'Vincular Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Dedicado para Agregar Nuevos Bancos / Entidades Financieras */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Agregar Nueva Entidad Bancaria
                </h3>
              </div>
              <button
                onClick={() => setIsAddBankModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomBank} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nombre Oficial del Banco o Cooperativa
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                  placeholder="Ej. Banco Santander, BBVA, Chase, Cooperativa Local..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Siglas o Nombre Corto
                  </label>
                  <input
                    type="text"
                    value={newBankShortName}
                    onChange={e => setNewBankShortName(e.target.value)}
                    placeholder="Ej. Coop Altagracia"
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Tipo de Entidad
                  </label>
                  <select
                    value={newBankCategory}
                    onChange={e => setNewBankCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Banco Múltiple">Banco Múltiple</option>
                    <option value="Asociación de Ahorros y Préstamos">Asociación de Ahorros</option>
                    <option value="Cooperativa de Ahorro y Crédito">Cooperativa</option>
                    <option value="Banco Digital">Banco Digital</option>
                    <option value="Banco de Ahorro y Crédito">Ahorro y Crédito</option>
                    <option value="Entidad Internacional">Entidad Internacional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Color Representativo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newBankColor}
                    onChange={e => setNewBankColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-stone-300 dark:border-stone-700 cursor-pointer p-0.5 bg-transparent"
                  />
                  <div className="flex items-center gap-1.5">
                    {['#004b87', '#002855', '#007a3d', '#ec111a', '#f37021', '#7c3aed', '#008080'].map(presetColor => (
                      <button
                        key={presetColor}
                        type="button"
                        onClick={() => setNewBankColor(presetColor)}
                        className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 transition transform hover:scale-110"
                        style={{ backgroundColor: presetColor }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de bancos personalizados ya existentes */}
              {state.customBanks && state.customBanks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block mb-1">
                    Bancos personalizados de la familia:
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {state.customBanks.map(cb => (
                      <div
                        key={cb.id}
                        className="flex items-center justify-between px-2.5 py-1 rounded bg-stone-50 dark:bg-stone-800 text-xs"
                      >
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cb.color }} />
                          {cb.name}
                        </span>
                        {onDeleteCustomBank && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomBank(cb.id)}
                            className="text-stone-400 hover:text-rose-600 text-xs ml-2"
                            title="Eliminar banco personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  Guardar Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal de Ajuste Rápido y Conciliación de Saldo */}
      {adjustBalanceAccount && (() => {
        const currentBal = adjustBalanceAccount.balance || 0;
        const parsedNew = parseFloat(newBalanceInput);
        const hasValidParsed = !isNaN(parsedNew);
        const diff = hasValidParsed ? parsedNew - currentBal : 0;
        const symbol = adjustBalanceAccount.currencySymbol || state.currency;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span>Ajustar Saldo Real</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAdjustBalanceAccount(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400">
                {adjustBalanceAccount.bankName} • <strong>{adjustBalanceAccount.name}</strong>
              </p>

              <div className="my-3.5 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-700/70 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Saldo actual registrado:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{formatMoney(currentBal, symbol)}</span>
                </div>
                {hasValidParsed && Math.abs(diff) > 0.001 && (
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span className="text-stone-500 dark:text-stone-400">Diferencia de conciliación:</span>
                    <span className={`font-bold ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {diff > 0 ? '+' : ''}{formatMoney(diff, symbol)}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveAdjustBalance} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nuevo Saldo Real en Banco ({symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    value={newBalanceInput}
                    onChange={e => setNewBalanceInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Ingresa exactamente el saldo disponible o dispuesto que muestra tu aplicación del banco.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Motivo o Nota del Ajuste (Opcional)
                  </label>
                  <input
                    type="text"
                    value={adjustNoteInput}
                    onChange={e => setAdjustNoteInput(e.target.value)}
                    placeholder="Ej. Conciliación con banca en línea, intereses cobrados..."
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setAdjustBalanceAccount(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Saldo Real</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 8. Modal de Auditoría de Movimientos y Conciliación de Cuenta */}
      {inspectingAccount && (() => {
        const txSummary = calculateAccountTransactionsSummary(inspectingAccount, state.transactions, state.currencyCode || 'DOP');
        const symbol = inspectingAccount.currencySymbol || state.currency;
        const linkedList = txSummary.linkedTransactions.filter(tx => {
          if (inspectingTypeFilter === 'all') return true;
          return tx.type === inspectingTypeFilter;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                    style={{ backgroundColor: inspectingAccount.color || '#004b87' }}
                  >
                    {inspectingAccount.bankName.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{inspectingAccount.name}</span>
                      <span className="text-xs font-mono font-normal text-stone-400">
                        ({inspectingAccount.currency || 'DOP'})
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {inspectingAccount.bankName} • {inspectingAccount.accountNumberMasked || 'Cuenta vinculada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectingAccount;
                      setInspectingAccount(null);
                      handleOpenAdjustBalance(target);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs transition"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Ajustar Saldo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectingAccount(null)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Condiciones de Préstamo / Tarjeta */}
              {(inspectingAccount.accountType === 'loan' || inspectingAccount.accountType === 'credit') && (() => {
                const dueInfo = getAccountNextDueDate(inspectingAccount);
                return (
                  <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <span className="text-stone-500 dark:text-stone-400">Próximo vencimiento: </span>
                        <strong className="font-bold text-stone-900 dark:text-stone-100">
                          {dueInfo ? dueInfo.formattedLongDate : 'No configurado'}
                        </strong>
                        {dueInfo && (
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            dueInfo.status === 'today'
                              ? 'bg-rose-600 text-white'
                              : dueInfo.status === 'soon'
                              ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}>
                            {dueInfo.badgeText}
                          </span>
                        )}
                        {dueInfo && (
                          <span className="text-stone-400 text-[11px] ml-1">
                            ({dueInfo.dueDayDescription})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-stone-600 dark:text-stone-300 text-xs">
                      {inspectingAccount.interestRate !== undefined && (
                        <span>Tasa: <strong className="text-amber-700 dark:text-amber-400 font-semibold">{inspectingAccount.interestRate}% APR</strong></span>
                      )}
                      {inspectingAccount.minimumPayment !== undefined && (
                        <span>Cuota: <strong className="font-semibold">{formatMoney(inspectingAccount.minimumPayment, symbol)}/m</strong></span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Resumen Financiero de la Cuenta */}
              <div className="p-4 sm:p-5 bg-stone-50/70 dark:bg-stone-950/40 border-b border-stone-200/80 dark:border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Saldo Registrado</span>
                  <span className={`text-base font-extrabold ${inspectingAccount.balance < 0 ? 'text-rose-600' : 'text-stone-900 dark:text-stone-100'}`}>
                    {formatMoney(inspectingAccount.balance, symbol)}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Total Ingresos</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(txSummary.totalIncomes, symbol)}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Total Gastos</span>
                  <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    -{formatMoney(txSummary.totalExpenses, symbol)}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Transferencias</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {formatMoney(txSummary.totalTransfersIn + txSummary.totalTransfersOut, symbol)}
                  </span>
                </div>
              </div>

              {/* Filtro de tipos */}
              <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInspectingTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      inspectingTypeFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    Todos ({txSummary.totalMovements})
                  </button>
                  <button
                    onClick={() => setInspectingTypeFilter('income')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      inspectingTypeFilter === 'income'
                        ? 'bg-emerald-600 text-white'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    Ingresos
                  </button>
                  <button
                    onClick={() => setInspectingTypeFilter('expense')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      inspectingTypeFilter === 'expense'
                        ? 'bg-rose-600 text-white'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    Gastos
                  </button>
                  <button
                    onClick={() => setInspectingTypeFilter('transfer')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      inspectingTypeFilter === 'transfer'
                        ? 'bg-blue-600 text-white'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    Transferencias
                  </button>
                </div>
                <span className="text-[11px] text-stone-400">
                  Mostrando {linkedList.length} movimientos
                </span>
              </div>

              {/* Lista de Movimientos */}
              <div className="overflow-y-auto flex-1 p-4 space-y-2 divide-y divide-stone-100 dark:divide-stone-800/80">
                {linkedList.map(tx => {
                  const member = state.members.find(m => m.id === tx.memberId);
                  const toMember = tx.toMemberId ? state.members.find(m => m.id === tx.toMemberId) : null;
                  const fromAcc = tx.bankAccountId ? state.bankAccounts.find(b => b.id === tx.bankAccountId) : null;
                  const toAcc = tx.toBankAccountId ? state.bankAccounts.find(b => b.id === tx.toBankAccountId) : null;
                  const isIncomingTransfer = tx.type === 'transfer' && tx.toBankAccountId === inspectingAccount.id;
                  const isOutgoingTransfer = tx.type === 'transfer' && tx.bankAccountId === inspectingAccount.id;

                  // Put sender name first in description display if not already present
                  const senderName = member?.name || fromAcc?.name || 'Emisor';
                  const displayDescription = tx.type === 'transfer' && !tx.description.toLowerCase().startsWith(senderName.toLowerCase())
                    ? `${senderName} - ${tx.description}`
                    : tx.description;

                  return (
                    <div key={tx.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                          tx.type === 'income' || isIncomingTransfer
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                            : tx.type === 'transfer'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                        }`}>
                          {tx.type === 'income' || isIncomingTransfer ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === 'transfer' ? (
                            <ArrowRightLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-stone-900 dark:text-stone-100 break-words leading-tight">
                            {displayDescription}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-stone-400 mt-0.5">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <span className="font-medium text-stone-600 dark:text-stone-300">{tx.category}</span>
                            {tx.type === 'transfer' ? (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                                  <span className="font-bold">Emisor:</span>
                                  <span>{member?.avatar || '👤'} {senderName}</span>
                                  {(toMember || toAcc) && (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                                      <span className="font-bold">Receptor:</span>
                                      <span>{toMember ? `${toMember.avatar || '👤'} ${toMember.name}` : (toAcc?.name || 'Receptor')}</span>
                                    </>
                                  )}
                                </span>
                                {isIncomingTransfer && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    (Recibida desde {fromAcc?.name || 'cuenta origen'})
                                  </span>
                                )}
                                {isOutgoingTransfer && (
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    (Enviada hacia {toAcc?.name || 'cuenta destino'})
                                  </span>
                                )}
                              </>
                            ) : (
                              member && (
                                <>
                                  <span>•</span>
                                  <span>{member.avatar} {member.name}</span>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-bold text-sm block ${
                          tx.type === 'income' || isIncomingTransfer
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}>
                          {tx.type === 'income' || isIncomingTransfer ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}
                          {formatMoney(tx.amount, symbol)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {linkedList.length === 0 && (
                  <div className="py-10 text-center text-stone-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-xs">No hay transacciones registradas para esta cuenta</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Al crear un gasto, ingreso o transferencia, selecciona esta cuenta para que sus movimientos se vinculen automáticamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3.5 sm:p-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500">
                  Saldo en tiempo real basado en movimientos y conciliaciones
                </span>
                <button
                  type="button"
                  onClick={() => setInspectingAccount(null)}
                  className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. Modal de Confirmación o Bloqueo al Desvincular / Eliminar Cuenta Bancaria */}
      {deletingAccount && (() => {
        const assignedIncomes = (state.recurringIncomes || []).filter(
          inc => inc.destinationAccountId === deletingAccount.id
        );
        const assignedExpenses = (state.recurringExpenses || []).filter(
          exp => exp.paymentAccountId === deletingAccount.id
        );
        const isBlocked = assignedIncomes.length > 0;
        const symbol = deletingAccount.currencySymbol || state.currency;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150">
              {isBlocked ? (
                /* Caso Bloqueado: Tiene ingresos recurrentes asignados */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        No se puede eliminar la cuenta
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Acción bloqueada por integridad financiera
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    Esta cuenta (<strong>{deletingAccount.name}</strong> en {deletingAccount.bankName}) está configurada como cuenta de depósito para <strong>{assignedIncomes.length} {assignedIncomes.length === 1 ? 'ingreso recurrente' : 'ingresos recurrentes'}</strong>:
                  </div>

                  {/* Lista de ingresos recurrentes asignados */}
                  <div className="max-h-44 overflow-y-auto space-y-2 p-1 overscroll-contain">
                    {assignedIncomes.map(inc => {
                      const member = state.members.find(m => m.id === inc.memberId);
                      const freqLabel = inc.frequency === 'biweekly' ? 'Quincenal' : inc.frequency === 'monthly' ? 'Mensual' : inc.frequency === 'weekly' ? 'Semanal' : 'Anual';
                      return (
                        <div
                          key={inc.id}
                          className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-stone-800 dark:text-stone-200 block truncate">
                              {inc.title}
                            </span>
                            <span className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                              <span>{freqLabel}</span>
                              {member && (
                                <>
                                  <span>•</span>
                                  <span>{member.avatar} {member.name}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                            +{formatMoney(inc.amount, state.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    💡 Para desvincular o borrar esta cuenta, primero ve a <strong>Ingresos Recurrentes</strong> y reasigna los depósitos a otra cuenta bancaria del hogar.
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setDeletingAccount(null)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-bold transition shadow-xs"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              ) : (
                /* Caso Confirmación de Eliminación */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        ¿Desvincular cuenta bancaria?
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Esta acción requiere confirmación
                      </p>
                    </div>
                  </div>

                  {/* Resumen de la cuenta a eliminar */}
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                      style={{ backgroundColor: deletingAccount.color || '#004b87' }}
                    >
                      {deletingAccount.bankName.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 break-words">
                        {deletingAccount.name}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {deletingAccount.bankName} • {deletingAccount.accountNumberMasked || '•••• 0000'}
                      </p>
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mt-0.5">
                        Saldo registrado: <span className="font-mono font-bold">{formatMoney(deletingAccount.balance, symbol)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                    <p>
                      Al desvincular esta cuenta, ya no aparecerá en tu tesorería ni estará disponible para nuevos registros.
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ El historial contable de transacciones pasadas permanecerá guardado en el libro contable familiar.
                    </p>
                    {assignedExpenses.length > 0 && (
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Aviso: Esta cuenta está vinculada a {assignedExpenses.length} gasto(s) recurrente(s). Dichos gastos quedarán sin método de pago automático asignado.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setDeletingAccount(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sí, desvincular</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
