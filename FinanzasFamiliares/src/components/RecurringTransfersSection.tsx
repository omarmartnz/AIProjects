import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowRight,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Zap,
  Building2,
  AlertCircle,
  Coins,
  Clock,
  Sparkles,
} from 'lucide-react';
import { FamilyState, RecurringTransfer } from '../types';
import { formatMoney } from '../utils/currencies';
import {
  computeRecurringTransferNextDueDate,
  isRecurringTransferExecutedForCurrentCycle,
  getRecurringTransferSummary,
  formatFullDate,
} from '../utils/recurringUtils';

interface RecurringTransfersSectionProps {
  state: FamilyState;
  onOpenNewTransfer: () => void;
  onEditTransfer: (transfer: RecurringTransfer) => void;
  onDeleteTransfer: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleAutoRegister: (id: string) => void;
  onExecuteTransfer: (transfer: RecurringTransfer) => void;
}

const getAccountTypeLabel = (type?: string) => {
  switch (type) {
    case 'checking': return 'Cta. Corriente';
    case 'savings': return 'Cta. Ahorros';
    case 'credit': return 'Tarjeta Crédito';
    case 'investment': return 'Inversión';
    case 'loan': return 'Préstamo';
    default: return 'Cuenta';
  }
};

export const RecurringTransfersSection: React.FC<RecurringTransfersSectionProps> = ({
  state,
  onOpenNewTransfer,
  onEditTransfer,
  onDeleteTransfer,
  onToggleActive,
  onToggleAutoRegister,
  onExecuteTransfer,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed'>('all');

  const transfersList = state.recurringTransfers || [];
  const baseCurrency = state.currency || '$';

  // Metrics summary
  const summary = useMemo(() => {
    return getRecurringTransferSummary(transfersList, state.transactions || [], new Date());
  }, [transfersList, state.transactions]);

  // Enriched items with status and next due dates
  const enrichedTransfers = useMemo(() => {
    return transfersList.map(item => {
      const nextDue = computeRecurringTransferNextDueDate(item, new Date());
      const executionCheck = isRecurringTransferExecutedForCurrentCycle(
        item,
        state.transactions || [],
        new Date()
      );

      const fromAccount = (state.bankAccounts || []).find(b => b.id === item.fromBankAccountId);
      const toAccount = (state.bankAccounts || []).find(b => b.id === item.toBankAccountId);
      const fromMember = (state.members || []).find(m => m.id === item.fromMemberId || m.id === fromAccount?.holderMemberId || m.id === (fromAccount as any)?.memberId);
      const toMember = (state.members || []).find(m => m.id === item.toMemberId || m.id === toAccount?.holderMemberId || m.id === (toAccount as any)?.memberId);

      return {
        ...item,
        nextDueDateStr: nextDue.nextDueDate,
        daysUntil: nextDue.daysUntil,
        isExecutedThisCycle: executionCheck.isExecuted,
        executedDate: executionCheck.executedDate,
        fromAccount,
        toAccount,
        fromMember,
        toMember,
      };
    });
  }, [transfersList, state.transactions, state.bankAccounts, state.members]);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return enrichedTransfers.filter(item => {
      if (filter === 'pending') return !item.isExecutedThisCycle;
      if (filter === 'executed') return item.isExecutedThisCycle;
      return true;
    });
  }, [enrichedTransfers, filter]);

  const executedCount = enrichedTransfers.filter(t => t.isExecutedThisCycle).length;
  const pendingCount = enrichedTransfers.filter(t => !t.isExecutedThisCycle).length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total monthly volume */}
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Volumen Mensual Programado</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {formatMoney(summary.totalMonthlyAmount, baseCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            {summary.activeCount} traspaso{summary.activeCount === 1 ? '' : 's'} activo{summary.activeCount === 1 ? '' : 's'} entre cuentas
          </div>
        </div>

        {/* Automated Transfers */}
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Traspasos Automatizados</span>
            <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary.automatedCount} / {summary.activeCount}
          </div>
          <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            {summary.automatedCount === summary.activeCount && summary.activeCount > 0
              ? 'Todos se ejecutan automáticamente'
              : `${summary.activeCount - summary.automatedCount} requieren confirmación manual`}
          </div>
        </div>

        {/* Execution status this cycle */}
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Estado del Mes Actual</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-stone-800 dark:text-stone-200">
            {executedCount} ejecutadas
          </div>
          <div className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            {pendingCount > 0 ? (
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} ({formatMoney(summary.pendingAmount, baseCurrency)})
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ¡Todos los traspasos del mes al día!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Count */}
      {transfersList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Todas ({enrichedTransfers.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>Pendientes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setFilter('executed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1.5 ${
                filter === 'executed'
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ejecutadas este mes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                {executedCount}
              </span>
            </button>
          </div>

          <p className="text-stone-500 dark:text-stone-400 text-xs">
            Traspasos periódicos neutros entre cuentas familiares (no computan como gasto de consumo ni ingreso externo).
          </p>
        </div>
      )}

      {/* Cards List or Empty State */}
      {transfersList.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
          <ArrowRightLeft className="w-12 h-12 mx-auto text-purple-400 mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            No has programado transferencias entre cuentas
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
            Programa traspasos recurrentes para ahorro periódico, fondo de emergencia, cuotas entre familiares o traspasos de efectivo a cuentas de inversión. ¡Y automatízalos para que se ejecuten solos en su fecha!
          </p>
          <button
            onClick={onOpenNewTransfer}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Primera Transferencia</span>
          </button>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            {filter === 'pending'
              ? '¡Excelente! Todos los traspasos programados de este mes están al día'
              : 'No hay transferencias en este filtro'}
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {filter === 'pending'
              ? 'Ya se han ejecutado todos los traspasos activos de este ciclo.'
              : 'Cambia el filtro para ver todas tus transferencias.'}
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Ver todas las transferencias
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTransfers.map(item => {
            const isDueToday = item.daysUntil === 0;
            const isOverdue = item.daysUntil < 0 && !item.isExecutedThisCycle;

            return (
              <div
                key={item.id}
                className={`relative p-4 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                  !item.isActive
                    ? 'opacity-60 bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800'
                    : item.isExecutedThisCycle
                    ? 'bg-white dark:bg-stone-900 border-emerald-200 dark:border-emerald-900/60'
                    : isOverdue
                    ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-300 dark:border-rose-900/80'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-purple-300 dark:hover:border-purple-800/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                        {item.category || 'Transferencia'}
                      </span>
                      <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                        {item.frequency === 'monthly'
                          ? 'Mensual'
                          : item.frequency === 'biweekly'
                          ? 'Quincenal'
                          : item.frequency === 'yearly'
                          ? 'Anual'
                          : 'Semanal'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1 truncate">
                      {item.title}
                    </h4>

                    {item.notes && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Top Right: Status toggle & Edit / Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleActive(item.id)}
                      className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 transition"
                      title={item.isActive ? 'Pausar transferencia' : 'Activar transferencia'}
                    >
                      {item.isActive ? (
                        <ToggleRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-stone-400" />
                      )}
                    </button>
                    <button
                      onClick={() => onEditTransfer(item)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransfer(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount & Route */}
                <div className="my-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold text-stone-500">
                      {item.frequency === 'yearly' ? 'Monto anual:' : 'Monto del traspaso:'}
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                        {formatMoney(item.amount, baseCurrency)}
                      </span>
                      {item.frequency === 'yearly' && (
                        <span className="block text-[10px] text-stone-500 font-mono">
                          ≈ {formatMoney(item.amount / 12, baseCurrency)} / mes
                        </span>
                      )}
                      {item.currency && item.currency !== (state.currencyCode || 'USD') && item.originalAmount && (
                        <span className="block text-[10px] text-stone-500 font-mono">
                          ({item.originalAmount} {item.currency})
                        </span>
                      )}
                    </div>
                  </div>

                  {item.installments && item.installments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      {item.installments.map((inst, idx) => (
                        <span
                          key={inst.id || idx}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-mono text-[10px]"
                        >
                          <strong className="text-purple-600 dark:text-purple-400">{inst.label || inst.name}:</strong> d.{inst.day} ({formatMoney(inst.amount, baseCurrency)})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Account route visual */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1 border-t border-stone-200/70 dark:border-stone-700/60 text-xs">
                    {/* Origin account */}
                    <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                        Origen (Débito)
                      </div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {item.fromAccount?.name || 'Cuenta de débito'}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {item.fromMember?.name ? `${item.fromMember.name} • ` : ''}
                        {getAccountTypeLabel(item.fromAccount?.accountType)}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Destination account */}
                    <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Destino (Crédito)
                      </div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {item.toAccount?.name || 'Cuenta destino'}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {item.toMember?.name ? `${item.toMember.name} • ` : ''}
                        {getAccountTypeLabel(item.toAccount?.accountType)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automation status and execute action */}
                <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                  {/* Auto-register toggle box */}
                  <div className="p-2 rounded-xl border border-stone-200/70 dark:border-stone-700/60 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          item.autoRegister
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${item.autoRegister ? 'fill-purple-600 dark:fill-purple-400' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            Automatización
                          </span>
                          {item.autoRegister ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
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
                            ? 'Se transfiere solo en la fecha'
                            : 'Requiere traspaso manual'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleAutoRegister(item.id)}
                      className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition shrink-0"
                      title={
                        item.autoRegister
                          ? 'Desactivar automatización (pasar a manual)'
                          : 'Activar automatización'
                      }
                    >
                      {item.autoRegister ? (
                        <ToggleRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-stone-400" />
                      )}
                    </button>
                  </div>

                  {/* Execution footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-600 dark:text-stone-400">
                        Próximo: <strong>{formatFullDate(item.nextDueDateStr, { withWeekday: false })}</strong>
                      </span>
                      {item.isExecutedThisCycle ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ejecutada este mes</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                          Vence hoy
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                          Pendiente
                        </span>
                      ) : null}
                    </div>

                    <button
                      onClick={() => onExecuteTransfer(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 text-xs font-semibold shadow-2xs transition"
                      title="Ejecutar transferencia ahora y asentar el movimiento"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{item.isExecutedThisCycle ? 'Traspasar Extra' : 'Transferir Ahora'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
