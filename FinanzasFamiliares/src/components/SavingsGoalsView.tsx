import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  Target,
  Calendar,
  Sparkles,
  CheckCircle2,
  Trash2,
  X,
  Shield,
  Palmtree,
  Car,
  Home,
  GraduationCap,
  Heart,
  Laptop,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import { FamilyState, SavingsGoal } from '../types';
import { formatMoney, formatNumber } from '../utils/currencies';

interface SavingsGoalsViewProps {
  state: FamilyState;
  onAddSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'contributions' | 'currentAmount'>) => void;
  onContributeToGoal: (goalId: string, amount: number, memberId: string, note?: string) => void;
  onDeleteSavingsGoal: (goalId: string) => void;
}

const GOAL_ICONS = [
  { name: 'PiggyBank', icon: PiggyBank, label: 'Ahorro General' },
  { name: 'Shield', icon: Shield, label: 'Fondo Emergencia' },
  { name: 'Palmtree', icon: Palmtree, label: 'Vacaciones' },
  { name: 'Car', icon: Car, label: 'Vehículo' },
  { name: 'Home', icon: Home, label: 'Hogar / Reforma' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'Estudios' },
  { name: 'Heart', icon: Heart, label: 'Salud / Familia' },
  { name: 'Laptop', icon: Laptop, label: 'Tecnología' },
];

const PRESET_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  state,
  onAddSavingsGoal,
  onContributeToGoal,
  onDeleteSavingsGoal,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);

  // Form states for creating goal
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('PiggyBank');
  const [color, setColor] = useState('#10b981');
  const [assignedMemberId, setAssignedMemberId] = useState('all');

  // Form states for contribution
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMemberId, setDepositMemberId] = useState(state.members[0]?.id || '');
  const [depositNote, setDepositNote] = useState('');

  // Computations
  const totalTarget = state.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = state.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (!title.trim() || isNaN(target) || target <= 0) return;

    onAddSavingsGoal({
      title: title.trim(),
      targetAmount: target,
      color,
      icon,
      assignedMemberId,
      ...(deadline ? { deadline } : {}),
    });

    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setIsCreateModalOpen(false);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;

    onContributeToGoal(contributeGoalId, amount, depositMemberId, depositNote.trim() || undefined);
    setDepositAmount('');
    setDepositNote('');
    setContributeGoalId(null);
  };

  const renderIcon = (iconName: string, className = 'w-5 h-5') => {
    const item = GOAL_ICONS.find(i => i.name === iconName) || GOAL_ICONS[0];
    const IconComp = item.icon;
    return <IconComp className={className} />;
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Metas de Ahorro Familiares</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Ahorrad juntos para proyectos, vacaciones, imprevistos y el futuro de la familia
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Meta</span>
        </button>
      </div>

      {/* Global Savings Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Total Ahorrado</span>
            <PiggyBank className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(totalSaved, state.currency)}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            En {state.savingsGoals.length} meta(s) activas
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Objetivo Total</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {formatMoney(totalTarget, state.currency)}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Falta: {formatMoney(Math.max(0, totalTarget - totalSaved), state.currency)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span>Progreso Global</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatNumber(overallPercentage, 1)}%
            </span>
            <span className="text-xs text-stone-500">alcanzado</span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Goals List */}
      {state.savingsGoals.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
          <PiggyBank className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            No hay metas de ahorro creadas todavía
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
            Comienza fijando un objetivo familiar como un fondo para imprevistos o un viaje juntos.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Meta</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.savingsGoals.map(goal => {
            const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-xs hover:border-emerald-500/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: goal.color || '#10b981' }}
                      >
                        {renderIcon(goal.icon)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {goal.title}
                        </h4>
                        {goal.deadline && (
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Meta: {goal.deadline}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteSavingsGoal(goal.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatMoney(goal.currentAmount, state.currency)}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">
                        / {formatMoney(goal.targetAmount, state.currency)}
                      </span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${isCompleted ? 'text-emerald-500' : 'text-stone-600 dark:text-stone-300'}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ¡Objetivo alcanzado!
                      </span>
                    ) : (
                      <span>Resta: {formatMoney(remaining, state.currency)}</span>
                    )}
                    <span>{goal.contributions.length} aporte(s)</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setContributeGoalId(goal.id);
                      setDepositAmount('');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aportar Fondos</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Nueva Meta */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Crear Nueva Meta de Ahorro</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Nombre de la Meta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vacaciones de Verano, Fondo Emergencia"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Objetivo ({state.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="1000.00"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Fecha Límite (Opcional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Icono Representativo
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GOAL_ICONS.map(i => {
                    const IconC = i.icon;
                    const isSelected = icon === i.name;
                    return (
                      <button
                        key={i.name}
                        type="button"
                        onClick={() => setIcon(i.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                            : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <IconC className="w-5 h-5" />
                        <span className="text-[10px] truncate max-w-full">{i.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Color de la Meta
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aportar Fondos */}
      {contributeGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>Aportar a la Meta</span>
              </h3>
              <button onClick={() => setContributeGoalId(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeposit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Importe a Ingresar ({state.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  placeholder="50.00"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Miembro que Aporta
                </label>
                <select
                  value={depositMemberId}
                  onChange={e => setDepositMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
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
                  Nota / Concepto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ahorro de nómina, propina extra"
                  value={depositNote}
                  onChange={e => setDepositNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContributeGoalId(null)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Guardar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
