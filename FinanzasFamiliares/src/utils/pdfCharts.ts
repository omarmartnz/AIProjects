import { formatCurrencyPDF } from './pdfExport';

interface CategoryExpenseItem {
  name: string;
  amount: number;
}

interface CategoryBudgetItem {
  name: string;
  budget: number;
  spent: number;
}

const PALETTE = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#64748B', // Slate
];

/**
 * 1. Gráfica de Distribución del Gasto por Categoría (Donut Chart con Leyenda)
 */
export function generateCategoryExpenseChart(
  categories: CategoryExpenseItem[],
  totalExpense: number,
  currency: string
): string {
  const width = 1600;
  const height = 760;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Border & Header accent
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(2, 2, width - 4, 8);

  // Title & Subtitle
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('5.1 Distribución del Gasto por Categoría', 44, 60);

  ctx.fillStyle = '#64748B';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Desglose porcentual y montos ejecutados sobre el gasto total del período: ${formatCurrencyPDF(totalExpense, currency)}`,
    44,
    98
  );

  const activeCategories = categories
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (activeCategories.length === 0 || totalExpense <= 0) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(44, 130, width - 88, height - 174);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(44, 130, width - 88, height - 174);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No hay gastos registrados en este período.', width / 2, height / 2);
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Los datos se actualizarán automáticamente al ingresar transacciones.', width / 2, height / 2 + 45);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  // Aggregate top 6 categories + others
  let displayCategories: { name: string; amount: number; color: string; pct: number }[] = [];
  if (activeCategories.length <= 6) {
    displayCategories = activeCategories.map((c, i) => ({
      name: c.name,
      amount: c.amount,
      color: PALETTE[i % PALETTE.length],
      pct: (c.amount / totalExpense) * 100,
    }));
  } else {
    const top5 = activeCategories.slice(0, 5);
    const othersAmount = activeCategories.slice(5).reduce((sum, c) => sum + c.amount, 0);
    displayCategories = top5.map((c, i) => ({
      name: c.name,
      amount: c.amount,
      color: PALETTE[i % PALETTE.length],
      pct: (c.amount / totalExpense) * 100,
    }));
    if (othersAmount > 0) {
      displayCategories.push({
        name: 'Otras Categorías',
        amount: othersAmount,
        color: '#64748B',
        pct: (othersAmount / totalExpense) * 100,
      });
    }
  }

  // Draw Donut Chart on Left Side
  const centerX = 340;
  const centerY = 450;
  const outerRadius = 220;
  const innerRadius = 135;

  let startAngle = -Math.PI / 2;

  displayCategories.forEach(cat => {
    const sliceAngle = (cat.amount / totalExpense) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = cat.color;
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Center Circle Text
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GASTO TOTAL', centerX, centerY - 20);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(formatCurrencyPDF(totalExpense, currency), centerX, centerY + 24);

  // Legend Cards on Right Side
  ctx.textAlign = 'left';
  const legendStartX = 660;
  const legendStartY = 160;
  const itemHeight = 84;

  displayCategories.forEach((cat, index) => {
    const y = legendStartY + index * itemHeight;

    // Background pill
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(legendStartX, y, width - legendStartX - 60, 72, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Color swatch indicator
    ctx.fillStyle = cat.color;
    ctx.beginPath();
    ctx.roundRect(legendStartX + 20, y + 20, 32, 32, 8);
    ctx.fill();

    // Category Name
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cat.name, legendStartX + 72, y + 45);

    // Formatted Amount
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    const amountText = formatCurrencyPDF(cat.amount, currency);
    ctx.fillText(amountText, width - 230, y + 45);

    // Percentage Badge
    const badgeX = width - 190;
    const badgeY = y + 18;
    ctx.fillStyle = cat.color + '1A'; // 10% opacity tint
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, 110, 36, 18);
    ctx.fill();

    ctx.fillStyle = cat.color;
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${cat.pct.toFixed(1)}%`, badgeX + 55, badgeY + 25);
    ctx.textAlign = 'left';
  });

  return canvas.toDataURL('image/png');
}

/**
 * 2. Gráfica Comparativa de Presupuesto Asignado vs. Gasto Real
 */
export function generateBudgetVsActualChart(
  categories: CategoryBudgetItem[],
  currency: string
): string {
  const width = 1600;
  const height = 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Border & Header accent
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(2, 2, width - 4, 8);

  // Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('5.2 Comparativa de Presupuesto vs. Gasto Real', 44, 60);

  ctx.fillStyle = '#64748B';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Control de límites presupuestados frente a los gastos reales por categoría', 44, 98);

  // Top Legend
  const legendX = 950;
  const legendY = 60;

  // Blue Budget Pill
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.roundRect(legendX, legendY - 14, 20, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Presupuesto Asignado', legendX + 30, legendY + 2);

  // Green Under Budget
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.roundRect(legendX + 270, legendY - 14, 20, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#047857';
  ctx.fillText('Dentro de Límite', legendX + 300, legendY + 2);

  // Red Over Budget
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.roundRect(legendX + 470, legendY - 14, 20, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('Superado', legendX + 500, legendY + 2);

  const activeList = categories
    .filter(c => c.budget > 0 || c.spent > 0)
    .sort((a, b) => Math.max(b.budget, b.spent) - Math.max(a.budget, a.spent))
    .slice(0, 5);

  if (activeList.length === 0) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(44, 130, width - 88, height - 174);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(44, 130, width - 88, height - 174);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No hay presupuestos ni gastos asignados para comparar.', width / 2, height / 2);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  // Find max value for bar scaling
  const maxVal = Math.max(...activeList.map(c => Math.max(c.budget, c.spent)), 100);
  const maxBarWidth = 720;
  const startY = 150;
  const rowHeight = 118;

  activeList.forEach((cat, index) => {
    const y = startY + index * rowHeight;
    const isOver = cat.spent > cat.budget;
    const actualColor = isOver ? '#EF4444' : '#10B981';

    // Category Label & Status Pill
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cat.name, 44, y + 36);

    // Status Pill
    const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
    const statusText = isOver ? `Excedido (+${(pct - 100).toFixed(0)}%)` : `${pct.toFixed(0)}% consumido`;
    ctx.fillStyle = isOver ? '#FEE2E2' : '#ECFDF5';
    ctx.beginPath();
    ctx.roundRect(44, y + 50, 190, 32, 16);
    ctx.fill();

    ctx.fillStyle = isOver ? '#B91C1C' : '#047857';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(statusText, 60, y + 72);

    // Bars Origin
    const barsX = 380;

    // Background track
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(barsX, y + 8, maxBarWidth, 28, 6);
    ctx.roundRect(barsX, y + 46, maxBarWidth, 28, 6);
    ctx.fill();

    // Bar 1: Budget (Slate)
    const budgetWidth = Math.max((cat.budget / maxVal) * maxBarWidth, 8);
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.roundRect(barsX, y + 8, budgetWidth, 28, 6);
    ctx.fill();

    // Bar 2: Actual Spent (Green or Red)
    const spentWidth = Math.max((cat.spent / maxVal) * maxBarWidth, 8);
    ctx.fillStyle = actualColor;
    ctx.beginPath();
    ctx.roundRect(barsX, y + 46, spentWidth, 28, 6);
    ctx.fill();

    // Value Labels on the Right
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Ppto: ${formatCurrencyPDF(cat.budget, currency)}`, barsX + maxBarWidth + 24, y + 30);

    ctx.fillStyle = isOver ? '#DC2626' : '#059669';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Real: ${formatCurrencyPDF(cat.spent, currency)}`, barsX + maxBarWidth + 24, y + 68);

    // Separator line
    if (index < activeList.length - 1) {
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, y + rowHeight);
      ctx.lineTo(width - 44, y + rowHeight);
      ctx.stroke();
    }
  });

  return canvas.toDataURL('image/png');
}

/**
 * 3. Gráfica de Flujo de Caja y Salud Financiera
 */
export function generateCashFlowAndSavingsChart(
  totalIncome: number,
  totalExpense: number,
  netBalance: number,
  savingsRate: number,
  currency: string
): string {
  const width = 1600;
  const height = 620;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Border & Header accent
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = '#059669';
  ctx.fillRect(2, 2, width - 4, 8);

  // Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('5.3 Flujo de Caja y Diagnóstico de Salud Financiera', 44, 60);

  ctx.fillStyle = '#64748B';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Evaluación de la liquidez mensual, margen de ahorro y estabilidad patrimonial', 44, 98);

  // 3 Horizontal Metric Tiles on Left (Width: 920)
  const metrics = [
    {
      label: 'Ingresos Totales',
      amount: totalIncome,
      color: '#10B981',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      sign: '+',
      pct: 100,
    },
    {
      label: 'Gastos Ejecutados',
      amount: totalExpense,
      color: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      sign: '-',
      pct: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0,
    },
    {
      label: 'Balance Neto de Ahorro',
      amount: netBalance,
      color: netBalance >= 0 ? '#4F46E5' : '#DC2626',
      bgColor: netBalance >= 0 ? '#EEF2FF' : '#FFF1F2',
      borderColor: netBalance >= 0 ? '#C7D2FE' : '#FFE4E6',
      sign: netBalance >= 0 ? '+' : '',
      pct: totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0,
    },
  ];

  const tileWidth = 960;
  const tileHeight = 98;
  const tileStartX = 44;
  const tileStartY = 140;

  metrics.forEach((m, idx) => {
    const y = tileStartY + idx * (tileHeight + 18);

    // Box
    ctx.fillStyle = m.bgColor;
    ctx.beginPath();
    ctx.roundRect(tileStartX, y, tileWidth, tileHeight, 14);
    ctx.fill();

    ctx.strokeStyle = m.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Colored left accent bar
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.roundRect(tileStartX, y, 10, tileHeight, [14, 0, 0, 14]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.label, tileStartX + 36, y + 42);

    // Sub-metric
    ctx.fillStyle = '#64748B';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      idx === 0 ? 'Base de ingresos del período' : `${m.pct.toFixed(1)}% de los ingresos totales`,
      tileStartX + 36,
      y + 74
    );

    // Amount
    ctx.fillStyle = m.color;
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    const displayStr = `${m.sign}${formatCurrencyPDF(m.amount, currency)}`;
    ctx.fillText(displayStr, tileStartX + tileWidth - 36, y + 58);
    ctx.textAlign = 'left';
  });

  // Flow Bar underneath metrics
  const barY = tileStartY + 3 * (tileHeight + 18) + 10;
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(tileStartX, barY, tileWidth, 32, 16);
  ctx.fill();

  const expenseRatio = totalIncome > 0 ? Math.min(totalExpense / totalIncome, 1.0) : 1.0;
  const expenseBarW = Math.max(expenseRatio * tileWidth, 0);

  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.roundRect(tileStartX, barY, expenseBarW, 32, [16, 0, 0, 16]);
  ctx.fill();

  if (totalIncome > totalExpense) {
    const savingsBarW = tileWidth - expenseBarW;
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(tileStartX + expenseBarW, barY, savingsBarW, 32, [0, 16, 16, 0]);
    ctx.fill();
  }

  // Right Side: Diagnostic Health Card (Width: 480)
  const healthX = 1060;
  const healthY = 140;
  const healthWidth = width - healthX - 44;
  const healthHeight = 420;

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(healthX, healthY, healthWidth, healthHeight, 16);
  ctx.fill();

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top header in health card
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INDICADOR DE AHORRO', healthX + healthWidth / 2, healthY + 50);

  // Large Savings Percentage
  const isHealthy = savingsRate >= 20;
  const isModerate = savingsRate >= 10 && savingsRate < 20;
  const rateColor = isHealthy ? '#059669' : isModerate ? '#2563EB' : savingsRate > 0 ? '#D97706' : '#DC2626';

  ctx.fillStyle = rateColor;
  ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${savingsRate.toFixed(1)}%`, healthX + healthWidth / 2, healthY + 145);

  ctx.fillStyle = '#64748B';
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Tasa de Ahorro Familiar', healthX + healthWidth / 2, healthY + 185);

  // Status Badge
  let badgeLabel = 'ÓPTIMO (Supera el 20%)';
  let badgeBg = '#ECFDF5';
  let badgeTextColor = '#065F46';

  if (isModerate) {
    badgeLabel = 'MODERADO (10% - 20%)';
    badgeBg = '#EFF6FF';
    badgeTextColor = '#1E40AF';
  } else if (savingsRate > 0) {
    badgeLabel = 'ATENCIÓN (Menor al 10%)';
    badgeBg = '#FFFBEB';
    badgeTextColor = '#92400E';
  } else {
    badgeLabel = 'DÉFICIT EN EL MES';
    badgeBg = '#FEF2F2';
    badgeTextColor = '#991B1B';
  }

  const badgeW = 340;
  const badgeH = 46;
  const bX = healthX + (healthWidth - badgeW) / 2;
  const bY = healthY + 225;

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(bX, bY, badgeW, badgeH, 23);
  ctx.fill();

  ctx.fillStyle = badgeTextColor;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(badgeLabel, healthX + healthWidth / 2, bY + 30);

  // Diagnostic recommendation text
  ctx.fillStyle = '#475569';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const recText1 = isHealthy
    ? 'Excelente salud financiera: la familia genera'
    : isModerate
    ? 'Buen desempeño: se recomienda mantener el gasto'
    : savingsRate > 0
    ? 'Margen ajustado: conviene revisar gastos variables'
    : 'Alerta: los gastos superaron los ingresos del mes.';

  const recText2 = isHealthy
    ? 'un excedente sólido para metas y emergencias.'
    : isModerate
    ? 'controlado para alcanzar la meta ideal del 20%.'
    : savingsRate > 0
    ? 'para aumentar el colchón de ahorro patrimonial.'
    : 'Se aconseja recortar compras no esenciales.';

  ctx.fillText(recText1, healthX + healthWidth / 2, healthY + 325);
  ctx.fillText(recText2, healthX + healthWidth / 2, healthY + 355);

  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png');
}
