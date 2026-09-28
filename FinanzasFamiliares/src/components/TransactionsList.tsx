import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Landmark,
  Tag as TagIcon,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowRight,
  Calendar,
  X,
  Plus,
  AlertTriangle,
  Eye,
  Building2,
  Clock,
  Info,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { FamilyState, Transaction } from '../types';
import { formatMoney, formatNumber } from '../utils/currencies';

interface TransactionsListProps {
  state: FamilyState;
  selectedMonth: string;
  categoryFilter?: string;
  onClearCategoryFilter: () => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNewTransaction: () => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  state,
  selectedMonth,
  categoryFilter,
  onClearCategoryFilter,
  onDeleteTransaction,
  onOpenNewTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [onlyBankSynced, setOnlyBankSynced] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<Transaction | null>(null);

  const getAccountTypeLabel = (accountType?: string) => {
    switch (accountType) {
      case 'checking':
        return 'Cuenta Corriente';
      case 'savings':
        return 'Cuenta de Ahorros';
      case 'credit':
        return 'Tarjeta de Crédito';
      case 'loan':
        return 'Préstamo / Financiamiento';
      case 'investment':
        return 'Cuenta de Inversión';
      default:
        return 'Cuenta Bancaria';
    }
  };

  // Filter list
  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter(tx => {
        // Month filter
        if (selectedMonth && !tx.date.startsWith(selectedMonth)) return false;

        // Search term
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          const matchesDesc = tx.description.toLowerCase().includes(lower);
          const matchesNotes = (tx.notes || '').toLowerCase().includes(lower);
          const matchesCat = tx.category.toLowerCase().includes(lower);
          if (!matchesDesc && !matchesNotes && !matchesCat) return false;
        }

        // Category filter
        if (categoryFilter && tx.category !== categoryFilter) return false;

        // Type filter
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

        // Member filter (matches sender or receiver)
        if (memberFilter !== 'all') {
          const isSender = tx.memberId === memberFilter;
          const isReceiver = tx.toMemberId === memberFilter;
          if (!isSender && !isReceiver) return false;
        }

        // Tag filter
        if (tagFilter !== 'all' && !(tx.tags || []).includes(tagFilter)) return false;

        // Bank synced filter
        if (onlyBankSynced && !tx.isBankSynced) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, selectedMonth, searchTerm, categoryFilter, typeFilter, memberFilter, tagFilter, onlyBankSynced]);

  const totalFilteredIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredTransfer = filteredTransactions
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Search & Filters Header */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por concepto, supermercado, notas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          {/* Type Selector */}
          <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setTypeFilter('transfer')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Transferencias
            </button>
          </div>

          {/* Member selector */}
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium focus:outline-none"
            >
              <option value="all">Todos los miembros</option>
              {state.members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Tag selector */}
          <div className="flex items-center gap-1">
            <TagIcon className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium focus:outline-none"
            >
              <option value="all">Todas las etiquetas</option>
              {state.tags.map(t => (
                <option key={t.id} value={t.name}>
                  #{t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Synced Toggle */}
          <button
            onClick={() => setOnlyBankSynced(!onlyBankSynced)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition ${
              onlyBankSynced
                ? 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Sólo Bancos</span>
          </button>

          {/* Active Category Filter Chip */}
          {categoryFilter && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-medium">
              <span>Categoría: {categoryFilter}</span>
              <button
                onClick={onClearCategoryFilter}
                className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Stats summary */}
      <div className="flex items-center justify-between text-xs px-2 text-stone-500 dark:text-stone-400">
        <span>Mostrando {filteredTransactions.length} movimiento(s)</span>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Ingresos: +{formatMoney(totalFilteredIncome, state.currency)}
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Gastos: -{formatMoney(totalFilteredExpense, state.currency)}
          </span>
          {totalFilteredTransfer > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Transferencias: {formatMoney(totalFilteredTransfer, state.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-12 text-center">
          <Calendar className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
          <h4 className="font-semibold text-stone-800 dark:text-stone-200 text-sm">
            No se encontraron transacciones
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros o registra un nuevo gasto para mantener el presupuesto familiar al día.
          </p>
          <button
            onClick={onOpenNewTransaction}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar movimiento</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
          {filteredTransactions.map(tx => {
            const member = state.members.find(m => m.id === tx.memberId);
            const toMember = tx.toMemberId ? state.members.find(m => m.id === tx.toMemberId) : null;
            const fromAccount = tx.bankAccountId ? state.bankAccounts.find(b => b.id === tx.bankAccountId) : null;
            const toAccount = tx.toBankAccountId ? state.bankAccounts.find(b => b.id === tx.toBankAccountId) : null;
            const categoryObj = state.categories.find(c => c.name === tx.category);

            // Put sender name first for transfers
            const senderName = member?.name || fromAccount?.name || 'Emisor';
            const displayDescription = tx.type === 'transfer' && !tx.description.toLowerCase().startsWith(senderName.toLowerCase())
              ? `${senderName} - ${tx.description}`
              : tx.description;

            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition flex items-start sm:items-center justify-between gap-3"
              >
                {/* Left side: Icon, Description, Category, Tags, Member */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
                      tx.type === 'income'
                        ? 'bg-emerald-600'
                        : tx.type === 'transfer'
                        ? 'bg-blue-600'
                        : ''
                    }`}
                    style={tx.type === 'expense' ? { backgroundColor: categoryObj?.color || '#64748b' } : {}}
                  >
                    {tx.type === 'income' ? (
                      <ArrowDownLeft className="w-5 h-5 text-white" />
                    ) : tx.type === 'transfer' ? (
                      <ArrowRightLeft className="w-5 h-5 text-white" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 break-words leading-snug">
                        {displayDescription}
                      </span>
                      {tx.type === 'transfer' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          Transferencia
                        </span>
                      )}
                      {tx.isBankSynced && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          <Landmark className="w-2.5 h-2.5" />
                          Banco
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {tx.category}
                      </span>
                      <span>•</span>
                      <span>{tx.date}</span>

                      {/* Member & Accounts Badge */}
                      {tx.type === 'transfer' ? (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/50">
                            <span className="font-bold">Emisor:</span>
                            <span>{member?.avatar || '👤'} {senderName}</span>
                            <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="font-bold">Receptor:</span>
                            <span>{toMember?.avatar || '👤'} {toMember?.name || toAccount?.name || 'Receptor'}</span>
                          </span>
                          {(fromAccount || toAccount) && (
                            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-stone-500">
                              ({fromAccount?.name || 'Origen'} ➔ {toAccount?.name || 'Destino'})
                            </span>
                          )}
                        </>
                      ) : (
                        member && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-md">
                              <span>{member.avatar}</span>
                              <span>{member.name}</span>
                            </span>
                          </>
                        )
                      )}

                      {/* Tags */}
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1">
                          {tx.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 break-words mt-0.5">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Amount and Delete button */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1 sm:ml-2">
                  <div className="text-right">
                    <span
                      className={`text-sm sm:text-base font-bold block ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'transfer'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}{formatMoney(tx.amount, state.currency)}
                    </span>
                    {tx.currency && tx.currency !== state.currencyCode && tx.originalAmount !== undefined && (
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-mono">
                        ({formatNumber(tx.originalAmount)} {tx.currency})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTxForDetails(tx)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      title="Ver detalles del movimiento"
                      aria-label="Ver detalles del movimiento"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionToDelete(tx)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      title="Eliminar transacción"
                      aria-label="Eliminar transacción"
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

      {/* Modal de confirmación para eliminar transacción */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  ¿Eliminar esta transacción?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Se requiere confirmación para evitar borrados accidentales
                </p>
              </div>
            </div>

            {/* Detalle del movimiento */}
            <div className="my-4 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-stone-500 dark:text-stone-400">Concepto:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-right break-words max-w-[65%]">
                  {transactionToDelete.description}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Monto:</span>
                <span className={`font-bold text-sm ${
                  transactionToDelete.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : transactionToDelete.type === 'transfer'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-stone-900 dark:text-stone-100'
                }`}>
                  {transactionToDelete.type === 'income' ? '+' : transactionToDelete.type === 'transfer' ? '⇄ ' : '-'}
                  {formatMoney(transactionToDelete.amount, state.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                <span>Fecha y Categoría:</span>
                <span>{transactionToDelete.date} • {transactionToDelete.category}</span>
              </div>
              {transactionToDelete.bankAccountId && (
                <div className="pt-2 mt-1 border-t border-stone-200 dark:border-stone-700 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 shrink-0" />
                  <span>El saldo de la cuenta bancaria vinculada se recalculará automáticamente.</span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5">
              Esta acción no se puede deshacer. ¿Deseas confirmar la eliminación?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(transactionToDelete.id);
                  setTransactionToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar detalles del movimiento (solo lectura) */}
      {selectedTxForDetails && (() => {
        const tx = selectedTxForDetails;
        const member = state.members.find(m => m.id === tx.memberId);
        const toMember = tx.toMemberId ? state.members.find(m => m.id === tx.toMemberId) : null;
        const fromAccount = tx.bankAccountId ? state.bankAccounts.find(b => b.id === tx.bankAccountId) : null;
        const toAccount = tx.toBankAccountId ? state.bankAccounts.find(b => b.id === tx.toBankAccountId) : null;
        const fromHolder = fromAccount ? state.members.find(m => m.id === (fromAccount.holderMemberId || (fromAccount as any).memberId)) : null;
        const toHolder = toAccount ? state.members.find(m => m.id === (toAccount.holderMemberId || (toAccount as any).memberId)) : null;
        const categoryObj = state.categories.find(c => c.name === tx.category);

        const isExpense = tx.type === 'expense';
        const isIncome = tx.type === 'income';
        const isTransfer = tx.type === 'transfer';

        const typeColorClass = isIncome
          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
          : isTransfer
          ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
          : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800';

        const typeBadgeText = isIncome ? 'Ingreso' : isTransfer ? 'Transferencia' : 'Gasto';

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150 relative my-6 max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-tx-detail-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${typeColorClass}`}>
                    {isIncome ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : isTransfer ? (
                      <ArrowRightLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 id="modal-tx-detail-title" className="text-base font-bold text-stone-900 dark:text-stone-100 leading-tight">
                      Detalle del Movimiento
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${typeColorClass}`}>
                        {typeBadgeText}
                      </span>
                      {tx.isBankSynced && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          <Landmark className="w-2.5 h-2.5" />
                          Banco Sincronizado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTxForDetails(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 -mr-1">
                {/* Hero Amount & Concept */}
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 text-center space-y-1">
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Monto Imputado
                  </div>
                  <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    isIncome
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isTransfer
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-stone-900 dark:text-stone-100'
                  }`}>
                    {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{formatMoney(tx.amount, state.currency)}
                  </div>
                  {tx.currency && tx.currency !== state.currencyCode && tx.originalAmount !== undefined && (
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-mono pt-1">
                      Moneda original: <span className="font-bold text-stone-700 dark:text-stone-300">{formatNumber(tx.originalAmount)} {tx.currency}</span>
                      {tx.exchangeRate && tx.exchangeRate !== 1.0 && (
                        <span> (Tasa: {tx.exchangeRate})</span>
                      )}
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-200/70 dark:border-stone-700/70 mt-2">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 break-words">
                      {tx.description}
                    </p>
                  </div>
                </div>

                {/* Grid of Key Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Fecha */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-500 dark:text-stone-400 block text-[11px]">Fecha del Movimiento</span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{tx.date}</span>
                      {tx.createdAt && (
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          Registrado: {new Date(tx.createdAt).toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 flex items-start gap-2.5">
                    <TagIcon className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-stone-500 dark:text-stone-400 block text-[11px]">Categoría</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: categoryObj?.color || '#94a3b8' }}
                        />
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{tx.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Miembros Involucrados */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 text-xs space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{isTransfer ? 'Participantes de la Transferencia' : 'Miembro de la Familia'}</span>
                  </div>

                  {isTransfer ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Emisor</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base">{member?.avatar || '👤'}</span>
                          <div>
                            <span className="font-semibold text-stone-900 dark:text-stone-100 block leading-tight">
                              {member?.name || 'No especificado'}
                            </span>
                            {member?.role && (
                              <span className="text-[10px] text-stone-500">{member.role}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Receptor</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base">{toMember?.avatar || '👤'}</span>
                          <div>
                            <span className="font-semibold text-stone-900 dark:text-stone-100 block leading-tight">
                              {toMember?.name || 'No especificado'}
                            </span>
                            {toMember?.role && (
                              <span className="text-[10px] text-stone-500">{toMember.role}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70">
                      <span className="text-lg">{member?.avatar || '👤'}</span>
                      <div>
                        <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm block leading-tight">
                          {member?.name || 'Miembro no especificado'}
                        </span>
                        {member?.role && (
                          <span className="text-[11px] text-stone-500 dark:text-stone-400">Rol: {member.role}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gasto Compartido */}
                  {tx.isSharedExpense && tx.splitBetweenMemberIds && tx.splitBetweenMemberIds.length > 0 && (
                    <div className="pt-2 border-t border-stone-200/70 dark:border-stone-700/70">
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 block mb-1">
                        Gasto compartido dividido entre:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tx.splitBetweenMemberIds.map(mid => {
                          const m = state.members.find(x => x.id === mid);
                          return (
                            <span key={mid} className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                              {m?.avatar || '👤'} {m?.name || mid}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cuenta(s) Bancaria(s) */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 text-xs space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isTransfer ? 'Cuentas Bancarias de la Operación' : 'Cuenta Bancaria Imputada'}</span>
                  </div>

                  {isTransfer ? (
                    <div className="space-y-2 pt-1">
                      {/* Cuenta Origen */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                            Cuenta de Origen (Débito)
                          </span>
                          {fromAccount && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              Saldo: {formatMoney(fromAccount.balance, fromAccount.currencySymbol || state.currency)}
                            </span>
                          )}
                        </div>
                        {fromAccount ? (
                          <div>
                            <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span>{fromAccount.bankName}</span>
                              <span>•</span>
                              <span>{fromAccount.name}</span>
                              <span className="text-[11px] text-stone-400 font-normal">({fromAccount.accountNumberMasked})</span>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              {getAccountTypeLabel(fromAccount.accountType)} {fromHolder ? `• Titular: ${fromHolder.name}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">No especificada</span>
                        )}
                      </div>

                      {/* Cuenta Destino */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Cuenta de Destino (Crédito)
                          </span>
                          {toAccount && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              Saldo: {formatMoney(toAccount.balance, toAccount.currencySymbol || state.currency)}
                            </span>
                          )}
                        </div>
                        {toAccount ? (
                          <div>
                            <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span>{toAccount.bankName}</span>
                              <span>•</span>
                              <span>{toAccount.name}</span>
                              <span className="text-[11px] text-stone-400 font-normal">({toAccount.accountNumberMasked})</span>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              {getAccountTypeLabel(toAccount.accountType)} {toHolder ? `• Titular: ${toHolder.name}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">No especificada</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {fromAccount ? (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: fromAccount.color || '#10b981' }}
                              />
                              <span>{fromAccount.bankName}</span>
                              <span>•</span>
                              <span>{fromAccount.name}</span>
                              <span className="text-[11px] text-stone-400 font-normal">({fromAccount.accountNumberMasked})</span>
                            </div>
                            <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                              {formatMoney(fromAccount.balance, fromAccount.currencySymbol || state.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span>Tipo: {getAccountTypeLabel(fromAccount.accountType)}</span>
                            {fromHolder && <span>Titular: {fromHolder.name}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 text-stone-400 italic">
                          (Sin cuenta bancaria específica asignada)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Etiquetas */}
                {tx.tags && tx.tags.length > 0 && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 text-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1.5">
                      Etiquetas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tx.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas / Observaciones */}
                {tx.notes && (
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/60 text-xs space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                      Notas y Observaciones
                    </span>
                    <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                      {tx.notes}
                    </p>
                  </div>
                )}

                {/* Automatización / Reglas recurrentes */}
                {(tx.isAutoLogged || tx.recurringExpenseId || tx.recurringIncomeId || tx.recurringTransferId) && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <Repeat className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <span>Movimiento generado automáticamente por regla recurrente programada.</span>
                  </div>
                )}

                {/* Auditoría / ID */}
                <div className="pt-2 text-[10px] font-mono text-stone-400 text-center">
                  Identificador: {tx.id}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTxForDetails(null)}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 bg-stone-100/60 dark:bg-stone-800/60 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
