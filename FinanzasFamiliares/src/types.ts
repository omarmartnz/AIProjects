export interface FamilyMember {
  id: string;
  uid?: string;
  name: string;
  role: 'Padre / Esposo' | 'Madre / Esposa' | 'Padre' | 'Madre' | 'Hijo/a' | 'Abuelo/a' | 'Tutor' | 'Otro';
  avatar: string;
  color: string;
  monthlyIncome?: number;
  email?: string;
  isDependent?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budgetLimit: number; // Presupuesto mensual límite
  alertThreshold: number; // Porcentaje de alerta, ej: 80 para 80%
  bucket503020?: 'needs' | 'wants' | 'savings'; // Clasificación Regla 50/30/20
  isCustom?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // Normalized amount in family base currency (used for all calculations)
  type: 'expense' | 'income' | 'transfer';
  category: string;
  memberId: string;
  toMemberId?: string; // Miembro receptor en transferencias entre miembros
  tags: string[];
  notes?: string;
  isBankSynced?: boolean;
  bankAccountId?: string; // Cuenta de origen o cuenta asociada
  toBankAccountId?: string; // Cuenta de destino en transferencias entre cuentas
  createdAt: number;
  currency?: string; // Original currency code e.g. 'USD', 'EUR', 'MXN'
  originalAmount?: number; // Amount in the original currency
  exchangeRate?: number; // Applied conversion rate to family base currency
  isSharedExpense?: boolean; // Si es un gasto familiar compartido para reparto
  splitBetweenMemberIds?: string[]; // Miembros entre los que se divide
  recurringExpenseId?: string; // ID del gasto recurrente vinculado
  recurringIncomeId?: string; // ID del ingreso recurrente vinculado
  recurringInstallmentId?: string; // ID o clave de la cuota/fracción de ingreso vinculada
  recurringTransferId?: string; // ID de la transferencia recurrente vinculada
  isAutoLogged?: boolean; // Si fue registrado de forma automática por el sistema
}

export type BankProductType = 'checking' | 'savings' | 'credit' | 'loan' | 'investment';

export interface BankEntity {
  id: string;
  name: string;
  shortName?: string;
  color: string;
  category?: string;
  categoryLabel?: string;
  isCustom?: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: BankProductType;
  balance: number;
  currency?: string; // Código ISO ej. 'DOP', 'USD', 'EUR'
  currencySymbol?: string; // Símbolo ej. 'RD$', '$', '€'
  creditLimit?: number;
  holderMemberId?: string;
  accountNumberMasked: string;
  iban?: string;
  notes?: string;
  color: string;
  autoSync?: boolean;
  lastSynced?: string;
  status?: 'connected' | 'syncing' | 'error';
  interestRate?: number; // Tasa de interés anual (%) APR/TAE (para préstamos y tarjetas de crédito)
  minimumPayment?: number; // Cuota mínima mensual obligatoria
  dueDay?: number; // Día del mes de corte / vencimiento (1 al 31)
  dueDate?: string; // Fecha de vencimiento específica (YYYY-MM-DD)
}

export type AlertType = 'budget_global' | 'budget_category' | 'recurring_due' | 'savings_goal' | 'member_no_accounts';

export interface BudgetAlert {
  id: string;
  type?: AlertType;
  categoryId?: string;
  title: string;
  categoryName: string;
  currentSpent: number;
  budgetLimit: number;
  percentage: number;
  threshold: number;
  level: 'warning' | 'danger'; // warning (>= threshold), danger (>= 100%)
  date: string;
  dueDate?: string; // Para gastos recurrentes próximos
  daysUntilDue?: number; // Días restantes hasta el vencimiento
  recurringId?: string;
  recurringTitle?: string;
  formattedAmount?: string;
  description?: string;
}

export interface AlertSettings {
  notificationsEnabled: boolean; // Habilitar o deshabilitar notificaciones del sistema
  browserNotifications: boolean; // Notificaciones nativas de navegador Web
  soundEnabled: boolean; // Sonido de alerta audible sutil
  notifyOnWarning: boolean; // Notificar al alcanzar el umbral de aviso (ej. 80%)
  notifyOnDanger: boolean; // Notificar al superar el 100% de límite
  notifyOnRecurringDue: boolean; // Notificar facturas o pagos recurrentes próximos a vencer
  // Opción de alertas por correo electrónico (preparado para siguiente fase)
  emailAlertsEnabled: boolean;
  emailAddress?: string;
  emailFrequency?: 'instant' | 'daily' | 'weekly';
  emailNotifyOnDangerOnly?: boolean;
}

// 1. Metas de Ahorro Familiares (Savings Goals)
export interface SavingsContribution {
  id: string;
  date: string;
  amount: number;
  memberId: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  color: string;
  icon: string;
  assignedMemberId?: string; // 'all' o ID de miembro
  contributions: SavingsContribution[];
}

// 2. Gastos Recurrentes / Suscripciones / Facturas
export interface RecurringExpense {
  id: string;
  title: string;
  amount: number; // Importe normalizado en la moneda base familiar
  category: string;
  memberId: string;
  frequency: 'monthly' | 'yearly' | 'weekly';
  dueDay: number; // Día de cobro (1 a 31)
  nextDueDate: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
  paymentAccountId?: string; // Cuenta bancaria o tarjeta desde donde se realiza el pago
  autoLogTransaction?: boolean;
  autoRegister?: boolean; // Automatizar registro de pago en movimientos
  currency?: string; // Código ISO ej. 'USD', 'EUR', 'DOP'
  originalAmount?: number; // Importe en la moneda original
  exchangeRate?: number; // Tasa de conversión aplicada a la moneda base
  lastPaidDate?: string; // Fecha del último pago registrado (YYYY-MM-DD)
  lastPaidMonth?: string; // Mes del último pago registrado (YYYY-MM)
}

// 2.1 Ingresos Recurrentes / Fijos (Nóminas, Rentas, Pensiones, etc.)
export interface RecurringIncomeInstallment {
  id?: string;
  name?: string; // ej. 'Quincena 1', 'Quincena 2'
  label?: string; // ej. 'Quincena 1', 'Quincena 2' o 'Semana 1'
  day: number; // Día del mes (1 a 31)
  amount: number; // Monto normalizado en moneda base
  originalAmount?: number; // Monto en la moneda seleccionada
  lastRegisteredDate?: string; // Fecha en que se registró el último cobro (YYYY-MM-DD)
  lastRegisteredPeriod?: string; // Ciclo registrado (ej. '2026-09-Q1')
}

export interface RecurringIncome {
  id: string;
  title: string;
  amount: number; // Importe total mensual normalizado en la moneda base familiar
  category?: string; // Fuente (ej. 'Nómina / Salario', 'Honorarios', 'Alquiler Percibido', 'Pensión', 'Inversiones', 'Remesas', 'Otro')
  memberId: string;
  frequency: 'monthly' | 'biweekly' | 'yearly' | 'weekly';
  dueDay: number; // Día habitual de percepción/cobro (1 a 31)
  dueMonth?: number; // Para frecuencia anual: mes de cobro (1 = Enero, 12 = Diciembre)
  installments?: RecurringIncomeInstallment[]; // Desglose para quincenal (2 cuotas) o semanal (4 cuotas)
  nextDueDate?: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
  destinationAccountId?: string; // Cuenta bancaria donde se deposita habitualmente
  currency?: string; // Código ISO ej. 'USD', 'EUR', 'DOP'
  originalAmount?: number; // Importe total en la moneda original
  exchangeRate?: number; // Tasa de conversión aplicada a la moneda base
  autoRegister?: boolean; // Opción con Check: si está marcada, se registra de forma automática en la fecha correspondiente
  lastRegisteredDate?: string; // Fecha del último cobro registrado (YYYY-MM-DD)
  lastRegisteredPeriod?: string; // Período o ciclo registrado (ej. '2026-09')
}

// 2.2 Transferencias Recurrentes / Traspasos Periódicos entre Cuentas Familiares
export interface RecurringTransferInstallment {
  id?: string;
  name?: string; // ej. 'Quincena 1', 'Quincena 2' o 'Semana 1'
  label?: string;
  day: number; // Día del mes (1 a 31)
  amount: number; // Monto normalizado en moneda base
  originalAmount?: number; // Monto en la moneda seleccionada
  lastRegisteredDate?: string;
  lastRegisteredPeriod?: string;
}

export interface RecurringTransfer {
  id: string;
  title: string;
  amount: number; // Importe total mensual normalizado en la moneda base familiar
  fromBankAccountId: string; // Cuenta de origen (débito)
  toBankAccountId: string; // Cuenta de destino (crédito)
  fromMemberId?: string; // Miembro titular origen
  toMemberId?: string; // Miembro titular destino
  category?: string; // ej. 'Ahorro Programado', 'Fondo de Emergencia', 'Traspaso Familiar', 'Inversión Periódica', 'Amortización de Deuda'
  frequency: 'monthly' | 'biweekly' | 'yearly' | 'weekly';
  dueDay: number; // Día habitual de ejecución (1 a 31)
  dueMonth?: number; // Para frecuencia anual: mes (1 = Enero, 12 = Diciembre)
  installments?: RecurringTransferInstallment[]; // Desglose para quincenal (2 cuotas) o semanal (4 cuotas)
  nextDueDate?: string; // YYYY-MM-DD
  isActive: boolean;
  autoRegister?: boolean; // Automatizar: registrar automáticamente en la fecha correspondiente
  notes?: string;
  currency?: string; // Código ISO ej. 'USD', 'EUR', 'DOP'
  originalAmount?: number; // Importe en la moneda original
  exchangeRate?: number; // Tasa de conversión aplicada a la moneda base
  lastTransferredDate?: string; // Fecha de la última transferencia realizada (YYYY-MM-DD)
  lastTransferredPeriod?: string; // Período o ciclo registrado (ej. '2026-09')
}

// 3. Asignaciones y Pagas para Hijos
export interface ChildAllowance {
  id: string;
  memberId: string; // Miembro asignado (hijo/a o dependiente)
  amount: number;
  frequency: 'weekly' | 'monthly';
  currentSavings: number;
  payoutDay: string; // ej. 'Viernes' o 'Día 1 del mes'
  tasksRequired?: string[];
  isActive: boolean;
  lastPayoutDate?: string;
}

export interface FamilyState {
  familyCode?: string;
  familyName: string;
  currency: string; // Símbolo, ej. '€', '$'
  currencyCode: string; // Código ISO, ej. 'EUR', 'USD', 'MXN'
  members: FamilyMember[];
  categories: Category[];
  deletedCategoryIds?: string[];
  tags: Tag[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  customBanks?: BankEntity[];
  savingsGoals: SavingsGoal[];
  recurringExpenses: RecurringExpense[];
  recurringIncomes?: RecurringIncome[];
  recurringTransfers?: RecurringTransfer[];
  childAllowances: ChildAllowance[];
  globalMonthlyBudget: number;
  globalAlertThreshold: number; // ej. 85%
  alertSettings?: AlertSettings;
  isEncryptionEnabled: boolean;
  encryptionFingerprint?: string;
  lastCloudSync?: string;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  currentFamilyId?: string | null;
  familyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyWorkspace {
  id: string;
  familyName: string;
  inviteCode?: string;
  ownerId: string;
  parentUids?: string[];
  memberUids: string[];
  state: FamilyState;
  stateEncrypted?: FamilyEncryptedState;
  encryptionMode?: 'strict' | 'compat';
  createdAt: string;
  updatedAt: string;
}

export interface FamilyEncryptedState {
  encrypted: true;
  familyCode: string;
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: number;
}

export interface FamilyInvite {
  token: string;
  familyId: string;
  familyName: string;
  creatorUid: string;
  creatorName: string;
  creatorRole: string;
  createdAt: number;
  expiresAt: number; // 60 minutos exactos
  used: boolean;
  status: 'active' | 'used' | 'expired' | 'revoked';
  usedByUid?: string | null;
  usedByName?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
}
