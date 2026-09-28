import { FamilyState } from '../types';

/**
 * Escapes a cell value for standard CSV formatting.
 * Encloses values containing commas, quotes, or newlines in double quotes.
 */
function csvEscape(val: any): string {
  if (val === null || val === undefined) return '""';
  const raw = String(val);
  const neutralized = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Formats a number with 2 decimals or empty string if not a number
 */
function fmtNum(val: any): string {
  const n = Number(val);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

/**
 * Triggers a browser download of CSV text with UTF-8 BOM so Excel opens it with proper accents.
 */
function triggerCsvDownload(csvContent: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Exports all transactions with exhaustive detail to CSV
 */
export function exportTransactionsToCSV(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const safeName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    'ID Transacción',
    'Fecha',
    'Descripción',
    'Tipo',
    'Categoría',
    'Miembro Emisor / Titular',
    'Miembro Receptor',
    'Cuenta Bancaria Origen',
    'Cuenta Bancaria Destino',
    `Importe (${state.currencyCode || 'Base'})`,
    'Moneda Base',
    'Importe Moneda Original',
    'Moneda Original',
    'Tasa de Cambio Aplicada',
    'Gasto Compartido Familiar',
    'Vinculado a Recurrente',
    'Registro Automático',
    'Conciliación Bancaria',
    'Etiquetas',
    'Notas',
  ];

  const rows = (state.transactions || []).map(t => {
    const member = state.members.find(m => m.id === t.memberId)?.name || 'Familiar';
    const toMember = t.toMemberId ? (state.members.find(m => m.id === t.toMemberId)?.name || 'Familiar') : '';

    const originAccount = state.bankAccounts.find(b => b.id === t.bankAccountId);
    const originAccountStr = originAccount
      ? `${originAccount.bankName} - ${originAccount.name} (${originAccount.accountNumberMasked || 'N/A'})`
      : '';

    const destAccount = t.toBankAccountId ? state.bankAccounts.find(b => b.id === t.toBankAccountId) : undefined;
    const destAccountStr = destAccount
      ? `${destAccount.bankName} - ${destAccount.name} (${destAccount.accountNumberMasked || 'N/A'})`
      : '';

    const typeLabel = t.type === 'income' ? 'Ingreso' : t.type === 'transfer' ? 'Transferencia' : 'Gasto';
    const tagsStr = (t.tags || []).join('; ');
    const originalAmt = t.originalAmount !== undefined ? fmtNum(t.originalAmount) : fmtNum(t.amount);
    const origCurrency = t.currency || state.currencyCode || 'EUR';
    const exchangeRate = t.exchangeRate ? Number(t.exchangeRate).toFixed(4) : '1.0000';
    const isShared = t.isSharedExpense ? 'Sí' : 'No';
    const isRecurring = t.recurringExpenseId || t.recurringIncomeId || t.recurringTransferId ? 'Sí' : 'No';
    const isAuto = t.isAutoLogged ? 'Sí' : 'No';
    const isBankSynced = t.isBankSynced ? 'Sincronizado' : 'Manual';

    return [
      csvEscape(t.id),
      csvEscape(t.date),
      csvEscape(t.description),
      csvEscape(typeLabel),
      csvEscape(t.category),
      csvEscape(member),
      csvEscape(toMember),
      csvEscape(originAccountStr),
      csvEscape(destAccountStr),
      fmtNum(t.amount),
      csvEscape(state.currencyCode || 'EUR'),
      originalAmt,
      csvEscape(origCurrency),
      exchangeRate,
      csvEscape(isShared),
      csvEscape(isRecurring),
      csvEscape(isAuto),
      csvEscape(isBankSynced),
      csvEscape(tagsStr),
      csvEscape(t.notes || ''),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  triggerCsvDownload(csv, `Transacciones_${safeName}_${today}.csv`);
}

/**
 * 2. Exports categories, budgets, and 50/30/20 buckets to CSV
 */
export function exportBudgetsToCSV(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const safeName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    'ID Categoría',
    'Nombre de Categoría',
    `Límite Presupuestario Mensual (${state.currencyCode})`,
    'Umbral de Alerta (%)',
    'Clasificación Regla 50/30/20',
    `Total Gastado Acumulado (${state.currencyCode})`,
    `Saldo Restante (${state.currencyCode})`,
    'Es Personalizada',
  ];

  const rows = (state.categories || []).map(c => {
    const totalSpent = (state.transactions || [])
      .filter(t => t.type === 'expense' && t.category === c.name)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const limit = Number(c.budgetLimit || 0);
    const remaining = limit - totalSpent;

    let bucketName = 'Sin Asignar';
    if (c.bucket503020 === 'needs') bucketName = 'Necesidades Básicas (50%)';
    else if (c.bucket503020 === 'wants') bucketName = 'Deseos y Estilo de Vida (30%)';
    else if (c.bucket503020 === 'savings') bucketName = 'Ahorro / Amortización (20%)';

    return [
      csvEscape(c.id),
      csvEscape(c.name),
      fmtNum(limit),
      csvEscape(`${c.alertThreshold || 80}%`),
      csvEscape(bucketName),
      fmtNum(totalSpent),
      fmtNum(remaining),
      csvEscape(c.isCustom ? 'Sí' : 'No'),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  triggerCsvDownload(csv, `Presupuestos_${safeName}_${today}.csv`);
}

/**
 * 3. Exports bank accounts, credit cards, and loans/debts to CSV
 */
export function exportBankAccountsToCSV(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const safeName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    'ID Cuenta',
    'Nombre de Cuenta',
    'Entidad Bancaria',
    'Tipo de Producto',
    'Titular Familiar',
    'Moneda de Cuenta',
    `Saldo Actual (${state.currencyCode})`,
    `Límite de Crédito (${state.currencyCode})`,
    'Tasa de Interés (APR %)',
    `Cuota Mínima Mensual (${state.currencyCode})`,
    'Día de Corte / Vencimiento',
    'Fecha de Vencimiento',
    'Número Enmascarado',
    'IBAN / Cuenta',
    'Sincronización',
    'Última Sincronización',
    'Notas',
  ];

  const rows = (state.bankAccounts || []).map(b => {
    const holder = state.members.find(m => m.id === b.holderMemberId)?.name || 'Familiar';
    const typeMap: Record<string, string> = {
      checking: 'Cuenta Corriente',
      savings: 'Cuenta de Ahorros',
      credit: 'Tarjeta de Crédito',
      loan: 'Préstamo / Hipoteca',
      investment: 'Inversión / Fondos',
    };

    return [
      csvEscape(b.id),
      csvEscape(b.name),
      csvEscape(b.bankName),
      csvEscape(typeMap[b.accountType] || b.accountType),
      csvEscape(holder),
      csvEscape(b.currency || state.currencyCode || 'EUR'),
      fmtNum(b.balance),
      fmtNum(b.creditLimit || 0),
      b.interestRate !== undefined ? fmtNum(b.interestRate) : '0.00',
      fmtNum(b.minimumPayment || 0),
      b.dueDay ? csvEscape(`Día ${b.dueDay}`) : '""',
      csvEscape(b.dueDate || ''),
      csvEscape(b.accountNumberMasked || 'N/A'),
      csvEscape(b.iban || ''),
      csvEscape(b.autoSync ? 'Automática' : 'Manual'),
      csvEscape(b.lastSynced || ''),
      csvEscape(b.notes || ''),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  triggerCsvDownload(csv, `Cuentas_y_Deudas_${safeName}_${today}.csv`);
}

/**
 * 4. Exports recurring obligations (expenses, incomes, transfers) to CSV
 */
export function exportRecurringToCSV(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const safeName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    'Tipo de Obligación',
    'ID',
    'Concepto / Título',
    `Importe Mensual (${state.currencyCode})`,
    'Moneda Original',
    'Importe Moneda Original',
    'Frecuencia',
    'Categoría',
    'Miembro Emisor / Titular',
    'Cuenta Origen / Pago',
    'Cuenta Destino / Cobro',
    'Día de Cobro / Ejecución',
    'Próximo Vencimiento',
    'Registro Automático',
    'Estado',
    'Último Registro',
    'Notas',
  ];

  const rows: string[] = [];

  // Recurring Expenses
  (state.recurringExpenses || []).forEach(r => {
    const member = state.members.find(m => m.id === r.memberId)?.name || 'Familiar';
    const acc = state.bankAccounts.find(b => b.id === r.paymentAccountId);
    const accStr = acc ? `${acc.bankName} - ${acc.name} (${acc.accountNumberMasked || 'N/A'})` : 'Sin asignar';

    rows.push([
      csvEscape('Gasto Recurrente'),
      csvEscape(r.id),
      csvEscape(r.title),
      fmtNum(r.amount),
      csvEscape(r.currency || state.currencyCode || 'EUR'),
      fmtNum(r.originalAmount || r.amount),
      csvEscape(r.frequency === 'monthly' ? 'Mensual' : r.frequency === 'yearly' ? 'Anual' : r.frequency),
      csvEscape(r.category),
      csvEscape(member),
      csvEscape(accStr),
      csvEscape('N/A'),
      r.dueDay ? csvEscape(`Día ${r.dueDay}`) : '""',
      csvEscape(r.nextDueDate || ''),
      csvEscape(r.autoRegister || r.autoLogTransaction ? 'Sí' : 'No'),
      csvEscape(r.isActive ? 'Activo' : 'Pausado'),
      csvEscape(r.lastPaidDate || ''),
      csvEscape(r.notes || ''),
    ].join(','));
  });

  // Recurring Incomes
  (state.recurringIncomes || []).forEach(i => {
    const member = state.members.find(m => m.id === i.memberId)?.name || 'Familiar';
    const acc = state.bankAccounts.find(b => b.id === i.destinationAccountId);
    const accStr = acc ? `${acc.bankName} - ${acc.name} (${acc.accountNumberMasked || 'N/A'})` : 'Sin asignar';

    rows.push([
      csvEscape('Ingreso Recurrente'),
      csvEscape(i.id),
      csvEscape(i.title),
      fmtNum(i.amount),
      csvEscape(i.currency || state.currencyCode || 'EUR'),
      fmtNum(i.originalAmount || i.amount),
      csvEscape(i.frequency === 'monthly' ? 'Mensual' : i.frequency === 'biweekly' ? 'Quincenal' : i.frequency === 'yearly' ? 'Anual' : i.frequency),
      csvEscape(i.category || 'Nómina / Fijo'),
      csvEscape(member),
      csvEscape('N/A'),
      csvEscape(accStr),
      i.dueDay ? csvEscape(`Día ${i.dueDay}`) : '""',
      csvEscape(i.nextDueDate || ''),
      csvEscape(i.autoRegister ? 'Sí' : 'No'),
      csvEscape(i.isActive ? 'Activo' : 'Pausado'),
      csvEscape(i.lastRegisteredDate || ''),
      csvEscape(i.notes || ''),
    ].join(','));
  });

  // Recurring Transfers
  (state.recurringTransfers || []).forEach(t => {
    const fromMember = state.members.find(m => m.id === t.fromMemberId)?.name || 'Familiar';
    const toMember = state.members.find(m => m.id === t.toMemberId)?.name || 'Familiar';
    const fromAcc = state.bankAccounts.find(b => b.id === t.fromBankAccountId);
    const toAcc = state.bankAccounts.find(b => b.id === t.toBankAccountId);
    const fromAccStr = fromAcc ? `${fromAcc.bankName} - ${fromAcc.name} (${fromAcc.accountNumberMasked || 'N/A'})` : 'Sin asignar';
    const toAccStr = toAcc ? `${toAcc.bankName} - ${toAcc.name} (${toAcc.accountNumberMasked || 'N/A'})` : 'Sin asignar';

    rows.push([
      csvEscape('Transferencia Recurrente'),
      csvEscape(t.id),
      csvEscape(t.title),
      fmtNum(t.amount),
      csvEscape(t.currency || state.currencyCode || 'EUR'),
      fmtNum(t.originalAmount || t.amount),
      csvEscape(t.frequency === 'monthly' ? 'Mensual' : t.frequency === 'biweekly' ? 'Quincenal' : t.frequency === 'yearly' ? 'Anual' : t.frequency),
      csvEscape(t.category || 'Traspaso Programado'),
      csvEscape(`${fromMember} -> ${toMember}`),
      csvEscape(fromAccStr),
      csvEscape(toAccStr),
      t.dueDay ? csvEscape(`Día ${t.dueDay}`) : '""',
      csvEscape(t.nextDueDate || ''),
      csvEscape(t.autoRegister ? 'Sí' : 'No'),
      csvEscape(t.isActive ? 'Activo' : 'Pausado'),
      csvEscape(t.lastTransferredDate || ''),
      csvEscape(t.notes || ''),
    ].join(','));
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  triggerCsvDownload(csv, `Recurrentes_${safeName}_${today}.csv`);
}

/**
 * 5. Exports savings goals and their contribution histories to CSV
 */
export function exportSavingsGoalsToCSV(state: FamilyState, familyName?: string): void {
  const currentFamilyName = familyName || state.familyName || 'Mi Hogar';
  const safeName = currentFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    'ID Meta',
    'Nombre de la Meta',
    `Monto Objetivo (${state.currencyCode})`,
    `Monto Ahorrado Actual (${state.currencyCode})`,
    'Progreso (%)',
    'Miembro Asignado',
    'Fecha Límite',
    'Total Aportaciones',
    'Estado',
  ];

  const rows = (state.savingsGoals || []).map(g => {
    const target = Number(g.targetAmount || 0);
    const current = Number(g.currentAmount || 0);
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const member = g.assignedMemberId === 'all'
      ? 'Toda la Familia'
      : state.members.find(m => m.id === g.assignedMemberId)?.name || 'Toda la Familia';
    const contribCount = (g.contributions || []).length;
    const status = current >= target && target > 0 ? 'Meta Alcanzada' : 'En Progreso';

    return [
      csvEscape(g.id),
      csvEscape(g.title),
      fmtNum(target),
      fmtNum(current),
      csvEscape(`${pct}%`),
      csvEscape(member),
      csvEscape(g.deadline || 'Sin fecha límite'),
      String(contribCount),
      csvEscape(status),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  triggerCsvDownload(csv, `Metas_de_Ahorro_${safeName}_${today}.csv`);
}
