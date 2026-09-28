import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  HelpCircle,
  Flame,
  TrendingUp,
  Landmark,
  PieChart,
  Target,
  CalendarClock,
  Coins,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Award,
  ArrowRight,
  ShieldCheck,
  Zap,
  Search,
  BarChart3,
  Receipt,
  Users,
  FileDown,
  Lock,
  FileSpreadsheet,
  Baby,
  CreditCard,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FamilyFinancialConceptsView } from './FamilyFinancialConceptsView';

export type HelpModuleId =
  | 'concepts'
  | 'dashboard'
  | 'cashflow'
  | 'debts'
  | 'budgets'
  | 'transactions'
  | 'recurring'
  | 'goals'
  | 'rule503020'
  | 'allowances'
  | 'banks'
  | 'members'
  | 'reports'
  | 'security';

export interface ModuleHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: HelpModuleId;
  onNavigateTab?: (tab: string) => void;
  onOpenPdfModal?: () => void;
  onOpenSecurityModal?: (tab?: 'currency' | 'security' | 'family' | 'alerts') => void;
  onOpenBackupExport?: () => void;
  onOpenFamilyModal?: (tab?: 'list' | 'create' | 'join' | 'invite') => void;
}

export type HelpCategory = 'all' | 'strategy' | 'accounts' | 'family' | 'security';

export interface ModuleHelpContent {
  id: HelpModuleId;
  tabKey?: string;
  category: 'strategy' | 'accounts' | 'family' | 'security';
  name: string;
  shortName: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  themeGradient: string;
  recentChanges: string[];
  overview: {
    title: string;
    description: string;
    keyConcept: string;
  };
  howToUse: {
    stepNumber: number;
    title: string;
    description: string;
  }[];
  benefits: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
  tips: {
    title: string;
    text: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  actionType: 'navigate' | 'pdf' | 'security' | 'backup' | 'family';
  actionLabel: string;
}

export const MODULE_HELP_DATA: Record<HelpModuleId, ModuleHelpContent> = {
  concepts: {
    id: 'concepts',
    tabKey: 'dashboard',
    category: 'strategy',
    name: 'Glosario & Conceptos Financieros Familiares',
    shortName: 'Conceptos Clave',
    badge: 'Saldo Líquido & Glosario',
    icon: Lightbulb,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    themeGradient: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    recentChanges: [
      'Sección dedicada de Glosario Financiero Familiar con 15 conceptos indispensables.',
      'Explicación exhaustiva del Saldo Líquido y su diferencia con el límite de tarjetas y préstamos.',
      'Fórmulas matemáticas y ejemplos prácticos de economía doméstica para cada concepto.',
      'Reglas de oro e impacto en el hogar para orientar las decisiones de la familia.',
    ],
    overview: {
      title: 'Domina los Conceptos Fundamentales de la Economía del Hogar',
      description:
        'Aprende a diferenciar el Saldo Líquido de la deuda en tarjetas, calcula tu Patrimonio Neto real, blinda a tu familia con el Fondo de Emergencia y comprende el impacto del Flujo de Caja y los Gastos Hormiga.',
      keyConcept:
        'El Saldo Líquido es el dinero real y disponible de inmediato en cuentas corrientes, ahorros y efectivo. Nunca debe confundirse con el cupo de una tarjeta de crédito, que es deuda potencial.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Explora la Pestaña "Conceptos & Glosario"',
        description: 'Accede al directorio completo de conceptos financieros familiares desde la pestaña superior.',
      },
      {
        stepNumber: 2,
        title: 'Comprende tu Saldo Líquido Real',
        description: 'Verifica cuánto dinero tienes disponible de inmediato antes de asumir nuevos compromisos.',
      },
      {
        stepNumber: 3,
        title: 'Aplica las Fórmulas en tu Presupuesto',
        description: 'Revisa tu tasa de ahorro, ratio DTI y el desglose de necesidades frente a deseos.',
      },
      {
        stepNumber: 4,
        title: 'Pon en Práctica las Reglas de Oro',
        description: 'Adopta hábitos como la regla de las 72 horas para gastos hormiga y el pago de deuda por avalancha.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Claridad mental absoluta',
        description: 'Entiende exactamente qué significa cada número en tu aplicación sin tecnicismos oscuros.',
      },
      {
        icon: Award,
        title: 'Prevención del sobreendeudamiento',
        description: 'Evita caer en la trampa de usar crédito bancario creyendo que es dinero disponible.',
      },
      {
        icon: ShieldCheck,
        title: 'Educación financiera para toda la familia',
        description: 'Comparte estos conceptos con tu pareja e hijos para unificar la visión económica del hogar.',
      },
    ],
    tips: [
      {
        title: 'Revisa tu Saldo Líquido semanalmente',
        text: 'Asegúrate de que tus cuentas corrientes y de ahorro cubran holgadamente los pagos de la próxima semana.',
      },
      {
        title: 'Diferencia activos de pasivos',
        text: 'Tu patrimonio solo crece cuando tus activos aumentan más rápido que tus deudas.',
      },
    ],
    faqs: [
      {
        question: '¿Por qué el límite de mi tarjeta no es saldo líquido?',
        answer:
          'Porque ese dinero no te pertenece: es un préstamo del banco que deberás devolver con intereses si no lo liquidas en tu fecha límite de pago.',
      },
      {
        question: '¿Cuánto saldo líquido debería tener mi familia?',
        answer:
          'Se recomienda tener entre 1 y 2 meses de gastos corrientes para el día a día, más un fondo de emergencia separado de 3 a 6 meses de gastos fijos.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ver Glosario de Conceptos',
  },
  dashboard: {
    id: 'dashboard',
    tabKey: 'dashboard',
    category: 'family',
    name: 'Dashboard Financiero Familiar & Analítica 360°',
    shortName: 'Dashboard',
    badge: 'Métricas & Diagnóstico Global',
    icon: BarChart3,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    themeGradient: 'from-indigo-500/15 via-blue-500/10 to-transparent',
    recentChanges: [
      'Visualización del ritmo de gasto diario acumulado en comparación con el ritmo ideal del mes.',
      'Gráfica de dona con desglose automático de consumo por categorías y colores distintivos.',
      'Distribución de gastos e ingresos por integrante de la familia para auditar la colaboración.',
      'Acceso rápido con un clic para cambiar de mes o registrar nuevas transacciones.',
    ],
    overview: {
      title: 'Tu Centro de Comando Financiero en un Solo Vistazo',
      description:
        'El Dashboard consolida la salud financiera total de tu hogar para el mes seleccionado. Combina ingresos netos, gastos totales, saldo de ahorro generado y el patrimonio líquido disponible en tus cuentas bancarias, permitiendo detectar desviaciones presupuestarias en segundos.',
      keyConcept:
        'La visión macro evita la fatiga de micro-gestión: en lugar de perderse en decenas de recibos, el Dashboard te indica de inmediato si tu familia está gastando más rápido de lo presupuestado o si el ahorro marcha a buen ritmo.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Selecciona el Mes a Auditar',
        description:
          'Utiliza el selector de mes superior para consultar el período en curso o analizar meses pasados para comparar la evolución.',
      },
      {
        stepNumber: 2,
        title: 'Verifica el Ritmo de Gasto Diario',
        description:
          'Observa la curva de gasto diario acumulado. Si la línea sube con demasiada inclinación antes del día 15, es momento de pausar compras discrecionales.',
      },
      {
        stepNumber: 3,
        title: 'Inspecciona la Dona de Categorías',
        description:
          'Identifica cuáles 2 o 3 categorías concentran más del 60% de los egresos familiares (generalmente Vivienda, Supermercado y Transporte).',
      },
      {
        stepNumber: 4,
        title: 'Evalúa la Participación por Miembro',
        description:
          'Comprueba los aportes y egresos registrados a nombre de cada integrante para asegurar un reparto equitativo de los compromisos.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Diagnóstico en 5 segundos',
        description:
          'Tres tarjetas clave te dicen si tienes superávit o déficit sin cálculos manuales.',
      },
      {
        icon: Award,
        title: 'Detección temprana de fugas',
        description:
          'Descubre a tiempo si los gastos hormiga están amenazando tu meta de ahorro mensual.',
      },
      {
        icon: ShieldCheck,
        title: 'Transparencia conyugal',
        description:
          'Ambos cónyuges ven los mismos números objetivos, reduciendo discusiones por dinero.',
      },
    ],
    tips: [
      {
        title: 'La cita financiera semanal de 10 minutos',
        text: 'Revisen el Dashboard juntos cada domingo para verificar cómo cerró la semana y planificar las compras de la siguiente.',
      },
      {
        title: 'Monitorea la tasa de ahorro neta',
        text: 'Intenta que la tarjeta de "Ahorro del Mes" mantenga al menos un 15% o 20% respecto a los ingresos totales familiares.',
      },
    ],
    faqs: [
      {
        question: '¿Por qué no veo movimientos en el Dashboard?',
        answer:
          'Verifica que el selector de mes coincida con las fechas en las que registraste tus transacciones.',
      },
      {
        question: '¿El patrimonio neto incluye las deudas?',
        answer:
          'Sí, el patrimonio líquido suma las cuentas corrientes/ahorro y resta el saldo adeudado de tarjetas y préstamos.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir al Dashboard',
  },

  cashflow: {
    id: 'cashflow',
    tabKey: 'cashflow',
    category: 'strategy',
    name: 'Proyección de Flujo de Caja & Tesorería Familiar',
    shortName: 'Flujo de Caja',
    badge: 'Previsión de Liquidez Futura',
    icon: TrendingUp,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    themeGradient: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    recentChanges: [
      'Horizontes predictivos ampliados a 3, 6 y 12 meses para planificación de corto, mediano y largo plazo.',
      'Simulador de escenarios macroeconómicos: Escenario Base, Optimista (+10% ingresos) y Cauteloso (+15% gastos/imprevistos).',
      'Integración automatizada con nóminas recurrentes, gastos fijos y amortizaciones de préstamos.',
      'Alertas visuales preventivas que señalan con exactitud qué mes caería en saldo negativo.',
    ],
    overview: {
      title: 'Anticipa tus Saldos Bancarios con Meses de Ventaja',
      description:
        'A diferencia de un presupuesto estático (que solo clasifica cuánto se gastó este mes), el Flujo de Caja proyecta la evolución del dinero en cuenta bancaria semana a semana y mes a mes durante los próximos 3 a 12 meses, combinando ingresos garantizados y facturas programadas.',
      keyConcept:
        'La liquidez es el oxígeno de la familia: muchas familias tienen presupuestos equilibrados sobre el papel pero sufren estrés severo por falta de efectivo en fechas de corte puntuales. El Flujo de Caja elimina esa incertidumbre para siempre.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Carga tus Ingresos y Gastos Recurrentes',
        description:
          'En el módulo "Fijos & Recurrentes", registra tus salarios, alquileres, servicios y cuotas. El motor los sincronizará automáticamente.',
      },
      {
        stepNumber: 2,
        title: 'Elige tu Horizonte de Tiempo',
        description:
          'Alterna entre 3 meses (vista operativa mensual), 6 meses (vista táctica semestral) o 12 meses (estrategia anual completa).',
      },
      {
        stepNumber: 3,
        title: 'Pon a Prueba tus Finanzas con Escenarios',
        description:
          'Selecciona el escenario "Cauteloso" para ver si tus cuentas soportarían un incremento imprevisto de gastos o inflación sin caer en números rojos.',
      },
      {
        stepNumber: 4,
        title: 'Planifica Grandes Compras en Meses Pico',
        description:
          'Identifica el mes del año donde la línea de liquidez acumulada alcanza su mayor altura para programar vacaciones o compras importantes.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Cero sorpresas a fin de mes',
        description:
          'Detectas déficits de tesorería con 60 a 90 días de anticipación, dándote tiempo para reaccionar con calma.',
      },
      {
        icon: Award,
        title: 'Fechas ideales para vacaciones',
        description:
          'Sabes matemáticamente cuándo tendrás el efectivo disponible sin endeudarte.',
      },
      {
        icon: ShieldCheck,
        title: 'Integración bancaria en tiempo real',
        description:
          'Comienza desde el saldo real actual de tus cuentas bancarias registradas en la app.',
      },
    ],
    tips: [
      {
        title: 'Registra los gastos anuales o semestrales',
        text: 'Seguros de salud, matrículas de colegio o impuestos de vehículos deben registrarse como recurrentes con su frecuencia respectiva.',
      },
      {
        title: 'Respeta el umbral de seguridad mínimo',
        text: 'Define un colchón intocable (ej. RD$25,000 o US$500). Si la curva proyectada toca ese límite, modera los gastos discrecionales de inmediato.',
      },
    ],
    faqs: [
      {
        question: '¿Qué ocurre si un mes muestra saldo negativo?',
        answer:
          'El módulo te avisa con una alerta ámbar/roja para que reduzcas gastos o traslades compras antes de que llegue esa fecha.',
      },
      {
        question: '¿Toma en cuenta las cuotas de préstamos?',
        answer:
          'Sí, las cuotas mínimas mensuales de tarjetas y préstamos se computan como egresos mensuales en la proyección.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Flujo de Caja',
  },

  debts: {
    id: 'debts',
    tabKey: 'debts',
    category: 'strategy',
    name: 'Planificador de Deudas: Avalancha vs. Bola de Nieve',
    shortName: 'Plan de Deudas',
    badge: 'Desendeudamiento Matemático',
    icon: Flame,
    accentColor: 'text-amber-500',
    themeGradient: 'from-amber-500/15 via-orange-500/10 to-transparent',
    recentChanges: [
      'Control deslizante interactivo del "Acelerador Mensual" para simular el impacto de pagos extraordinarios.',
      'Cálculo en vivo de meses ahorrados y miles de pesos/dólares evitados en intereses bancarios.',
      'Efecto Rollover automatizado: la cuota de la deuda saldada se transfiere de inmediato a la siguiente.',
      'Distinción clara entre cuota mínima obligatoria y abono extra al capital para proteger el historial crediticio.',
    ],
    overview: {
      title: 'Tu Hoja de Ruta Matemática Hacia Cero Deudas',
      description:
        'Este módulo calcula con precisión el tiempo y dinero que le toma a tu familia liquidar tarjetas de crédito, préstamos personales e hipotecas. Te permite alternar entre los dos métodos más respetados del mundo: Método Avalancha (ahorro máximo en intereses) y Método Bola de Nieve (victorias psicológicas rápidas).',
      keyConcept:
        'El secreto de ambos métodos es el "Efecto Rollover": cuando terminas de pagar una deuda, el dinero de esa cuota NO se gasta; se transfiere íntegro al pago de la siguiente deuda prioritaria, generando una velocidad de liquidación exponencial.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Verifica tus Tarjetas y Préstamos',
        description:
          'En "Cuentas Bancarias", asegúrate de que cada tarjeta o préstamo tenga registrado su saldo, tasa de interés anual (APR) y cuota mínima.',
      },
      {
        stepNumber: 2,
        title: 'Elige tu Estrategia de Amortización',
        description:
          'Selecciona Avalancha si deseas ahorrar la mayor cantidad de dinero en intereses bancarios, o Bola de Nieve si prefieres eliminar deudas pequeñas primero para motivarte.',
      },
      {
        stepNumber: 3,
        title: 'Ajusta el Acelerador Mensual (Pago Extra)',
        description:
          'Mueve el control deslizante para simular qué ocurre si apartas RD$1,000, RD$5,000 o US$100 extra cada mes. Verás cómo la fecha de libertad se adelanta años.',
      },
      {
        stepNumber: 4,
        title: 'Ejecuta el Plan Mes a Mes',
        description:
          'Paga el mínimo puntual a todas tus deudas para proteger tu historial crediticio, y concentra el 100% del pago extra en la Deuda Objetivo #1.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Ahorro masivo en comisiones e intereses',
        description:
          'Reduces drásticamente el dinero que le regalas al banco en intereses compuestos.',
      },
      {
        icon: Award,
        title: 'Fecha exacta de libertad financiera',
        description:
          'Conoces el mes y año matemático exacto en que tu familia estará 100% libre de pasivos.',
      },
      {
        icon: ShieldCheck,
        title: 'Historial crediticio intachable',
        description:
          'Al asegurar la cuota mínima en todas las cuentas, tu puntaje bancario se fortalece.',
      },
    ],
    tips: [
      {
        title: 'Nunca bajes el esfuerzo mensual',
        text: 'Cuando liquides la primera tarjeta, traslada esa cuota íntegra a la siguiente deuda. ¡Ese es el verdadero poder del rollover!',
      },
      {
        title: 'Negocia la tasa con tu entidad bancaria',
        text: 'Llama al banco y solicita una reducción de tasa por buen comportamiento o una consolidación a tasa fija más baja.',
      },
    ],
    faqs: [
      {
        question: '¿Cuál método me conviene más: Avalancha o Bola de Nieve?',
        answer:
          'Si tu prioridad es pagar menos dinero en intereses, elige Avalancha. Si te cuesta mantener la constancia y necesitas ver deudas desaparecer rápido para animarte, elige Bola de Nieve.',
      },
      {
        question: '¿Qué es el acelerador mensual?',
        answer:
          'Es un monto voluntario adicional que sumas a las cuotas mínimas para abonar directamente al capital de la deuda prioritaria.',
      },
      {
        question: 'Al pagar la cuota de un préstamo, ¿lo registro como Gasto o como Transferencia?',
        answer:
          'Si quieres ver la cuota reflejada en tu presupuesto y gráficos de gastos del mes, regístrala como Gasto (categoría Préstamos). Si tienes el préstamo registrado como cuenta bancaria y quieres que su saldo adeudado disminuya de forma directa y automática, realiza una Transferencia desde tu cuenta bancaria hacia la cuenta del Préstamo.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir al Plan de Deudas',
  },

  budgets: {
    id: 'budgets',
    tabKey: 'budgets',
    category: 'family',
    name: 'Presupuestos Mensuales & Alertas de Límite',
    shortName: 'Presupuestos',
    badge: 'Control Preventivo de Gastos',
    icon: PieChart,
    accentColor: 'text-purple-600 dark:text-purple-400',
    themeGradient: 'from-purple-500/15 via-pink-500/10 to-transparent',
    recentChanges: [
      'Semáforo visual dinámico con barras de consumo en tiempo real por cada categoría.',
      'Alertas tempranas automáticas al superar el 80% del tope asignado y avisos de peligro al sobrepasar el 100%.',
      'Configuración de presupuesto global mensual para todo el hogar con control de desviaciones.',
      'Filtro directo de transacciones con un clic en la categoría presupuestada.',
    ],
    overview: {
      title: 'Establece Límites Sanos y Elimina los Gastos Hormiga',
      description:
        'Crea límites máximos de gasto para cada rubro familiar (Alimentación, Servicios, Vivienda, Transporte, Ocio, etc.) y observa con barras de avance si tu familia se mantiene dentro de la meta acordada para el mes.',
      keyConcept:
        'Un presupuesto no es una limitación castigadora; es darle a cada peso una misión clara antes de que comience el mes, garantizando tranquilidad, libertad y acuerdo mutuo entre todos.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Define Presupuestos Realistas',
        description:
          'Asigna límites razonables basados en el histórico real de consumo de tu hogar para las categorías esenciales y discrecionales.',
      },
      {
        stepNumber: 2,
        title: 'Registra tus Gastos a Medida que Ocurren',
        description:
          'Cada compra con tarjeta o en efectivo se descuenta automáticamente de su respectiva bolsa presupuestaria.',
      },
      {
        stepNumber: 3,
        title: 'Monitorea el Semáforo de Colores',
        description:
          'Verde indica holgura (<80%), amarillo advierte proximidad al límite (80-99%) y rojo señala que la categoría se excedió.',
      },
      {
        stepNumber: 4,
        title: 'Rebalancea si es Necesario',
        description:
          'Si gastas menos en Entretenimiento pero requieres más en Supermercado, ajusta los montos para mantener el total balanceado.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Frena compras impulsivas',
        description:
          'Ver el porcentaje consumido desalienta gastos innecesarios antes de que descuadren el mes.',
      },
      {
        icon: Award,
        title: 'Acuerdos claros en la pareja',
        description:
          'Ambos conocen los topes consensuados, eliminando reproches posteriores por compras menores.',
      },
      {
        icon: ShieldCheck,
        title: 'Flexibilidad estacional',
        description:
          'Modifica los límites en meses de mayor demanda (Navidad, regreso a clases o vacaciones).',
      },
    ],
    tips: [
      {
        title: 'Evita presupuestar hasta el último centavo',
        text: 'Deja siempre un margen de maniobra de un 5% a 10% para imprevistos menores en la categoría de "Otros / Varios".',
      },
      {
        title: 'Revisa las alertas del banner en la cabecera',
        text: 'La campana del menú superior te avisa inmediatamente cuando una categoría entra en zona amarilla o roja.',
      },
    ],
    faqs: [
      {
        question: '¿Se reinician los presupuestos cada mes?',
        answer:
          'Los límites configurados permanecen vigentes mes a mes, mientras que los consumos se calculan de forma independiente para cada mes seleccionado.',
      },
      {
        question: '¿Qué hago si sobrepaso un presupuesto?',
        answer:
          'Revisa las transacciones de esa categoría para identificar si hubo un gasto extraordinario y compensa reduciendo en otra categoría no esencial.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Presupuestos',
  },

  transactions: {
    id: 'transactions',
    tabKey: 'transactions',
    category: 'accounts',
    name: 'Registro & Conciliación de Transacciones',
    shortName: 'Transacciones',
    badge: 'Contabilidad Familiar Diaria',
    icon: Receipt,
    accentColor: 'text-teal-600 dark:text-teal-400',
    themeGradient: 'from-teal-500/15 via-emerald-500/10 to-transparent',
    recentChanges: [
      'Soporte completo para Gastos, Ingresos y Transferencias entre cuentas bancarias familiares.',
      'Búsqueda en tiempo real por texto, notas, categorías, miembros y etiquetas.',
      'Filtro rápido por mes y vinculación con la cuenta bancaria de origen para conciliar saldos.',
      'Eliminación y edición segura con actualización instantánea de los balances del hogar.',
    ],
    overview: {
      title: 'El Registro Detallado de Cada Centavo en el Hogar',
      description:
        'El módulo de transacciones es el libro contable de tu familia. Te permite auditar cada movimiento, saber quién realizó el gasto, a través de qué cuenta bancaria o efectivo se pagó y qué etiqueta o notas descriptivas tiene asociadas.',
      keyConcept:
        'La precisión de todo el sistema depende de registrar con agilidad los movimientos: cada transacción actualiza en vivo el saldo de la cuenta bancaria, el presupuesto del mes y los gráficos del dashboard.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Añade una Transacción con "+ Nuevo Movimiento"',
        description:
          'Haz clic en el botón verde superior o en el botón flotante para abrir el modal de registro.',
      },
      {
        stepNumber: 2,
        title: 'Selecciona el Tipo y Cuenta',
        description:
          'Elige si es Gasto, Ingreso o Transferencia, e indica de qué cuenta bancaria o efectivo provienen los fondos.',
      },
      {
        stepNumber: 3,
        title: 'Asigna Categoría y Miembro',
        description:
          'Categoriza el gasto y selecciona qué miembro de la familia lo realizó para mantener las métricas al día.',
      },
      {
        stepNumber: 4,
        title: 'Usa Filtros para Encontrar Cualquier Recibo',
        description:
          'Escribe en la barra de búsqueda o filtra por miembro para auditar consumos específicos en segundos.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Trazabilidad total',
        description:
          'Sabrás con exactitud en qué fecha, lugar y concepto se utilizó el dinero familiar.',
      },
      {
        icon: Award,
        title: 'Transferencias sin descuadres',
        description:
          'Al mover dinero de tu cuenta corriente a tu cuenta de ahorros, el patrimonio no cambia erróneamente.',
      },
      {
        icon: ShieldCheck,
        title: 'Conciliación con extractos bancarios',
        description:
          'Compara fácilmente los movimientos de la app con los movimientos en la banca en línea.',
      },
    ],
    tips: [
      {
        title: 'Registra en el momento de la compra',
        text: 'Abre la app instalada en tu teléfono como PWA y toma 10 segundos para anotar el gasto antes de guardar la tarjeta.',
      },
      {
        title: 'Utiliza etiquetas temáticas',
        text: 'Usa etiquetas como #Vacaciones2026 o #Colegio para agrupar gastos que cruzan varias categorías distintas.',
      },
    ],
    faqs: [
      {
        question: '¿Qué diferencia hay entre un gasto y una transferencia?',
        answer:
          'Un gasto reduce tu patrimonio neto. Una transferencia solo mueve saldo de una cuenta familiar a otra sin variar el patrimonio total.',
      },
      {
        question: 'En un préstamo o deuda, ¿cuándo registrar el movimiento como Gasto o como Transferencia?',
        answer:
          'Si lo registras como Gasto, computa como egreso del mes en tu presupuesto (reduce el ahorro neto del mes y aparece en los reportes de gastos bajo la categoría de préstamos). Si lo registras como Transferencia desde tu cuenta bancaria hacia una cuenta de tipo "Préstamo", reduce de inmediato el saldo adeudado del préstamo sin alterar tu presupuesto de consumo.',
      },
      {
        question: '¿Puedo exportar mis transacciones a Excel?',
        answer:
          'Sí, desde el menú de herramientas en la opción "Copia de Seguridad y CSV" o en "Exportar Reporte PDF".',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Transacciones',
  },

  recurring: {
    id: 'recurring',
    tabKey: 'recurring',
    category: 'accounts',
    name: 'Gastos, Ingresos & Transferencias Recurrentes',
    shortName: 'Fijos & Recurrentes',
    badge: 'Automatización & Frecuencias Avanzadas',
    icon: CalendarClock,
    accentColor: 'text-sky-600 dark:text-sky-400',
    themeGradient: 'from-sky-500/15 via-blue-500/10 to-transparent',
    recentChanges: [
      'Transferencias recurrentes entre cuentas bancarias con frecuencias quincenal (Q1 y Q2 con días y montos independientes), semanal (4 cuotas), anual (con mes programado) y mensual.',
      'Soporte completo de cuotas e installments para traspasos programados entre cuentas con cálculo de equivalente mensual.',
      'Ejecución automatizada cuota a cuota de transferencias con actualización instantánea de saldos en las cuentas origen y destino.',
      'Calendario de próximos vencimientos con alertas y semáforo preventivo a 7 y 15 días.',
      'Conversión multidivisa en tiempo real para compromisos e ingresos en moneda extranjera (USD/EUR a DOP).',
      'Botón de "Marcar Pagado" que crea automáticamente la transacción correspondiente en la cuenta bancaria sin duplicidades.',
    ],
    overview: {
      title: 'Domina los Tres Pilares de Compromisos Programados del Hogar',
      description:
        'Gestiona los pagos fijos indispensables (alquiler, colegios, internet, electricidad, préstamos), los ingresos recurrentes (nóminas de quincena o mes) y las transferencias periódicas entre tus cuentas bancarias (traspasos a ahorros o pagos programados de tarjetas). El sistema calcula las próximas fechas y te avisa oportunamente.',
      keyConcept:
        'Tus compromisos y transferencias programadas representan el ritmo cardíaco del dinero familiar. Configurar cuotas quincenales o semanales independientes sincroniza exactamente tus cobros con tus pagos para evitar baches de liquidez.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Registra tus Facturas y Servicios Fijos',
        description:
          'Añade cada compromiso recurrente indicando monto, día del mes, periodicidad (mensual, quincenal, semanal, anual) y cuenta bancaria.',
      },
      {
        stepNumber: 2,
        title: 'Registra tus Nóminas e Ingresos Estables',
        description:
          'Define los salarios quincenales (Q1 y Q2) o mensuales de los miembros para alimentar la previsión de liquidez del hogar.',
      },
      {
        stepNumber: 3,
        title: 'Programa Transferencias Recurrentes entre Cuentas',
        description:
          'Configura traspasos periódicos (ej. de cuenta de nómina a cuenta de ahorros o provisión de tarjeta) con montos y días específicos por quincena o semana.',
      },
      {
        stepNumber: 4,
        title: 'Supervisa el Semáforo de Vencimientos y Pulsa "Pagar"',
        description:
          'Revisa qué pagos o transferencias vencen en los próximos 7 días y pulsa "Pagar" o deja que la automatización procese los asientos contables.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Cero cargos por mora o retraso',
        description:
          'Evita recargos bancarios o cortes de servicio por olvidos de fechas límites de pago.',
      },
      {
        icon: Award,
        title: 'Alimentación automática del Flujo de Caja',
        description:
          'Tus gastos fijos y transferencias periódicas nutren en tiempo real la proyección de tesorería a 12 meses.',
      },
      {
        icon: ShieldCheck,
        title: 'Traspasos de ahorro disciplinados y sin esfuerzo',
        description:
          'Al automatizar transferencias hacia tu fondo de emergencia o metas, ahorras antes de que surja la tentación de gastar.',
      },
    ],
    tips: [
      {
        title: 'Alinea los pagos con las quincenas reales',
        text: 'Aprovecha las frecuencias quincenales para asignar qué facturas se pagan con la Quincena 1 (día 15) y cuáles con la Quincena 2 (día 30).',
      },
      {
        title: 'Auditoría semestral de suscripciones',
        text: 'Revisa periódicamente los gastos fijos activos y cancela suscripciones zombi o duplicadas.',
      },
    ],
    faqs: [
      {
        question: '¿Cómo funcionan las frecuencias en las transferencias recurrentes?',
        answer:
          'Igual que con los ingresos recurrentes: puedes elegir Mensual, Quincenal (pudiendo definir montos y días distintos para Q1 y Q2), Semanal (con hasta 4 semanas configurables) o Anual (definiendo el mes específico). Cada cuota se procesa de forma individual.',
      },
      {
        question: '¿Una transferencia recurrente afecta mis gastos del presupuesto?',
        answer:
          'No. Una transferencia interna mueve dinero de una cuenta a otra dentro de tu familia. No es un gasto ni un ingreso externo, por lo que no descuadra tu presupuesto mensual.',
      },
      {
        question: '¿Qué ocurre al activar la automatización?',
        answer:
          'Cuando llega la fecha de vencimiento de una cuota, el sistema procesa automáticamente el movimiento bancario debitando la cuenta origen y acreditando la de destino, avanzando la fecha al siguiente ciclo.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Fijos & Recurrentes',
  },

  goals: {
    id: 'goals',
    tabKey: 'goals',
    category: 'strategy',
    name: 'Metas de Ahorro Colectivas e Individuales',
    shortName: 'Metas de Ahorro',
    badge: 'Proyectos Familiares',
    icon: Target,
    accentColor: 'text-teal-600 dark:text-teal-400',
    themeGradient: 'from-teal-500/15 via-emerald-500/10 to-transparent',
    recentChanges: [
      'Seguimiento individual de aportes: cada miembro puede registrar su contribución a la meta compartida.',
      'Cálculo dinámico de velocidad de ahorro mensual y fecha estimada de culminación basada en el ritmo real.',
      'Categorización de metas con iconos personalizados (Fondo de Emergencia, Vacaciones, Vehículo, Educación, Hogar).',
      'Barra de progreso visual con porcentaje de cumplimiento y monto restante para llegar al 100%.',
    ],
    overview: {
      title: 'Convierte los Sueños Familiares en Metas Concretas',
      description:
        'Crea metas de ahorro con fecha límite, monto objetivo y titular familiar (Fondo de Emergencia, Vacaciones, Reparaciones del Hogar, Universidad, etc.) y registra aportes periódicos para medir el avance.',
      keyConcept:
        'Ahorrar sin un objetivo claro es psicológicamente difícil de sostener. Darle un nombre, un propósito y una fecha límite a cada proyecto familiar multiplica por tres la constancia y el compromiso de todos.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Crea una Nueva Meta con "+ Nueva Meta"',
        description:
          'Indica un nombre motivador, el monto total a reunir, la fecha objetivo y el icono correspondiente.',
      },
      {
        stepNumber: 2,
        title: 'Registra Aportes Periódicos',
        description:
          'Cada vez que apartes dinero de tu nómina o de un excedente presupuestario, registra el abono indicando el miembro que aportó.',
      },
      {
        stepNumber: 3,
        title: 'Monitorea la Velocidad de Ahorro',
        description:
          'Verifica si el ritmo mensual actual alcanzará la meta antes de la fecha límite fijada.',
      },
      {
        stepNumber: 4,
        title: 'Celebra los Hitos Alcanzados',
        description:
          'Al completar el 100%, reconoce el esfuerzo colectivo de la familia antes de iniciar el siguiente proyecto.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Motivación visual continua',
        description:
          'Ver cómo la barra de progreso se llena estimula a toda la familia a seguir apartando dinero.',
      },
      {
        icon: Award,
        title: 'Blindaje contra imprevistos',
        description:
          'Tener una meta para el Fondo de Emergencia evita recurrir a préstamos costosos ante contingencias.',
      },
      {
        icon: ShieldCheck,
        title: 'Participación de hijos y cónyuge',
        description:
          'Cada integrante aporta a su ritmo y ve reflejado su esfuerzo en el proyecto común.',
      },
    ],
    tips: [
      {
        title: 'Meta indispensable #1: Fondo de Emergencia',
        text: 'Antes de ahorrar para vacaciones u objetos de lujo, reúne al menos el equivalente a 3 meses de gastos fijos esenciales.',
      },
      {
        title: 'Separa el dinero de las metas',
        text: 'Deposita el dinero destinado a metas en una cuenta bancaria de ahorro dedicada o depósito a plazo para no mezclarlo con el gasto diario.',
      },
    ],
    faqs: [
      {
        question: '¿Puedo retirar dinero de una meta si surge una necesidad?',
        answer:
          'Sí, puedes editar el saldo acumulado o registrar movimientos compensatorios en cualquier momento.',
      },
      {
        question: '¿Cuántas metas es recomendable tener abiertas a la vez?',
        answer:
          'Recomendamos un máximo de 2 a 3 metas activas a la vez (por ejemplo: Fondo de Emergencia + un proyecto de disfrute familiar) para no dispersar el esfuerzo.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Metas de Ahorro',
  },

  rule503020: {
    id: 'rule503020',
    tabKey: 'rule503020',
    category: 'strategy',
    name: 'Regla 50/30/20 para el Hogar',
    shortName: 'Regla 50/30/20',
    badge: 'Proporción Financiera Óptima',
    icon: ShieldCheck,
    accentColor: 'text-rose-600 dark:text-rose-400',
    themeGradient: 'from-rose-500/15 via-pink-500/10 to-transparent',
    recentChanges: [
      'Comparativa en vivo entre la distribución ideal recomendada y los gastos reales del mes en curso.',
      'Semáforo inteligente que diagnostica si las Necesidades superan el umbral de seguridad del 50%.',
      'Reclasificación dinámica de categorías entre los 3 pilares (Necesidades, Deseos y Ahorro/Deuda).',
      'Recomendaciones automáticas personalizadas para reequilibrar partidas desfasadas.',
    ],
    overview: {
      title: 'El Estándar Internacional de Salud Financiera',
      description:
        'Distribuye tus ingresos netos en 3 grandes bloques universales: 50% para Necesidades Esenciales, 30% para Calidad de Vida & Deseos, y 20% para Ahorro, Inversión o liquidación de pasivos.',
      keyConcept:
        'Si tus Necesidades superan el 50%, tu estructura de gastos fijos está comprometiendo la estabilidad del hogar. Si tu Ahorro supera el 20%, la libertad y tranquilidad financiera de tu familia avanzan a pasos agigantados.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Revisa tus Ingresos Netos del Mes',
        description:
          'El módulo toma el total de ingresos familiares y calcula la fórmula matemática ideal para tu nivel salarial.',
      },
      {
        stepNumber: 2,
        title: 'Compara el Desglose Real con el Ideal',
        description:
          'Observa las gráficas de barra y porcentajes reales destinados a Necesidades, Deseos y Ahorro.',
      },
      {
        stepNumber: 3,
        title: 'Ajusta Categorías Desubicadas',
        description:
          'Si una categoría está en el cubo equivocado, puedes reasignarla con un clic para que el cálculo sea fiel a la realidad.',
      },
      {
        stepNumber: 4,
        title: 'Aplica las Sugerencias del Semáforo',
        description:
          'Sigue los consejos inteligentes para comprimir gastos fijos o reorientar excedentes hacia el pilar de ahorro.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Simplicidad absoluta',
        description:
          'En lugar de vigilar 30 categorías, solo vigilas 3 grandes números macro para saber si tu economía es sana.',
      },
      {
        icon: Award,
        title: 'Libertad sin culpa',
        description:
          'Gastas el 30% en ocio y deseos con total tranquilidad porque el 50% de necesidades y el 20% de ahorro ya están cubiertos.',
      },
      {
        icon: ShieldCheck,
        title: 'Blindaje contra crisis',
        description:
          'Mantener las necesidades por debajo del 50% da margen de maniobra si los ingresos sufren una baja temporal.',
      },
    ],
    tips: [
      {
        title: 'Si tienes deudas costosas en tarjetas',
        text: 'Dirige el 20% de ahorro íntegramente a amortizar capital en el Plan de Deudas hasta llegar a cero pasivos antes de invertir.',
      },
      {
        title: 'Distingue entre Necesidad y Deseo',
        text: 'Comer es una necesidad (50%); salir a cenar a un restaurante de lujo es un deseo (30%). Clasifícalos correctamente para no engañar la fórmula.',
      },
    ],
    faqs: [
      {
        question: '¿Qué hago si mis necesidades superan el 60%?',
        answer:
          'Es habitual en familias con hipotecas o alquileres altos. El objetivo a mediano plazo es renegociar servicios o incrementar ingresos para devolver el bloque al 50%.',
      },
      {
        question: '¿Puedo ahorrar más del 20%?',
        answer:
          '¡Por supuesto! Cuanto mayor sea tu porcentaje de ahorro e inversión, más rápido tu familia alcanzará independencia económica.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Regla 50/30/20',
  },

  allowances: {
    id: 'allowances',
    tabKey: 'allowances',
    category: 'family',
    name: 'Asignaciones, Gastos Personales & Mesadas Infantiles',
    shortName: 'Asignaciones',
    badge: 'Autonomía & Educación',
    icon: Coins,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    themeGradient: 'from-indigo-500/15 via-purple-500/10 to-transparent',
    recentChanges: [
      'Sistema dual adaptativo: cupos de gasto discrecional para adultos y mesadas educativas para los hijos.',
      'Módulo de tareas y recompensas formativas para los niños (ej. recoger la habitación, estudiar, ayudar en casa).',
      'Historial de consumos personales para no sobrepasar el cupo mensual acordado.',
      'Control de saldo disponible individual sin interferir con las cuentas esenciales del hogar.',
    ],
    overview: {
      title: 'Espacio de Gasto Libre y Educación Financiera Familiar',
      description:
        'Gestiona cupos mensuales de gasto libre para los adultos sin rendición de cuentas, y mesadas educativas con tareas del hogar para los hijos, promoviendo la responsabilidad y el aprendizaje financiero temprano.',
      keyConcept:
        'La transparencia familiar no significa perder la autonomía individual. Un fondo personal acordado elimina la necesidad de dar explicaciones por compras recreativas menores, garantizando paz y armonía en la pareja.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Asigna un Cupo Mensual por Miembro',
        description:
          'Define cuánto puede gastar cada adulto o hijo en gustos personales durante el mes.',
      },
      {
        stepNumber: 2,
        title: 'Asigna Tareas Formativas a los Hijos',
        description:
          'Crea tareas con recompensas asociadas para enseñarles que el dinero se gana con esfuerzo y constancia.',
      },
      {
        stepNumber: 3,
        title: 'Registra los Consumos Personales',
        description:
          'Descuenta las compras personales del cupo del miembro para mantener el balance actualizado.',
      },
      {
        stepNumber: 4,
        title: 'Fomenta el Hábito del Ahorro en los Niños',
        description:
          'Enséñales que si no agotan su mesada, pueden acumularla para adquirir juguetes o libros de mayor valor.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Armonía total en la pareja',
        description:
          'Nadie tiene que justificar compras recreativas personales si están dentro del cupo acordado.',
      },
      {
        icon: Award,
        title: 'Educación financiera práctica para niños',
        description:
          'Los hijos aprenden a presupuestar, postergar la gratificación y cuidar su dinero real.',
      },
      {
        icon: ShieldCheck,
        title: 'Límites claros al gasto discrecional',
        description:
          'Evita que los gustos individuales descuadren las cuentas esenciales del hogar.',
      },
    ],
    tips: [
      {
        title: 'Mantén los cupos proporcionales a los ingresos',
        text: 'Un cupo libre saludable oscila entre el 5% y el 10% de los ingresos netos familiares, una vez cubiertos los gastos fijos y el ahorro.',
      },
      {
        title: 'No uses el dinero como único castigo',
        text: 'Utiliza las tareas y mesadas como una herramienta de estímulo positivo y aprendizaje, no como una sanción punitiva.',
      },
    ],
    faqs: [
      {
        question: '¿Por qué no veo la pestaña de Hijos en el menú?',
        answer:
          'La pestaña aparece automáticamente cuando registras al menos un miembro con rol de "Hijo / Menor" en la sección de Miembros Familiares.',
      },
      {
        question: '¿Qué pasa si un adulto no gasta todo su cupo en el mes?',
        answer:
          'Puede acumular el remanente para un gusto mayor el mes siguiente o destinarlo a su meta de ahorro personal.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Asignaciones',
  },

  banks: {
    id: 'banks',
    tabKey: 'banks',
    category: 'accounts',
    name: 'Cuentas Bancarias, Saldo Líquido & Tarjetas',
    shortName: 'Cuentas & Liquidez',
    badge: 'Tesorería & Saldo Líquido',
    icon: Landmark,
    accentColor: 'text-blue-600 dark:text-blue-400',
    themeGradient: 'from-blue-500/15 via-indigo-500/10 to-transparent',
    recentChanges: [
      'Visualización clara y destacada del Saldo Líquido Inmediato (efectivo y saldos a la vista) frente a Límites de Crédito y Pasivos.',
      'Soporte completo para transferencias directas y periódicas entre bancos con conciliación instantánea.',
      'Catálogo ampliado de bancos dominicanos (Popular, Banreservas, BHD, Scotiabank, APAP, Cibao, Santa Cruz, Qik) e internacionales.',
      'Configuración detallada de tarjetas: fecha de corte, fecha límite de pago, cuota mínima mensual, límite de crédito y APR.',
      'Enmascaramiento seguro de dígitos de cuenta (•••• 1234) para garantizar privacidad visual compartida.',
    ],
    overview: {
      title: 'Audita la Verdadera Liquidez y Patrimonio del Hogar',
      description:
        'Gestiona cuentas corrientes, cuentas de ahorro, efectivo, tarjetas de crédito, préstamos personales e hipotecas. Permite calcular con exactitud tu Saldo Líquido Inmediato (dinero real disponible hoy) y diferenciarlo de tus pasivos o endeudamiento potencial.',
      keyConcept:
        'El Saldo Líquido es el dinero real y disponible de inmediato en cuentas de débito, ahorros y efectivo. El límite disponible en una tarjeta de crédito NO es dinero tuyo: es un préstamo bancario que genera deuda.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Haz Clic en "+ Vincular Cuenta"',
        description:
          'Elige tu entidad bancaria del catálogo dominicano/internacional o digita el nombre de tu cooperativa o cuenta de efectivo.',
      },
      {
        stepNumber: 2,
        title: 'Elige el Tipo de Producto Financiero',
        description:
          'Selecciona si es Cuenta Corriente, Ahorros, Efectivo (aportan a Saldo Líquido) o Tarjeta de Crédito / Préstamo (Pasivos).',
      },
      {
        stepNumber: 3,
        title: 'Indica Condiciones para Tarjetas y Préstamos',
        description:
          'Especifica la tasa de interés anual (APR), la cuota mínima mensual, el límite crediticio y el día de corte.',
      },
      {
        stepNumber: 4,
        title: 'Asigna el Titular Familiar y Moneda',
        description:
          'Indica a qué miembro pertenece la cuenta y define su moneda (DOP, USD, EUR) para conversión en vivo.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Auditoría instantánea de Saldo Líquido',
        description:
          'Conoce en segundos cuánto dinero total real tiene la familia para responder ante cualquier urgencia.',
      },
      {
        icon: Award,
        title: 'Cálculo transparente de Patrimonio Neto',
        description:
          'Deduce automáticamente el saldo consumido en tarjetas y préstamos para mostrar la riqueza neta del hogar.',
      },
      {
        icon: ShieldCheck,
        title: 'Privacidad y seguridad familiar',
        description:
          'Los números de cuenta se mantienen enmascarados para evitar filtraciones visuales accidentales.',
      },
    ],
    tips: [
      {
        title: 'No cuentes el límite de tarjeta como ahorro',
        text: 'Muchas familias se endeudan porque consideran que su "disponible" incluye el cupo de la tarjeta de crédito. La tarjeta es un medio de pago, no una reserva de liquidez.',
      },
      {
        title: 'Separa cuentas de gasto y cuentas de fondo de emergencia',
        text: 'Mantén una cuenta corriente operativa para los gastos del mes y otra cuenta de ahorros protegida para tu colchón de seguridad.',
      },
    ],
    faqs: [
      {
        question: '¿Qué diferencia hay entre Saldo Líquido y Patrimonio Neto?',
        answer:
          'El Saldo Líquido es el efectivo y saldo en cuentas bancarias disponible de inmediato para gastar. El Patrimonio Neto suma todo lo que la familia posee (activos líquidos, inversiones, bienes) y le resta todas sus deudas pendientes (tarjetas, préstamos, hipotecas).',
      },
      {
        question: '¿Cómo afecta una tarjeta de crédito a mi saldo?',
        answer:
          'El saldo consumido de la tarjeta no reduce tu saldo líquido de débito en ese instante, pero se registra como deuda a pagar y reduce tu Patrimonio Neto. Cuando pagas la tarjeta mediante una transferencia o gasto, se descuenta de tu cuenta bancaria.',
      },
      {
        question: '¿La app almacena mis claves o contraseñas bancarias?',
        answer:
          'Nunca. La aplicación jamás solicita claves, pines ni credenciales bancarias. Solo registra saldos y condiciones declaradas para máxima privacidad y seguridad.',
      },
    ],
    actionType: 'navigate',
    actionLabel: 'Ir a Cuentas Bancarias',
  },

  members: {
    id: 'members',
    tabKey: 'members',
    category: 'family',
    name: 'Miembros Familiares, Roles & Economía Compartida',
    shortName: 'Miembros',
    badge: 'Gestión del Núcleo Familiar',
    icon: Users,
    accentColor: 'text-amber-600 dark:text-amber-400',
    themeGradient: 'from-amber-500/15 via-yellow-500/10 to-transparent',
    recentChanges: [
      'Gestión de roles diferenciados: Administrador (gestión total), Miembro (edición) y Observador (solo lectura).',
      'Generación de tokens criptográficos de 256-bit para invitar familiares con caducidad y uso seguro.',
      'Soporte multi-hogar: posibilidad de pertenecer a más de una familia y alternar entre ellas con un clic.',
      'Seguimiento visual de aportes a ingresos y consumos de gastos individuales por integrante.',
    ],
    overview: {
      title: 'Economía Colaborativa con Roles y Privacidad',
      description:
        'Administra los integrantes de tu hogar, asigna roles de responsabilidad (Administrador, Miembro u Observador) y comparte el acceso mediante enlaces seguros para que toda la familia colabore en una sola cuenta sincronizada.',
      keyConcept:
        'Una economía familiar saludable se basa en la cooperación y la claridad: cuando cada integrante tiene visibilidad de sus aportes y gastos, se eliminan los malentendidos y se fortalece la confianza mutua.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Registra a los Integrantes del Hogar',
        description:
          'Añade a tu cónyuge, hijos o familiares indicando su nombre, rol y color identificador.',
      },
      {
        stepNumber: 2,
        title: 'Genera un Enlace de Invitación Seguro',
        description:
          'Haz clic en "Invitar" en la cabecera para generar un código con token seguro de 256-bit.',
      },
      {
        stepNumber: 3,
        title: 'El Familiar se Une con su Cuenta de Google o Correo',
        description:
          'Al acceder mediante el enlace o ingresar el código, el familiar sincroniza sus datos en tiempo real.',
      },
      {
        stepNumber: 4,
        title: 'Asigna Transacciones y Cuentas',
        description:
          'Vincula cada movimiento contable al miembro responsable para auditar las contribuciones.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Sincronización en tiempo real',
        description:
          'Cualquier gasto registrado por un familiar se actualiza al instante en los dispositivos de los demás.',
      },
      {
        icon: Award,
        title: 'Reparto equitativo de gastos',
        description:
          'Permite evaluar con claridad matemática si los aportes a los gastos del hogar son justos.',
      },
      {
        icon: ShieldCheck,
        title: 'Control de acceso por roles',
        description:
          'Asigna rol de observador o menor para proteger configuraciones críticas del hogar.',
      },
    ],
    tips: [
      {
        title: 'Invita a tu pareja con rol de Administrador',
        text: 'Ambos deben tener facultades para ajustar presupuestos y registrar cuentas para mantener la corresponsabilidad.',
      },
      {
        title: 'Tokens seguros de un solo uso',
        text: 'Los tokens de invitación generados expiran automáticamente para impedir accesos no autorizados al hogar.',
      },
    ],
    faqs: [
      {
        question: '¿Puede un miembro pertenecer a dos familias distintas?',
        answer:
          'Sí, la arquitectura multi-hogar permite crear o unirse a varios núcleos familiares y cambiar entre ellos desde el menú superior.',
      },
      {
        question: '¿Qué pasa si un familiar pierde su teléfono?',
        answer:
          'El Administrador puede revocar el acceso del miembro en cualquier momento desde la lista de integrantes.',
      },
    ],
    actionType: 'family',
    actionLabel: 'Gestionar Miembros e Invitaciones',
  },

  reports: {
    id: 'reports',
    tabKey: 'dashboard',
    category: 'security',
    name: 'Reportes Ejecutivos en PDF & Exportación Excel / CSV',
    shortName: 'Reportes & Exportar',
    badge: 'Auditoría & Documentación',
    icon: FileDown,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    themeGradient: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    recentChanges: [
      'Generador de reportes PDF profesionales vectoriales listos para imprimir con portada ejecutiva y membrete.',
      'Gráficas de dona y barras renderizadas directamente en el documento PDF para reuniones familiares.',
      'Exportación integral a Excel / CSV con todas las transacciones, presupuestos y balances conciliados.',
      'Filtros por mes y desglose detallado de gastos por categoría y miembro.',
    ],
    overview: {
      title: 'Informes Financieros Ejecutivos al Alcance de un Clic',
      description:
        'Genera informes mensuales descargables en PDF de alta calidad estética para archivar físicamente, presentar ante entidades bancarias en trámites de préstamos/visas o revisar en asambleas familiares de fin de mes.',
      keyConcept:
        'Tener tus finanzas documentadas en un formato estándar y exportable te otorga libertad total: eres dueño de tus datos y puedes auditarlos en hojas de cálculo o compartirlos profesionalmente.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Abre el Modal de "Exportar Reporte PDF"',
        description:
          'Haz clic en el botón de descarga en la cabecera o en el menú de herramientas móvil.',
      },
      {
        stepNumber: 2,
        title: 'Selecciona el Mes del Informe',
        description:
          'Elige el período que deseas auditar. El motor compila automáticamente métricas, gráficos y tablas.',
      },
      {
        stepNumber: 3,
        title: 'Descarga o Imprime el Documento PDF',
        description:
          'Obtén un archivo PDF vectorial perfectamente diagramado con resumen ejecutivo y desglose por categorías.',
      },
      {
        stepNumber: 4,
        title: 'Exporta a Excel / CSV para Análisis Avanzado',
        description:
          'En "Copia de Seguridad y CSV", descarga la sábana completa de datos para trabajarla en Excel o Google Sheets.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Presentación ejecutiva impecable',
        description:
          'Un informe visualmente profesional que infunde confianza ante bancos o asesores.',
      },
      {
        icon: Award,
        title: 'Archivo histórico permanente',
        description:
          'Guarda tus informes mensuales en una carpeta digital o física para auditorías anuales.',
      },
      {
        icon: ShieldCheck,
        title: 'Portabilidad total de datos',
        description:
          'Exporta en formatos abiertos (CSV, JSON, PDF) sin ataduras a ninguna plataforma.',
      },
    ],
    tips: [
      {
        title: 'Genera el PDF al cierre de cada mes',
        text: 'Crea el hábito de descargar el PDF el primer día de cada mes para tener una memoria histórica fidedigna de tu progreso.',
      },
      {
        title: 'Úsalo para solicitudes bancarias',
        text: 'Cuando solicites una hipoteca o préstamo personal, este reporte demuestra organización y disciplina financiera.',
      },
    ],
    faqs: [
      {
        question: '¿Los gráficos en el PDF se ven nítidos al imprimir?',
        answer:
          'Sí, los gráficos se generan como vectores de alta resolución optimizados tanto para pantalla como para impresión en papel.',
      },
      {
        question: '¿Puedo exportar solo un rango específico de fechas?',
        answer:
          'Puedes filtrar por mes en el modal de PDF o descargar el archivo CSV completo para filtrar fechas en Excel.',
      },
    ],
    actionType: 'pdf',
    actionLabel: 'Abrir Generador de Reporte PDF',
  },

  security: {
    id: 'security',
    tabKey: 'dashboard',
    category: 'security',
    name: 'Bóveda Cifrada E2EE, Firestore & Respaldo en GitHub',
    shortName: 'Seguridad & Cifrado',
    badge: 'Criptografía AES-256 & Nube',
    icon: Lock,
    accentColor: 'text-stone-700 dark:text-stone-300',
    themeGradient: 'from-stone-500/15 via-zinc-500/10 to-transparent',
    recentChanges: [
      'Cifrado de extremo a extremo (E2EE) con algoritmo militar AES-GCM de 256 bits antes de sincronizar con Firestore.',
      'Copia de seguridad en archivo JSON cifrado con contraseña maestra descargable a disco local.',
      'Intercepción segura del atajo Ctrl+S / Cmd+S para prevenir descargas accidentales de HTML en texto plano.',
      'Compatibilidad total con repositorios GitHub privados para control de versiones y despliegues CI/CD.',
    ],
    overview: {
      title: 'Privacidad Grado Militar y Respaldo Permanente',
      description:
        'Toda la información sensible de tu familia (saldos, números de cuenta, movimientos, salarios) puede ser cifrada en tu navegador antes de enviarse a la base de datos en la nube. Ni siquiera los servidores de Google pueden leer tus datos sin tu clave maestra.',
      keyConcept:
        'Tu privacidad financiera es un derecho innegociable: la arquitectura Zero-Knowledge garantiza que la contraseña de cifrado reside exclusivamente en la memoria de tus dispositivos, nunca en servidores externos.',
    },
    howToUse: [
      {
        stepNumber: 1,
        title: 'Establece una Frase de Seguridad Maestra',
        description:
          'En "Configurar > Seguridad", define una contraseña sólida conocida únicamente por tu familia.',
      },
      {
        stepNumber: 2,
        title: 'Verifica el Estado del Cifrado E2EE',
        description:
          'Comprueba que el candado de la cabecera indique que los datos se transmiten cifrados con AES-256.',
      },
      {
        stepNumber: 3,
        title: 'Descarga Periódicamente una Copia de Seguridad JSON',
        description:
          'En "Copia de Seguridad y CSV", genera un archivo cifrado de respaldo para guardarlo en un disco o nube personal.',
      },
      {
        stepNumber: 4,
        title: 'Respalda el Código Fuente en GitHub',
        description:
          'Vincula tu proyecto a un repositorio privado de GitHub para asegurar el código y versionar mejoras.',
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: 'Privacidad absoluta Zero-Knowledge',
        description:
          'Nadie ajeno a tu familia puede descifrar los montos o nombres de tus cuentas bancarias.',
      },
      {
        icon: Award,
        title: 'Inmune a caídas de red (PWA Offline)',
        description:
          'La app sigue funcionando sin conexión a internet y sincroniza cambios al recuperar señal.',
      },
      {
        icon: ShieldCheck,
        title: 'Respaldo doble: Nube + Archivo Local',
        description:
          'Protegido simultáneamente por Google Cloud Firestore y por tus copias locales cifradas.',
      },
    ],
    tips: [
      {
        title: 'Nunca olvides tu frase de seguridad maestra',
        text: 'Por diseño criptográfico, si pierdes la clave nadie puede recuperarla. Anótala en un gestor de contraseñas seguro.',
      },
      {
        title: 'Utiliza un repositorio de GitHub Privado',
        text: 'Al versionar tu código en GitHub, mantén el repositorio privado para resguardar la estructura de tu app.',
      },
    ],
    faqs: [
      {
        question: '¿Qué algoritmo de cifrado utiliza la app?',
        answer:
          'Utiliza AES-GCM de 256 bits con derivación de claves PBKDF2 (SHA-256) y vector de inicialización único por registro.',
      },
      {
        question: '¿Puedo restaurar mis datos en una computadora nueva?',
        answer:
          'Sí, solo necesitas iniciar sesión con tu cuenta y escribir tu frase de seguridad para descifrar todo al instante.',
      },
    ],
    actionType: 'security',
    actionLabel: 'Abrir Configuración de Seguridad',
  },
};

export const ModuleHelpModal: React.FC<ModuleHelpModalProps> = ({
  isOpen,
  onClose,
  initialModule = 'dashboard',
  onNavigateTab,
  onOpenPdfModal,
  onOpenSecurityModal,
  onOpenBackupExport,
  onOpenFamilyModal,
}) => {
  const [viewMode, setViewMode] = useState<'modules' | 'concepts'>(
    initialModule === 'concepts' ? 'concepts' : 'modules'
  );
  const [selectedModule, setSelectedModule] = useState<HelpModuleId>(
    initialModule && initialModule !== 'concepts' ? initialModule : 'dashboard'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<HelpCategory>('all');

  // Sync initial module if prop changes
  useEffect(() => {
    if (initialModule === 'concepts') {
      setViewMode('concepts');
    } else if (initialModule && MODULE_HELP_DATA[initialModule]) {
      setSelectedModule(initialModule);
      setViewMode('modules');
    }
  }, [initialModule, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter modules based on category and search query
  const filteredModuleKeys = useMemo(() => {
    const allKeys = Object.keys(MODULE_HELP_DATA) as HelpModuleId[];
    const q = searchQuery.trim().toLowerCase();

    return allKeys.filter(id => {
      const item = MODULE_HELP_DATA[id];
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;

      const inName = item.name.toLowerCase().includes(q);
      const inShort = item.shortName.toLowerCase().includes(q);
      const inBadge = item.badge.toLowerCase().includes(q);
      const inOverview = item.overview.description.toLowerCase().includes(q);
      const inConcept = item.overview.keyConcept.toLowerCase().includes(q);
      const inTips = item.tips.some(
        t => t.title.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
      );
      const inFaqs = item.faqs.some(
        f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
      const inRecent = item.recentChanges.some(r => r.toLowerCase().includes(q));

      return (
        inName ||
        inShort ||
        inBadge ||
        inOverview ||
        inConcept ||
        inTips ||
        inFaqs ||
        inRecent
      );
    });
  }, [searchQuery, activeCategory]);

  // Auto select first match if current is not in filtered list
  useEffect(() => {
    if (filteredModuleKeys.length > 0 && !filteredModuleKeys.includes(selectedModule)) {
      setSelectedModule(filteredModuleKeys[0]);
    }
  }, [filteredModuleKeys, selectedModule]);

  if (!isOpen) return null;

  const currentModuleData =
    MODULE_HELP_DATA[selectedModule] || MODULE_HELP_DATA.dashboard;
  const ModuleIcon = currentModuleData.icon;

  const handleAction = () => {
    onClose();
    if (currentModuleData.actionType === 'navigate' && currentModuleData.tabKey && onNavigateTab) {
      onNavigateTab(currentModuleData.tabKey);
    } else if (currentModuleData.actionType === 'pdf' && onOpenPdfModal) {
      onOpenPdfModal();
    } else if (currentModuleData.actionType === 'security' && onOpenSecurityModal) {
      onOpenSecurityModal('security');
    } else if (currentModuleData.actionType === 'backup' && onOpenBackupExport) {
      onOpenBackupExport();
    } else if (currentModuleData.actionType === 'family' && onOpenFamilyModal) {
      onOpenFamilyModal('list');
    }
  };

  return (
    <div
      id="module-help-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="module-help-modal-card"
        className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="relative px-4 py-3 sm:px-6 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-b from-stone-50 dark:from-stone-950/70 to-transparent shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Centro de Conocimiento & Guías
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    13 Módulos + Glosario
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 truncate">
                  Manual Detallado del Sistema Financiero
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher: Guías vs Glosario de Conceptos */}
              <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('modules')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'modules'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guías por Módulo</span>
                  <span className="sm:hidden">Guías</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    13
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('concepts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'concepts'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Conceptos & Glosario</span>
                  <span className="sm:hidden">Conceptos</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-extrabold uppercase">
                    Saldo Líquido
                  </span>
                </button>
              </div>

              <button
                id="close-help-modal-button"
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                title="Cerrar ventana de guías (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar (Shown in modules mode) */}
          {viewMode === 'modules' && (
            <>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-800/80">
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar tema, tarjeta, avalancha, banco, cifrado..."
                    className="w-full pl-9 pr-7 py-1.5 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="sm:col-span-7 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'strategy', label: 'Estrategia & Deudas' },
                    { key: 'accounts', label: 'Bancos & Tesorería' },
                    { key: 'family', label: 'Familia & Presupuesto' },
                    { key: 'security', label: 'Seguridad & Reportes' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(cat.key as HelpCategory)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                        activeCategory === cat.key
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Module Switcher Horizontal Scroller */}
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-800 overflow-x-auto no-scrollbar">
                {filteredModuleKeys.length === 0 ? (
                  <span className="text-xs text-stone-500 italic py-1">
                    No se encontraron módulos con &quot;{searchQuery}&quot;
                  </span>
                ) : (
                  filteredModuleKeys.map(modId => {
                    const item = MODULE_HELP_DATA[modId];
                    const ItemIcon = item.icon;
                    const isSelected = selectedModule === modId;
                    return (
                      <button
                        key={modId}
                        type="button"
                        onClick={() => {
                          if (modId === 'concepts') {
                            setViewMode('concepts');
                          } else {
                            setSelectedModule(modId);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                          isSelected
                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 shadow-xs'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800'
                        }`}
                      >
                        <ItemIcon
                          className={`w-3.5 h-3.5 ${
                            isSelected
                              ? 'text-white dark:text-stone-950'
                              : item.accentColor
                          }`}
                        />
                        <span>{item.shortName}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {viewMode === 'concepts' || selectedModule === 'concepts' ? (
            <FamilyFinancialConceptsView
              onNavigateTab={tab => {
                onClose();
                if (onNavigateTab) onNavigateTab(tab);
              }}
              onCloseModal={onClose}
            />
          ) : (
            <>
              {/* Module Banner Hero */}
              <div
                className={`p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-gradient-to-br ${currentModuleData.themeGradient} space-y-3.5 relative overflow-hidden`}
              >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 shadow-2xs">
                <ModuleIcon className={`w-4 h-4 ${currentModuleData.accentColor}`} />
                <span>{currentModuleData.badge}</span>
              </span>

              <button
                type="button"
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-950 text-xs font-bold transition shadow-xs"
              >
                <span>{currentModuleData.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {currentModuleData.overview.title}
            </h3>

            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed max-w-4xl">
              {currentModuleData.overview.description}
            </p>

            <div className="p-3.5 rounded-xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 shadow-xs">
              <strong className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">
                💡 Concepto Fundamental:
              </strong>
              <span>{currentModuleData.overview.keyConcept}</span>
            </div>
          </div>

          {/* Section: Últimos Cambios y Mejoras del Módulo */}
          {currentModuleData.recentChanges.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 space-y-2">
              <h4 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Novedades & Últimos Cambios en este Módulo</span>
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 dark:text-stone-300">
                {currentModuleData.recentChanges.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1: Cómo Usarlo Paso a Paso */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>¿Cómo Usarlo Paso a Paso? (Flujo Recomendado)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentModuleData.howToUse.map(step => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 space-y-1.5 transition hover:border-indigo-300 dark:hover:border-indigo-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {step.stepNumber}
                    </span>
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {step.title}
                    </h5>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 pl-8 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Beneficios Clave */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Beneficios para la Economía de tu Hogar</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {currentModuleData.benefits.map((benefit, i) => {
                const BIcon = benefit.icon;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <BIcon className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {benefit.title}
                    </h5>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Consejos de Oro */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Consejos de Oro & Mejores Prácticas</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentModuleData.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <strong className="text-stone-900 dark:text-stone-100 font-bold block">
                      {tip.title}
                    </strong>
                    <span className="text-stone-600 dark:text-stone-300 leading-relaxed block">
                      {tip.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Preguntas Frecuentes (FAQ) */}
          {currentModuleData.faqs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span>Preguntas Frecuentes del Módulo</span>
              </h4>

              <div className="space-y-2">
                {currentModuleData.faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 text-xs space-y-1"
                  >
                    <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">
                        P:
                      </span>
                      <span>{faq.question}</span>
                    </p>
                    <p className="text-stone-600 dark:text-stone-400 pl-4 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* Modal Bottom Actions */}
    <div className="p-3 sm:px-6 sm:py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
        >
          Cerrar
        </button>

        {viewMode === 'modules' ? (
          <button
            type="button"
            onClick={() => setViewMode('concepts')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition border border-emerald-300/50 dark:border-emerald-800/50"
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Explorar Glosario & Saldo Líquido</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setViewMode('modules')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/50 transition border border-indigo-300/50 dark:border-indigo-800/50"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Volver a Guías de Módulos</span>
          </button>
        )}
      </div>

      {viewMode === 'concepts' || selectedModule === 'concepts' ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onNavigateTab) onNavigateTab('banks');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Ver Cuentas & Saldo Líquido</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
        >
          <span>{currentModuleData.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
      </div>
    </div>
  );
};
