import React, { useState } from 'react';
import {
  Baby,
  Coins,
  Plus,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  Award,
  ListTodo,
  TrendingUp,
  Gift,
} from 'lucide-react';
import { FamilyState, ChildAllowance } from '../types';
import { formatMoney, formatNumber } from '../utils/currencies';

interface ChildAllowancesViewProps {
  state: FamilyState;
  onAddChildAllowance: (allowance: Omit<ChildAllowance, 'id' | 'currentSavings'>) => void;
  onPayAllowance: (allowanceId: string) => void;
  onDeleteChildAllowance: (allowanceId: string) => void;
  onAddTaskToAllowance: (allowanceId: string, taskText: string) => void;
  onRemoveTaskFromAllowance: (allowanceId: string, taskIndex: number) => void;
}

export const ChildAllowancesView: React.FC<ChildAllowancesViewProps> = ({
  state,
  onAddChildAllowance,
  onPayAllowance,
  onDeleteChildAllowance,
  onAddTaskToAllowance,
  onRemoveTaskFromAllowance,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAllowanceIdForTask, setSelectedAllowanceIdForTask] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Form states
  const [memberId, setMemberId] = useState(
    state.members.find(m => m.role === 'Hijo/a' || m.isDependent)?.id || state.members[0]?.id || ''
  );
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [payoutDay, setPayoutDay] = useState('Viernes');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!memberId || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddChildAllowance({
      memberId,
      amount: parsedAmount,
      frequency,
      payoutDay,
      isActive: true,
      tasksRequired: ['Mantener la habitación ordenada', 'Cumplir con las tareas del colegio'],
    });

    setAmount('');
    setIsModalOpen(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllowanceIdForTask || !newTaskInput.trim()) return;
    onAddTaskToAllowance(selectedAllowanceIdForTask, newTaskInput.trim());
    setNewTaskInput('');
    setSelectedAllowanceIdForTask(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Baby className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Asignaciones y Pagas para Hijos</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Fomenta la educación financiera de los hijos gestionando su paga, ahorros y metas familiares
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-purple-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Configurar Paga / Asignación</span>
        </button>
      </div>

      {/* Cards of Allowances */}
      {state.childAllowances.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
          <Baby className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            No hay asignaciones de paga configuradas
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
            Configura una paga periódica vinculada a tareas del hogar para enseñar a tus hijos el valor del ahorro responsable.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Asignación</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.childAllowances.map(item => {
            const member = state.members.find(m => m.id === item.memberId);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs"
                        style={{ backgroundColor: `${member?.color || '#8b5cf6'}20` }}
                      >
                        {member?.avatar || '🧑'}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                          {member?.name || 'Hijo/a'}
                        </h4>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Paga {item.frequency === 'weekly' ? 'semanal' : 'mensual'} • Cada {item.payoutDay}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteChildAllowance(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="Eliminar asignación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Financial Stats */}
                  <div className="mt-5 grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block">
                        Paga Asignada
                      </span>
                      <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">
                        {formatMoney(item.amount, state.currency)}
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        /{item.frequency === 'weekly' ? 'sem' : 'mes'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block">
                        Ahorro Acumulado
                      </span>
                      <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatMoney(item.currentSavings, state.currency)}
                      </span>
                      <span className="text-[10px] text-emerald-500/80 block">
                        en sus ahorros personales
                      </span>
                    </div>
                  </div>

                  {/* Responsibilities / Tasks */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3.5 h-3.5 text-purple-500" />
                        <span>Tareas & Responsabilidades</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedAllowanceIdForTask(item.id)}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        + Añadir
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {(item.tasksRequired || []).map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 group"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{t}</span>
                          </span>
                          <button
                            onClick={() => onRemoveTaskFromAllowance(item.id, idx)}
                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(item.tasksRequired || []).length === 0 && (
                        <p className="text-[11px] text-stone-400 italic">Sin tareas fijadas.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => onPayAllowance(item.id)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Entregar Paga ({formatMoney(item.amount, state.currency)})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Allowance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Configurar Paga Infantil / Asignación</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Hijo/a o Miembro Receptor
                </label>
                <select
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                >
                  {state.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Importe de la Paga ({state.currency})
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    required
                    placeholder="10.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-stone-900 dark:text-stone-100 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Día de Entrega
                </label>
                <input
                  type="text"
                  placeholder="Ej. Viernes, Sábado, Día 1 de cada mes"
                  value={payoutDay}
                  onChange={e => setPayoutDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Guardar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {selectedAllowanceIdForTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 dark:border-stone-800">
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-3">
              Añadir Tarea o Compromiso
            </h4>
            <form onSubmit={handleAddTask} className="space-y-3 text-xs">
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Sacar la basura, Leer 20 min al día"
                value={newTaskInput}
                onChange={e => setNewTaskInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAllowanceIdForTask(null)}
                  className="px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Añadir Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
