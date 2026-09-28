import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  PieChart,
  ShieldCheck,
  PiggyBank,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  Baby,
  CalendarClock,
  FileDown,
  Tags,
  Landmark,
  Smartphone,
  Play,
  Pause,
  Shuffle,
  RotateCcw,
  Receipt,
  Flame,
  Snowflake,
  Coins,
  Zap,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';

export interface FamilyFinancialTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onOpenRuleTab?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenPdfModal?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenKnowledgeCenter?: () => void;
}

export interface TipSlide {
  id: string;
  badge: string;
  badgeColor: string;
  typeBadge: 'Consejo Familiar' | 'Tip de la App';
  typeBadgeColor: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  lightBg: string;
  darkBg: string;
  points: {
    title: string;
    description: string;
  }[];
  appRecommendation: string;
  actionLabel?: string;
  actionTab?: string;
}

export const ALL_TIPS_SLIDES: TipSlide[] = [
  // --- 10 CONSEJOS FINANCIEROS FAMILIARES ---
  {
    id: 'rule503020',
    badge: 'Presupuesto Saludable',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    title: 'La Regla de Oro 50/30/20 para el Hogar',
    subtitle: 'La fórmula más simple y eficaz para evitar deudas y planificar en armonía',
    icon: PieChart,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    points: [
      {
        title: '50% Necesidades Básicas',
        description: 'Vivienda (alquiler/hipoteca), alimentación esencial, servicios básicos (agua, luz, internet), transporte y seguros de salud.',
      },
      {
        title: '30% Calidad de Vida & Deseos',
        description: 'Salidas en familia, actividades recreativas, cine, hobbies compartidos y compras personales acordadas.',
      },
      {
        title: '20% Ahorro e Inversión',
        description: 'Construcción del fondo de emergencia, metas de ahorro a mediano plazo o liquidación anticipada de deudas.',
      },
    ],
    appRecommendation: 'Puedes monitorear este balance en tiempo real en la pestaña "Regla 50/30/20" de tu panel.',
    actionLabel: 'Ver Regla 50/30/20',
    actionTab: 'rule503020',
  },
  {
    id: 'emergencyFund',
    badge: 'Seguridad & Tranquilidad',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    title: 'Fondo de Emergencia: El Escudo Protector',
    subtitle: 'Protege a tu familia de imprevistos sin recurrir a préstamos ni tarjetas de crédito',
    icon: ShieldCheck,
    accentColor: 'text-blue-600 dark:text-blue-400',
    lightBg: 'bg-blue-50/50',
    darkBg: 'dark:bg-blue-950/20',
    points: [
      {
        title: 'Objetivo: 3 a 6 Meses de Gastos Fijos',
        description: 'Calcula cuánto necesita tu hogar estrictamente para vivir un mes (tu 50% de necesidades) y multiplícalo por 3 a 6.',
      },
      {
        title: 'Totalmente Líquido e Intocable',
        description: 'Este dinero no es para vacaciones ni rebajas. Debe estar disponible en una cuenta separada ante emergencias médicas o averías.',
      },
      {
        title: 'Paz Mental para la Pareja',
        description: 'Tener este colchón financiero reduce el 80% de las discusiones por incertidumbre económica en casa.',
      },
    ],
    appRecommendation: 'Crea una meta específica llamada "Fondo de Emergencia" en la pestaña "Metas de Ahorro" y haz aportes periódicos.',
    actionLabel: 'Crear Meta de Ahorro',
    actionTab: 'goals',
  },
  {
    id: 'payYourselfFirst',
    badge: 'Estrategia de Crecimiento',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    title: '«Págate a Ti Primero»: El Hábito del Ahorro Real',
    subtitle: 'No ahorres lo que te sobra; gasta solo lo que queda tras separar el ahorro',
    icon: PiggyBank,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    lightBg: 'bg-indigo-50/50',
    darkBg: 'dark:bg-indigo-950/20',
    points: [
      {
        title: 'El Error del Fin de Mes',
        description: 'Si esperas a final de mes para guardar "lo que sobre", casi nunca quedará nada debido a gastos cotidianos imprevistos.',
      },
      {
        title: 'Transferencia el Día 1',
        description: 'En cuanto ingresa el sueldo o nómina, aparta inmediatamente el porcentaje acordado destinado al ahorro familiar.',
      },
      {
        title: 'El Efecto Adaptativo',
        description: 'La familia se adapta naturalmente al saldo disponible restante, logrando ahorrar mes a mes sin sentir privaciones.',
      },
    ],
    appRecommendation: 'Programa en tus Gastos Fijos una partida de "Ahorro Automático" como si fuera una factura innegociable.',
    actionLabel: 'Ver Gastos Recurrentes',
    actionTab: 'recurring',
  },
  {
    id: 'coupleTransparency',
    badge: 'Armonía en Pareja',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    title: 'Finanzas en Pareja con Transparencia Total',
    subtitle: 'El dinero compartido debe ser un motor de unión y confianza, nunca de discordia',
    icon: HeartHandshake,
    accentColor: 'text-rose-600 dark:text-rose-400',
    lightBg: 'bg-rose-50/50',
    darkBg: 'dark:bg-rose-950/20',
    points: [
      {
        title: 'Cero Gastos Secretos',
        description: 'Registrar los gastos al momento permite a ambos miembros conocer la realidad sin tener que pedir explicaciones incómodas.',
      },
      {
        title: 'Presupuesto Personal Libre',
        description: 'Cada miembro puede tener un pequeño cupo mensual para gustos individuales sin necesidad de justificar cada gasto.',
      },
      {
        title: 'Cita Financiera Mensual de 15 Minutos',
        description: 'Elegid un día fijo al mes para revisar juntos los gráficos de la app, celebrar progresos y ajustar presupuestos.',
      },
    ],
    appRecommendation: 'Invita a tu pareja desde "Mi Familia" mediante un enlace seguro para que ambos tengan sincronización en vivo desde sus propios teléfonos.',
    actionLabel: 'Gestionar Miembros',
    actionTab: 'members',
  },
  {
    id: 'kidsEducation',
    badge: 'Educación para Hijos',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    title: 'Educación Financiera Práctica para los Hijos',
    subtitle: 'Fomenta el valor del esfuerzo, la paciencia y el ahorro inteligente desde la infancia',
    icon: GraduationCap,
    accentColor: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    points: [
      {
        title: 'El Método de los 3 Frascos',
        description: 'Enseña a tus hijos a dividir su paga o propina en: 50% para Gastos pequeños, 40% para Ahorro de metas y 10% para Compartir.',
      },
      {
        title: 'Aprender a Esperar',
        description: 'Si desean un juguete o videojuego costoso, anímalos a ahorrar una parte de su paga. Cuidarán mucho más lo que les costó conseguir.',
      },
      {
        title: 'Asignaciones Vinculadas a Hábitos',
        description: 'Las responsabilidades básicas del hogar no se pagan, pero puedes premiar iniciativas especiales o hábitos destacados.',
      },
    ],
    appRecommendation: 'Usa la pestaña "Asignaciones Hijos" en esta aplicación para registrar sus saldos y metas educativas de forma visual.',
    actionLabel: 'Ver Asignaciones Hijos',
    actionTab: 'allowances',
  },
  {
    id: 'antExpenses',
    badge: 'Optimización de Gastos',
    badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
    title: 'Control de «Gastos Hormiga» y Fugas Invisibles',
    subtitle: 'Pequeñas fugas diarias de 5€ que acumulan más de 1.800€ al año sin que lo notes',
    icon: Sparkles,
    accentColor: 'text-violet-600 dark:text-violet-400',
    lightBg: 'bg-violet-50/50',
    darkBg: 'dark:bg-violet-950/20',
    points: [
      {
        title: 'La Suma Invisible',
        description: 'Cafés fuera de casa, golosinas, botellas de agua o suscripciones que nadie usa drenan tu presupuesto silenciosamente.',
      },
      {
        title: 'Auditoría Trimestral de Suscripciones',
        description: 'Revisa cada 3 meses plataformas de streaming, membresías de gimnasio o apps. Cancela de inmediato las que no uses.',
      },
      {
        title: 'Regla de las 48 Horas para Compras',
        description: 'Antes de realizar una compra no esencial importante, espera 48 horas. El 60% del impulso desaparece al enfriarse.',
      },
    ],
    appRecommendation: 'Revisa las categorías en la pestaña "Presupuestos" para fijar límites máximos y recibir alertas tempranas.',
    actionLabel: 'Ver Presupuestos',
    actionTab: 'budgets',
  },
  {
    id: 'debtAvalancheVsSnowball',
    badge: 'Estrategia de Deuda',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    title: 'Avalancha vs. Bola de Nieve: La Ciencia del Desendeudamiento',
    subtitle: 'Elige entre el máximo ahorro en intereses o victorias psicológicas inmediatas',
    icon: Flame,
    accentColor: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    points: [
      {
        title: 'Método Avalancha (Mayor Tasa APR)',
        description: 'Prioriza liquidar primero la tarjeta o préstamo con la tasa de interés más alta. Matemáticamente es el método que más dinero te ahorra.',
      },
      {
        title: 'Método Bola de Nieve (Menor Saldo)',
        description: 'Liquida primero la cuenta con el balance más pequeño, sin importar la tasa. Te brinda victorias anímicas rápidas para mantener la constancia.',
      },
      {
        title: 'El Poder del Efecto Rollover',
        description: 'Al terminar la primera deuda, jamás gastes esa cuota: súmala íntegra a la cuota de la deuda siguiente para una amortización acelerada.',
      },
    ],
    appRecommendation: 'Simula ambos métodos frente a frente y ajusta tu acelerador mensual en la pestaña "Plan de Deudas".',
    actionLabel: 'Ver Plan de Deudas',
    actionTab: 'debts',
  },
  {
    id: 'minimumPaymentTrap',
    badge: 'Alerta Bancaria',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    title: 'La Trampa del Pago Mínimo en Tarjetas',
    subtitle: 'Pagar solo el mínimo bancario puede multiplicar tu deuda por 3 y tardar 15 años',
    icon: AlertCircle,
    accentColor: 'text-rose-600 dark:text-rose-400',
    lightBg: 'bg-rose-50/50',
    darkBg: 'dark:bg-rose-950/20',
    points: [
      {
        title: 'Solo Amortiza una Fracción Mínima',
        description: 'El pago mínimo de las tarjetas está diseñado para cubrir comisiones e intereses corrientes, amortizando apenas un 1% o 2% del capital real.',
      },
      {
        title: 'Interés Compuesto en tu Contra',
        description: 'El saldo restante continúa generando intereses cada día, prolongando el compromiso durante décadas de pagos interminables.',
      },
      {
        title: 'Regla: Mínimo + Aporte Extra Fijo',
        description: 'Paga siempre aunque sea RD$20, RD$50 o RD$100 por encima del mínimo bancario; cada peso extra va 100% directo a descontar capital.',
      },
    ],
    appRecommendation: 'Usa el control deslizante de "Acelerador Mensual" en el Plan de Deudas para calcular cuánto tiempo y dinero ahorras.',
    actionLabel: 'Simular Acelerador de Deudas',
    actionTab: 'debts',
  },
  {
    id: 'cashFlowMastery',
    badge: 'Tesorería & Liquidez',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    title: 'Flujo de Caja: El Oxígeno de la Economía del Hogar',
    subtitle: 'Tener dinero presupuestado no es suficiente: necesitas liquidez en la fecha exacta',
    icon: TrendingUp,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    points: [
      {
        title: 'El Desfase Temporal del Dinero',
        description: 'Si tus facturas o cuotas bancarias vencen los días 5 y tu sueldo entra el 15, puedes sufrir descubiertos aunque a fin de mes tus cuentas cuadren.',
      },
      {
        title: 'Anticipar Meses Deficitarios',
        description: 'El flujo de caja te avisa 2 o 3 meses antes si un mes futuro requerirá más efectivo del que ingresa (ej. seguros anuales o regreso a clases).',
      },
      {
        title: 'Piso de Seguridad Intocable',
        description: 'Define un saldo bancario mínimo que nunca debes tocar para que tu cuenta corriente jamás caiga en cargos por sobregiro.',
      },
    ],
    appRecommendation: 'Consulta tu saldo proyectado acumulado a 3, 6 y 12 meses en la nueva pestaña "Flujo de Caja".',
    actionLabel: 'Ver Flujo de Caja',
    actionTab: 'cashflow',
  },
  {
    id: 'smartGroceries',
    badge: 'Consumo Inteligente',
    badgeColor: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300 border-lime-200 dark:border-lime-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20',
    title: 'Menú Semanal y Compras Inteligentes en el Súper',
    subtitle: 'Ahorra entre un 20% y 35% en alimentación sin sacrificar nutrición ni variedad',
    icon: Receipt,
    accentColor: 'text-lime-600 dark:text-lime-400',
    lightBg: 'bg-lime-50/50',
    darkBg: 'dark:bg-lime-950/20',
    points: [
      {
        title: 'Planifica Antes de Salir de Casa',
        description: 'Diseña el menú familiar semanal, revisa despensa y refrigerador, y elabora una lista estricta de compras cerradas.',
      },
      {
        title: 'Cero Compras con Hambre',
        description: 'Ir al supermercado con apetito o sin lista incrementa las compras impulsivas y ultraprocesados hasta un 45%.',
      },
      {
        title: 'Productos de Temporada y Descuentos',
        description: 'Aprovecha vegetales y frutas de temporada local, y compara precios por kilo o litro en lugar de empaques llamativos.',
      },
    ],
    appRecommendation: 'Asigna un tope mensual a "Supermercado & Alimentación" y consulta tu margen disponible antes de ir de compras.',
    actionLabel: 'Ver Presupuestos',
    actionTab: 'budgets',
  },
  {
    id: 'sharedGoals',
    badge: 'Sueños en Familia',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    title: 'Metas con Propósito: El Ahorro que Une y Emociona',
    subtitle: 'Ahorrar sin objetivo se siente como privación; ahorrar para un sueño compartido une al hogar',
    icon: Target,
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    lightBg: 'bg-cyan-50/50',
    darkBg: 'dark:bg-cyan-950/20',
    points: [
      {
        title: 'Nombre Tangible y Específico',
        description: 'En lugar de "ahorrar en general", asignad nombres claros: "Vacaciones en la Playa", "Renovación del Hogar" o "Coche Familiar".',
      },
      {
        title: 'Fecha Objetivo y Cuota Mensual',
        description: 'Dividir el monto total entre los meses restantes genera una cuota mensual alcanzable que todos pueden apoyar.',
      },
      {
        title: 'Celebren los Hitos Intermedios',
        description: 'Festejad en familia al alcanzar el 25%, 50% y 75% del camino para renovar la energía y el compromiso.',
      },
    ],
    appRecommendation: 'Crea metas visuales con fecha límite y barra de progreso en la pestaña "Metas de Ahorro".',
    actionLabel: 'Ver Metas de Ahorro',
    actionTab: 'goals',
  },
  {
    id: 'annualSinkingFunds',
    badge: 'Previsión sin Sobresaltos',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    typeBadge: 'Consejo Familiar',
    typeBadgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    title: 'Fondo de Provisión para Gastos Anuales',
    subtitle: 'Seguros, matrículas y fiestas no son sorpresas imprevistas: planifícalos mes a mes',
    icon: Clock,
    accentColor: 'text-orange-600 dark:text-orange-400',
    lightBg: 'bg-orange-50/50',
    darkBg: 'dark:bg-orange-950/20',
    points: [
      {
        title: 'Los Gastos que Llegan Cada Año',
        description: 'Seguros médicos o de vehículo, colegiaturas escolares, impuestos anuales y regalos navideños son fechas conocidas.',
      },
      {
        title: 'La Regla de Dividir entre 12',
        description: 'Calcula el total de estos compromisos del año, divide entre 12 y aparta esa fracción fija cada mes.',
      },
      {
        title: 'Meses sin Resaca Financiera',
        description: 'Cuando llegue el mes del pago, el dinero ya estará esperando en la cuenta sin necesidad de endeudarse ni recortar la comida.',
      },
    ],
    appRecommendation: 'Registra estos compromisos anuales en "Gastos Recurrentes" o crea metas específicas para cada seguro.',
    actionLabel: 'Ver Gastos Recurrentes',
    actionTab: 'recurring',
  },

  // --- 10 TIPS Y TRUCOS DE LA APLICACIÓN ---
  {
    id: 'appLiveSync',
    badge: 'Tip de la App',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    title: 'Sincronización en Vivo para Toda la Familia',
    subtitle: 'Tu hogar financiero conectado en tiempo real entre múltiples dispositivos',
    icon: Users,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    points: [
      {
        title: 'Código Único de Familia',
        description: 'Comparte tu código de 6 caracteres con tu pareja o familiares para que se unan al mismo espacio desde sus propios teléfonos.',
      },
      {
        title: 'Actualización Instantánea',
        description: 'Cuando tu pareja registra una compra en el supermercado, el balance y los gráficos se actualizan al instante en tu pantalla.',
      },
      {
        title: 'Respaldo Cloud Seguro',
        description: 'Todos los datos quedan respaldados de forma continua en la nube de Google Firestore con alta disponibilidad.',
      },
    ],
    appRecommendation: 'Ve a la pestaña "Miembros" o pulsa en el nombre de tu hogar en el menú superior para invitar a tu familia.',
    actionLabel: 'Ver Miembros del Hogar',
    actionTab: 'members',
  },
  {
    id: 'appAllowances',
    badge: 'Tip de la App',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    title: 'Mesadas y Tareas Educativas para Hijos',
    subtitle: 'Transforma las finanzas familiares en una experiencia formativa e interactiva',
    icon: Baby,
    accentColor: 'text-purple-600 dark:text-purple-400',
    lightBg: 'bg-purple-50/50',
    darkBg: 'dark:bg-purple-950/20',
    points: [
      {
        title: 'Mesadas Automáticas o Periódicas',
        description: 'Define mesadas fijas semanales o mensuales para cada hijo miembro del hogar.',
      },
      {
        title: 'Lista de Tareas con Recompensa',
        description: 'Asigna tareas del hogar (ordenar habitación, buenas notas) con montos asociados para fomentar la cultura del esfuerzo.',
      },
      {
        title: 'Pagos con un Clic y Registro Visual',
        description: 'Marca tareas completadas y abona el saldo con un solo toque, manteniendo un historial claro para los hijos.',
      },
    ],
    appRecommendation: 'Accede a la pestaña "Asignaciones Hijos" en la barra de navegación para configurar las mesadas de tus hijos.',
    actionLabel: 'Ir a Asignaciones',
    actionTab: 'allowances',
  },
  {
    id: 'appRecurring',
    badge: 'Tip de la App',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    title: 'Automatización de Gastos Recurrentes',
    subtitle: 'Centraliza facturas, colegiaturas y suscripciones con recordatorios de pago',
    icon: CalendarClock,
    accentColor: 'text-blue-600 dark:text-blue-400',
    lightBg: 'bg-blue-50/50',
    darkBg: 'dark:bg-blue-950/20',
    points: [
      {
        title: 'Calendario de Vencimientos',
        description: 'Registra tus servicios fijos (luz, agua, internet, alquiler) y observa de un vistazo qué pagos vencen en los próximos días.',
      },
      {
        title: 'Botón «Pagar Ahora»',
        description: 'Al realizar el pago de una factura, pulsa "Pagar ahora" para generar la transacción automáticamente sin reescribir datos.',
      },
      {
        title: 'Monitoreo de Frecuencia',
        description: 'Soporta pagos semanales, quincenales, mensuales o anuales para adaptarse a cualquier tipo de compromiso.',
      },
    ],
    appRecommendation: 'Configura tus compromisos periódicos en la pestaña "Gastos Recurrentes" para no volver a pagar recargos.',
    actionLabel: 'Ver Gastos Recurrentes',
    actionTab: 'recurring',
  },
  {
    id: 'appAlerts',
    badge: 'Tip de la App',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    title: 'Alertas Inteligentes de Presupuesto (80% y 100%)',
    subtitle: 'Avisos preventivos en tiempo real antes de que tu presupuesto mensual se agote',
    icon: AlertCircle,
    accentColor: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    points: [
      {
        title: 'Alerta Preventiva Ámbar al 80%',
        description: 'Cuando una categoría alcanza el 80% de su límite asignado, la campana superior muestra un aviso para desacelerar gastos.',
      },
      {
        title: 'Alerta Crítica Roja al 100%',
        description: 'Si una categoría excede su límite, aparece un banner destacado en la parte superior para alertar a toda la familia.',
      },
      {
        title: 'Menú Desplegable con Acceso Directo',
        description: 'Haz clic en la campana de notificaciones para ver exactamente qué categorías requieren atención inmediata.',
      },
    ],
    appRecommendation: 'Define los límites de tus categorías en "Presupuestos" para activar la vigilancia automática de la app.',
    actionLabel: 'Ver Presupuestos',
    actionTab: 'budgets',
  },
  {
    id: 'appPdfExport',
    badge: 'Tip de la App',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    title: 'Reportes Ejecutivos en PDF y Excel',
    subtitle: 'Genera informes profesionales completos para revisiones familiares o contabilidad',
    icon: FileDown,
    accentColor: 'text-rose-600 dark:text-rose-400',
    lightBg: 'bg-rose-50/50',
    darkBg: 'dark:bg-rose-950/20',
    points: [
      {
        title: 'PDF Ejecutivo de Alta Calidad',
        description: 'Descarga un balance mensual maquetado con gráficos circulares, desglose por miembro y análisis de la regla 50/30/20.',
      },
      {
        title: 'Exportación a Excel y CSV',
        description: 'Exporta todas tus transacciones con fechas, categorías, cuentas y notas para análisis avanzados en hojas de cálculo.',
      },
      {
        title: 'Copias de Seguridad Portátiles',
        description: 'Genera un archivo JSON cifrado con todo el historial de tu hogar para restaurarlo en cualquier momento.',
      },
    ],
    appRecommendation: 'Haz clic en el icono de exportación en la barra superior para generar tu informe mensual con un solo clic.',
    actionLabel: 'Abrir Exportador',
    actionTab: 'pdf',
  },
  {
    id: 'appSecurity',
    badge: 'Tip de la App',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    title: 'Cifrado E2EE: Tu Privacidad es Sagrada',
    subtitle: 'Tus transacciones y saldos están protegidos bajo estándares de seguridad militar',
    icon: ShieldCheck,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    lightBg: 'bg-indigo-50/50',
    darkBg: 'dark:bg-indigo-950/20',
    points: [
      {
        title: 'Cifrado Militar AES-GCM 256-bit',
        description: 'Tus registros financieros se cifran de forma que nadie ajeno a tu familia puede descifrar o inspeccionar tus cuentas.',
      },
      {
        title: 'Frase de Paso Maestra',
        description: 'Puedes configurar una contraseña de cifrado personalizada en el menú de seguridad para soberanía total de datos.',
      },
      {
        title: 'Aislamiento Estricto por Hogar',
        description: 'Cada familia opera en una bóveda virtual separada y protegida con reglas de seguridad estrictas en Firestore.',
      },
    ],
    appRecommendation: 'Accede al menú de seguridad pulsando el icono de candado o engranaje en la barra superior.',
    actionLabel: 'Ajustes de Seguridad',
    actionTab: 'security',
  },
  {
    id: 'appTags',
    badge: 'Tip de la App',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/20',
    title: 'Etiquetas (Tags) para Eventos Especiales',
    subtitle: 'Agrupa gastos de proyectos como #Vacaciones, #Boda o #Navidad entre distintas categorías',
    icon: Tags,
    accentColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    lightBg: 'bg-fuchsia-50/50',
    darkBg: 'dark:bg-fuchsia-950/20',
    points: [
      {
        title: 'Seguimiento por Proyecto',
        description: 'Añade tags como #Viaje2026 o #Remodelacion a cualquier gasto de comida, transporte o compras.',
      },
      {
        title: 'Filtro Inmediato por Etiqueta',
        description: 'En la lista de transacciones, filtra por un tag específico para saber el costo global exacto de ese evento.',
      },
      {
        title: 'Categorías Siempre Ordenadas',
        description: 'Tus categorías principales se mantienen limpias mientras las etiquetas te dan el contexto específico del gasto.',
      },
    ],
    appRecommendation: 'Gestiona tus etiquetas personalizadas y consulta sus acumulados en la pestaña "Etiquetas".',
    actionLabel: 'Ver Etiquetas',
    actionTab: 'tags',
  },
  {
    id: 'appBanks',
    badge: 'Tip de la App',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    title: 'Cuentas Bancarias y Tarjetas del Hogar',
    subtitle: 'Lleva el balance exacto y la conciliación de cada una de tus cuentas y tarjetas de crédito',
    icon: Landmark,
    accentColor: 'text-sky-600 dark:text-sky-400',
    lightBg: 'bg-sky-50/50',
    darkBg: 'dark:bg-sky-950/20',
    points: [
      {
        title: 'Todas tus Entidades en un Solo Lugar',
        description: 'Registra cuentas corrientes, de ahorros, efectivo y tarjetas de crédito con su límite y saldo real disponible.',
      },
      {
        title: 'Conciliación Automática',
        description: 'Al registrar un ingreso o gasto, asigna la cuenta correspondiente para que el saldo bancario se descuente al instante.',
      },
      {
        title: 'Soporte para Bancos Locales',
        description: 'Incluye bancos dominicanos e internacionales con sus logotipos y colores distintivos para fácil reconocimiento.',
      },
    ],
    appRecommendation: 'Administra tus cuentas financieras familiares en la pestaña "Bancos" del menú principal.',
    actionLabel: 'Ver Cuentas Bancarias',
    actionTab: 'banks',
  },
  {
    id: 'appPWA',
    badge: 'Tip de la App',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    title: 'Instala la App en la Pantalla de Inicio (PWA)',
    subtitle: 'Acceso directo como app nativa y funcionamiento offline garantizado',
    icon: Smartphone,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    points: [
      {
        title: 'Experiencia Nativa a Pantalla Completa',
        description: 'Instala Finanzas Familiares en iOS o Android sin tiendas de apps; ábrela desde tu pantalla de inicio con su icono dedicado.',
      },
      {
        title: 'Registro Offline sin Cobertura',
        description: '¿Sin señal en el supermercado? Puedes anotar tus compras sin conexión; se sincronizarán al recuperar la red.',
      },
      {
        title: 'Rendimiento Ultra Rápido',
        description: 'Caché inteligente local que permite iniciar la aplicación en milisegundos incluso con conexiones lentas.',
      },
    ],
    appRecommendation: 'Pulsa el botón "Instalar App" en la barra superior o usa "Agregar a Inicio" en el navegador de tu móvil.',
    actionLabel: 'Ir al Panel',
    actionTab: 'dashboard',
  },
  {
    id: 'appShortcuts',
    badge: 'Tip de la App',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    title: 'Atajos Rápidos y Modo Oscuro Protector',
    subtitle: 'Optimiza tu velocidad de registro y cuida tu descanso visual durante la noche',
    icon: Lightbulb,
    accentColor: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    points: [
      {
        title: 'Navegación con Teclado',
        description: 'Usa las flechas ← y → para navegar entre estos consejos y la tecla Escape para cerrar cualquier ventana emergente.',
      },
      {
        title: 'Modo Oscuro Integrado',
        description: 'Alterna entre tema claro y oscuro con el botón de sol/luna en el encabezado superior para un contraste óptimo.',
      },
      {
        title: 'Filtros con un Solo Clic',
        description: 'Haz clic en cualquier categoría de los gráficos del panel para filtrar automáticamente sus transacciones.',
      },
    ],
    appRecommendation: 'Explora los atajos interactivos en el panel de control para gestionar tus cuentas con agilidad.',
    actionLabel: 'Ir al Panel',
    actionTab: 'dashboard',
  },
  {
    id: 'cashFlowHorizons',
    badge: 'Tip de la App',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    title: 'Pronósticos a 3, 6 y 12 Meses en Flujo de Caja',
    subtitle: 'Simula escenarios optimistas, prudentes y analiza tu saldo acumulado futuro',
    icon: TrendingUp,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'dark:bg-emerald-950/20',
    points: [
      {
        title: 'Alterna Horizontes Temporales',
        description: 'Usa el selector de 3 meses para el día a día operativo, 6 meses para proyectos medianos o 12 meses para visión anual.',
      },
      {
        title: 'Eventos Programados Extraordinarios',
        description: 'Agrega ingresos o gastos únicos futuros (bonos, vacaciones, renovaciones) para ver su impacto directo en la gráfica.',
      },
      {
        title: 'Simulador de Escenarios de Estrés',
        description: 'Prueba el escenario "Cauteloso" para comprobar si tu tesorería resiste un alza en costos de vida sin caer en números rojos.',
      },
    ],
    appRecommendation: 'Visita la pestaña "Flujo de Caja" para proyectar la liquidez bancaria de tu hogar.',
    actionLabel: 'Abrir Flujo de Caja',
    actionTab: 'cashflow',
  },
  {
    id: 'appDebtSimulator',
    badge: 'Tip de la App',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    typeBadge: 'Tip de la App',
    typeBadgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    title: 'Simulador y Estrategias del Plan de Deudas',
    subtitle: 'Calcula tu fecha de libertad financiera con amortización acelerada interactiva',
    icon: Flame,
    accentColor: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50/50',
    darkBg: 'dark:bg-amber-950/20',
    points: [
      {
        title: 'Condiciones Financieras en Cuentas',
        description: 'Al vincular o editar tarjetas y préstamos en Cuentas Bancarias, define la tasa de interés anual (APR) y la cuota mínima mensual.',
      },
      {
        title: 'Comparador Frente a Frente',
        description: 'Alterna entre el Método Avalancha y Bola de Nieve para ver qué método te ahorra más dinero o te da la primera victoria antes.',
      },
      {
        title: 'Acelerador Mensual Interactivo',
        description: 'Mueve el control deslizante para descubrir cómo un pequeño aporte adicional mensual puede recortar años de deudas bancarias.',
      },
    ],
    appRecommendation: 'Explora la pestaña "Plan de Deudas" para trazar tu ruta personalizada libre de pasivos.',
    actionLabel: 'Ir al Plan de Deudas',
    actionTab: 'debts',
  },
];

// Helper: Pick 6 distinct items at random from the pool
export function pickRandomTips(pool: TipSlide[], count = 6): TipSlide[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, pool.length));
}

const AUTO_ADVANCE_SECONDS = 6;

export const FamilyFinancialTipsModal: React.FC<FamilyFinancialTipsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onOpenRuleTab,
  onNavigateTab,
  onOpenPdfModal,
  onOpenSecurityModal,
  onOpenKnowledgeCenter,
}) => {
  // Pool of 6 randomly chosen tips for this session
  const [activeTips, setActiveTips] = useState<TipSlide[]>(() => pickRandomTips(ALL_TIPS_SLIDES, 6));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Auto-play state & hover pause
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Storage key based on user ID or global
  const storageKey = `family_finances_hide_tips_${userId || 'default'}`;

  // When modal opens, pick 6 fresh random tips and reset index
  useEffect(() => {
    if (isOpen) {
      setActiveTips(pickRandomTips(ALL_TIPS_SLIDES, 6));
      setCurrentSlideIndex(0);
      setIsHovered(false);
      try {
        const stored = localStorage.getItem(storageKey);
        setDontShowAgain(stored === 'true');
      } catch (_) {}
    }
  }, [isOpen, storageKey]);

  // Next slide with continuous loop
  const nextSlide = useCallback(() => {
    setActiveTips((tips) => {
      if (tips.length === 0) return tips;
      setCurrentSlideIndex((prev) => (prev + 1) % tips.length);
      return tips;
    });
  }, []);

  // Previous slide with continuous loop
  const prevSlide = useCallback(() => {
    setActiveTips((tips) => {
      if (tips.length === 0) return tips;
      setCurrentSlideIndex((prev) => (prev - 1 + tips.length) % tips.length);
      return tips;
    });
  }, []);

  // Shuffle to get 6 new random tips on demand
  const handleReshuffle = () => {
    setActiveTips(pickRandomTips(ALL_TIPS_SLIDES, 6));
    setCurrentSlideIndex(0);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, prevSlide]);

  // Auto-advance interval that loops continuously, pausing when hovered or toggled off
  useEffect(() => {
    if (!isOpen || !isAutoPlayEnabled || isHovered || activeTips.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeTips.length);
    }, AUTO_ADVANCE_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [isOpen, isAutoPlayEnabled, isHovered, activeTips.length, currentSlideIndex]);

  if (!isOpen) return null;

  const currentSlide = activeTips[currentSlideIndex] || activeTips[0] || ALL_TIPS_SLIDES[0];

  const handleCheckboxChange = (checked: boolean) => {
    setDontShowAgain(checked);
    try {
      if (checked) {
        localStorage.setItem(storageKey, 'true');
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (_) {}
  };

  const handleClose = () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem(storageKey, 'true');
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (_) {}
    onClose();
  };

  const handleActionClick = () => {
    handleClose();
    if (currentSlide.actionTab === 'pdf' && onOpenPdfModal) {
      onOpenPdfModal();
    } else if (currentSlide.actionTab === 'security' && onOpenSecurityModal) {
      onOpenSecurityModal();
    } else if (currentSlide.actionTab === 'rule503020' && onOpenRuleTab) {
      onOpenRuleTab();
    } else if (currentSlide.actionTab && onNavigateTab) {
      onNavigateTab(currentSlide.actionTab);
    } else if (onOpenRuleTab) {
      onOpenRuleTab();
    }
  };

  const IconComponent = currentSlide.icon;
  const isAutoAdvancing = isAutoPlayEnabled && !isHovered;

  return (
    <div
      id="family-tips-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        id="family-tips-modal-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-950/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                  Consejos & Tips Financieros
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 whitespace-nowrap">
                  6 elegidos al azar
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Economía del hogar y trucos de la aplicación en bucle continuo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón Centro de Conocimiento / Guías de Módulos */}
            {onOpenKnowledgeCenter && (
              <button
                id="tips-open-knowledge-center-button"
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenKnowledgeCenter();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/70 transition shadow-2xs"
                title="Abrir el Centro de Conocimiento con guías paso a paso de cada módulo"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline whitespace-nowrap">Centro de Conocimiento</span>
                <span className="sm:hidden whitespace-nowrap">Guías</span>
              </button>
            )}

            {/* Reshuffle 6 Tips button */}
            <button
              id="reshuffle-tips-button"
              type="button"
              onClick={handleReshuffle}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent hover:border-stone-200 dark:hover:border-stone-700 transition"
              title="Elegir otros 6 consejos al azar de los 20 disponibles"
            >
              <Shuffle className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span className="hidden md:inline whitespace-nowrap">Otros 6</span>
            </button>

            {/* Play/Pause Auto-advance button */}
            <button
              id="toggle-autoplay-button"
              type="button"
              onClick={() => setIsAutoPlayEnabled((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition ${
                isAutoPlayEnabled
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}
              title={
                isAutoPlayEnabled
                  ? isHovered
                    ? 'Avance automático pausado (cursor sobre el popup)'
                    : 'Pausar avance automático (cambia cada 6s en bucle)'
                  : 'Activar avance automático en bucle'
              }
            >
              {isAutoPlayEnabled ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Step Counter Badge */}
            <span
              id="tips-step-counter-badge"
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 whitespace-nowrap"
            >
              {currentSlideIndex + 1} de {activeTips.length}
            </span>

            {/* Close Button */}
            <button
              id="close-tips-modal-button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              title="Cerrar consejos"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auto-Advance Timer Progress Bar */}
        <div
          id="tips-timer-progress-track"
          className="h-1 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden relative"
          title={isAutoAdvancing ? 'Avanzando automáticamente al siguiente consejo...' : 'Avance en pausa'}
        >
          {isAutoAdvancing ? (
            <motion.div
              key={`${currentSlideIndex}-${currentSlide.id}-${isAutoAdvancing}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: AUTO_ADVANCE_SECONDS,
                ease: 'linear',
              }}
              className="h-full bg-emerald-500 dark:bg-emerald-400"
            />
          ) : (
            <div className="h-full w-full bg-stone-200/50 dark:bg-stone-700/50" />
          )}
        </div>

        {/* Carousel Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {/* Card Hero Banner for Current Slide */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 ${currentSlide.lightBg} ${currentSlide.darkBg} transition-colors duration-300`}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentSlide.typeBadgeColor}`}
                >
                  {currentSlide.typeBadge}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentSlide.badgeColor}`}
                >
                  <IconComponent className="w-3 h-3 shrink-0" />
                  <span>{currentSlide.badge}</span>
                </span>
              </div>

              <div className="w-9 h-9 rounded-xl bg-white dark:bg-stone-800 shadow-xs border border-stone-200/60 dark:border-stone-700 flex items-center justify-center shrink-0">
                <IconComponent className={`w-5 h-5 ${currentSlide.accentColor}`} />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-snug">
              {currentSlide.title}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Three Key Pillar Points */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Puntos Clave a Recordar
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {currentSlide.points.map((point, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-750 flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {point.title}
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App Recommendation Note with Action Button */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-snug">
                <strong className="font-semibold text-indigo-900 dark:text-indigo-100">
                  En tu aplicación:{' '}
                </strong>
                {currentSlide.appRecommendation}
              </p>
            </div>

            {currentSlide.actionLabel && (
              <button
                type="button"
                id="tip-action-button"
                onClick={handleActionClick}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
              >
                <span>{currentSlide.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer with Carousel Dots, Checkbox & Controls */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Checkbox: Don't show again */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition">
            <input
              id="dont-show-tips-again-checkbox"
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-emerald-600 focus:ring-emerald-500 dark:bg-stone-800 transition"
            />
            <span className="font-medium whitespace-nowrap">No mostrar al iniciar sesión</span>
          </label>

          {/* Carousel Navigation Controls (Infinite Loop) */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Dots Indicator */}
            <div className="flex items-center gap-1.5 px-1" title="Navegar a consejo específico">
              {activeTips.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    index === currentSlideIndex
                      ? 'w-6 bg-emerald-600 dark:bg-emerald-400'
                      : 'w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 dark:hover:bg-stone-600'
                  }`}
                  title={`Ir al consejo ${index + 1} de 6: ${slide.badge}`}
                />
              ))}
            </div>

            {/* Prev / Next Buttons in Loop */}
            <div className="flex items-center gap-1.5">
              <button
                id="prev-tip-button"
                type="button"
                onClick={prevSlide}
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 active:scale-95 transition"
                title="Consejo anterior (bucle continuo)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                id="next-tip-button"
                type="button"
                onClick={nextSlide}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition whitespace-nowrap"
                title="Siguiente consejo (repite en bucle continuo)"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                id="finish-tips-button"
                type="button"
                onClick={handleClose}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition whitespace-nowrap"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

