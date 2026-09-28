import React from 'react';
import {
  PieChart,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { FamilyState, Category } from '../types';
import { formatMoney, formatNumber } from '../utils/currencies';

interface BudgetRule503020ViewProps {
  state: FamilyState;
  selectedMonth: string;
  onUpdateCategoryBucket: (categoryId: string, bucket: 'needs' | 'wants' | 'savings') => void;
}

export const BudgetRule503020View: React.FC<BudgetRule503020ViewProps> = ({
  state,
  selectedMonth,
  onUpdateCategoryBucket,
}) => {
  const monthTransactions = state.transactions.filter(t => t.date.startsWith(selectedMonth));
  
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const baseForCalculation = totalIncome > 0 ? totalIncome : state.globalMonthlyBudget;

  // Group categories by bucket
  const categoryBucketMap: Record<string, 'needs' | 'wants' | 'savings'> = {};
  state.categories.forEach(c => {
    categoryBucketMap[c.name] = c.bucket503020 || (
      c.name.toLowerCase().includes('ocio') || c.name.toLowerCase().includes('streaming') || c.name.toLowerCase().includes('vacaciones')
        ? 'wants'
        : c.name.toLowerCase().includes('ahorro') || c.name.toLowerCase().includes('meta')
        ? 'savings'
        : 'needs'
    );
  });

  // Calculate actual spending per bucket
  let needsSpent = 0;
  let wantsSpent = 0;
  let savingsSpent = 0;

  monthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const bucket = categoryBucketMap[t.category] || 'needs';
      if (bucket === 'needs') needsSpent += t.amount;
      else if (bucket === 'wants') wantsSpent += t.amount;
      else if (bucket === 'savings') savingsSpent += t.amount;
    });

  // Include goal contributions in savings
  const monthGoalSavings = state.savingsGoals.reduce((sum, g) => {
    const contributionsThisMonth = g.contributions
      .filter(c => c.date.startsWith(selectedMonth))
      .reduce((s, c) => s + c.amount, 0);
    return sum + contributionsThisMonth;
  }, 0);

  const totalSavings = savingsSpent + monthGoalSavings;

  const needsPct = baseForCalculation > 0 ? (needsSpent / baseForCalculation) * 100 : 0;
  const wantsPct = baseForCalculation > 0 ? (wantsSpent / baseForCalculation) * 100 : 0;
  const savingsPct = baseForCalculation > 0 ? (totalSavings / baseForCalculation) * 100 : 0;

  // Recommendations
  const tips: { type: 'good' | 'warning' | 'info'; title: string; text: string }[] = [];

  if (baseForCalculation <= 0) {
    tips.push({
      type: 'info',
      title: 'Sin datos registrados aún',
      text: 'Registra tus primeros ingresos del mes o define un presupuesto mensual para que la regla 50/30/20 evalúe tu distribución financiera familiar.',
    });
  } else {
    if (needsPct > 55) {
      tips.push({
        type: 'warning',
        title: 'Necesidades Básicas por encima del 50%',
        text: `Tus gastos fijos e indispensables representan el ${needsPct.toFixed(0)}% de los ingresos. Conviene renegociar contratos de suministros (luz/internet) o buscar opciones de ahorro en la cesta de la compra.`,
      });
    } else {
      tips.push({
        type: 'good',
        title: 'Control óptimo de necesidades básicas',
        text: `El ${needsPct.toFixed(0)}% en necesidades está en sintonía con la regla 50/30/20, lo que deja suficiente margen de maniobra para el hogar.`,
      });
    }

    if (wantsPct > 35) {
      tips.push({
        type: 'warning',
        title: 'Gastos de Ocio y Deseos elevados',
        text: `El ${wantsPct.toFixed(0)}% se destina a ocio, salidas o compras prescindibles. Reducir un 5-10% en restaurantes o compras impulsivas liberaría capital inmediato para vuestras metas de ahorro.`,
      });
    } else {
      tips.push({
        type: 'good',
        title: 'Gasto en ocio equilibrado',
        text: `Mantienes los deseos en un saludable ${wantsPct.toFixed(0)}%, permitiendo disfrutar sin desestabilizar la economía familiar.`,
      });
    }

    if (savingsPct >= 20) {
      tips.push({
        type: 'good',
        title: '¡Meta de ahorro familiar cumplida!',
        text: `Estáis ahorrando un ${savingsPct.toFixed(0)}% del presupuesto este mes, superando el estándar recomendado del 20%.`,
      });
    } else {
      tips.push({
        type: 'info',
        title: 'Oportunidad para potenciar el ahorro',
        text: `El ahorro actual es del ${savingsPct.toFixed(0)}%. Fijar aportaciones automáticas a las metas de ahorro al inicio del mes ayuda a alcanzar el 20% objetivo.`,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <PieChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Salud Financiera Familiar • Regla 50 / 30 / 20</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Diagnóstico equilibrado: 50% Necesidades esenciales, 30% Deseos y ocio, 20% Ahorro e inversión
        </p>
      </div>

      {/* 3 Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Necesidades */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                50% Necesidades Básicas
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold font-mono">
                Ideal: 50%
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Vivienda, alimentación, luz, agua, salud y movilidad
            </p>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
                {formatMoney(needsSpent, state.currency)}
              </span>
              <span className={`text-lg font-bold font-mono ${needsPct > 55 ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>
                {formatNumber(needsPct, 1)}%
              </span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${needsPct > 55 ? 'bg-rose-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, needsPct)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-500 pt-3 border-t border-stone-100 dark:border-stone-800">
            {needsPct <= 50 ? 'Dentro del objetivo ideal' : `Excede el límite recomendado en ${(needsPct - 50).toFixed(1)}%`}
          </div>
        </div>

        {/* 2. Deseos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                30% Deseos & Ocio
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold font-mono">
                Ideal: 30%
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Restaurantes, aficiones, salidas, compras personales y ocio
            </p>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
                {formatMoney(wantsSpent, state.currency)}
              </span>
              <span className={`text-lg font-bold font-mono ${wantsPct > 35 ? 'text-amber-500' : 'text-purple-600 dark:text-purple-400'}`}>
                {formatNumber(wantsPct, 1)}%
              </span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${wantsPct > 35 ? 'bg-amber-500' : 'bg-purple-500'}`}
                style={{ width: `${Math.min(100, wantsPct)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-500 pt-3 border-t border-stone-100 dark:border-stone-800">
            {wantsPct <= 30 ? 'Gasto discrecional controlado' : `Supera el margen óptimo en ${(wantsPct - 30).toFixed(1)}%`}
          </div>
        </div>

        {/* 3. Ahorro */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                20% Ahorro & Futuro
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                Ideal: 20%
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Metas de ahorro, fondo de emergencia e inversiones
            </p>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalSavings, state.currency)}
              </span>
              <span className={`text-lg font-bold font-mono ${savingsPct >= 20 ? 'text-emerald-500' : 'text-stone-500'}`}>
                {formatNumber(savingsPct, 1)}%
              </span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, savingsPct)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-500 pt-3 border-t border-stone-100 dark:border-stone-800">
            {savingsPct >= 20 ? '¡Objetivo alcanzado con éxito!' : `Faltan ${(20 - savingsPct).toFixed(1)}% para el 20%`}
          </div>
        </div>
      </div>

      {/* Diagnostics and Tips */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Diagnóstico y Consejos Financieros para la Familia</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                tip.type === 'good'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                  : tip.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {tip.type === 'good' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : tip.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>{tip.title}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Classification Editor */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-xs">
        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-2 flex items-center justify-between">
          <span>Clasificación de Categorías para la Regla 50/30/20</span>
          <span className="text-xs font-normal text-stone-500">
            Personaliza cómo se clasifica cada categoría
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
          {state.categories.map(cat => {
            const currentBucket = cat.bucket503020 || categoryBucketMap[cat.name] || 'needs';
            return (
              <div
                key={cat.id}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-stone-900 dark:text-stone-100 truncate">
                    {cat.name}
                  </span>
                </div>

                <select
                  value={currentBucket}
                  onChange={e => onUpdateCategoryBucket(cat.id, e.target.value as any)}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shrink-0 ml-2"
                >
                  <option value="needs">50% Necesidad</option>
                  <option value="wants">30% Deseo/Ocio</option>
                  <option value="savings">20% Ahorro</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
