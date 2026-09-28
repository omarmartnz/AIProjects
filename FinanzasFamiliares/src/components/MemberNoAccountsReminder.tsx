import React from 'react';
import { Landmark, ArrowRight, X, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { FamilyMember } from '../types';

interface MemberNoAccountsReminderProps {
  member: FamilyMember | null;
  hasFamilyAccounts: boolean;
  isCurrentTabBanks: boolean;
  onNavigateToBanks: () => void;
  onDismiss: () => void;
}

export const MemberNoAccountsReminder: React.FC<MemberNoAccountsReminderProps> = ({
  member,
  hasFamilyAccounts,
  isCurrentTabBanks,
  onNavigateToBanks,
  onDismiss,
}) => {
  if (!member) return null;

  return (
    <aside
      id="member-no-accounts-reminder"
      aria-label="Recordatorio de cuentas bancarias"
      className="w-full max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-8 pt-2 sm:pt-3"
    >
      <div className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-blue-50/90 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-sky-950/30 p-3.5 sm:p-4 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="relative p-2 sm:p-2.5 rounded-xl bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm shrink-0 mt-0.5 sm:mt-0 flex items-center justify-center">
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                  <span>{member.avatar || '👤'}</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{member.name}</span>
                </span>

                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  {hasFamilyAccounts
                    ? 'Aún no tienes cuentas bancarias asignadas a tu nombre'
                    : 'Tu hogar aún no tiene cuentas bancarias registradas'}
                </span>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed max-w-3xl">
                {isCurrentTabBanks ? (
                  <span>
                    Estás en el módulo de <strong>Cuentas Bancarias</strong>. Pulsa el botón <strong>"+ Registrar Cuenta"</strong> para vincular tu cuenta corriente, de nómina, ahorros o tarjeta.
                  </span>
                ) : hasFamilyAccounts ? (
                  <span>
                    Para imputar tus ingresos personales, conciliar gastos y tener una visión exacta de tus saldos individuales, conecta o añade tu cuenta bancaria.
                  </span>
                ) : (
                  <span>
                    Para gestionar los saldos reales de la familia, conciliar transferencias automáticas y calcular tu patrimonio neto, registra tu primera cuenta bancaria.
                  </span>
                )}
              </p>
            </div>

            {/* Close button for mobile */}
            <button
              id="dismiss-no-accounts-reminder-mobile"
              onClick={onDismiss}
              className="sm:hidden -mr-1 -mt-1 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition shrink-0"
              title="Cerrar recordatorio por ahora"
              aria-label="Cerrar recordatorio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action button & Dismiss */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-indigo-100 dark:border-indigo-900/40 sm:border-0">
            <button
              id="navigate-to-banks-from-reminder"
              onClick={onNavigateToBanks}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-xs transition-all w-full sm:w-auto group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-stone-900"
              title="Ir al módulo de cuentas bancarias"
            >
              <Landmark className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" />
              <span>{isCurrentTabBanks ? 'Ver Módulo de Cuentas' : 'Ir a Cuentas Bancarias'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              id="dismiss-no-accounts-reminder-desktop"
              onClick={onDismiss}
              className="hidden sm:inline-flex p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50 transition shrink-0"
              title="Cerrar recordatorio por ahora"
              aria-label="Cerrar recordatorio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
