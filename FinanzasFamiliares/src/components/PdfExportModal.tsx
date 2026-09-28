import React, { useState, useMemo } from 'react';
import {
  FileDown,
  X,
  Check,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { FamilyState } from '../types';
import {
  exportFamilyReportPDF,
  formatCurrencyPDF,
  formatPeriodLabel,
  MONTH_NAMES_ES,
  MONTH_SHORT_NAMES_ES,
} from '../utils/pdfExport';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  selectedMonth: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  state,
  selectedMonth: initialMonth,
}) => {
  // Parse initial year & month
  const initialYear = useMemo(() => {
    const y = parseInt(initialMonth?.split('-')[0], 10);
    return !isNaN(y) && y > 2000 ? y : new Date().getFullYear();
  }, [initialMonth]);

  const initialMonthNum = useMemo(() => {
    const m = parseInt(initialMonth?.split('-')[1], 10);
    return !isNaN(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  }, [initialMonth]);

  // Multi-year and multi-month selections
  const [selectedYears, setSelectedYears] = useState<number[]>([initialYear]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([initialMonthNum]);
  const [customYearInput, setCustomYearInput] = useState<string>('');
  const [showAddYearInput, setShowAddYearInput] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Discover all distinct years available in transactions
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear, currentYear - 1]);
    
    // Add years from transactions
    state.transactions.forEach(tx => {
      if (tx.date && tx.date.length >= 4) {
        const y = parseInt(tx.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2000 && y <= 2100) {
          yearsSet.add(y);
        }
      }
    });

    // Also include any selected years
    selectedYears.forEach(y => yearsSet.add(y));

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [state.transactions, selectedYears]);

  // Compute all period keys (e.g. ['2025-01', '2025-02', '2026-01', ...])
  const selectedPeriodKeys = useMemo(() => {
    const keys: string[] = [];
    const sortedY = [...selectedYears].sort((a, b) => a - b);
    const sortedM = [...selectedMonths].sort((a, b) => a - b);
    for (const y of sortedY) {
      for (const m of sortedM) {
        keys.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
    return keys;
  }, [selectedYears, selectedMonths]);

  // Filter transactions for the entire multi-period selection
  const periodTransactions = useMemo(() => {
    if (selectedPeriodKeys.length === 0) return [];
    const keysSet = new Set(selectedPeriodKeys);
    return state.transactions.filter(t => t.date && keysSet.has(t.date.substring(0, 7)));
  }, [state.transactions, selectedPeriodKeys]);

  // Count transactions per month for visual feedback badges
  const txCountByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    if (selectedYears.length === 0) return map;
    const yearsSet = new Set(selectedYears);
    state.transactions.forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const y = parseInt(t.date.substring(0, 4), 10);
      const m = parseInt(t.date.substring(5, 7), 10);
      if (yearsSet.has(y)) {
        map[m] = (map[m] || 0) + 1;
      }
    });
    return map;
  }, [state.transactions, selectedYears]);

  // Financial totals for the selected period
  const totalIncome = useMemo(() => {
    return periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const totalExpense = useMemo(() => {
    return periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const netBalance = totalIncome - totalExpense;
  const periodCount = selectedPeriodKeys.length;
  const scaledGlobalBudget = state.globalMonthlyBudget * periodCount;
  const formattedPeriodTitle = formatPeriodLabel(selectedYears, selectedMonths);

  // Year toggles
  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => b - a)
    );
  };

  const handleSelectAllYears = () => {
    setSelectedYears([...availableYears]);
  };

  const handleSelectCurrentYearOnly = () => {
    const curYear = new Date().getFullYear();
    setSelectedYears([curYear]);
  };

  const handleAddCustomYear = () => {
    const y = parseInt(customYearInput.trim(), 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      if (!selectedYears.includes(y)) {
        setSelectedYears(prev => [...prev, y].sort((a, b) => b - a));
      }
      setCustomYearInput('');
      setShowAddYearInput(false);
    }
  };

  // Month toggles
  const toggleMonth = (monthNum: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthNum)
        ? prev.filter(m => m !== monthNum)
        : [...prev, monthNum].sort((a, b) => a - b)
    );
  };

  const handleSelectAllMonths = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const handleSelectCurrentMonthOnly = () => {
    const curM = new Date().getMonth() + 1;
    setSelectedMonths([curM]);
  };

  const handleSelectSemester1 = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6]);
  };

  const handleSelectSemester2 = () => {
    setSelectedMonths([7, 8, 9, 10, 11, 12]);
  };

  const handleSelectQuarter = (q: 1 | 2 | 3 | 4) => {
    if (q === 1) setSelectedMonths([1, 2, 3]);
    if (q === 2) setSelectedMonths([4, 5, 6]);
    if (q === 3) setSelectedMonths([7, 8, 9]);
    if (q === 4) setSelectedMonths([10, 11, 12]);
  };

  const handleInvertMonths = () => {
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    setSelectedMonths(all.filter(m => !selectedMonths.includes(m)));
  };

  // Quick Preset Handlers
  const handlePresetCurrentMonth = () => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    setSelectedYears([curYear]);
    setSelectedMonths([curMonth]);
  };

  const handlePresetFullCurrentYear = () => {
    const curYear = new Date().getFullYear();
    setSelectedYears([curYear]);
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  const handlePresetLast3Months = () => {
    const now = new Date();
    const years = new Set<number>();
    const months = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      years.add(d.getFullYear());
      months.add(d.getMonth() + 1);
    }
    setSelectedYears(Array.from(years).sort((a, b) => b - a));
    setSelectedMonths(Array.from(months).sort((a, b) => a - b));
  };

  const handlePresetAllHistory = () => {
    setSelectedYears([...availableYears]);
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };

  // Export Trigger
  const handleExport = async () => {
    if (selectedPeriodKeys.length === 0) return;
    setIsExporting(true);
    try {
      await exportFamilyReportPDF(state, {
        years: selectedYears,
        months: selectedMonths,
        periodKeys: selectedPeriodKeys,
        periodLabel: formattedPeriodTitle,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error al exportar reporte PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const isPeriodValid = selectedYears.length > 0 && selectedMonths.length > 0;

  return (
    <div
      id="pdf-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="pdf-export-modal-card"
        className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shadow-inner">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Exportar Reporte en PDF</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Multiperíodo
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Selecciona uno o más años y meses para consolidar en el informe
              </p>
            </div>
          </div>
          <button
            id="btn-close-pdf-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          
          {/* Quick Preset Selector Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Accesos Rápidos</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handlePresetCurrentMonth}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-stone-200 dark:border-stone-700 transition"
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={handlePresetFullCurrentYear}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-stone-200 dark:border-stone-700 transition"
              >
                Año Actual Completo
              </button>
              <button
                type="button"
                onClick={handlePresetLast3Months}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-stone-200 dark:border-stone-700 transition"
              >
                Últimos 3 Meses
              </button>
              <button
                type="button"
                onClick={handlePresetAllHistory}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 border border-stone-200 dark:border-stone-700 transition"
              >
                Todo el Histórico
              </button>
            </div>
          </div>

          {/* 1. SELECCIÓN DE AÑOS */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  1. Seleccionar Año(s):
                </label>
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {selectedYears.length} {selectedYears.length === 1 ? 'año' : 'años'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllYears}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Todos
                </button>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <button
                  type="button"
                  onClick={handleSelectCurrentYearOnly}
                  className="font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400"
                >
                  Solo este año
                </button>
              </div>
            </div>

            {/* Year Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {availableYears.map(year => {
                const isSelected = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{year}</span>
                  </button>
                );
              })}

              {/* Add other year inline */}
              {showAddYearInput ? (
                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-emerald-400 rounded-lg p-0.5">
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    placeholder="Año..."
                    value={customYearInput}
                    onChange={e => setCustomYearInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCustomYear()}
                    className="w-16 px-2 py-1 text-xs bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomYear}
                    className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddYearInput(false)}
                    className="p-1 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddYearInput(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Otro año</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. SELECCIÓN DE MESES */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  2. Seleccionar Mes(es):
                </label>
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {selectedMonths.length} de 12 meses
                </span>
              </div>

              {/* Sub-actions */}
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className="px-1.5 py-0.5 rounded font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                >
                  Todos
                </button>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <button
                  type="button"
                  onClick={handleSelectCurrentMonthOnly}
                  className="px-1.5 py-0.5 rounded font-semibold text-stone-600 hover:text-stone-800 dark:text-stone-400"
                >
                  Mes actual
                </button>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <button
                  type="button"
                  onClick={handleSelectSemester1}
                  className="px-1.5 py-0.5 rounded font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400"
                >
                  1er Sem
                </button>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <button
                  type="button"
                  onClick={handleSelectSemester2}
                  className="px-1.5 py-0.5 rounded font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400"
                >
                  2do Sem
                </button>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <button
                  type="button"
                  onClick={handleInvertMonths}
                  title="Invertir selección de meses"
                  className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quarter Quick Buttons */}
            <div className="flex items-center gap-1 text-[11px] pb-1">
              <span className="text-stone-400 dark:text-stone-500 font-medium">Trimestres:</span>
              <button
                type="button"
                onClick={() => handleSelectQuarter(1)}
                className="px-2 py-0.5 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold"
              >
                Q1 (Ene-Mar)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuarter(2)}
                className="px-2 py-0.5 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold"
              >
                Q2 (Abr-Jun)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuarter(3)}
                className="px-2 py-0.5 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold"
              >
                Q3 (Jul-Sep)
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuarter(4)}
                className="px-2 py-0.5 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-semibold"
              >
                Q4 (Oct-Dic)
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTH_NAMES_ES.map((fullName, idx) => {
                const monthNum = idx + 1;
                const isSelected = selectedMonths.includes(monthNum);
                const shortName = MONTH_SHORT_NAMES_ES[idx];
                const count = txCountByMonth[monthNum] || 0;

                return (
                  <button
                    key={monthNum}
                    type="button"
                    onClick={() => toggleMonth(monthNum)}
                    className={`relative p-2 rounded-xl flex items-center justify-between border text-left transition ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {monthNum}
                        </span>
                        <span className="font-bold text-xs">{shortName}</span>
                      </div>
                      <span className="block text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {fullName}
                      </span>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-1">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-stone-300 dark:border-stone-600" />
                      )}
                      {count > 0 && (
                        <span className="text-[9px] font-medium text-stone-400 dark:text-stone-500 mt-1">
                          {count} tx
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Warning if empty selection */}
          {!isPeriodValid && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Por favor selecciona al menos un año y un mes para generar el informe consolidado.</span>
            </div>
          )}

          {/* Dynamic Period Summary Card */}
          {isPeriodValid && (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 block">
                      Período Consolidado: {formattedPeriodTitle}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Total de {periodCount} {periodCount === 1 ? 'mes analizado' : 'meses analizados'} ({selectedYears.join(', ')})
                    </span>
                  </div>
                </div>
                <span className="font-bold px-2 py-1 rounded bg-stone-200/80 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                  {periodTransactions.length} {periodTransactions.length === 1 ? 'transacción' : 'transacciones'}
                </span>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">Total Ingresos</span>
                  <strong className="text-emerald-600 font-bold text-xs">
                    +{formatCurrencyPDF(totalIncome, state.currency)}
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">Total Gastos</span>
                  <strong className="text-rose-600 font-bold text-xs">
                    -{formatCurrencyPDF(totalExpense, state.currency)}
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">Balance Neto</span>
                  <strong className={`font-bold text-xs ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netBalance >= 0 ? '+' : ''}{formatCurrencyPDF(netBalance, state.currency)}
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">Presupuesto Asignado</span>
                  <strong className="text-stone-700 dark:text-stone-300 font-bold text-xs">
                    {formatCurrencyPDF(scaledGlobalBudget, state.currency)}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400">
                El informe PDF incluye automáticamente:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Cabecera oficial ejecutiva con logotipo de la aplicación</li>
                  <li>1. Resumen consolidado del período con tasa de ahorro calculada</li>
                  <li>2. Control y límites de presupuesto escalados proporcionalmente a los {periodCount} meses</li>
                  <li>3. Desglose detallado del gasto por cada miembro familiar</li>
                  <li>4. Registro cronológico completo de todas las transacciones filtradas</li>
                  <li className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    5. Gráficas recomendadas: Estructura del gasto, Presupuesto vs. Real y Salud financiera
                  </li>
                </ul>
              </div>
            </div>
          )}

          {downloadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Reporte generado y descargado exitosamente en tu dispositivo!</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 mt-4 shrink-0">
          <button
            type="button"
            id="btn-cancel-pdf-export"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            Cerrar
          </button>
          
          <button
            type="button"
            id="btn-generate-pdf-report"
            disabled={isExporting || !isPeriodValid}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>
              {isExporting
                ? `Generando PDF (${periodCount} meses)...`
                : `Descargar Informe PDF (${periodCount} ${periodCount === 1 ? 'mes' : 'meses'})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
