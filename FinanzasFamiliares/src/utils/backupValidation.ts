import { z } from 'zod';
import type { FamilyEncryptedState, FamilyState } from '../types';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoMonthRegex = /^\d{4}-\d{2}$/;
const safeString = z.string().trim().min(1).max(200);
const safeOptionalString = z.string().trim().max(1000).optional();
const finiteNumber = z.number().finite();

const familyMemberSchema = z
  .object({
    id: safeString,
    uid: safeOptionalString,
    name: safeString,
    role: z.enum(['Padre / Esposo', 'Madre / Esposa', 'Padre', 'Madre', 'Hijo/a', 'Abuelo/a', 'Tutor', 'Otro']),
    avatar: z.string().trim().min(1).max(24),
    color: z.string().trim().min(1).max(32),
    monthlyIncome: finiteNumber.optional(),
    email: z.string().trim().email().max(254).optional(),
    isDependent: z.boolean().optional(),
  })
  .strict();

const categorySchema = z
  .object({
    id: safeString,
    name: safeString,
    icon: z.string().trim().min(1).max(64),
    color: z.string().trim().min(1).max(32),
    budgetLimit: finiteNumber,
    alertThreshold: z.number().finite().min(0).max(100),
    bucket503020: z.enum(['needs', 'wants', 'savings']).optional(),
    isCustom: z.boolean().optional(),
  })
  .strict();

const tagSchema = z
  .object({
    id: safeString,
    name: safeString,
    color: z.string().trim().min(1).max(32),
  })
  .strict();

const transactionSchema = z
  .object({
    id: safeString,
    date: z.string().regex(isoDateRegex),
    description: z.string().trim().min(1).max(500),
    amount: finiteNumber,
    type: z.enum(['expense', 'income', 'transfer']),
    category: safeString,
    memberId: safeString,
    toMemberId: safeOptionalString,
    tags: z.array(z.string().trim().min(1).max(60)).max(50),
    notes: safeOptionalString,
    isBankSynced: z.boolean().optional(),
    bankAccountId: safeOptionalString,
    toBankAccountId: safeOptionalString,
    createdAt: z.number().int().nonnegative(),
    currency: z.string().trim().min(2).max(12).optional(),
    originalAmount: finiteNumber.optional(),
    exchangeRate: z.number().finite().positive().optional(),
    isSharedExpense: z.boolean().optional(),
    splitBetweenMemberIds: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
    recurringExpenseId: safeOptionalString,
    recurringIncomeId: safeOptionalString,
    recurringInstallmentId: safeOptionalString,
    recurringTransferId: safeOptionalString,
    isAutoLogged: z.boolean().optional(),
  })
  .strict();

const bankEntitySchema = z
  .object({
    id: safeString,
    name: safeString,
    shortName: z.string().trim().max(50).optional(),
    color: z.string().trim().min(1).max(32),
    category: z.string().trim().max(80).optional(),
    categoryLabel: z.string().trim().max(120).optional(),
    isCustom: z.boolean().optional(),
  })
  .strict();

const bankAccountSchema = z
  .object({
    id: safeString,
    name: safeString,
    bankName: safeString,
    accountType: z.enum(['checking', 'savings', 'credit', 'loan', 'investment']),
    balance: finiteNumber,
    currency: z.string().trim().min(2).max(12).optional(),
    currencySymbol: z.string().trim().max(8).optional(),
    creditLimit: finiteNumber.optional(),
    holderMemberId: safeOptionalString,
    accountNumberMasked: z.string().trim().min(1).max(40),
    iban: z.string().trim().max(80).optional(),
    notes: safeOptionalString,
    color: z.string().trim().min(1).max(32),
    autoSync: z.boolean().optional(),
    lastSynced: z.string().trim().max(80).optional(),
    status: z.enum(['connected', 'syncing', 'error']).optional(),
    interestRate: finiteNumber.optional(),
    minimumPayment: finiteNumber.optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    dueDate: z.string().regex(isoDateRegex).optional(),
  })
  .strict();

const savingsContributionSchema = z
  .object({
    id: safeString,
    date: z.string().regex(isoDateRegex),
    amount: finiteNumber,
    memberId: safeString,
    note: safeOptionalString,
  })
  .strict();

const savingsGoalSchema = z
  .object({
    id: safeString,
    title: safeString,
    targetAmount: finiteNumber,
    currentAmount: finiteNumber,
    deadline: z.string().regex(isoDateRegex).optional(),
    color: z.string().trim().min(1).max(32),
    icon: z.string().trim().min(1).max(64),
    assignedMemberId: z.string().trim().max(120).optional(),
    contributions: z.array(savingsContributionSchema).max(5000),
  })
  .strict();

const recurringExpenseSchema = z
  .object({
    id: safeString,
    title: safeString,
    amount: finiteNumber,
    category: safeString,
    memberId: safeString,
    frequency: z.enum(['monthly', 'yearly', 'weekly']),
    dueDay: z.number().int().min(1).max(31),
    nextDueDate: z.string().regex(isoDateRegex),
    isActive: z.boolean(),
    notes: safeOptionalString,
    paymentAccountId: safeOptionalString,
    autoLogTransaction: z.boolean().optional(),
    autoRegister: z.boolean().optional(),
    currency: z.string().trim().min(2).max(12).optional(),
    originalAmount: finiteNumber.optional(),
    exchangeRate: z.number().finite().positive().optional(),
    lastPaidDate: z.string().regex(isoDateRegex).optional(),
    lastPaidMonth: z.string().regex(isoMonthRegex).optional(),
  })
  .strict();

const recurringInstallmentSchema = z
  .object({
    id: z.string().trim().max(120).optional(),
    name: z.string().trim().max(120).optional(),
    label: z.string().trim().max(120).optional(),
    day: z.number().int().min(1).max(31),
    amount: finiteNumber,
    originalAmount: finiteNumber.optional(),
    lastRegisteredDate: z.string().regex(isoDateRegex).optional(),
    lastRegisteredPeriod: z.string().trim().max(40).optional(),
  })
  .strict();

const recurringIncomeSchema = z
  .object({
    id: safeString,
    title: safeString,
    amount: finiteNumber,
    category: z.string().trim().max(120).optional(),
    memberId: safeString,
    frequency: z.enum(['monthly', 'biweekly', 'yearly', 'weekly']),
    dueDay: z.number().int().min(1).max(31),
    dueMonth: z.number().int().min(1).max(12).optional(),
    installments: z.array(recurringInstallmentSchema).max(52).optional(),
    nextDueDate: z.string().regex(isoDateRegex).optional(),
    isActive: z.boolean(),
    notes: safeOptionalString,
    destinationAccountId: safeOptionalString,
    currency: z.string().trim().min(2).max(12).optional(),
    originalAmount: finiteNumber.optional(),
    exchangeRate: z.number().finite().positive().optional(),
    autoRegister: z.boolean().optional(),
    lastRegisteredDate: z.string().regex(isoDateRegex).optional(),
    lastRegisteredPeriod: z.string().trim().max(40).optional(),
  })
  .strict();

const recurringTransferSchema = z
  .object({
    id: safeString,
    title: safeString,
    amount: finiteNumber,
    fromBankAccountId: safeString,
    toBankAccountId: safeString,
    fromMemberId: safeOptionalString,
    toMemberId: safeOptionalString,
    category: z.string().trim().max(120).optional(),
    frequency: z.enum(['monthly', 'biweekly', 'yearly', 'weekly']),
    dueDay: z.number().int().min(1).max(31),
    dueMonth: z.number().int().min(1).max(12).optional(),
    installments: z.array(recurringInstallmentSchema).max(52).optional(),
    nextDueDate: z.string().regex(isoDateRegex).optional(),
    isActive: z.boolean(),
    autoRegister: z.boolean().optional(),
    notes: safeOptionalString,
    currency: z.string().trim().min(2).max(12).optional(),
    originalAmount: finiteNumber.optional(),
    exchangeRate: z.number().finite().positive().optional(),
    lastTransferredDate: z.string().regex(isoDateRegex).optional(),
    lastTransferredPeriod: z.string().trim().max(40).optional(),
  })
  .strict();

const childAllowanceSchema = z
  .object({
    id: safeString,
    memberId: safeString,
    amount: finiteNumber,
    frequency: z.enum(['weekly', 'monthly']),
    currentSavings: finiteNumber,
    payoutDay: z.string().trim().min(1).max(40),
    tasksRequired: z.array(z.string().trim().min(1).max(200)).max(200).optional(),
    isActive: z.boolean(),
    lastPayoutDate: z.string().regex(isoDateRegex).optional(),
  })
  .strict();

const alertSettingsSchema = z
  .object({
    notificationsEnabled: z.boolean(),
    browserNotifications: z.boolean(),
    soundEnabled: z.boolean(),
    notifyOnWarning: z.boolean(),
    notifyOnDanger: z.boolean(),
    notifyOnRecurringDue: z.boolean(),
    emailAlertsEnabled: z.boolean(),
    emailAddress: z.string().trim().email().max(254).optional(),
    emailFrequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    emailNotifyOnDangerOnly: z.boolean().optional(),
  })
  .strict();

const familyStateSchema = z
  .object({
    familyCode: z.string().trim().max(80).optional(),
    familyName: z.string().trim().min(1).max(120),
    currency: z.string().trim().min(1).max(8),
    currencyCode: z.string().trim().min(2).max(12),
    members: z.array(familyMemberSchema).min(1).max(100),
    categories: z.array(categorySchema).min(1).max(500),
    deletedCategoryIds: z.array(z.string().trim().min(1).max(80)).max(500).optional(),
    tags: z.array(tagSchema).max(500),
    transactions: z.array(transactionSchema).max(50000),
    bankAccounts: z.array(bankAccountSchema).max(500),
    customBanks: z.array(bankEntitySchema).max(300).optional(),
    savingsGoals: z.array(savingsGoalSchema).max(5000),
    recurringExpenses: z.array(recurringExpenseSchema).max(3000),
    recurringIncomes: z.array(recurringIncomeSchema).max(3000).optional(),
    recurringTransfers: z.array(recurringTransferSchema).max(3000).optional(),
    childAllowances: z.array(childAllowanceSchema).max(1000),
    globalMonthlyBudget: finiteNumber,
    globalAlertThreshold: z.number().finite().min(0).max(100),
    alertSettings: alertSettingsSchema.optional(),
    isEncryptionEnabled: z.boolean(),
    encryptionFingerprint: z.string().trim().max(200).optional(),
    lastCloudSync: z.string().trim().max(120).optional(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((state, ctx) => {
    const memberIds = new Set(state.members.map(m => m.id));
    const bankIds = new Set(state.bankAccounts.map(acc => acc.id));

    state.transactions.forEach((tx, index) => {
      if (!memberIds.has(tx.memberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transactions', index, 'memberId'],
          message: 'Referencia inválida: memberId no existe en members',
        });
      }
      if (tx.toMemberId && !memberIds.has(tx.toMemberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transactions', index, 'toMemberId'],
          message: 'Referencia inválida: toMemberId no existe en members',
        });
      }
      if (tx.bankAccountId && !bankIds.has(tx.bankAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transactions', index, 'bankAccountId'],
          message: 'Referencia inválida: bankAccountId no existe en bankAccounts',
        });
      }
      if (tx.toBankAccountId && !bankIds.has(tx.toBankAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transactions', index, 'toBankAccountId'],
          message: 'Referencia inválida: toBankAccountId no existe en bankAccounts',
        });
      }
      if (tx.splitBetweenMemberIds) {
        tx.splitBetweenMemberIds.forEach((memberId, splitIndex) => {
          if (!memberIds.has(memberId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['transactions', index, 'splitBetweenMemberIds', splitIndex],
              message: 'Referencia inválida: splitBetweenMemberIds contiene miembro inexistente',
            });
          }
        });
      }
    });

    state.savingsGoals.forEach((goal, goalIndex) => {
      if (goal.assignedMemberId && goal.assignedMemberId !== 'all' && !memberIds.has(goal.assignedMemberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['savingsGoals', goalIndex, 'assignedMemberId'],
          message: 'Referencia inválida: assignedMemberId no existe en members',
        });
      }
      goal.contributions.forEach((contribution, contributionIndex) => {
        if (!memberIds.has(contribution.memberId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['savingsGoals', goalIndex, 'contributions', contributionIndex, 'memberId'],
            message: 'Referencia inválida: contribution.memberId no existe en members',
          });
        }
      });
    });

    state.recurringExpenses.forEach((item, index) => {
      if (!memberIds.has(item.memberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringExpenses', index, 'memberId'],
          message: 'Referencia inválida: memberId no existe en members',
        });
      }
      if (item.paymentAccountId && !bankIds.has(item.paymentAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringExpenses', index, 'paymentAccountId'],
          message: 'Referencia inválida: paymentAccountId no existe en bankAccounts',
        });
      }
    });

    (state.recurringIncomes || []).forEach((item, index) => {
      if (!memberIds.has(item.memberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringIncomes', index, 'memberId'],
          message: 'Referencia inválida: memberId no existe en members',
        });
      }
      if (item.destinationAccountId && !bankIds.has(item.destinationAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringIncomes', index, 'destinationAccountId'],
          message: 'Referencia inválida: destinationAccountId no existe en bankAccounts',
        });
      }
    });

    (state.recurringTransfers || []).forEach((item, index) => {
      if (!bankIds.has(item.fromBankAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringTransfers', index, 'fromBankAccountId'],
          message: 'Referencia inválida: fromBankAccountId no existe en bankAccounts',
        });
      }
      if (!bankIds.has(item.toBankAccountId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringTransfers', index, 'toBankAccountId'],
          message: 'Referencia inválida: toBankAccountId no existe en bankAccounts',
        });
      }
      if (item.fromMemberId && !memberIds.has(item.fromMemberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringTransfers', index, 'fromMemberId'],
          message: 'Referencia inválida: fromMemberId no existe en members',
        });
      }
      if (item.toMemberId && !memberIds.has(item.toMemberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recurringTransfers', index, 'toMemberId'],
          message: 'Referencia inválida: toMemberId no existe en members',
        });
      }
    });

    state.childAllowances.forEach((item, index) => {
      if (!memberIds.has(item.memberId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['childAllowances', index, 'memberId'],
          message: 'Referencia inválida: memberId no existe en members',
        });
      }
    });
  });

const encryptedPayloadSchema = z
  .object({
    encrypted: z.literal(true),
    familyCode: z.string().trim().min(1).max(80),
    version: z.number().int().min(1).max(10),
    salt: z.string().trim().min(16).max(512),
    iv: z.string().trim().min(12).max(128),
    ciphertext: z.string().trim().min(16).max(2_000_000),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

const encryptedBackupPackageSchema = z
  .object({
    version: z.string().trim().min(1).max(20),
    exportedAt: z.string().datetime(),
    familyName: z.string().trim().min(1).max(120),
    encrypted: z.literal(true),
    payload: encryptedPayloadSchema,
  })
  .strict();

export type BackupValidationResult =
  | { kind: 'encrypted'; payload: FamilyEncryptedState }
  | { kind: 'plain'; state: FamilyState };

function formatZodError(error: z.ZodError): string {
  const details = error.issues
    .slice(0, 3)
    .map(issue => {
      const path = issue.path.length ? issue.path.join('.') : 'backup';
      return `${path}: ${issue.message}`;
    })
    .join(' | ');

  return details || 'El backup no cumple el esquema de seguridad requerido';
}

export function validateBackupPackageStrict(value: unknown): BackupValidationResult {
  const encryptedResult = encryptedBackupPackageSchema.safeParse(value);
  if (encryptedResult.success) {
    return { kind: 'encrypted', payload: encryptedResult.data.payload as FamilyEncryptedState };
  }

  const plainResult = familyStateSchema.safeParse(value);
  if (plainResult.success) {
    return { kind: 'plain', state: plainResult.data as FamilyState };
  }

  const encryptedError = encryptedResult.error;
  const plainError = plainResult.error;
  const preferPlain = plainError.issues.length <= encryptedError.issues.length;
  throw new Error(formatZodError(preferPlain ? plainError : encryptedError));
}

export function validateRestoredFamilyStateStrict(value: unknown): FamilyState {
  const result = familyStateSchema.safeParse(value);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data as FamilyState;
}
