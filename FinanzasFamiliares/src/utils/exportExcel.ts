import { FamilyState } from '../types';

function xmlEscape(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitizes worksheet title so it is valid in Microsoft Excel and Google Sheets:
 * Max 31 characters, no invalid chars : \ / ? * [ ]
 */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
}

/**
 * Exports all data from the family unit into a comprehensive multi-sheet Excel Workbook (.xls)
 * Compatible with Microsoft Excel, Google Sheets, LibreOffice, and Apple Numbers.
 */
export function exportFullFamilyToExcel(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const today = new Date().toISOString().slice(0, 10);
  const currencyCode = state.currencyCode || 'EUR';
  const currencySymbol = state.currency || '€';

  // 1. Financial Totals & Balances
  const totalIncome = (state.transactions || [])
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpenses = (state.transactions || [])
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalTransfers = (state.transactions || [])
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  // Liquid assets vs debts in bank accounts
  const liquidAssets = (state.bankAccounts || [])
    .filter(b => b.accountType === 'checking' || b.accountType === 'savings' || b.accountType === 'investment')
    .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);
  const debtTotal = (state.bankAccounts || [])
    .filter(b => b.accountType === 'credit' || b.accountType === 'loan')
    .reduce((sum, b) => sum + Math.abs(Number(b.balance) || 0), 0);
  const netWorth = liquidAssets - debtTotal;

  // Recurring totals
  const monthlyRecurringExpenses = (state.recurringExpenses || [])
    .filter(r => r.isActive)
    .reduce((sum, r) => {
      const amt = Number(r.amount) || 0;
      return sum + (r.frequency === 'yearly' ? amt / 12 : r.frequency === 'weekly' ? amt * 4.33 : amt);
    }, 0);

  const monthlyRecurringIncomes = (state.recurringIncomes || [])
    .filter(i => i.isActive)
    .reduce((sum, i) => {
      const amt = Number(i.amount) || 0;
      return sum + (i.frequency === 'yearly' ? amt / 12 : i.frequency === 'weekly' ? amt * 4.33 : amt);
    }, 0);

  const netFixedFlow = monthlyRecurringIncomes - monthlyRecurringExpenses;

  // Savings goals
  const totalGoalsTarget = (state.savingsGoals || []).reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalGoalsSaved = (state.savingsGoals || []).reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);

  // =========================================================
  // SHEET 1: RESUMEN GENERAL EJECUTIVO
  // =========================================================
  const resumenRows: [string, string][] = [
    ['Parámetro', 'Valor'],
    ['Nombre de la Unidad Familiar', currentFamilyName],
    ['Moneda Base del Sistema', `${currencyCode} (${currencySymbol})`],
    ['Presupuesto Mensual Global', `${currencySymbol} ${Number(state.globalMonthlyBudget || 0).toFixed(2)}`],
    ['Total Ingresos Registrados (Acumulado)', `${currencySymbol} ${totalIncome.toFixed(2)}`],
    ['Total Gastos Registrados (Acumulado)', `${currencySymbol} ${totalExpenses.toFixed(2)}`],
    ['Total Transferencias Entre Cuentas', `${currencySymbol} ${totalTransfers.toFixed(2)}`],
    ['Balance Neto Acumulado (Ingresos - Gastos)', `${currencySymbol} ${netBalance.toFixed(2)}`],
    ['Activos Líquidos en Bancos (Cuentas/Ahorro/Inv)', `${currencySymbol} ${liquidAssets.toFixed(2)}`],
    ['Deuda Acumulada (Tarjetas de Crédito y Préstamos)', `${currencySymbol} ${debtTotal.toFixed(2)}`],
    ['Patrimonio Neto Familiar Estimado', `${currencySymbol} ${netWorth.toFixed(2)}`],
    ['Total Miembros Registrados', String((state.members || []).length)],
    ['Total Cuentas Bancarias Registradas', String((state.bankAccounts || []).length)],
    ['Metas de Ahorro Activas', String((state.savingsGoals || []).length)],
    ['Ahorro Acumulado en Metas', `${currencySymbol} ${totalGoalsSaved.toFixed(2)} de ${currencySymbol} ${totalGoalsTarget.toFixed(2)}`],
    ['Gastos Recurrentes Activos (Compromiso Mensual)', `${currencySymbol} ${monthlyRecurringExpenses.toFixed(2)}/mes`],
    ['Ingresos Recurrentes Activos (Nóminas/Fijos)', `${currencySymbol} ${monthlyRecurringIncomes.toFixed(2)}/mes`],
    ['Flujo Fijo Neto Mensual (Ingresos - Gastos Fijos)', `${currencySymbol} ${netFixedFlow.toFixed(2)}/mes`],
    ['Transferencias Recurrentes Activas', String((state.recurringTransfers || []).length)],
    ['Asignaciones / Mesadas Infantiles', String((state.childAllowances || []).length)],
    ['Fecha de Generación del Archivo', today],
  ];

  // =========================================================
  // SHEET 2: TRANSACCIONES EXHAUSTIVAS
  // =========================================================
  const txHeaders = [
    'ID Transacción',
    'Fecha',
    'Descripción',
    'Tipo',
    'Categoría',
    'Miembro Titular / Emisor',
    'Miembro Receptor',
    'Cuenta Bancaria Origen',
    'Cuenta Bancaria Destino',
    `Importe (${currencyCode})`,
    'Moneda Base',
    'Importe Moneda Original',
    'Moneda Original',
    'Tasa de Cambio',
    'Gasto Compartido',
    'Vinculado a Recurrente',
    'Registro Automático',
    'Conciliación Bancaria',
    'Etiquetas',
    'Notas',
  ];

  const txRows = (state.transactions || []).map(t => {
    const memberName = state.members.find(m => m.id === t.memberId)?.name || 'Familiar';
    const toMemberName = t.toMemberId ? (state.members.find(m => m.id === t.toMemberId)?.name || 'Familiar') : '';

    const originAcc = state.bankAccounts.find(b => b.id === t.bankAccountId);
    const originAccStr = originAcc
      ? `${originAcc.bankName} - ${originAcc.name} (${originAcc.accountNumberMasked || 'N/A'})`
      : '';

    const destAcc = t.toBankAccountId ? state.bankAccounts.find(b => b.id === t.toBankAccountId) : undefined;
    const destAccStr = destAcc
      ? `${destAcc.bankName} - ${destAcc.name} (${destAcc.accountNumberMasked || 'N/A'})`
      : '';

    const typeLabel = t.type === 'income' ? 'Ingreso' : t.type === 'transfer' ? 'Transferencia' : 'Gasto';
    const tagsStr = (t.tags || []).join('; ');
    const isShared = t.isSharedExpense ? 'Sí' : 'No';
    const isRecurring = t.recurringExpenseId || t.recurringIncomeId || t.recurringTransferId ? 'Sí' : 'No';
    const isAuto = t.isAutoLogged ? 'Sí' : 'No';
    const isSynced = t.isBankSynced ? 'Sincronizado' : 'Manual';

    return [
      t.id,
      t.date,
      t.description,
      typeLabel,
      t.category,
      memberName,
      toMemberName,
      originAccStr,
      destAccStr,
      Number(t.amount || 0).toFixed(2),
      currencyCode,
      t.originalAmount !== undefined ? Number(t.originalAmount).toFixed(2) : Number(t.amount || 0).toFixed(2),
      t.currency || currencyCode,
      t.exchangeRate ? Number(t.exchangeRate).toFixed(4) : '1.0000',
      isShared,
      isRecurring,
      isAuto,
      isSynced,
      tagsStr,
      t.notes || '',
    ];
  });

  // =========================================================
  // SHEET 3: PRESUPUESTO Y CATEGORÍAS
  // =========================================================
  const catHeaders = [
    'ID Categoría',
    'Nombre de Categoría',
    `Límite Presupuestario Mensual (${currencyCode})`,
    'Umbral de Alerta (%)',
    'Clasificación Regla 50/30/20',
    `Gasto Total Acumulado (${currencyCode})`,
    `Saldo Restante / Exceso (${currencyCode})`,
    'Es Personalizada',
  ];

  const catRows = (state.categories || []).map(c => {
    const totalSpent = (state.transactions || [])
      .filter(t => t.type === 'expense' && t.category === c.name)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const limit = Number(c.budgetLimit || 0);
    const diff = limit - totalSpent;

    let bucketName = 'Sin Asignar';
    if (c.bucket503020 === 'needs') bucketName = 'Necesidades Básicas (50%)';
    else if (c.bucket503020 === 'wants') bucketName = 'Deseos y Estilo de Vida (30%)';
    else if (c.bucket503020 === 'savings') bucketName = 'Ahorro / Deudas (20%)';

    return [
      c.id,
      c.name,
      limit.toFixed(2),
      `${c.alertThreshold || 80}%`,
      bucketName,
      totalSpent.toFixed(2),
      diff.toFixed(2),
      c.isCustom ? 'Sí' : 'No',
    ];
  });

  // =========================================================
  // SHEET 4: REGLA 50/30/20
  // =========================================================
  const ruleHeaders = [
    'Pilar 50/30/20',
    '% Recomendado',
    `Límite Mensual Combinado (${currencyCode})`,
    `Gasto Total Registrado (${currencyCode})`,
    '% del Gasto Total Real',
    'Diagnóstico',
  ];

  const needsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'needs')
    .reduce((sum, c) => {
      const spent = (state.transactions || [])
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return sum + spent;
    }, 0);
  const needsBudget = (state.categories || [])
    .filter(c => c.bucket503020 === 'needs')
    .reduce((sum, c) => sum + (Number(c.budgetLimit) || 0), 0);

  const wantsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'wants')
    .reduce((sum, c) => {
      const spent = (state.transactions || [])
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return sum + spent;
    }, 0);
  const wantsBudget = (state.categories || [])
    .filter(c => c.bucket503020 === 'wants')
    .reduce((sum, c) => sum + (Number(c.budgetLimit) || 0), 0);

  const savingsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'savings')
    .reduce((sum, c) => {
      const spent = (state.transactions || [])
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return sum + spent;
    }, 0);
  const savingsBudget = (state.categories || [])
    .filter(c => c.bucket503020 === 'savings')
    .reduce((sum, c) => sum + (Number(c.budgetLimit) || 0), 0);

  const totalBucketSpent = needsSpent + wantsSpent + savingsSpent || totalExpenses || 1;
  const needsPct = ((needsSpent / totalBucketSpent) * 100).toFixed(1);
  const wantsPct = ((wantsSpent / totalBucketSpent) * 100).toFixed(1);
  const savingsPct = ((savingsSpent / totalBucketSpent) * 100).toFixed(1);

  const ruleRows = [
    [
      'Necesidades Básicas (Vivienda, Comida, Salud, Servicios)',
      '50%',
      needsBudget.toFixed(2),
      needsSpent.toFixed(2),
      `${needsPct}%`,
      Number(needsPct) <= 50 ? 'En Rango Óptimo' : 'Supera recomendación (Revisar fijos)',
    ],
    [
      'Deseos y Calidad de Vida (Ocio, Restaurantes, Caprichos)',
      '30%',
      wantsBudget.toFixed(2),
      wantsSpent.toFixed(2),
      `${wantsPct}%`,
      Number(wantsPct) <= 30 ? 'Bajo Control' : 'Exceso en gastos discrecionales',
    ],
    [
      'Ahorro, Inversión y Amortización de Deudas',
      '20%',
      savingsBudget.toFixed(2),
      savingsSpent.toFixed(2),
      `${savingsPct}%`,
      Number(savingsPct) >= 20 ? 'Excelente Capacidad' : 'Inferior al 20% recomendado',
    ],
  ];

  // =========================================================
  // SHEET 5: MIEMBROS FAMILIARES
  // =========================================================
  const memberHeaders = [
    'ID Miembro',
    'Nombre',
    'Rol Familiar',
    'Correo Electrónico',
    `Ingreso Mensual Declarado (${currencyCode})`,
    'Es Dependiente',
    `Total Gastado Registrado (${currencyCode})`,
    `Total Ingresado Registrado (${currencyCode})`,
    `Balance Neto (${currencyCode})`,
  ];

  const memberRows = (state.members || []).map(m => {
    const memberExpenses = (state.transactions || [])
      .filter(t => t.memberId === m.id && t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const memberIncome = (state.transactions || [])
      .filter(t => t.memberId === m.id && t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const mBalance = memberIncome - memberExpenses;

    return [
      m.id,
      m.name,
      m.role || 'Miembro',
      m.email || 'N/A',
      m.monthlyIncome !== undefined ? Number(m.monthlyIncome).toFixed(2) : '0.00',
      m.isDependent ? 'Sí' : 'No',
      memberExpenses.toFixed(2),
      memberIncome.toFixed(2),
      mBalance.toFixed(2),
    ];
  });

  // =========================================================
  // SHEET 6: CUENTAS BANCARIAS
  // =========================================================
  const bankHeaders = [
    'ID Cuenta',
    'Nombre de Cuenta',
    'Entidad Bancaria',
    'Tipo de Producto',
    'Titular Familiar',
    'Divisa de Cuenta',
    `Saldo Actual (${currencyCode})`,
    `Límite de Crédito (${currencyCode})`,
    'Tasa de Interés (APR %)',
    `Cuota Mínima Mensual (${currencyCode})`,
    'Día de Corte / Vencimiento',
    'Fecha de Vencimiento',
    'Número Enmascarado',
    'IBAN / Número',
    'Sincronización',
    'Última Sincronización',
    'Notas',
  ];

  const typeMap: Record<string, string> = {
    checking: 'Cuenta Corriente',
    savings: 'Cuenta de Ahorros',
    credit: 'Tarjeta de Crédito',
    loan: 'Préstamo / Hipoteca',
    investment: 'Inversión / Fondos',
  };

  const bankRows = (state.bankAccounts || []).map(b => {
    const holder = state.members.find(m => m.id === b.holderMemberId)?.name || 'Familiar';
    return [
      b.id,
      b.name,
      b.bankName,
      typeMap[b.accountType] || b.accountType,
      holder,
      b.currency || currencyCode,
      Number(b.balance || 0).toFixed(2),
      Number(b.creditLimit || 0).toFixed(2),
      b.interestRate !== undefined ? Number(b.interestRate).toFixed(2) : '0.00',
      Number(b.minimumPayment || 0).toFixed(2),
      b.dueDay ? `Día ${b.dueDay}` : 'N/A',
      b.dueDate || 'N/A',
      b.accountNumberMasked || 'N/A',
      b.iban || 'N/A',
      b.autoSync ? 'Automática' : 'Manual',
      b.lastSynced || 'N/A',
      b.notes || '',
    ];
  });

  // =========================================================
  // SHEET 7: PLAN DE DEUDAS Y PRÉSTAMOS
  // =========================================================
  const debtHeaders = [
    'ID Deuda',
    'Concepto / Producto',
    'Entidad Financiera',
    'Titular',
    'Tipo',
    `Saldo Adeudado (${currencyCode})`,
    `Límite de Crédito (${currencyCode})`,
    'Tasa de Interés Anual (APR %)',
    `Pago Mínimo Mensual (${currencyCode})`,
    'Día de Corte / Pago',
    'Estado',
  ];

  const debtAccounts = (state.bankAccounts || []).filter(
    b => b.accountType === 'credit' || b.accountType === 'loan'
  );

  const debtRows = debtAccounts.map(b => {
    const holder = state.members.find(m => m.id === b.holderMemberId)?.name || 'Familiar';
    const owed = Math.abs(Number(b.balance || 0));
    return [
      b.id,
      b.name,
      b.bankName,
      holder,
      b.accountType === 'credit' ? 'Tarjeta de Crédito' : 'Préstamo / Financiación',
      owed.toFixed(2),
      Number(b.creditLimit || 0).toFixed(2),
      b.interestRate !== undefined ? `${Number(b.interestRate).toFixed(2)}%` : '0.00%',
      Number(b.minimumPayment || 0).toFixed(2),
      b.dueDay ? `Día ${b.dueDay}` : 'N/A',
      owed > 0 ? 'Activa con saldo' : 'Al corriente (Saldo 0)',
    ];
  });

  // =========================================================
  // SHEET 8: METAS DE AHORRO
  // =========================================================
  const goalHeaders = [
    'ID Meta',
    'Nombre de la Meta',
    `Monto Objetivo (${currencyCode})`,
    `Monto Ahorrado (${currencyCode})`,
    'Progreso (%)',
    'Miembro Asignado',
    'Fecha Límite',
    'Aportaciones Registradas',
    'Estado',
  ];

  const goalRows = (state.savingsGoals || []).map(g => {
    const target = Number(g.targetAmount || 0);
    const current = Number(g.currentAmount || 0);
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const member = g.assignedMemberId === 'all'
      ? 'Toda la Familia'
      : state.members.find(m => m.id === g.assignedMemberId)?.name || 'Toda la Familia';
    const contribs = (g.contributions || []).length;
    const isCompleted = current >= target && target > 0;

    return [
      g.id,
      g.title,
      target.toFixed(2),
      current.toFixed(2),
      `${percent}%`,
      member,
      g.deadline || 'Sin fecha límite',
      contribs,
      isCompleted ? 'Alcanzada' : 'En Progreso',
    ];
  });

  // =========================================================
  // SHEET 9: HISTORIAL DE APORTACIONES A METAS
  // =========================================================
  const contribHeaders = [
    'ID Aportación',
    'Meta de Ahorro',
    'Fecha',
    `Importe Aportado (${currencyCode})`,
    'Miembro Aportante',
    'Nota / Detalle',
  ];

  const contribRows: (string | number)[][] = [];
  (state.savingsGoals || []).forEach(g => {
    (g.contributions || []).forEach(c => {
      const member = state.members.find(m => m.id === c.memberId)?.name || 'Familiar';
      contribRows.push([
        c.id,
        g.title,
        c.date,
        Number(c.amount || 0).toFixed(2),
        member,
        c.note || '',
      ]);
    });
  });

  // =========================================================
  // SHEET 10: GASTOS RECURRENTES Y SUSCRIPCIONES
  // =========================================================
  const recExpHeaders = [
    'ID Gasto',
    'Concepto',
    `Importe Mensual Base (${currencyCode})`,
    'Moneda Factura',
    'Importe Original',
    'Tasa de Cambio',
    'Frecuencia',
    'Categoría',
    'Miembro Responsable',
    'Cuenta de Débito',
    'Día de Cobro',
    'Próximo Vencimiento',
    'Registro Automático',
    'Estado',
    'Último Pago Registrado',
    'Notas',
  ];

  const recExpRows = (state.recurringExpenses || []).map(r => {
    const member = state.members.find(m => m.id === r.memberId)?.name || 'Familiar';
    const acc = state.bankAccounts.find(b => b.id === r.paymentAccountId);
    const debitAccountLabel = acc ? `${acc.bankName} - ${acc.name} (${acc.accountNumberMasked || 'N/A'})` : 'Sin asignar';
    const freqLabel = r.frequency === 'monthly' ? 'Mensual' : r.frequency === 'yearly' ? 'Anual' : r.frequency || 'Periódico';

    return [
      r.id,
      r.title,
      Number(r.amount || 0).toFixed(2),
      r.currency || currencyCode,
      Number(r.originalAmount || r.amount || 0).toFixed(2),
      r.exchangeRate ? Number(r.exchangeRate).toFixed(4) : '1.0000',
      freqLabel,
      r.category,
      member,
      debitAccountLabel,
      r.dueDay ? `Día ${r.dueDay}` : 'N/A',
      r.nextDueDate || 'Pendiente',
      r.autoRegister || r.autoLogTransaction ? 'Sí' : 'No',
      r.isActive ? 'Activo' : 'Pausado',
      r.lastPaidDate || 'N/A',
      r.notes || '',
    ];
  });

  // =========================================================
  // SHEET 11: INGRESOS RECURRENTES Y NÓMINAS
  // =========================================================
  const recIncHeaders = [
    'ID Ingreso',
    'Concepto / Fuente',
    `Importe Mensual Base (${currencyCode})`,
    'Moneda Original',
    'Importe Moneda Original',
    'Tasa de Cambio',
    'Frecuencia',
    'Desglose Cuotas / Quincenas',
    'Categoría / Tipo de Ingreso',
    'Miembro Perceptor',
    'Cuenta Bancaria Destino',
    'Día de Cobro',
    'Próximo Cobro',
    'Registro Automático',
    'Estado',
    'Último Cobro Registrado',
    'Notas',
  ];

  const recIncRows = (state.recurringIncomes || []).map(i => {
    const member = state.members.find(m => m.id === i.memberId)?.name || 'Familiar';
    const acc = state.bankAccounts.find(b => b.id === i.destinationAccountId);
    const destAccStr = acc ? `${acc.bankName} - ${acc.name} (${acc.accountNumberMasked || 'N/A'})` : 'Sin asignar';
    const freqLabel = i.frequency === 'monthly' ? 'Mensual' : i.frequency === 'biweekly' ? 'Quincenal' : i.frequency === 'yearly' ? 'Anual' : i.frequency || 'Periódico';

    let installmentsStr = '1 cuota mensual';
    if (i.installments && i.installments.length > 0) {
      installmentsStr = i.installments.map(ins => `${ins.name || ins.label || 'Cuota'}: ${currencySymbol}${Number(ins.amount || 0).toFixed(2)} (Día ${ins.day})`).join('; ');
    }

    return [
      i.id,
      i.title,
      Number(i.amount || 0).toFixed(2),
      i.currency || currencyCode,
      Number(i.originalAmount || i.amount || 0).toFixed(2),
      i.exchangeRate ? Number(i.exchangeRate).toFixed(4) : '1.0000',
      freqLabel,
      installmentsStr,
      i.category || 'Nómina / Salario',
      member,
      destAccStr,
      i.dueDay ? `Día ${i.dueDay}` : 'N/A',
      i.nextDueDate || 'Pendiente',
      i.autoRegister ? 'Sí' : 'No',
      i.isActive ? 'Activo' : 'Pausado',
      i.lastRegisteredDate || 'N/A',
      i.notes || '',
    ];
  });

  // =========================================================
  // SHEET 12: TRANSFERENCIAS RECURRENTES
  // =========================================================
  const recTxHeaders = [
    'ID Transferencia',
    'Concepto',
    `Importe Mensual Base (${currencyCode})`,
    'Moneda Original',
    'Importe Moneda Original',
    'Frecuencia',
    'Cuenta Origen (Débito)',
    'Cuenta Destino (Crédito)',
    'Titular Origen',
    'Titular Destino',
    'Categoría',
    'Desglose Cuotas',
    'Día de Ejecución',
    'Próxima Ejecución',
    'Registro Automático',
    'Estado',
    'Última Ejecución',
    'Notas',
  ];

  const recTxRows = (state.recurringTransfers || []).map(t => {
    const fromMember = state.members.find(m => m.id === t.fromMemberId)?.name || 'Familiar';
    const toMember = state.members.find(m => m.id === t.toMemberId)?.name || 'Familiar';
    const fromAcc = state.bankAccounts.find(b => b.id === t.fromBankAccountId);
    const toAcc = state.bankAccounts.find(b => b.id === t.toBankAccountId);
    const fromAccStr = fromAcc ? `${fromAcc.bankName} - ${fromAcc.name} (${fromAcc.accountNumberMasked || 'N/A'})` : 'Sin asignar';
    const toAccStr = toAcc ? `${toAcc.bankName} - ${toAcc.name} (${toAcc.accountNumberMasked || 'N/A'})` : 'Sin asignar';
    const freqLabel = t.frequency === 'monthly' ? 'Mensual' : t.frequency === 'biweekly' ? 'Quincenal' : t.frequency === 'yearly' ? 'Anual' : t.frequency;

    let installmentsStr = '1 ejecución mensual';
    if (t.installments && t.installments.length > 0) {
      installmentsStr = t.installments.map(ins => `${ins.name || ins.label || 'Cuota'}: ${currencySymbol}${Number(ins.amount || 0).toFixed(2)} (Día ${ins.day})`).join('; ');
    }

    return [
      t.id,
      t.title,
      Number(t.amount || 0).toFixed(2),
      t.currency || currencyCode,
      Number(t.originalAmount || t.amount || 0).toFixed(2),
      freqLabel,
      fromAccStr,
      toAccStr,
      fromMember,
      toMember,
      t.category || 'Traspaso Programado',
      installmentsStr,
      t.dueDay ? `Día ${t.dueDay}` : 'N/A',
      t.nextDueDate || 'Pendiente',
      t.autoRegister ? 'Sí' : 'No',
      t.isActive ? 'Activo' : 'Pausado',
      t.lastTransferredDate || 'N/A',
      t.notes || '',
    ];
  });

  // =========================================================
  // SHEET 13: MESADAS INFANTILES Y TAREAS
  // =========================================================
  const allowHeaders = [
    'ID Asignación',
    'Miembro Asignado (Hijo/a)',
    `Monto Base (${currencyCode})`,
    'Frecuencia',
    `Ahorros Acumulados (${currencyCode})`,
    'Día de Cobro / Pago',
    'Tareas Requeridas',
    'Estado',
    'Último Pago Realizado',
  ];

  const allowRows = (state.childAllowances || []).map(a => {
    const memberName = state.members.find(m => m.id === a.memberId)?.name || 'Hijo/a';
    const tasks = (a.tasksRequired || []).join('; ');
    return [
      a.id,
      memberName,
      Number(a.amount || 0).toFixed(2),
      a.frequency === 'weekly' ? 'Semanal' : a.frequency === 'monthly' ? 'Mensual' : a.frequency || 'Periódico',
      Number(a.currentSavings || 0).toFixed(2),
      a.payoutDay || 'N/A',
      tasks || 'Ninguna',
      a.isActive ? 'Activo' : 'Inactivo',
      a.lastPayoutDate || 'N/A',
    ];
  });

  // =========================================================
  // SHEET 14: ETIQUETAS (TAGS)
  // =========================================================
  const tagHeaders = ['ID Etiqueta', 'Nombre de Etiqueta', 'Color', 'Total de Transacciones Asociadas'];
  const tagRows = (state.tags || []).map(tag => {
    const count = (state.transactions || []).filter(t => (t.tags || []).includes(tag.name)).length;
    return [tag.id, tag.name, tag.color, count];
  });

  // =========================================================
  // XML BUILDER HELPERS
  // =========================================================
  function buildWorksheetXml(sheetName: string, headers: string[], rows: (string | number)[][]): string {
    const cleanName = sanitizeSheetName(sheetName);
    let xml = ` <Worksheet ss:Name="${xmlEscape(cleanName)}">\n  <Table>\n`;
    // Header row
    xml += '   <Row>\n';
    for (const h of headers) {
      xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>\n`;
    }
    xml += '   </Row>\n';

    // Data rows
    for (const row of rows) {
      xml += '   <Row>\n';
      for (const val of row) {
        const isNum = typeof val === 'number' || (
          !isNaN(Number(val)) &&
          typeof val === 'string' &&
          val.trim() !== '' &&
          !val.includes('-') &&
          !val.includes('/') &&
          !val.includes('%') &&
          !val.includes(':') &&
          !val.includes(';') &&
          !val.startsWith('0') &&
          !val.startsWith('*')
        );
        const type = isNum ? 'Number' : 'String';
        xml += `    <Cell><Data ss:Type="${type}">${xmlEscape(val)}</Data></Cell>\n`;
      }
      xml += '   </Row>\n';
    }
    xml += '  </Table>\n </Worksheet>\n';
    return xml;
  }

  function buildKeyValueSheetXml(sheetName: string, rows: [string, string][]): string {
    const cleanName = sanitizeSheetName(sheetName);
    let xml = ` <Worksheet ss:Name="${xmlEscape(cleanName)}">\n  <Table>\n`;
    xml += `   <Row>\n    <Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(rows[0][0])}</Data></Cell>\n    <Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(rows[0][1])}</Data></Cell>\n   </Row>\n`;
    for (let i = 1; i < rows.length; i++) {
      xml += `   <Row>\n    <Cell ss:StyleID="Bold"><Data ss:Type="String">${xmlEscape(rows[i][0])}</Data></Cell>\n    <Cell><Data ss:Type="String">${xmlEscape(rows[i][1])}</Data></Cell>\n   </Row>\n`;
    }
    xml += '  </Table>\n </Worksheet>\n';
    return xml;
  }

  // =========================================================
  // WORKBOOK COMPILATION
  // =========================================================
  let fullXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="11"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Bold">
   <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="11"/>
  </Style>
 </Styles>
`;

  fullXml += buildKeyValueSheetXml('Resumen General', resumenRows);
  fullXml += buildWorksheetXml('Transacciones', txHeaders, txRows);
  fullXml += buildWorksheetXml('Presupuesto y Categorias', catHeaders, catRows);
  fullXml += buildWorksheetXml('Regla 50-30-20', ruleHeaders, ruleRows);
  fullXml += buildWorksheetXml('Miembros', memberHeaders, memberRows);
  fullXml += buildWorksheetXml('Cuentas Bancarias', bankHeaders, bankRows);
  fullXml += buildWorksheetXml('Plan Deudas y Prestamos', debtHeaders, debtRows);
  fullXml += buildWorksheetXml('Metas de Ahorro', goalHeaders, goalRows);
  fullXml += buildWorksheetXml('Aportaciones a Metas', contribHeaders, contribRows);
  fullXml += buildWorksheetXml('Gastos Recurrentes', recExpHeaders, recExpRows);
  fullXml += buildWorksheetXml('Ingresos Recurrentes', recIncHeaders, recIncRows);
  fullXml += buildWorksheetXml('Transferencias Recurrentes', recTxHeaders, recTxRows);
  fullXml += buildWorksheetXml('Mesadas Infantiles', allowHeaders, allowRows);
  fullXml += buildWorksheetXml('Etiquetas', tagHeaders, tagRows);

  fullXml += '</Workbook>';

  const blob = new Blob([fullXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanFamilyName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.setAttribute('download', `Finanzas_Unidad_${cleanFamilyName}_${today}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
