import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCheck,
  Ban,
  Sparkles,
  LayoutGrid,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import {
  DASHBOARD_WIDGETS,
  DashboardWidgetCategory,
  DashboardWidgetMeta,
  getDefaultWidgetVisibility,
  getDefaultWidgetOrder,
} from './dashboardWidgets';

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: Record<string, boolean>;
  onChangeVisibility: (updated: Record<string, boolean>) => void;
  order: string[];
  onChangeOrder: (newOrder: string[]) => void;
  initialTab?: 'visibility' | 'order';
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  visibility,
  onChangeVisibility,
  order,
  onChangeOrder,
  initialTab = 'visibility',
}) => {
  const [activeTab, setActiveTab] = useState<'visibility' | 'order'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const totalCount = DASHBOARD_WIDGETS.length;
  const activeCount = DASHBOARD_WIDGETS.filter(w => visibility[w.id] !== false).length;

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Todas las Gráficas' },
    { id: 'core', label: 'Métricas Principales' },
    { id: 'loans', label: 'Préstamos y Deuda' },
    { id: 'wealth', label: 'Patrimonio y Salud' },
    { id: 'analysis', label: 'Análisis Histórico' },
  ];

  // Map of metadata for fast lookup
  const widgetMap = new Map<string, DashboardWidgetMeta>();
  DASHBOARD_WIDGETS.forEach(w => widgetMap.set(w.id, w));

  // Ordered list of widget objects
  const orderedWidgets: DashboardWidgetMeta[] = order
    .map(id => widgetMap.get(id))
    .filter((w): w is DashboardWidgetMeta => !!w);

  // If any widgets were not in order array, append them
  DASHBOARD_WIDGETS.forEach(w => {
    if (!order.includes(w.id)) {
      orderedWidgets.push(w);
    }
  });

  const filteredWidgets = DASHBOARD_WIDGETS.filter(w => {
    const matchesCategory = selectedCategory === 'all' || w.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggle = (id: string) => {
    const nextState = {
      ...visibility,
      [id]: !(visibility[id] !== false),
    };
    onChangeVisibility(nextState);
  };

  const handleEnableAll = () => {
    const nextState: Record<string, boolean> = {};
    DASHBOARD_WIDGETS.forEach(w => {
      nextState[w.id] = true;
    });
    onChangeVisibility(nextState);
  };

  const handleDisableAll = () => {
    const nextState: Record<string, boolean> = {};
    DASHBOARD_WIDGETS.forEach(w => {
      nextState[w.id] = false;
    });
    onChangeVisibility(nextState);
  };

  const handleResetVisibilityDefaults = () => {
    onChangeVisibility(getDefaultWidgetVisibility());
  };

  const handleResetOrderDefaults = () => {
    onChangeOrder(getDefaultWidgetOrder());
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...order];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    onChangeOrder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index >= order.length - 1) return;
    const newOrder = [...order];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    onChangeOrder(newOrder);
  };

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    const item = order[index];
    const newOrder = [item, ...order.filter((_, i) => i !== index)];
    onChangeOrder(newOrder);
  };

  const handleMoveToBottom = (index: number) => {
    if (index >= order.length - 1) return;
    const item = order[index];
    const newOrder = [...order.filter((_, i) => i !== index), item];
    onChangeOrder(newOrder);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newOrder = [...order];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    onChangeOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Personalizar Gráficos del Dashboard</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {activeCount} de {totalCount} activos
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Configura la visibilidad y reubica el orden de presentación de cada gráfica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Visibility vs Order */}
        <div className="flex items-center border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'visibility'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Activar / Ocultar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'order'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Reubicar y Reordenar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
              Prioridades
            </span>
          </button>
        </div>

        {/* Tab 1: Visibility View */}
        {activeTab === 'visibility' && (
          <>
            {/* Quick Batch Actions & Search */}
            <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 space-y-3 bg-white dark:bg-stone-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                        selectedCategory === c.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleEnableAll}
                    title="Mostrar todas las gráficas"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Activar todas</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableAll}
                    title="Ocultar todas las gráficas"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Ocultar todas</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetVisibilityDefaults}
                    title="Restablecer visibilidad predeterminada"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                    <span>Por defecto</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar gráfica o métrica (ej. préstamos, patrimonio, 50/30/20)..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Widgets List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 divide-y divide-stone-100 dark:divide-stone-800/60 space-y-1">
              {filteredWidgets.length === 0 ? (
                <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs">
                  No se encontraron gráficas con ese criterio de búsqueda.
                </div>
              ) : (
                filteredWidgets.map(widget => {
                  const isVisible = visibility[widget.id] !== false;
                  const currentPos = order.indexOf(widget.id) + 1;
                  return (
                    <div
                      key={widget.id}
                      onClick={() => handleToggle(widget.id)}
                      className={`pt-2.5 pb-2.5 px-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer border ${
                        isVisible
                          ? 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-xs'
                          : 'bg-stone-50/80 dark:bg-stone-950/40 border-dashed border-stone-200 dark:border-stone-800 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isVisible
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                          }`}
                        >
                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                              {widget.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                              {widget.categoryLabel}
                            </span>
                            {currentPos > 0 && isVisible && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                                #{currentPos}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                            {widget.shortDesc}
                          </p>
                        </div>
                      </div>

                      {/* Switch toggle control */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isVisible}
                          onClick={e => {
                            e.stopPropagation();
                            handleToggle(widget.id);
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            isVisible ? 'bg-indigo-600' : 'bg-stone-300 dark:bg-stone-700'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isVisible ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tab 2: Reordering & Relocation View */}
        {activeTab === 'order' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-3 sm:p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Arrastra o utiliza las flechas para reubicar la posición de cada gráfica en el Dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetOrderDefaults}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                title="Restablecer el orden original predeterminado"
              >
                <RotateCcw className="w-3 h-3 text-stone-500" />
                <span>Orden por defecto</span>
              </button>
            </div>

            {/* Drag & Drop Reorderable List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
              {orderedWidgets.map((widget, index) => {
                const isVisible = visibility[widget.id] !== false;
                const isDragging = draggedIndex === index;
                const isOver = dragOverIndex === index;

                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, index)}
                    className={`p-2.5 sm:p-3 rounded-xl border transition flex items-center justify-between gap-2 select-none ${
                      isDragging
                        ? 'opacity-40 border-dashed border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50'
                        : isOver
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/30'
                        : isVisible
                        ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs hover:border-stone-300 dark:hover:border-stone-700'
                        : 'bg-stone-50/70 dark:bg-stone-950/40 border-dashed border-stone-200 dark:border-stone-800 opacity-60'
                    }`}
                  >
                    {/* Left: Drag handle + Index Number + Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Arrastrar para reubicar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                            {widget.title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isVisible
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                            }`}
                          >
                            {isVisible ? 'Visible' : 'Oculto'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {widget.shortDesc}
                        </p>
                      </div>
                    </div>

                    {/* Right: Reorder Controls (Up, Down, Top, Bottom) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveToTop(index)}
                        disabled={index === 0}
                        title="Mover arriba del todo"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        title="Subir una posición"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === order.length - 1}
                        title="Bajar una posición"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveToBottom(index)}
                        disabled={index === order.length - 1}
                        title="Mover al final del todo"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 disabled:pointer-events-none transition"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>Los cambios de posición y visibilidad se guardan al instante</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Listo, ver Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
