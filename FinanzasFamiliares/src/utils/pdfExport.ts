import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FamilyState } from '../types';
import {
  generateCategoryExpenseChart,
  generateBudgetVsActualChart,
  generateCashFlowAndSavingsChart,
} from './pdfCharts';

/**
 * Formats monetary amounts with comma (,) as thousands separator and dot (.) as decimal separator.
 * e.g. 1250.50 -> "$1,250.50" or "€ 1,250.50"
 */
export function formatCurrencyPDF(
  amount: number | null | undefined,
  currency: string = '€',
  showSign: boolean = false
): string {
  const val = Number(amount) || 0;
  const absVal = Math.abs(val);
  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign) {
    if (val > 0) return `+${currency} ${formattedNumber}`;
    if (val < 0) return `-${currency} ${formattedNumber}`;
    return `${currency} ${formattedNumber}`;
  }

  if (val < 0) {
    return `-${currency} ${formattedNumber}`;
  }
  return `${currency} ${formattedNumber}`;
}

/**
 * Loads the application icon as a PNG Data URL for embedding in jsPDF header.
 */
async function getAppLogoDataUrl(): Promise<string> {
  const tryLoad = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 180;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No context'));
          ctx.drawImage(img, 0, 0, 180, 180);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Image failed'));
      img.src = url;
    });
  };

  try {
    return await Promise.race([
      tryLoad('/apple-touch-icon.png'),
      new Promise<string>((_, reject) => setTimeout(() => reject('timeout'), 400)),
    ]);
  } catch {
    try {
      return await Promise.race([
        tryLoad('/pwa-192x192.png'),
        new Promise<string>((_, reject) => setTimeout(() => reject('timeout'), 400)),
      ]);
    } catch {
      // High quality vector fallback drawing
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(0, 0, 180, 180, 36);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(65, 95, 38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(115, 95, 38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(90, 85, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(90, 85, 7, 0, Math.PI * 2);
      ctx.fill();

      return canvas.toDataURL('image/png');
    }
  }
}

export interface PdfExportPeriodOptions {
  years: number[];
  months: number[]; // 1 to 12
  periodKeys?: string[];
  periodLabel?: string;
}

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTH_SHORT_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export function formatPeriodLabel(years: number[], months: number[]): string {
  const sortedYears = [...years].sort((a, b) => a - b);
  const sortedMonths = [...months].sort((a, b) => a - b);

  if (sortedYears.length === 0 || sortedMonths.length === 0) {
    return 'Sin período seleccionado';
  }

  // Single year, single month
  if (sortedYears.length === 1 && sortedMonths.length === 1) {
    return `${MONTH_NAMES_ES[sortedMonths[0] - 1]} ${sortedYears[0]}`;
  }

  // Single year, all 12 months
  if (sortedYears.length === 1 && sortedMonths.length === 12) {
    return `Año Completo ${sortedYears[0]} (12 meses)`;
  }

  // Multiple years, all 12 months
  if (sortedMonths.length === 12) {
    return `Años Completos ${sortedYears.join(', ')} (${sortedYears.length * 12} meses)`;
  }

  // Single year, consecutive months
  if (sortedYears.length === 1) {
    const isContiguous = sortedMonths.every((m, idx) => idx === 0 || m === sortedMonths[idx - 1] + 1);
    if (isContiguous && sortedMonths.length > 2) {
      return `${MONTH_SHORT_NAMES_ES[sortedMonths[0] - 1]} - ${MONTH_SHORT_NAMES_ES[sortedMonths[sortedMonths.length - 1] - 1]} ${sortedYears[0]} (${sortedMonths.length} meses)`;
    }
    if (sortedMonths.length <= 4) {
      return `${sortedMonths.map(m => MONTH_SHORT_NAMES_ES[m - 1]).join(', ')} ${sortedYears[0]} (${sortedMonths.length} meses)`;
    }
    return `${sortedMonths.length} meses en ${sortedYears[0]}`;
  }

  // Multiple years, single month
  if (sortedMonths.length === 1) {
    return `${MONTH_NAMES_ES[sortedMonths[0] - 1]} en [${sortedYears.join(', ')}] (${sortedYears.length} meses)`;
  }

  // Multiple years, multiple months
  const monthsStr = sortedMonths.length <= 4
    ? sortedMonths.map(m => MONTH_SHORT_NAMES_ES[m - 1]).join(', ')
    : `${sortedMonths.length} meses (${MONTH_SHORT_NAMES_ES[sortedMonths[0] - 1]} a ${MONTH_SHORT_NAMES_ES[sortedMonths[sortedMonths.length - 1] - 1]})`;
  return `${monthsStr} en [${sortedYears.join(', ')}] (${sortedYears.length * sortedMonths.length} meses)`;
}

export async function exportFamilyReportPDF(
  state: FamilyState,
  selectedPeriod: string | PdfExportPeriodOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let years: number[] = [];
  let months: number[] = [];
  let periodKeys: string[] = [];
  let customPeriodLabel: string | undefined;

  if (typeof selectedPeriod === 'string') {
    const [yStr, mStr] = selectedPeriod.split('-');
    const y = parseInt(yStr, 10) || new Date().getFullYear();
    const m = parseInt(mStr, 10) || 1;
    years = [y];
    months = [m];
    periodKeys = [selectedPeriod];
  } else {
    years = [...selectedPeriod.years].sort((a, b) => a - b);
    months = [...selectedPeriod.months].sort((a, b) => a - b);
    customPeriodLabel = selectedPeriod.periodLabel;

    if (selectedPeriod.periodKeys && selectedPeriod.periodKeys.length > 0) {
      periodKeys = selectedPeriod.periodKeys;
    } else {
      periodKeys = [];
      for (const y of years) {
        for (const m of months) {
          periodKeys.push(`${y}-${String(m).padStart(2, '0')}`);
        }
      }
    }
  }

  periodKeys = Array.from(new Set(periodKeys)).sort();
  const periodCount = Math.max(periodKeys.length, 1);
  const periodLabel = customPeriodLabel || formatPeriodLabel(years, months);
  const generationDate = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Filter transactions for this period
  const periodKeysSet = new Set(periodKeys);
  const periodTransactions = (state.transactions || []).filter(t => {
    if (!t.date || t.date.length < 7) return false;
    return periodKeysSet.has(t.date.substring(0, 7));
  });

  const totalIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalTransfers = periodTransactions
    .filter(t => t.type === 'transfer')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
  const savingsRateFormatted = savingsRate.toFixed(1);

  // Scaled monthly budget to selected period length
  const totalGlobalBudget = (Number(state.globalMonthlyBudget) || 0) * periodCount;

  // Liquid assets vs debt totals
  const liquidAccounts = (state.bankAccounts || []).filter(
    b => b.accountType === 'checking' || b.accountType === 'savings' || b.accountType === 'investment'
  );
  const totalLiquidAssets = liquidAccounts.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

  const debtAccounts = (state.bankAccounts || []).filter(
    b => b.accountType === 'credit' || b.accountType === 'loan'
  );
  const totalDebt = debtAccounts.reduce((sum, b) => sum + Math.abs(Number(b.balance) || 0), 0);
  const netWorth = totalLiquidAssets - totalDebt;

  // Load logo icon
  const appLogoDataUrl = await getAppLogoDataUrl();

  // ==========================================
  // CABECERA EJECUTIVA CON ICONO DE LA APP
  // ==========================================
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 38, 'F');

  // Decorative accent line at bottom of header
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 36.5, 140, 1.5, 'F');
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(140, 36.5, 70, 1.5, 'F');

  // Application Icon
  if (appLogoDataUrl) {
    try {
      doc.addImage(appLogoDataUrl, 'PNG', 14, 6.5, 24, 24);
    } catch {
      // Ignore image rendering error if any
    }
  }

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME FINANCIERO FAMILIAR', 43, 15.5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // Sky 400
  const familyNameText = (state.familyName || 'Mi Hogar').toUpperCase();
  doc.text(familyNameText, 43, 23);

  const familyNameWidth = doc.getTextWidth(familyNameText);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  const periodHeaderText = `   |   Período: ${periodLabel}`;
  if (43 + familyNameWidth + doc.getTextWidth(periodHeaderText) <= 196) {
    doc.text(periodHeaderText, 43 + familyNameWidth, 23);
  } else {
    doc.text(`   |   ${periodLabel.length > 38 ? periodLabel.substring(0, 36) + '...' : periodLabel}`, 43 + familyNameWidth, 23);
  }

  // Metadata: family name, coverage, issue date
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `Hogar: ${state.familyName}   |   Cobertura: ${periodCount} ${periodCount === 1 ? 'mes' : 'meses'}   |   Emisión: ${generationDate}`,
    43,
    30.5
  );

  // ==========================================
  // 1. RESUMEN EJECUTIVO DEL PERÍODO
  // ==========================================
  let currentY = 48;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Resumen Ejecutivo (${periodCount === 1 ? 'del Mes' : `del Período - ${periodCount} meses`})`, 14, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Total Ingresos', 'Total Gastos', 'Balance Neto', `Presupuesto (${periodCount > 1 ? `${periodCount}m` : 'Mensual'})`, 'Tasa de Ahorro']],
    body: [
      [
        `+${formatCurrencyPDF(totalIncome, state.currency)}`,
        `-${formatCurrencyPDF(totalExpense, state.currency)}`,
        `${netBalance >= 0 ? '+' : ''}${formatCurrencyPDF(netBalance, state.currency)}`,
        `${formatCurrencyPDF(totalGlobalBudget, state.currency)}`,
        `${savingsRateFormatted}%`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: 3.5,
    },
    bodyStyles: {
      halign: 'center',
      fontStyle: 'bold',
      fontSize: 10.5,
      cellPadding: 4,
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        if (data.column.index === 0) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
        } else if (data.column.index === 1) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (data.column.index === 2) {
          data.cell.styles.textColor = netBalance >= 0 ? [5, 150, 105] : [220, 38, 38];
        } else if (data.column.index === 4) {
          data.cell.styles.textColor = savingsRate >= 20 ? [5, 150, 105] : [79, 70, 229];
        }
      }
    },
  });

  // ==========================================
  // 2. POSICIÓN PATRIMONIAL, BANCOS Y GESTIÓN DE DEUDAS
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Posición Patrimonial, Bancos y Deudas', 14, currentY);

  const bankTableRows = (state.bankAccounts || []).map(b => {
    const holder = state.members.find(m => m.id === b.holderMemberId)?.name || 'Familiar';
    const isDebt = b.accountType === 'credit' || b.accountType === 'loan';
    const typeLabel = b.accountType === 'checking'
      ? 'Cta. Corriente'
      : b.accountType === 'savings'
      ? 'Cta. Ahorros'
      : b.accountType === 'credit'
      ? 'Tarjeta Crédito'
      : b.accountType === 'loan'
      ? 'Préstamo / Hipoteca'
      : 'Inversión';

    const balanceStr = isDebt
      ? `-${formatCurrencyPDF(Math.abs(Number(b.balance) || 0), state.currency)}`
      : formatCurrencyPDF(Number(b.balance) || 0, state.currency);

    const detailRate = b.interestRate !== undefined && b.interestRate > 0 ? `${Number(b.interestRate).toFixed(1)}% APR` : '-';
    const minPay = b.minimumPayment && b.minimumPayment > 0 ? formatCurrencyPDF(b.minimumPayment, state.currency) : '-';

    return [
      b.name,
      b.bankName,
      typeLabel,
      holder,
      balanceStr,
      detailRate,
      minPay,
    ];
  });

  // Append summary row
  bankTableRows.push([
    'TOTALES PATRIMONIALES',
    `Activos: ${formatCurrencyPDF(totalLiquidAssets, state.currency)}`,
    `Deudas: -${formatCurrencyPDF(totalDebt, state.currency)}`,
    '-',
    `Patrimonio Neto: ${formatCurrencyPDF(netWorth, state.currency)}`,
    '-',
    '-',
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Cuenta / Producto', 'Entidad', 'Tipo', 'Titular', 'Saldo Actual', 'Tasa (APR)', 'Cuota Mín.']],
    body: bankTableRows.length > 1 ? bankTableRows : [['Sin cuentas bancarias registradas', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center' },
      6: { halign: 'right' },
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        const isLastRow = data.row.index === bankTableRows.length - 1 && bankTableRows.length > 1;
        if (isLastRow) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          if (data.column.index === 4) {
            data.cell.styles.textColor = netWorth >= 0 ? [5, 150, 105] : [220, 38, 38];
          }
        } else if (data.column.index === 4) {
          const raw = String(data.cell.raw);
          if (raw.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      }
    },
  });

  // ==========================================
  // 3. CONTROL DE PRESUPUESTOS POR CATEGORÍA
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Control de Presupuestos por Categoría', 14, currentY);

  const categoryRows = (state.categories || []).map(cat => {
    const spent = periodTransactions
      .filter(t => t.type === 'expense' && t.category === cat.name)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const limit = (Number(cat.budgetLimit) || 0) * periodCount;
    const diff = limit - spent;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;

    let statusText = 'Normal';
    if (spent > limit && limit > 0) {
      statusText = 'SUPERADO';
    } else if (pct >= (cat.alertThreshold || 80) && limit > 0) {
      statusText = `ALERTA (${cat.alertThreshold || 80}%)`;
    } else {
      statusText = 'EN PRESUPUESTO';
    }

    return [
      cat.name,
      formatCurrencyPDF(limit, state.currency),
      formatCurrencyPDF(spent, state.currency),
      formatCurrencyPDF(diff, state.currency, true),
      `${pct.toFixed(1)}%`,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Categoría', `Límite (${periodCount > 1 ? `${periodCount} meses` : 'Mensual'})`, 'Gastado Real', 'Disponible', '% Consumido', 'Estado de Alerta']],
    body: categoryRows.length > 0 ? categoryRows : [['Sin categorías configuradas', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 118, 110], // Teal 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        if (data.column.index === 3) {
          const val = String(data.cell.raw);
          if (val.startsWith('-')) {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (val.startsWith('+')) {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
        if (data.column.index === 5) {
          if (data.cell.raw === 'SUPERADO') {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (typeof data.cell.raw === 'string' && data.cell.raw.startsWith('ALERTA')) {
            data.cell.styles.textColor = [217, 119, 6];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      }
    },
  });

  // ==========================================
  // 4. DISTRIBUCIÓN MACROECONÓMICA: REGLA 50/30/20
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. Distribución Macroeconómica Familiar (Regla 50/30/20)', 14, currentY);

  const needsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'needs')
    .reduce((sum, c) => {
      return sum + periodTransactions
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, 0);
  const wantsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'wants')
    .reduce((sum, c) => {
      return sum + periodTransactions
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, 0);
  const savingsSpent = (state.categories || [])
    .filter(c => c.bucket503020 === 'savings')
    .reduce((sum, c) => {
      return sum + periodTransactions
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, 0);

  const total503020 = needsSpent + wantsSpent + savingsSpent || totalExpense || 1;
  const needsPct = ((needsSpent / total503020) * 100).toFixed(1);
  const wantsPct = ((wantsSpent / total503020) * 100).toFixed(1);
  const savingsPct = ((savingsSpent / total503020) * 100).toFixed(1);

  const rule503020Rows = [
    [
      'Necesidades Básicas (Vivienda, Alimentación, Salud, Servicios)',
      '50%',
      formatCurrencyPDF(needsSpent, state.currency),
      `${needsPct}%`,
      Number(needsPct) <= 50 ? 'En Rango Óptimo' : 'Exceso en Gastos Esenciales',
    ],
    [
      'Deseos y Calidad de Vida (Ocio, Restaurantes, Caprichos)',
      '30%',
      formatCurrencyPDF(wantsSpent, state.currency),
      `${wantsPct}%`,
      Number(wantsPct) <= 30 ? 'Bajo Control' : 'Exceso en Estilo de Vida',
    ],
    [
      'Ahorro, Inversión y Amortización de Deudas',
      '20%',
      formatCurrencyPDF(savingsSpent, state.currency),
      `${savingsPct}%`,
      Number(savingsPct) >= 20 ? 'Excelente Capacidad' : 'Margen Bajo (Meta: 20%)',
    ],
  ];

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Pilar de la Regla', 'Objetivo Recomendado', 'Gasto Real en el Período', '% Real del Gasto', 'Diagnóstico']],
    body: rule503020Rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
  });

  // ==========================================
  // 5. DISTRIBUCIÓN DEL GASTO POR MIEMBRO
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('5. Distribución del Gasto por Miembro Familiar', 14, currentY);

  const memberRows = (state.members || []).map(member => {
    const memberSpent = periodTransactions
      .filter(t => t.type === 'expense' && t.memberId === member.id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pctOfTotal = totalExpense > 0 ? ((memberSpent / totalExpense) * 100).toFixed(1) : '0.0';
    const txCount = periodTransactions.filter(t => t.memberId === member.id).length;

    return [
      member.name,
      member.role || 'Miembro',
      `${txCount} registros`,
      formatCurrencyPDF(memberSpent, state.currency),
      `${pctOfTotal}%`,
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Miembro Familiar', 'Rol', 'Actividad', 'Total Gastado', '% del Total Familiar']],
    body: memberRows.length > 0 ? memberRows : [['Sin miembros registrados', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
  });

  // ==========================================
  // 6. METAS DE AHORRO FAMILIARES ACTIVAS
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('6. Metas de Ahorro Familiares y Progreso', 14, currentY);

  const goalRows = (state.savingsGoals || []).map(g => {
    const target = Number(g.targetAmount) || 0;
    const current = Number(g.currentAmount) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const member = g.assignedMemberId === 'all'
      ? 'Toda la Familia'
      : state.members.find(m => m.id === g.assignedMemberId)?.name || 'Toda la Familia';
    const isReached = current >= target && target > 0;

    return [
      g.title,
      formatCurrencyPDF(target, state.currency),
      formatCurrencyPDF(current, state.currency),
      `${pct}%`,
      member,
      g.deadline || 'Sin fecha límite',
      isReached ? 'ALCANZADA' : 'EN PROGRESO',
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Meta de Ahorro', 'Objetivo', 'Ahorrado Actual', 'Progreso', 'Asignado a', 'Fecha Límite', 'Estado']],
    body: goalRows.length > 0 ? goalRows : [['Sin metas de ahorro configuradas', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105], // Emerald 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // ==========================================
  // 7. COMPROMISOS FIJOS Y FLUJO RECURRENTE DEL HOGAR
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('7. Compromisos Fijos y Flujo Recurrente Mensual', 14, currentY);

  const recurringRows: (string | number)[][] = [];

  // Active Recurring Incomes
  (state.recurringIncomes || []).filter(i => i.isActive).forEach(inc => {
    recurringRows.push([
      inc.title,
      'Ingreso Fijo (Nómina/Renta)',
      `+${formatCurrencyPDF(Number(inc.amount) || 0, state.currency)}`,
      inc.frequency === 'monthly' ? 'Mensual' : inc.frequency === 'biweekly' ? 'Quincenal' : inc.frequency,
      inc.dueDay ? `Día ${inc.dueDay}` : 'N/A',
      'Activo',
    ]);
  });

  // Active Recurring Expenses
  (state.recurringExpenses || []).filter(r => r.isActive).forEach(exp => {
    recurringRows.push([
      exp.title,
      `Gasto Fijo (${exp.category})`,
      `-${formatCurrencyPDF(Number(exp.amount) || 0, state.currency)}`,
      exp.frequency === 'monthly' ? 'Mensual' : exp.frequency === 'yearly' ? 'Anual' : exp.frequency,
      exp.dueDay ? `Día ${exp.dueDay}` : 'N/A',
      'Activo',
    ]);
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Concepto Recurrente', 'Tipo / Categoría', 'Monto Estimado', 'Frecuencia', 'Día de Cobro/Pago', 'Estado']],
    body: recurringRows.length > 0 ? recurringRows : [['Sin compromisos recurrentes registrados', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [100, 116, 139], // Slate 500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const raw = String(data.cell.raw);
        if (raw.startsWith('+')) data.cell.styles.textColor = [5, 150, 105];
        if (raw.startsWith('-')) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  // ==========================================
  // 8. DETALLE EXHAUSTIVO DE TRANSACCIONES DEL PERÍODO
  // ==========================================
  currentY = (doc as any).lastAutoTable.finalY + 10;
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`8. Detalle Exhaustivo de Transacciones (${periodTransactions.length} registros)`, 14, currentY);

  const txRows = periodTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(tx => {
      const member = state.members.find(m => m.id === tx.memberId)?.name || 'Familiar';
      const toMember = tx.toMemberId ? (state.members.find(m => m.id === tx.toMemberId)?.name || 'Familiar') : '';

      const originAcc = state.bankAccounts.find(b => b.id === tx.bankAccountId);
      const destAcc = tx.toBankAccountId ? state.bankAccounts.find(b => b.id === tx.toBankAccountId) : undefined;

      let accountInfo = originAcc ? originAcc.bankName : '-';
      if (tx.type === 'transfer') {
        accountInfo = `${originAcc?.bankName || 'Cta'} -> ${destAcc?.bankName || 'Cta'}`;
      }

      const tagsStr = (tx.tags || []).map(t => `#${t}`).join(', ') || '-';
      let sign = '-';
      if (tx.type === 'income') sign = '+';
      if (tx.type === 'transfer') sign = '⇆ ';

      const isForeign =
        tx.currency &&
        tx.currency !== (state.currencyCode || 'EUR') &&
        tx.originalAmount !== undefined;

      const formattedPrimary = formatCurrencyPDF(Number(tx.amount) || 0, state.currency);
      const amountStr = isForeign
        ? `${sign}${formattedPrimary} (${formatCurrencyPDF(Number(tx.originalAmount) || 0, tx.currency)})`
        : `${sign}${formattedPrimary}`;

      return [
        tx.date,
        tx.description,
        tx.type === 'transfer' ? 'Transferencia' : tx.category,
        tx.type === 'transfer' && toMember ? `${member} -> ${toMember}` : member,
        accountInfo,
        tagsStr,
        amountStr,
      ];
    });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Fecha', 'Descripción', 'Categoría', 'Titular / Miembro', 'Cuenta / Ruta', 'Etiquetas', 'Importe']],
    body: txRows.length > 0 ? txRows : [['-', 'Sin transacciones registradas en el período', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { cellWidth: 26 },
      3: { cellWidth: 28 },
      4: { cellWidth: 26 },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val.startsWith('+')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (val.startsWith('-')) {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (val.startsWith('⇆')) {
          data.cell.styles.textColor = [79, 70, 229];
        }
      }
    },
  });

  // ==========================================
  // 9. ANÁLISIS VISUAL Y GRÁFICAS RECOMENDADAS
  // (Inicia limpiamente en nueva página)
  // ==========================================
  doc.addPage();
  currentY = 18;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('9. Análisis Visual y Gráficas Financieras Recomendadas', 14, currentY);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(
    'Visualización integral de la estructura del gasto, ejecución presupuestaria y salud del flujo de caja.',
    14,
    currentY + 5.5
  );

  // Prepare chart data
  const categoryExpenseData = (state.categories || []).map(cat => {
    const spent = periodTransactions
      .filter(t => t.type === 'expense' && t.category === cat.name)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return { name: cat.name, amount: spent };
  });

  const categoryBudgetData = (state.categories || []).map(cat => {
    const spent = periodTransactions
      .filter(t => t.type === 'expense' && t.category === cat.name)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return {
      name: cat.name,
      budget: (Number(cat.budgetLimit) || 0) * periodCount,
      spent,
    };
  });

  // Generate charts asynchronously via high-resolution canvas
  const chart1DataUrl = generateCategoryExpenseChart(categoryExpenseData, totalExpense, state.currency);
  const chart2DataUrl = generateBudgetVsActualChart(categoryBudgetData, state.currency);
  const chart3DataUrl = generateCashFlowAndSavingsChart(
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    state.currency
  );

  // Chart 1: Category Distribution Donut
  let chartY = currentY + 11;
  const chartWidth = 182; // mm
  const chart1Height = 82; // mm

  if (chart1DataUrl) {
    doc.addImage(chart1DataUrl, 'PNG', 14, chartY, chartWidth, chart1Height);
  }

  // Chart 2: Budget vs Actual Grouped Bars
  chartY += chart1Height + 6;
  const chart2Height = 86; // mm

  if (chart2DataUrl) {
    doc.addImage(chart2DataUrl, 'PNG', 14, chartY, chartWidth, chart2Height);
  }

  // Chart 3: Cash Flow and Savings Health (Next Page for spacious elegance)
  doc.addPage();
  currentY = 18;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('9. Análisis Visual y Gráficas Financieras (Continuación)', 14, currentY);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Diagnóstico de estabilidad patrimonial, distribución del flujo monetario y margen de contingencia.',
    14,
    currentY + 5.5
  );

  chartY = currentY + 11;
  const chart3Height = 72; // mm
  if (chart3DataUrl) {
    doc.addImage(chart3DataUrl, 'PNG', 14, chartY, chartWidth, chart3Height);
  }

  // ==========================================
  // 10. CONCLUSIONES Y RECOMENDACIONES
  // ==========================================
  const summaryBoxY = chartY + chart3Height + 8;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, summaryBoxY, 182, 68, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, summaryBoxY, 182, 68, 3, 3, 'S');

  // Decorative left border
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.roundedRect(14, summaryBoxY, 2.5, 68, 1.5, 1.5, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('10. Conclusiones y Recomendaciones para la Familia', 22, summaryBoxY + 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const topExceeded = categoryBudgetData.filter(c => c.spent > c.budget && c.budget > 0);
  const advice1 =
    savingsRate >= 20
      ? `• Tasa de Ahorro Saludable: Se logró ahorrar un ${savingsRateFormatted}% del total de ingresos en el período analizado, superando el objetivo recomendado de la regla 50/30/20.`
      : savingsRate > 0
      ? `• Tasa de Ahorro Moderada: Se logró un balance positivo del ${savingsRateFormatted}% en el período, aunque se sugiere evaluar ajustes para acercarse al 20% ideal.`
      : `• Atención al Balance: El período cerró con un déficit de ${formatCurrencyPDF(Math.abs(netBalance), state.currency)}. Se recomienda auditar los gastos extraordinarios.`;

  const advice2 =
    topExceeded.length > 0
      ? `• Categorías en Exceso: ${topExceeded.map(c => `${c.name} (+${formatCurrencyPDF(c.spent - c.budget, state.currency)})`).join(', ')}. Conviene revisar los límites para los próximos períodos.`
      : '• Disciplina Presupuestaria: Todas las categorías se mantuvieron dentro de sus límites presupuestados para este período.';

  const advice3 = `• Patrimonio y Metas: El balance neto disponible (${formatCurrencyPDF(netBalance, state.currency, true)}) y los activos líquidos (${formatCurrencyPDF(totalLiquidAssets, state.currency)}) pueden respaldar el progreso de las ${state.savingsGoals?.length || 0} metas de ahorro activas.`;

  doc.text(doc.splitTextToSize(advice1, 168), 22, summaryBoxY + 20);
  doc.text(doc.splitTextToSize(advice2, 168), 22, summaryBoxY + 34);
  doc.text(doc.splitTextToSize(advice3, 168), 22, summaryBoxY + 48);

  // ==========================================
  // PIE DE PÁGINA PROFESIONAL EN TODAS LAS PÁGINAS
  // ==========================================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Subtle divider line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.3);
    doc.line(14, 286, 196, 286);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Finanzas Familiares  |  ${state.familyName}  |  Período: ${periodLabel}`,
      14,
      291
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      196,
      291,
      { align: 'right' }
    );
  }

  // Save the PDF
  const cleanFamily = (state.familyName || 'Familia').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSlug = years.length === 1 && months.length === 1
    ? `${years[0]}-${String(months[0]).padStart(2, '0')}`
    : years.length === 1 && months.length === 12
    ? `${years[0]}_Anual`
    : `${years.join('-')}_${periodCount}meses`;
  const filename = `Reporte_Finanzas_${cleanFamily}_${cleanSlug}.pdf`;
  doc.save(filename);
}
