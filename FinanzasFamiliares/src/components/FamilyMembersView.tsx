import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Receipt,
  Mail,
  ShieldCheck,
  Landmark,
  X,
} from 'lucide-react';
import { FamilyState, FamilyMember } from '../types';
import { formatMoney } from '../utils/currencies';

interface FamilyMembersViewProps {
  state: FamilyState;
  selectedMonth: string;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onUpdateMember: (id: string, updates: Partial<FamilyMember>) => void;
  onRemoveMember: (id: string) => void;
  onFilterMemberTransactions: (memberId: string) => void;
  onNavigateToBanks?: () => void;
}

export const FamilyMembersView: React.FC<FamilyMembersViewProps> = ({
  state,
  selectedMonth,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onFilterMemberTransactions,
  onNavigateToBanks,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<FamilyMember['role']>('Hijo/a');
  const [avatar, setAvatar] = useState('👤');
  const [color, setColor] = useState('#0284c7');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [email, setEmail] = useState('');

  const monthTransactions = state.transactions.filter(t => t.date.startsWith(selectedMonth));
  const totalFamilyExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setName('');
    setRole('Hijo/a');
    setAvatar('👤');
    setColor('#0284c7');
    setMonthlyIncome('');
    setEmail('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: FamilyMember) => {
    setEditingMember(m);
    setName(m.name);
    setRole(m.role);
    setAvatar(m.avatar);
    setColor(m.color);
    setMonthlyIncome(m.monthlyIncome ? String(m.monthlyIncome) : '');
    setEmail(m.email || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedIncome = parseFloat(monthlyIncome) || 0;

    const memberPayload = {
      name: name.trim(),
      role,
      avatar,
      color,
      monthlyIncome: parsedIncome,
      ...(email.trim() ? { email: email.trim() } : {}),
    };

    if (editingMember) {
      onUpdateMember(editingMember.id, memberPayload);
    } else {
      onAddMember(memberPayload);
    }
    setIsModalOpen(false);
  };

  const emojiChoices = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👵', '👴', '🧑‍🎓', '👶', '🐶', '🐱'];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Miembros de la Familia ({state.members.length})</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Registra a cada integrante para distribuir los gastos, supervisar consumos individuales y asignar ingresos.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Familiar</span>
        </button>
      </div>

      {/* Family Members Grid or Empty State */}
      {state.members.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-8 text-center">
          <Users className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 dark:text-stone-200">No hay familiares registrados</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Añade a los integrantes de tu familia para registrar ingresos, gastos y presupuestos asignados.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Primer Familiar</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {state.members.map(member => {
          const memberExpenses = monthTransactions
            .filter(t => t.type === 'expense' && t.memberId === member.id)
            .reduce((sum, t) => sum + t.amount, 0);

          const memberIncome = monthTransactions
            .filter(t => t.type === 'income' && t.memberId === member.id)
            .reduce((sum, t) => sum + t.amount, 0);

          const memberTxCount = monthTransactions.filter(t => t.memberId === member.id).length;
          const pctOfFamily = totalFamilyExpense > 0
            ? ((memberExpenses / totalFamilyExpense) * 100).toFixed(1)
            : '0.0';

          return (
            <div
              key={member.id}
              className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:shadow transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs"
                      style={{ backgroundColor: `${member.color}20`, border: `2px solid ${member.color}` }}
                    >
                      {member.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                          {member.name}
                        </h4>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.role}
                        </span>
                      </div>
                      {member.email && (
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{member.email}</span>
                        </p>
                      )}

                      {/* Bank account status pill with link to banks module */}
                      {(() => {
                        const memberAccounts = (state.bankAccounts || []).filter(
                          b => (b.holderMemberId || (b as any).memberId) === member.id
                        );
                        if (memberAccounts.length === 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => onNavigateToBanks?.()}
                              className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition group cursor-pointer"
                              title="Asignar o vincular cuentas a este miembro"
                            >
                              <Landmark className="w-3 h-3 text-amber-500" />
                              <span>Sin cuenta bancaria</span>
                              {onNavigateToBanks && (
                                <span className="underline opacity-80 group-hover:opacity-100">
                                  · Vincular →
                                </span>
                              )}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => onNavigateToBanks?.()}
                            className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
                            title="Ver cuentas de este miembro en el módulo bancario"
                          >
                            <Landmark className="w-3 h-3 text-emerald-500" />
                            <span>
                              {memberAccounts.length} {memberAccounts.length === 1 ? 'cuenta' : 'cuentas'}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                      title="Editar miembro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {state.members.length > 1 && (
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Eliminar miembro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-center">
                  <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block">Gastos (Mes)</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatMoney(memberExpenses, state.currency)}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block">Aportes (Mes)</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(memberIncome, state.currency)}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block">% del Gasto</span>
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {pctOfFamily}%
                    </span>
                  </div>
                </div>

                {/* Expense share bar */}
                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, parseFloat(pctOfFamily))}%`,
                        backgroundColor: member.color,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{memberTxCount} transacciones este mes</span>
                </span>
                <button
                  onClick={() => onFilterMemberTransactions(member.id)}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Ver movimientos →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Member Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {editingMember ? 'Editar Familiar' : 'Registrar Miembro Familiar'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos González"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Rol familiar
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Padre / Esposo">Padre / Esposo</option>
                    <option value="Madre / Esposa">Madre / Esposa</option>
                    <option value="Hijo/a">Hijo/a</option>
                    <option value="Abuelo/a">Abuelo/a</option>
                    <option value="Tutor">Tutor/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Color representativo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-full h-9 p-1 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Avatar (Emoji)
                </label>
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map(emo => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setAvatar(emo)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                        avatar === emo
                          ? 'bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-600'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ingreso mensual estim. ({state.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={monthlyIncome}
                    onChange={e => setMonthlyIncome(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="familiar@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {editingMember ? 'Guardar Cambios' : 'Registrar Familiar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
