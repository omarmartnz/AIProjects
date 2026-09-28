import React, { useState } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  FolderPlus,
  Sliders,
  Check,
  Edit2,
  ShoppingCart,
  Utensils,
  Home,
  Zap,
  HeartPulse,
  GraduationCap,
  Car,
  Sparkles,
  Palmtree,
  TrendingUp,
  CreditCard,
  Plane,
  Gift,
  Dumbbell,
  Smartphone,
  Film,
  Dog,
  Briefcase,
  Coffee,
  Baby,
  Wrench,
  Shield,
  DollarSign,
  AlertTriangle,
  X,
  Search,
} from 'lucide-react';
import { FamilyState, Category } from '../types';
import { formatMoney } from '../utils/currencies';

// Available Lucide icons for category representation
export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Utensils,
  Home,
  Zap,
  HeartPulse,
  GraduationCap,
  Car,
  Sparkles,
  Palmtree,
  TrendingUp,
  CreditCard,
  Plane,
  Gift,
  Dumbbell,
  Smartphone,
  Film,
  Dog,
  Briefcase,
  Coffee,
  Baby,
  Wrench,
  Shield,
  DollarSign,
  Tag: TagIcon,
};

export const AVAILABLE_CATEGORY_ICONS = [
  { key: 'ShoppingCart', label: 'Supermercado' },
  { key: 'Utensils', label: 'Restaurantes' },
  { key: 'Home', label: 'Vivienda' },
  { key: 'Zap', label: 'Servicios/Luz' },
  { key: 'HeartPulse', label: 'Salud' },
  { key: 'GraduationCap', label: 'Educación' },
  { key: 'Car', label: 'Transporte' },
  { key: 'Palmtree', label: 'Vacaciones' },
  { key: 'Sparkles', label: 'Ocio' },
  { key: 'TrendingUp', label: 'Inversión' },
  { key: 'CreditCard', label: 'Préstamos' },
  { key: 'Plane', label: 'Viajes' },
  { key: 'Gift', label: 'Regalos' },
  { key: 'Dumbbell', label: 'Deporte' },
  { key: 'Smartphone', label: 'Tecnología' },
  { key: 'Film', label: 'Streaming' },
  { key: 'Dog', label: 'Mascotas' },
  { key: 'Briefcase', label: 'Negocio' },
  { key: 'Coffee', label: 'Cafetería' },
  { key: 'Baby', label: 'Bebés' },
  { key: 'Wrench', label: 'Reparaciones' },
  { key: 'Shield', label: 'Seguros' },
  { key: 'DollarSign', label: 'Finanzas' },
  { key: 'Tag', label: 'General' },
];

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

interface TagsCategoriesViewProps {
  state: FamilyState;
  selectedMonth: string;
  onAddTag: (name: string, color: string) => void;
  onRemoveTag: (id: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategoryBudget: (id: string, budgetLimit: number, alertThreshold: number) => void;
  onUpdateCategory?: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory?: (id: string) => void;
}

export const TagsCategoriesView: React.FC<TagsCategoriesViewProps> = ({
  state,
  selectedMonth,
  onAddTag,
  onRemoveTag,
  onAddCategory,
  onUpdateCategoryBudget,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  // New Tag form state
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#10b981');

  // Search/filter categories
  const [categorySearch, setCategorySearch] = useState('');

  // Create Category modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catLimit, setCatLimit] = useState('300');
  const [catThreshold, setCatThreshold] = useState('80');
  const [catBucket, setCatBucket] = useState<'needs' | 'wants' | 'savings'>('needs');

  // Edit Category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Tag');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editLimit, setEditLimit] = useState('0');
  const [editThreshold, setEditThreshold] = useState('80');
  const [editBucket, setEditBucket] = useState<'needs' | 'wants' | 'savings'>('needs');

  // Delete confirmation modal state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const monthTransactions = state.transactions.filter(t => t.date.startsWith(selectedMonth));

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    onAddTag(tagName.trim(), tagColor);
    setTagName('');
  };

  const handleOpenCreateModal = () => {
    setCatName('');
    setCatIcon('Tag');
    setCatColor('#3b82f6');
    setCatLimit('500');
    setCatThreshold('80');
    setCatBucket('needs');
    setIsCreateModalOpen(true);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory({
      name: catName.trim(),
      icon: catIcon,
      color: catColor,
      budgetLimit: parseFloat(catLimit) || 0,
      alertThreshold: parseInt(catThreshold, 10) || 80,
      bucket503020: catBucket,
    });
    setIsCreateModalOpen(false);
    setCatName('');
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'Tag');
    setEditColor(cat.color || '#3b82f6');
    setEditLimit(cat.budgetLimit.toString());
    setEditThreshold(cat.alertThreshold.toString());
    setEditBucket(cat.bucket503020 || 'needs');
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    const parsedLimit = parseFloat(editLimit) || 0;
    const parsedThreshold = parseInt(editThreshold, 10) || 80;

    if (onUpdateCategory) {
      onUpdateCategory(editingCategory.id, {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
        budgetLimit: parsedLimit,
        alertThreshold: parsedThreshold,
        bucket503020: editBucket,
      });
    } else {
      // Fallback if only budget mutation exists
      onUpdateCategoryBudget(editingCategory.id, parsedLimit, parsedThreshold);
    }

    setEditingCategory(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    if (onDeleteCategory) {
      onDeleteCategory(deletingCategory.id);
    }
    setDeletingCategory(null);
  };

  const renderIconComponent = (iconKey?: string, className: string = 'w-4 h-4') => {
    const IconComp = iconKey && CATEGORY_ICON_MAP[iconKey] ? CATEGORY_ICON_MAP[iconKey] : TagIcon;
    return <IconComp className={className} />;
  };

  const filteredCategories = state.categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  return (
    <div className="space-y-8">
      {/* 1. Categories Management Section */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Categorías de Presupuesto ({state.categories.length})
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Edita nombres, iconos, colores, límites mensuales y asignaciones de la regla 50/30/20.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </button>
          </div>
        </div>

        {/* Search bar if many categories */}
        {state.categories.length > 5 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Categories Grid / List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCategories.map(cat => {
            const spent = monthTransactions
              .filter(t => t.type === 'expense' && t.category === cat.name)
              .reduce((sum, t) => sum + t.amount, 0);

            const limit = cat.budgetLimit;
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const isAlert = limit > 0 && pct >= cat.alertThreshold;
            const isExceeded = limit > 0 && pct >= 100;

            const bucketLabel =
              cat.bucket503020 === 'wants'
                ? 'Deseos (30%)'
                : cat.bucket503020 === 'savings'
                ? 'Ahorro (20%)'
                : 'Necesidades (50%)';

            const bucketColor =
              cat.bucket503020 === 'wants'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                : cat.bucket503020 === 'savings'
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';

            return (
              <div
                key={cat.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      {renderIconComponent(cat.icon, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {cat.name}
                        </h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bucketColor}`}>
                          {bucketLabel}
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 dark:text-stone-400 block mt-0.5">
                        Alerta temprana: <strong className="text-amber-600 dark:text-amber-400">{cat.alertThreshold}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                      title={`Editar categoría ${cat.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeletingCategory(cat)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title={`Eliminar categoría ${cat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar and spending info */}
                <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-stone-500 dark:text-stone-400">
                      Gastado:{' '}
                      <strong className="text-stone-800 dark:text-stone-200 font-bold">
                        {formatMoney(spent, state.currency)}
                      </strong>
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">
                      Límite:{' '}
                      <strong className="text-stone-800 dark:text-stone-200 font-bold">
                        {cat.budgetLimit > 0 ? formatMoney(cat.budgetLimit, state.currency) : 'Sin límite fijado'}
                      </strong>
                    </span>
                  </div>

                  {cat.budgetLimit > 0 && (
                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: isExceeded ? '#ef4444' : isAlert ? '#f59e0b' : cat.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Tags Section */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-emerald-600" />
              <span>Etiquetas Personalizadas (Tags)</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Crea etiquetas a tu medida (#supermercado, #fijo, #vacaciones, #urgente) para clasificar y filtrar gastos transversalmente.
            </p>
          </div>
        </div>

        {/* Create Tag Bar */}
        <form onSubmit={handleCreateTag} className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
          <input
            type="text"
            required
            placeholder="Nueva etiqueta (ej. Mascotas, Reparaciones)"
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 dark:text-stone-400">Color:</span>
            <input
              type="color"
              value={tagColor}
              onChange={e => setTagColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-600 p-0.5"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Etiqueta</span>
          </button>
        </form>

        {/* Tags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {state.tags.map(tag => {
            const taggedTx = monthTransactions.filter(t => (t.tags || []).includes(tag.name));
            const totalTaggedSpent = taggedTx
              .filter(t => t.type === 'expense')
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <div
                key={tag.id}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                      #{tag.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                    {taggedTx.length} uso(s) • {formatMoney(totalTaggedSpent, state.currency)}
                  </span>
                </div>

                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-stone-200 dark:hover:bg-stone-700"
                  title="Eliminar etiqueta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: editColor }}
                >
                  {renderIconComponent(editIcon, 'w-4 h-4')}
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Editar Categoría
                </h3>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Modifica los detalles, límite mensual y regla financiera de esta categoría.
            </p>

            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Seleccionar Icono
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                  {AVAILABLE_CATEGORY_ICONS.map(item => {
                    const isSelected = editIcon === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setEditIcon(item.key)}
                        title={item.label}
                        className={`p-2 rounded-lg flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {renderIconComponent(item.key, 'w-4 h-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets & Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Color Representativo
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center ${
                        editColor.toLowerCase() === c.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {editColor.toLowerCase() === c.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[11px] text-stone-500">Personalizado:</span>
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-600 p-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* 50/30/20 Classification */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Clasificación Regla 50/30/20
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditBucket('needs')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      editBucket === 'needs'
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Necesidades (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditBucket('wants')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      editBucket === 'wants'
                        ? 'bg-purple-50 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Deseos (30%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditBucket('savings')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      editBucket === 'savings'
                        ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Ahorro (20%)
                  </button>
                </div>
              </div>

              {/* Budget Limit & Alert Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Límite Mensual ({state.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editLimit}
                    onChange={e => setEditLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-stone-400 mt-0.5 block">0 = Sin límite fijado</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Umbral de Alerta
                    </label>
                    <span className="text-xs font-bold text-amber-600">
                      {editThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={editThreshold}
                    onChange={e => setEditThreshold(e.target.value)}
                    className="w-full accent-amber-500 mt-2"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Category Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: catColor }}
                >
                  {renderIconComponent(catIcon, 'w-4 h-4')}
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Crear Nueva Categoría
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Agrupa tus gastos familiares, define su icono, color y presupuesto mensual.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mascotas, Deportes, Vacaciones..."
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Seleccionar Icono
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                  {AVAILABLE_CATEGORY_ICONS.map(item => {
                    const isSelected = catIcon === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCatIcon(item.key)}
                        title={item.label}
                        className={`p-2 rounded-lg flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {renderIconComponent(item.key, 'w-4 h-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets & Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Color Representativo
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center ${
                        catColor.toLowerCase() === c.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {catColor.toLowerCase() === c.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[11px] text-stone-500">Personalizado:</span>
                    <input
                      type="color"
                      value={catColor}
                      onChange={e => setCatColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-600 p-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* 50/30/20 Classification */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Clasificación Regla 50/30/20
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatBucket('needs')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      catBucket === 'needs'
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Necesidades (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBucket('wants')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      catBucket === 'wants'
                        ? 'bg-purple-50 dark:bg-purple-950 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Deseos (30%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatBucket('savings')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                      catBucket === 'savings'
                        ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Ahorro (20%)
                  </button>
                </div>
              </div>

              {/* Budget Limit & Alert Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Límite Mensual ({state.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={catLimit}
                    onChange={e => setCatLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-stone-400 mt-0.5 block">0 = Sin límite fijado</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Umbral de Alerta
                    </label>
                    <span className="text-xs font-bold text-amber-600">
                      {catThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={catThreshold}
                    onChange={e => setCatThreshold(e.target.value)}
                    className="w-full accent-amber-500 mt-2"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                ¿Eliminar Categoría?
              </h3>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-3">
              ¿Estás seguro de que deseas eliminar la categoría{' '}
              <strong className="text-stone-900 dark:text-stone-100">"{deletingCategory.name}"</strong>?
            </p>

            {(() => {
              const txCount = state.transactions.filter(t => t.category === deletingCategory.name).length;
              if (txCount > 0) {
                return (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 mb-4">
                    ⚠️ Hay <strong>{txCount} transacción(es)</strong> asociadas a esta categoría. Si la eliminas, las transacciones se mantendrán en el registro histórico pero la categoría dejará de estar disponible en los presupuestos y selector.
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
