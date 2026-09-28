import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Coins,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  FINANCIAL_CONCEPTS_CATEGORIES,
  FAMILY_FINANCIAL_CONCEPTS,
  FinancialConcept,
  ConceptCategory,
} from '../data/familyFinancialConcepts';

interface FamilyFinancialConceptsViewProps {
  initialSearch?: string;
  onNavigateTab?: (tab: string) => void;
  onCloseModal?: () => void;
}

export const FamilyFinancialConceptsView: React.FC<FamilyFinancialConceptsViewProps> = ({
  initialSearch = '',
  onNavigateTab,
  onCloseModal,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<ConceptCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>('saldo-liquido');

  // Filter concepts based on search and category
  const filteredConcepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAMILY_FINANCIAL_CONCEPTS.filter(item => {
      if (category !== 'all' && item.category !== category) {
        return false;
      }
      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.shortTitle.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        (item.whatItIsNot && item.whatItIsNot.toLowerCase().includes(q)) ||
        (item.formula && item.formula.toLowerCase().includes(q)) ||
        item.example.toLowerCase().includes(q) ||
        item.goldenRule.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const spotlightConcept = useMemo(() => {
    return FAMILY_FINANCIAL_CONCEPTS.find(c => c.id === 'saldo-liquido');
  }, []);

  const handleAction = (tabKey?: string) => {
    if (tabKey && onNavigateTab) {
      if (onCloseModal) onCloseModal();
      onNavigateTab(tabKey);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Glosario Financiero Familiar & Conceptos Clave</span>
          </div>
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            {FAMILY_FINANCIAL_CONCEPTS.length} Conceptos Esenciales
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Conceptos Fundamentales de Finanzas Familiares
        </h3>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl">
          Aprende el lenguaje real de la economía doméstica: qué significa cada término, cómo se calcula,
          qué errores comunes evitar (como confundir el límite de una tarjeta de crédito con dinero propio)
          y cómo aplicar cada regla en las decisiones diarias de tu hogar.
        </p>

        {/* Quick Search & Categories */}
        <div className="pt-2 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar concepto: saldo líquido, patrimonio neto, fondo de emergencia, avalancha, gastos hormiga..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {FINANCIAL_CONCEPTS_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  category === cat.key
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spotlight Card: Saldo Líquido (Always prominent when category is 'all' or 'liquidity' without conflicting search) */}
      {spotlightConcept && (category === 'all' || category === 'liquidity') && (!search || 'saldo líquido'.includes(search.toLowerCase()) || spotlightConcept.title.toLowerCase().includes(search.toLowerCase())) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-stone-900 dark:to-stone-900 border-2 border-emerald-500/40 dark:border-emerald-600/50 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Concepto Protagonista
                </span>
                <h4 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
                  {spotlightConcept.title}
                </h4>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
              {spotlightConcept.badge}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
            {spotlightConcept.definition}
          </p>

          {/* Contrast warning block: Qué NO es el saldo líquido */}
          {spotlightConcept.whatItIsNot && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <strong className="text-amber-900 dark:text-amber-200 font-bold block">
                  ⚠️ Advertencia Fundamental: ¿Qué NO es Saldo Líquido?
                </strong>
                <span className="text-amber-800 dark:text-amber-300/90 leading-relaxed block">
                  {spotlightConcept.whatItIsNot}
                </span>
              </div>
            </div>
          )}

          {/* Formula and Example Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-emerald-200/70 dark:border-emerald-900/50 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fórmula Matemática:</span>
              </div>
              <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
                {spotlightConcept.formula}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-stone-800/80 border border-emerald-200/70 dark:border-emerald-900/50 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Ejemplo Práctico en el Hogar:</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {spotlightConcept.example}
              </p>
            </div>
          </div>

          {/* Golden rule & Action */}
          <div className="p-3.5 rounded-xl bg-emerald-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-200 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <strong className="font-bold block text-white">Regla de Oro Familiar:</strong>
                <span className="text-emerald-100 leading-relaxed">{spotlightConcept.goldenRule}</span>
              </div>
            </div>

            {spotlightConcept.relatedModuleTab && (
              <button
                type="button"
                onClick={() => handleAction(spotlightConcept.relatedModuleTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs transition shrink-0 shadow-xs"
              >
                <span>{spotlightConcept.relatedModuleLabel || 'Ver en la App'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Concepts List Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Directorio de Conceptos Financieros ({filteredConcepts.length})</span>
          </h4>
          <span className="text-xs text-stone-400">Haz clic en cada tarjeta para expandir</span>
        </div>

        {filteredConcepts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-2">
            <HelpCircle className="w-8 h-8 text-stone-400 mx-auto" />
            <h5 className="font-bold text-stone-700 dark:text-stone-300">
              No se encontraron conceptos con &quot;{search}&quot;
            </h5>
            <p className="text-xs text-stone-500">
              Prueba buscando términos como &quot;saldo líquido&quot;, &quot;fondo de emergencia&quot;, &quot;interés&quot; o &quot;deuda&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('all');
              }}
              className="mt-2 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-bold"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredConcepts.map(item => {
              const ItemIcon = item.icon;
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition overflow-hidden bg-white dark:bg-stone-900 ${
                    isExpanded
                      ? 'border-emerald-400 dark:border-emerald-700 shadow-md ring-1 ring-emerald-500/20'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-xs'
                  }`}
                >
                  {/* Card Header (Clickable) */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-800 ${item.accentColor}`}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                          <span className="text-[10px] font-medium text-stone-400">
                            {item.categoryLabel}
                          </span>
                        </div>

                        <h5 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {item.title}
                        </h5>

                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3 bg-stone-50/50 dark:bg-stone-950/30 text-xs">
                      {/* Full Definition */}
                      <div>
                        <strong className="text-stone-900 dark:text-stone-100 font-bold block mb-1">
                          📖 Definición Completa:
                        </strong>
                        <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                          {item.definition}
                        </p>
                      </div>

                      {/* What it is not */}
                      {item.whatItIsNot && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 space-y-0.5">
                          <strong className="font-bold block flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>¿Qué NO es?:</span>
                          </strong>
                          <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                            {item.whatItIsNot}
                          </p>
                        </div>
                      )}

                      {/* Formula */}
                      {item.formula && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <strong className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">
                            📐 Fórmula / Cálculo:
                          </strong>
                          <code className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
                            {item.formula}
                          </code>
                        </div>
                      )}

                      {/* Practical Example */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-0.5">
                        <strong className="text-teal-600 dark:text-teal-400 font-bold block">
                          💡 Ejemplo en la Vida Familiar:
                        </strong>
                        <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                          {item.example}
                        </p>
                      </div>

                      {/* Family Impact & Golden Rule */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                        <div>
                          <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                            Impacto en el Hogar:
                          </strong>{' '}
                          <span className="text-stone-700 dark:text-stone-300">{item.familyImpact}</span>
                        </div>
                        <div className="pt-1 border-t border-emerald-200/60 dark:border-emerald-900/50">
                          <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                            Regla de Oro:
                          </strong>{' '}
                          <span className="text-stone-700 dark:text-stone-300">{item.goldenRule}</span>
                        </div>
                      </div>

                      {/* Jump button */}
                      {item.relatedModuleTab && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleAction(item.relatedModuleTab)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs"
                          >
                            <span>{item.relatedModuleLabel || 'Ver en el Sistema'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
