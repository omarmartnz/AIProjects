import { BankAccount, FamilyMember, Transaction } from '../types';

export type DashboardWidgetCategory = 'core' | 'loans' | 'wealth' | 'analysis';

export interface DashboardWidgetMeta {
  id: string;
  title: string;
  shortDesc: string;
  category: DashboardWidgetCategory;
  categoryLabel: string;
  defaultVisible: boolean;
}

export const DASHBOARD_WIDGETS: DashboardWidgetMeta[] = [
  {
    id: 'kpi_cards',
    title: 'Tarjetas de Métricas Clave',
    shortDesc: 'Ingresos, gastos del mes, tasa de ahorro y pagos de préstamos',
    category: 'core',
    categoryLabel: 'Métricas Principales',
    defaultVisible: true,
  },
  {
    id: 'loans_overview',
    title: 'Monitor de Préstamos e Hipotecas',
    shortDesc: 'Consolidado de deudas bancarias, cuotas mensuales, tasas y desglose por titular',
    category: 'loans',
    categoryLabel: 'Préstamos y Deuda',
    defaultVisible: true,
  },
  {
    id: 'net_worth',
    title: 'Patrimonio Neto Familiar',
    shortDesc: 'Balance general de activos líquidos vs pasivos totales y ratio de solvencia',
    category: 'wealth',
    categoryLabel: 'Patrimonio y Salud Financiera',
    defaultVisible: true,
  },
  {
    id: 'historical_evolution',
    title: 'Evolución Semestral',
    shortDesc: 'Tendencia histórica mensual de ingresos, gastos y ahorro de los últimos 6 meses',
    category: 'analysis',
    categoryLabel: 'Análisis Histórico',
    defaultVisible: true,
  },
  {
    id: 'category_distribution',
    title: 'Distribución por Categorías',
    shortDesc: 'Gráfico circular de desglose de gastos y lista de principales rubros',
    category: 'core',
    categoryLabel: 'Métricas Principales',
    defaultVisible: true,
  },
  {
    id: 'daily_pace',
    title: 'Ritmo de Gasto Diario Acumulado',
    shortDesc: 'Velocidad de desembolsos en el mes frente al tope presupuestario diario',
    category: 'analysis',
    categoryLabel: 'Análisis Histórico',
    defaultVisible: true,
  },
  {
    id: 'rule_503020',
    title: 'Estructura 50/30/20 (Ideal vs Real)',
    shortDesc: 'Comparativa de necesidades (50%), deseos (30%) y ahorro/metas (20%)',
    category: 'wealth',
    categoryLabel: 'Patrimonio y Salud Financiera',
    defaultVisible: true,
  },
  {
    id: 'ant_expenses',
    title: 'Fugas de Dinero y Gastos Hormiga',
    shortDesc: 'Detección de microgastos y compras frecuentes de bajo importe con proyección anual',
    category: 'analysis',
    categoryLabel: 'Análisis Histórico',
    defaultVisible: true,
  },
  {
    id: 'member_expenses',
    title: 'Aportes y Gastos por Miembro',
    shortDesc: 'Ingresos generados y gastos realizados comparados por cada miembro del hogar',
    category: 'core',
    categoryLabel: 'Métricas Principales',
    defaultVisible: true,
  },
  {
    id: 'member_equity',
    title: 'Balance y Equidad Familiar',
    shortDesc: 'Aporte neto por integrante (ingreso aportado menos gasto consumido)',
    category: 'wealth',
    categoryLabel: 'Patrimonio y Salud Financiera',
    defaultVisible: true,
  },
  {
    id: 'quick_access',
    title: 'Accesos Directos y Rutas Rápidas',
    shortDesc: 'Tarjetas de enlace a Presupuestos, Movimientos, Flujo de Caja y Plan de Deudas',
    category: 'core',
    categoryLabel: 'Métricas Principales',
    defaultVisible: true,
  },
];

export const DASHBOARD_STORAGE_KEY = 'family_finances_dashboard_widgets_v1';
export const DASHBOARD_ORDER_STORAGE_KEY = 'family_finances_dashboard_widgets_order_v1';

export function getDefaultWidgetOrder(): string[] {
  return DASHBOARD_WIDGETS.map(w => w.id);
}

export function loadSavedWidgetOrder(): string[] {
  const defaults = getDefaultWidgetOrder();
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_ORDER_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    
    // Validate IDs
    const validSet = new Set(defaults);
    const savedOrdered = parsed.filter(id => validSet.has(id));
    // Append any widgets from defaults that were not in saved order
    const missing = defaults.filter(id => !savedOrdered.includes(id));
    return [...savedOrdered, ...missing];
  } catch (e) {
    console.warn('Could not read dashboard widget order from localStorage:', e);
    return defaults;
  }
}

export function saveWidgetOrder(order: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DASHBOARD_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (e) {
    console.warn('Could not save dashboard widget order to localStorage:', e);
  }
}

export function getDefaultWidgetVisibility(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  DASHBOARD_WIDGETS.forEach(w => {
    map[w.id] = w.defaultVisible;
  });
  return map;
}

export function loadSavedWidgetVisibility(): Record<string, boolean> {
  const defaults = getDefaultWidgetVisibility();
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Ensure all defined widgets exist in the object
    const result: Record<string, boolean> = { ...defaults };
    Object.keys(parsed).forEach(key => {
      if (typeof parsed[key] === 'boolean') {
        result[key] = parsed[key];
      }
    });
    return result;
  } catch (e) {
    console.warn('Could not read dashboard widgets from localStorage:', e);
    return defaults;
  }
}

export function saveWidgetVisibility(visibility: Record<string, boolean>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(visibility));
  } catch (e) {
    console.warn('Could not save dashboard widgets to localStorage:', e);
  }
}
