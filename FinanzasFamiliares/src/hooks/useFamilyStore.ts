import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FamilyState,
  Transaction,
  FamilyMember,
  Category,
  Tag,
  BankAccount,
  BankEntity,
  BudgetAlert,
  SavingsGoal,
  RecurringExpense,
  RecurringIncome,
  RecurringIncomeInstallment,
  RecurringTransfer,
  ChildAllowance,
  SavingsContribution,
  AlertSettings,
} from '../types';
import { initialFamilyState, generateAnonymousDemoData, defaultAlertSettings } from '../data/initialData';
import {
  generateSecurityPassphrase,
  calculateKeyFingerprint,
  encryptState,
  decryptState,
} from '../utils/crypto';
import { useAuth } from '../context/AuthContext';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { showBrowserNotification, requestNotificationPermission } from '../utils/notifications';
import { formatMoney } from '../utils/currencies';
import { isCloudSecurityStrict } from '../config/securityMode';
import {
  computeEffectiveNextDueDate,
  getRecurringExpenseSummary,
  formatFullDate,
  processAutoRecurringIncomes,
  processAutoRecurringTransfers,
  processAutoRecurringExpenses,
} from '../utils/recurringUtils';
import {
  applyTransactionToAccount,
  revertTransactionFromAccount,
  getTxAmountInAccountCurrency,
} from '../utils/bankUtils';

// Clean legacy local storage keys containing previous demo data
try {
  localStorage.removeItem('family_finances_data_v1');
  localStorage.removeItem('family_finances_data_v2');
  localStorage.removeItem('family_finances_data_v3');
  localStorage.removeItem('family_finances_state');
  localStorage.removeItem('family_finances_store_v2');
} catch (_) {}

const LOCAL_STORAGE_KEY = 'family_finances_data_v4';
const THEME_KEY = 'family_finances_theme';
const PASSPHRASE_KEY_PREFIX = 'family_finances_passphrase_v1';
const LEGACY_PASSPHRASE_KEY = 'family_finances_passphrase_v1';

function buildScopedPassphraseKey(uid?: string | null): string {
  const scopedUid = uid?.trim() || 'anon';
  return `${PASSPHRASE_KEY_PREFIX}:${scopedUid}`;
}

function readSessionValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeSessionValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (_) {}
}

function removeSessionValue(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (_) {}
}

/**
 * Sanitizes any state to guarantee ZERO mock/demo data:
 * - Keeps standard financial categories, preserving user-defined budgetLimits or defaulting to 0.
 * - Filters out any legacy demo transactions, accounts, members, goals with 'demo' IDs.
 * - Preserves real user-created data.
 */
export function sanitizeCleanFamilyState(raw?: Partial<FamilyState> | null): FamilyState {
  if (!raw) return resetToEmptyState();

  const deletedCategoryIds = new Set<string>((raw as any)?.deletedCategoryIds || []);
  const initialCategoryNames = new Set(initialFamilyState.categories.map(c => c.name.toLowerCase()));
  const initialCategoryIds = new Set(initialFamilyState.categories.map(c => c.id));

  const cleanCategories = initialFamilyState.categories
    .filter(c => !deletedCategoryIds.has(c.id))
    .map(c => {
      const existing = (raw?.categories || []).find((cat: any) =>
        cat.id === c.id ||
        cat.name?.toLowerCase() === c.name.toLowerCase() ||
        (c.id === 'cat-10' && (cat.name?.toLowerCase() === 'prestamo' || cat.name?.toLowerCase() === 'préstamo'))
      );
      return {
        ...c,
        name: existing?.name || c.name,
        icon: existing?.icon || c.icon,
        color: existing?.color || c.color,
        budgetLimit: typeof existing?.budgetLimit === 'number' ? existing.budgetLimit : 0,
        alertThreshold: existing?.alertThreshold ?? c.alertThreshold,
        bucket503020: existing?.bucket503020 ?? c.bucket503020,
        isCustom: existing?.isCustom ?? c.isCustom,
      };
    });

  const customCategories = (raw?.categories || []).filter((cat: any) =>
    !initialCategoryIds.has(cat.id) &&
    !initialCategoryNames.has(cat.name?.toLowerCase()) &&
    cat.name?.toLowerCase() !== 'prestamo' &&
    cat.name?.toLowerCase() !== 'préstamo' &&
    !deletedCategoryIds.has(cat.id)
  );

  const mergedCategories = [...cleanCategories, ...customCategories];

  // Filter out any leftover demo transactions
  const realTransactions = (raw.transactions || []).filter((tx: any) => {
    if (!tx?.id) return false;
    return !tx.id.startsWith('tx-demo');
  });

  // Filter out demo bank accounts
  const realBankAccounts = (raw.bankAccounts || []).filter((acc: any) => {
    if (!acc?.id) return false;
    return !acc.id.startsWith('acc-demo');
  });

  // Filter out demo savings goals
  const realSavingsGoals = (raw.savingsGoals || []).filter((goal: any) => {
    if (!goal?.id) return false;
    return !goal.id.startsWith('goal-demo');
  });

  // Filter out demo recurring
  const realRecurring = (raw.recurringExpenses || []).filter((rec: any) => {
    if (!rec?.id) return false;
    return !rec.id.startsWith('rec-demo');
  });

  // Filter out demo recurring incomes
  const realRecurringIncomes = (raw.recurringIncomes || []).filter((rec: any) => {
    if (!rec?.id) return false;
    return !rec.id.startsWith('rec-demo');
  });

  // Filter out demo recurring transfers
  const realRecurringTransfers = (raw.recurringTransfers || []).filter((rec: any) => {
    if (!rec?.id) return false;
    return !rec.id.startsWith('rec-demo');
  });

  // Filter out demo allowances
  const realAllowances = (raw.childAllowances || []).filter((al: any) => {
    if (!al?.id) return false;
    return !al.id.startsWith('all-demo');
  });

  // Filter out demo members
  const realMembers = (raw.members || []).filter((m: any) => {
    const name = (m.name || '').toLowerCase();
    return !['carlos', 'laura', 'mateo', 'sofía', 'sofia'].some(demoName => name.includes(demoName)) && !m.id?.startsWith('mem-demo');
  });

  return {
    ...initialFamilyState,
    familyCode: '',
    familyName: raw.familyName || initialFamilyState.familyName,
    currency: raw.currency || initialFamilyState.currency,
    currencyCode: raw.currencyCode || initialFamilyState.currencyCode,
    isEncryptionEnabled: raw.isEncryptionEnabled !== false,
    globalMonthlyBudget: typeof raw.globalMonthlyBudget === 'number' ? raw.globalMonthlyBudget : 0,
    globalAlertThreshold: raw.globalAlertThreshold ?? 80,
    alertSettings: raw.alertSettings
      ? { ...defaultAlertSettings, ...raw.alertSettings }
      : initialFamilyState.alertSettings || defaultAlertSettings,
    categories: mergedCategories,
    tags: raw.tags || initialFamilyState.tags,
    members: realMembers,
    transactions: realTransactions,
    bankAccounts: realBankAccounts,
    savingsGoals: realSavingsGoals,
    recurringExpenses: realRecurring,
    recurringIncomes: realRecurringIncomes,
    recurringTransfers: realRecurringTransfers,
    childAllowances: realAllowances,
    updatedAt: raw.updatedAt || Date.now(),
  };
}

/**
 * Hard reset to an empty state with 0 limits and zero transactions
 */
export function resetToEmptyState(raw?: Partial<FamilyState> | null): FamilyState {
  return {
    ...initialFamilyState,
    familyCode: '',
    familyName: raw?.familyName || initialFamilyState.familyName,
    currency: raw?.currency || initialFamilyState.currency,
    currencyCode: raw?.currencyCode || initialFamilyState.currencyCode,
    isEncryptionEnabled: raw?.isEncryptionEnabled !== false,
    globalMonthlyBudget: 0,
    globalAlertThreshold: 80,
    alertSettings: defaultAlertSettings,
    categories: initialFamilyState.categories.map(c => ({ ...c, budgetLimit: 0 })),
    tags: initialFamilyState.tags,
    members: [],
    transactions: [],
    bankAccounts: [],
    savingsGoals: [],
    recurringExpenses: [],
    recurringIncomes: [],
    recurringTransfers: [],
    childAllowances: [],
    updatedAt: Date.now(),
  };
}

export function useFamilyStore() {
  const { user, loading: authLoading, activeFamily, updateFamilyState } = useAuth();

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const passphraseStorageKey = useMemo(
    () => buildScopedPassphraseKey(user?.uid ?? null),
    [user?.uid]
  );

  const resolveScopedPassphrase = useCallback((scopedKey: string): string => {
    const scopedSaved = readSessionValue(scopedKey);
    if (scopedSaved && scopedSaved.trim()) {
      return scopedSaved.trim();
    }

    const legacySaved = readSessionValue(LEGACY_PASSPHRASE_KEY);
    if (legacySaved && legacySaved.trim()) {
      const migrated = legacySaved.trim();
      writeSessionValue(scopedKey, migrated);
      removeSessionValue(LEGACY_PASSPHRASE_KEY);
      try {
        localStorage.removeItem(LEGACY_PASSPHRASE_KEY);
      } catch (_) {}
      return migrated;
    }

    const generated = generateSecurityPassphrase();
    writeSessionValue(scopedKey, generated);

    try {
      localStorage.removeItem(LEGACY_PASSPHRASE_KEY);
    } catch (_) {}

    return generated;
  }, []);

  // End-to-End Encryption Passphrase
  const [passphrase, setPassphraseState] = useState<string>('');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const scopedPassphrase = resolveScopedPassphrase(passphraseStorageKey);
    setPassphraseState(prev => (prev === scopedPassphrase ? prev : scopedPassphrase));
  }, [authLoading, passphraseStorageKey, resolveScopedPassphrase]);

  const updatePassphrase = useCallback((newPass: string) => {
    const clean = newPass.trim();
    if (!clean) return;
    setPassphraseState(clean);
    writeSessionValue(passphraseStorageKey, clean);
    removeSessionValue(LEGACY_PASSPHRASE_KEY);

    try {
      localStorage.removeItem(LEGACY_PASSPHRASE_KEY);
    } catch (_) {}

    showToast('Clave de Cifrado Actualizada', 'Los datos ahora se cifrarán con tu nueva clave de seguridad');
  }, [passphraseStorageKey]);

  // Core state with local storage fallback
  const [state, setState] = useState<FamilyState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return sanitizeCleanFamilyState(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
    return sanitizeCleanFamilyState(initialFamilyState);
  });

  const buildStrictCloudShadowState = useCallback((raw: FamilyState): FamilyState => {
    const base = resetToEmptyState(raw);
    return {
      ...base,
      familyName: raw.familyName,
      familyCode: raw.familyCode,
      currency: raw.currency,
      currencyCode: raw.currencyCode,
      members: raw.members || [],
      tags: raw.tags || base.tags,
      isEncryptionEnabled: true,
      updatedAt: raw.updatedAt || Date.now(),
    };
  }, []);

  const strictLegacyMigrationAttemptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!isCloudSecurityStrict) return;
    if (!activeFamily?.id || !activeFamily.state) return;
    if (activeFamily.stateEncrypted?.encrypted) return;
    if (!passphrase || !passphrase.trim()) return;

    const migrationKey = `${activeFamily.id}:${activeFamily.state.updatedAt || 'na'}`;
    if (strictLegacyMigrationAttemptsRef.current.has(migrationKey)) {
      return;
    }

    strictLegacyMigrationAttemptsRef.current.add(migrationKey);

    let cancelled = false;
    const migrateLegacyFamilyToStrict = async () => {
      try {
        const effectiveFamilyName = activeFamily.familyName || activeFamily.state?.familyName || 'Mi Familia';
        const normalizedState = sanitizeCleanFamilyState(activeFamily.state);
        normalizedState.familyName = effectiveFamilyName;
        normalizedState.familyCode = '';

        const cleanState = sanitizeForFirestore(normalizedState) as FamilyState;
        const encryptedPayload = await encryptState(cleanState, passphrase);
        const shadowState = buildStrictCloudShadowState(cleanState);

        if (cancelled) return;

        await updateFamilyState({
          state: sanitizeForFirestore(shadowState) as FamilyState,
          stateEncrypted: encryptedPayload,
          encryptionMode: 'strict',
        });

        if (!cancelled) {
          setLastSyncText('En Vivo (Firestore cifrado)');
          console.info(`[Security] Legacy family ${activeFamily.id} migrated to strict encrypted cloud state.`);
        }
      } catch (err) {
        strictLegacyMigrationAttemptsRef.current.delete(migrationKey);
        console.warn('Strict legacy migration failed:', err);
      }
    };

    void migrateLegacyFamilyToStrict();

    return () => {
      cancelled = true;
    };
  }, [authLoading, activeFamily?.id, activeFamily?.familyName, activeFamily?.state?.updatedAt, activeFamily?.stateEncrypted?.updatedAt, passphrase, updateFamilyState, buildStrictCloudShadowState]);

  // Synchronize state with active family workspace from Firestore
  useEffect(() => {
    let cancelled = false;

    const syncFromCloud = async () => {
      if (!activeFamily) return;

      if (activeFamily.stateEncrypted?.encrypted) {
        try {
          const decrypted = await decryptState<FamilyState>(activeFamily.stateEncrypted, passphrase);
          if (cancelled) return;
          setState(sanitizeCleanFamilyState(decrypted));
          setCloudStatus('synced');
          setLastSyncText('En Vivo (Firestore cifrado)');
          return;
        } catch (err) {
          console.warn('Cloud decrypt error:', err);
          if (isCloudSecurityStrict) {
            if (cancelled) return;
            setCloudStatus('offline');
            setLastSyncText('Error de descifrado cloud');
            setToastMessage({
              title: 'Error de Cifrado',
              desc: 'No se pudo descifrar el estado cloud con la clave actual. Verifica tu passphrase.',
              type: 'warning',
            });
            return;
          }
        }
      }

      if (activeFamily.state) {
        const effectiveFamilyName = activeFamily.familyName || activeFamily.state.familyName || 'Mi Familia';
        const cleanedState = sanitizeCleanFamilyState(activeFamily.state);
        cleanedState.familyName = effectiveFamilyName;
        cleanedState.familyCode = '';
        if (cancelled) return;
        setState(cleanedState);
        setCloudStatus('synced');
        setLastSyncText('En Vivo (Firestore)');
      }
    };

    syncFromCloud();

    return () => {
      cancelled = true;
    };
  }, [activeFamily?.id, activeFamily?.state?.updatedAt, activeFamily?.stateEncrypted?.updatedAt, activeFamily?.familyName, passphrase]);

  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncText, setLastSyncText] = useState<string>('En la nube (Firestore)');
  const [isBankSyncing, setIsBankSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.title === title ? null : prev));
    }, 4000);
  };

  // Save to local storage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [state]);

  // Sync to Firebase Firestore cloud database
  const pushToCloud = useCallback(async (currentState: FamilyState) => {
    try {
      setIsCloudSyncing(true);
      setCloudStatus('syncing');

      const cleanState = sanitizeForFirestore(currentState) as FamilyState;

      // Sync directly to Firestore if active family workspace exists
      if (activeFamily?.id) {
        if (isCloudSecurityStrict) {
          const encryptedPayload = await encryptState(cleanState, passphrase);
          const shadowState = buildStrictCloudShadowState(cleanState);
          await updateFamilyState({
            state: sanitizeForFirestore(shadowState) as FamilyState,
            stateEncrypted: encryptedPayload,
            encryptionMode: 'strict',
          });
          setLastSyncText('En Vivo (Firestore cifrado)');
        } else {
          await updateFamilyState({
            state: cleanState,
            encryptionMode: 'compat',
          });
          setLastSyncText('En Vivo (Firestore)');
        }
        setCloudStatus('synced');
      } else {
        setCloudStatus('synced');
        setLastSyncText('Guardado Local');
      }
    } catch (err) {
      console.warn('Firestore cloud sync error:', err);
      setCloudStatus('offline');
    } finally {
      setIsCloudSyncing(false);
    }
  }, [activeFamily?.id, updateFamilyState, passphrase, buildStrictCloudShadowState]);

  // Pull latest verified state from active Firestore workspace
  const pullFromCloud = useCallback(async (_familyCode?: string) => {
    if (activeFamily?.stateEncrypted?.encrypted) {
      try {
        const decrypted = await decryptState<FamilyState>(activeFamily.stateEncrypted, passphrase);
        setState(sanitizeCleanFamilyState(decrypted));
        setCloudStatus('synced');
        setLastSyncText('En Vivo (Firestore cifrado)');
        showToast('Sincronizado', 'Datos cifrados actualizados desde Firestore');
        return true;
      } catch (err) {
        console.warn('Cloud decrypt error:', err);
        if (isCloudSecurityStrict) {
          setCloudStatus('offline');
          showToast('Error de Cifrado', 'No se pudo descifrar el estado cloud con la clave actual', 'warning');
          return false;
        }
      }
    }

    if (activeFamily?.state) {
      setState(sanitizeCleanFamilyState(activeFamily.state));
      setCloudStatus('synced');
      setLastSyncText('En Vivo (Firestore)');
      showToast('Sincronizado', 'Datos actualizados desde Firestore');
      return true;
    }
    return false;
  }, [activeFamily?.state, activeFamily?.stateEncrypted, passphrase]);

  // Check and process any recurring incomes scheduled for auto-registration
  useEffect(() => {
    if (!state.recurringIncomes || state.recurringIncomes.length === 0) return;
    const hasAnyAuto = state.recurringIncomes.some(inc => inc.isActive && inc.autoRegister);
    if (!hasAnyAuto) return;

    const { updatedState, registeredItems } = processAutoRecurringIncomes(state);
    if (registeredItems.length > 0) {
      setState(updatedState);
      pushToCloud(updatedState);

      registeredItems.forEach(item => {
        showToast(
          '⚡ Ingreso Registrado Automáticamente',
          `Se registró ${item.label ? `"${item.label}" de ` : ''}"${item.title}" (${formatMoney(item.amount, state.currency)}) según su fecha programada`,
          'success'
        );
      });
    }
  }, [state.recurringIncomes, state.transactions.length, pushToCloud, state.currency]);

  // Check and process any recurring transfers scheduled for auto-registration
  useEffect(() => {
    if (!state.recurringTransfers || state.recurringTransfers.length === 0) return;
    const hasAnyAuto = state.recurringTransfers.some(t => t.isActive && t.autoRegister);
    if (!hasAnyAuto) return;

    const { updatedState, registeredItems } = processAutoRecurringTransfers(state);
    if (registeredItems.length > 0) {
      setState(updatedState);
      pushToCloud(updatedState);

      registeredItems.forEach(item => {
        const fromAcc = state.bankAccounts.find(b => b.id === item.fromBankAccountId);
        const toAcc = state.bankAccounts.find(b => b.id === item.toBankAccountId);
        showToast(
          '⚡ Transferencia Automática Realizada',
          `Se ejecutó "${item.title}" (${formatMoney(item.amount, state.currency)})${fromAcc && toAcc ? ` (${fromAcc.name} ➔ ${toAcc.name})` : ''} según su fecha programada`,
          'success'
        );
      });
    }
  }, [state.recurringTransfers, state.transactions.length, pushToCloud, state.currency, state.bankAccounts]);

  // Check and process any recurring expenses scheduled for auto-registration
  useEffect(() => {
    if (!state.recurringExpenses || state.recurringExpenses.length === 0) return;
    const hasAnyAuto = state.recurringExpenses.some(exp => exp.isActive && (exp.autoLogTransaction || (exp as any).autoRegister));
    if (!hasAnyAuto) return;

    const { updatedState, registeredItems } = processAutoRecurringExpenses(state);
    if (registeredItems.length > 0) {
      setState(updatedState);
      pushToCloud(updatedState);

      registeredItems.forEach(item => {
        showToast(
          '⚡ Gasto Registrado Automáticamente',
          `Se contabilizó el pago de "${item.title}" (${formatMoney(item.amount, state.currency)}) en su fecha de vencimiento`,
          'success'
        );
      });
    }
  }, [state.recurringExpenses, state.transactions.length, pushToCloud, state.currency]);

  // Bank sync action
  const syncBankAccounts = useCallback(async () => {
    const activeBank = state.bankAccounts.find(b => b.autoSync || b.status === 'connected') || state.bankAccounts[0];
    if (!activeBank) {
      showToast('Sin cuentas conectadas', 'Agrega una cuenta bancaria para habilitar la sincronización bancaria.', 'info');
      return;
    }

    setIsBankSyncing(true);
    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeBank.id,
          bankName: activeBank.bankName,
          memberId: activeBank.holderMemberId || state.members[0]?.id,
          currency: state.currencyCode || 'EUR',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.transactions && data.transactions.length > 0) {
          const newTxList: Transaction[] = data.transactions;
          
          setState(prev => {
            const updatedTx = [...newTxList, ...prev.transactions];
            // Update bank accounts balance
            const updatedBanks = prev.bankAccounts.map(b => ({
              ...b,
              lastSynced: 'Justo ahora',
              balance: b.balance - newTxList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            }));

            const nextState: FamilyState = {
              ...prev,
              transactions: updatedTx,
              bankAccounts: updatedBanks,
              updatedAt: Date.now(),
            };
            pushToCloud(nextState);
            return nextState;
          });

          showToast(
            'Cuentas Bancarias Sincronizadas',
            `Se han importado ${newTxList.length} nueva(s) transacción(es) bancarias`,
            'success'
          );
        } else {
          showToast('Bancos al día', data?.message || 'No hay nuevos movimientos bancarios pendientes', 'info');
        }
      } else if (res.status === 429) {
        const errorData = await res.json().catch(() => null);
        showToast(
          'Límite de solicitudes alcanzado',
          errorData?.error || 'Por seguridad contra abusos, espere un momento antes de volver a sincronizar.',
          'warning'
        );
      } else {
        showToast('Error de conexión', 'No se pudo contactar con la pasarela bancaria', 'warning');
      }
    } catch (e) {
      showToast('Error de conexión', 'No se pudo contactar con la pasarela bancaria', 'warning');
    } finally {
      setIsBankSyncing(false);
    }
  }, [state.bankAccounts, state.members, state.currencyCode, pushToCloud]);

  // Current Month Alert calculations
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const alerts = useMemo<BudgetAlert[]>(() => {
    const alertSettings = state.alertSettings || defaultAlertSettings;
    const currentMonthTx = state.transactions.filter(t => t.date.startsWith(currentMonthKey));
    const result: BudgetAlert[] = [];

    // Global budget alert
    const totalSpent = currentMonthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const globalPct = state.globalMonthlyBudget > 0 ? (totalSpent / state.globalMonthlyBudget) * 100 : 0;
    if (globalPct >= state.globalAlertThreshold) {
      const level = globalPct >= 100 ? 'danger' : 'warning';
      const allowLevel = level === 'danger' ? alertSettings.notifyOnDanger : alertSettings.notifyOnWarning;
      if (allowLevel) {
        result.push({
          id: 'alert-global',
          type: 'budget_global',
          title: globalPct >= 100 ? '¡Presupuesto Familiar Excedido!' : 'Atención: Límite Familiar Próximo',
          categoryName: 'Presupuesto Familiar Total',
          currentSpent: totalSpent,
          budgetLimit: state.globalMonthlyBudget,
          percentage: globalPct,
          threshold: state.globalAlertThreshold,
          level,
          date: new Date().toLocaleDateString('es-ES'),
          description: `Has gastado ${formatMoney(totalSpent, state.currency)} de un tope de ${formatMoney(state.globalMonthlyBudget, state.currency)}.`,
        });
      }
    }

    // Category alerts
    state.categories.forEach(cat => {
      const catSpent = currentMonthTx
        .filter(t => t.type === 'expense' && t.category === cat.name)
        .reduce((sum, t) => sum + t.amount, 0);

      const limit = cat.budgetLimit;
      if (limit > 0) {
        const pct = (catSpent / limit) * 100;
        if (pct >= cat.alertThreshold) {
          const level = pct >= 100 ? 'danger' : 'warning';
          const allowLevel = level === 'danger' ? alertSettings.notifyOnDanger : alertSettings.notifyOnWarning;
          if (allowLevel) {
            result.push({
              id: `alert-cat-${cat.id}`,
              type: 'budget_category',
              categoryId: cat.id,
              title: pct >= 100 ? `Límite superado en ${cat.name}` : `Gasto cercano al límite en ${cat.name}`,
              categoryName: cat.name,
              currentSpent: catSpent,
              budgetLimit: limit,
              percentage: pct,
              threshold: cat.alertThreshold,
              level,
              date: new Date().toLocaleDateString('es-ES'),
              description: `Gastado ${formatMoney(catSpent, state.currency)} de un presupuesto de ${formatMoney(limit, state.currency)} (${pct.toFixed(0)}%).`,
            });
          }
        }
      }
    });

    // Recurring expenses alerts (upcoming or past due, only for unpaid bills)
    if (alertSettings.notifyOnRecurringDue && state.recurringExpenses && state.recurringExpenses.length > 0) {
      const today = new Date();

      state.recurringExpenses.forEach(rec => {
        if (!rec.isActive) return;
        const summary = getRecurringExpenseSummary(rec, state.transactions, today);

        // If it's already paid this month/cycle, it is NOT due and NOT overdue!
        if (summary.isPaidThisMonth) return;

        // Alert only if within 5 days of due date or if overdue
        if (summary.daysUntilDue <= 5) {
          const isOverdue = summary.isOverdue;
          const level = isOverdue ? 'danger' : 'warning';
          const allowLevel = level === 'danger' ? alertSettings.notifyOnDanger : alertSettings.notifyOnWarning;
          if (allowLevel) {
            const hasForeign = rec.currency && rec.currency !== state.currencyCode && rec.originalAmount;
            const formattedAmt = hasForeign
              ? `${formatMoney(rec.amount, state.currency)} (${formatMoney(rec.originalAmount, rec.currency || '$')})`
              : formatMoney(rec.amount, state.currency);

            const diffDays = summary.daysUntilDue;

            let alertTitle = `Factura por vencer: ${rec.title}`;
            if (isOverdue) {
              alertTitle = `Factura vencida: ${rec.title}`;
            } else if (diffDays === 0) {
              alertTitle = `Vence hoy: ${rec.title}`;
            } else if (diffDays === 1) {
              alertTitle = `Vence mañana: ${rec.title}`;
            } else {
              alertTitle = `Vence en ${diffDays} días: ${rec.title}`;
            }

            result.push({
              id: `alert-rec-${rec.id}`,
              type: 'recurring_due',
              recurringId: rec.id,
              recurringTitle: rec.title,
              title: alertTitle,
              categoryName: rec.category,
              currentSpent: rec.amount,
              budgetLimit: rec.amount,
              percentage: isOverdue ? 100 : Math.max(0, Math.min(100, Math.round(((5 - diffDays) / 5) * 100))),
              threshold: 100,
              level,
              date: summary.effectiveNextDueDate,
              dueDate: summary.effectiveNextDueDate,
              daysUntilDue: diffDays,
              formattedAmount: formattedAmt,
              description: isOverdue
                ? `Venció el ${summary.formattedFullDate} (${Math.abs(diffDays)}d de atraso). Importe: ${formattedAmt}`
                : diffDays === 0
                ? `Vence hoy (${summary.formattedFullDate}). Importe: ${formattedAmt}`
                : `Vence el ${summary.formattedFullDate} (en ${diffDays} días). Importe: ${formattedAmt}`,
            });
          }
        }
      });
    }

    return result;
  }, [state.transactions, state.categories, state.recurringExpenses, state.globalMonthlyBudget, state.globalAlertThreshold, state.alertSettings, state.currency, currentMonthKey]);

  // Transaction mutations
  const addTransaction = useCallback((newTx: Omit<Transaction, 'id' | 'createdAt'>) => {
    let finalTxData = { ...newTx };

    // Enforce that every transaction has a bank account assigned
    if (!finalTxData.bankAccountId && state.bankAccounts.length > 0) {
      const memberAccs = state.bankAccounts.filter(b => {
        const holderId = b.holderMemberId || (b as any).memberId;
        return holderId ? holderId === finalTxData.memberId : (finalTxData.memberId === state.members[0]?.id || state.members.length <= 1);
      });
      const validAcc = finalTxData.type === 'expense'
        ? memberAccs.find(b => b.accountType !== 'loan') || state.bankAccounts.find(b => b.accountType !== 'loan')
        : memberAccs[0] || state.bankAccounts[0];
      if (validAcc) {
        finalTxData.bankAccountId = validAcc.id;
      }
    }

    if (finalTxData.type === 'transfer') {
      const fromMember = state.members.find(m => m.id === finalTxData.memberId);
      const fromAcc = state.bankAccounts.find(b => b.id === finalTxData.bankAccountId);
      const toAcc = state.bankAccounts.find(b => b.id === finalTxData.toBankAccountId);
      const senderName = fromMember?.name || fromAcc?.name || 'Emisor';

      let desc = (finalTxData.description || '').trim();
      if (!desc) {
        desc = `${senderName} - Transferencia: ${fromAcc ? fromAcc.name : 'Origen'} ➔ ${toAcc ? toAcc.name : 'Destino'}`;
      } else {
        const lowerDesc = desc.toLowerCase();
        const lowerSender = senderName.toLowerCase();
        if (!lowerDesc.startsWith(lowerSender)) {
          desc = `${senderName} - ${desc}`;
        }
      }
      finalTxData.description = desc;
    }

    const fullTx: Transaction = {
      ...finalTxData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    setState(prev => {
      let updatedBankAccounts = prev.bankAccounts;
      if (fullTx.type === 'transfer') {
        updatedBankAccounts = prev.bankAccounts.map(b => {
          if (fullTx.bankAccountId && b.id === fullTx.bankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(fullTx, b, prev.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'transfer', amtInAcc, true);
          }
          if (fullTx.toBankAccountId && b.id === fullTx.toBankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(fullTx, b, prev.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'transfer', amtInAcc, false);
          }
          return b;
        });
      } else if (fullTx.bankAccountId) {
        updatedBankAccounts = prev.bankAccounts.map(b => {
          if (b.id === fullTx.bankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(fullTx, b, prev.currencyCode || 'DOP');
            return applyTransactionToAccount(b, fullTx.type, amtInAcc, false);
          }
          return b;
        });
      }

      const nextState: FamilyState = {
        ...prev,
        transactions: [fullTx, ...prev.transactions],
        bankAccounts: updatedBankAccounts,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });

    // Check for real-time notification trigger on budget alerts
    const alertSettings = state.alertSettings || defaultAlertSettings;
    if (alertSettings.notificationsEnabled && alertSettings.browserNotifications && fullTx.type === 'expense') {
      const cat = state.categories.find(c => c.name === fullTx.category);
      if (cat && cat.budgetLimit > 0) {
        const spentSoFar = state.transactions
          .filter(t => t.type === 'expense' && t.category === cat.name && t.date.startsWith(currentMonthKey))
          .reduce((sum, t) => sum + t.amount, 0) + fullTx.amount;
        const pct = (spentSoFar / cat.budgetLimit) * 100;
        if (pct >= 100 && alertSettings.notifyOnDanger) {
          showBrowserNotification(`⚠️ Límite Excedido: ${cat.name}`, {
            body: `Has alcanzado el ${pct.toFixed(0)}% (${formatMoney(spentSoFar, state.currency)} de ${formatMoney(cat.budgetLimit, state.currency)})`,
            playSound: alertSettings.soundEnabled,
            soundType: 'danger',
          });
        } else if (pct >= cat.alertThreshold && alertSettings.notifyOnWarning) {
          showBrowserNotification(`🔔 Aviso de Presupuesto: ${cat.name}`, {
            body: `Has consumido el ${pct.toFixed(0)}% del límite establecido para ${cat.name}`,
            playSound: alertSettings.soundEnabled,
            soundType: 'warning',
          });
        }
      }
    }

    if (fullTx.type === 'transfer') {
      showToast('Transferencia Registrada', `${fullTx.description} (${formatMoney(fullTx.amount, state.currency)})`, 'info');
    } else {
      showToast('Transacción Registrada', `${fullTx.description} (${fullTx.type === 'income' ? '+' : '-'}${formatMoney(fullTx.amount, state.currency)})`);
    }
  }, [pushToCloud, state.currency, state.alertSettings, state.categories, state.transactions, currentMonthKey]);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      const txToDelete = prev.transactions.find(t => t.id === id);
      let updatedBankAccounts = prev.bankAccounts;
      if (txToDelete) {
        if (txToDelete.type === 'transfer') {
          updatedBankAccounts = prev.bankAccounts.map(b => {
            if (txToDelete.bankAccountId && b.id === txToDelete.bankAccountId) {
              const amtInAcc = getTxAmountInAccountCurrency(txToDelete, b, prev.currencyCode || 'DOP');
              return revertTransactionFromAccount(b, 'transfer', amtInAcc, true);
            }
            if (txToDelete.toBankAccountId && b.id === txToDelete.toBankAccountId) {
              const amtInAcc = getTxAmountInAccountCurrency(txToDelete, b, prev.currencyCode || 'DOP');
              return revertTransactionFromAccount(b, 'transfer', amtInAcc, false);
            }
            return b;
          });
        } else if (txToDelete.bankAccountId) {
          updatedBankAccounts = prev.bankAccounts.map(b => {
            if (b.id === txToDelete.bankAccountId) {
              const amtInAcc = getTxAmountInAccountCurrency(txToDelete, b, prev.currencyCode || 'DOP');
              return revertTransactionFromAccount(b, txToDelete.type, amtInAcc, false);
            }
            return b;
          });
        }
      }

      const nextState: FamilyState = {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        bankAccounts: updatedBankAccounts,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Transacción Eliminada', 'Se ha eliminado la transacción del registro familiar', 'info');
  }, [pushToCloud]);

  // Member mutations
  const addFamilyMember = useCallback((member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: `m-${Date.now()}`,
    };
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        members: [...prev.members, newMember],
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Miembro Agregado', `${member.name} ahora es parte del grupo familiar`);
  }, [pushToCloud]);

  const updateFamilyMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        members: prev.members.map(m => (m.id === id ? { ...m, ...updates } : m)),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Miembro Actualizado', 'Información familiar guardada');
  }, [pushToCloud]);

  const removeFamilyMember = useCallback((id: string) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        members: prev.members.filter(m => m.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Miembro Removido', 'Se ha retirado al miembro de la familia', 'info');
  }, [pushToCloud]);

  // Category mutations
  const updateCategoryBudget = useCallback((id: string, budgetLimit: number, alertThreshold: number) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === id ? { ...c, budgetLimit, alertThreshold } : c
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Presupuesto Actualizado', 'Límite mensual y umbral de alerta guardados');
  }, [pushToCloud]);

  const addCategory = useCallback((newCat: Omit<Category, 'id'>) => {
    const cat: Category = {
      ...newCat,
      id: `cat-${Date.now()}`,
      isCustom: true,
    };
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        categories: [...prev.categories, cat],
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Categoría Creada', `Categoría ${newCat.name} disponible para clasificar gastos`);
  }, [pushToCloud]);

  const updateCategory = useCallback((id: string, updated: Partial<Category>) => {
    setState(prev => {
      const oldCat = prev.categories.find(c => c.id === id);
      const oldName = oldCat?.name;
      const newName = updated.name?.trim();

      const nextCategories = prev.categories.map(c =>
        c.id === id ? { ...c, ...updated, ...(newName ? { name: newName } : {}) } : c
      );

      let nextTransactions = prev.transactions;
      if (oldName && newName && oldName !== newName) {
        nextTransactions = prev.transactions.map(t =>
          t.category === oldName ? { ...t, category: newName } : t
        );
      }

      const nextState: FamilyState = {
        ...prev,
        categories: nextCategories,
        transactions: nextTransactions,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Categoría Actualizada', 'Los cambios en la categoría se han guardado exitosamente');
  }, [pushToCloud]);

  const deleteCategory = useCallback((id: string) => {
    setState(prev => {
      const catToRemove = prev.categories.find(c => c.id === id);
      if (!catToRemove) return prev;

      const nextCategories = prev.categories.filter(c => c.id !== id);
      const nextDeletedIds = Array.from(new Set([...(prev.deletedCategoryIds || []), id]));

      const nextState: FamilyState = {
        ...prev,
        categories: nextCategories,
        deletedCategoryIds: nextDeletedIds,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Categoría Eliminada', 'Se ha eliminado la categoría del presupuesto', 'info');
  }, [pushToCloud]);

  // Tag mutations
  const addTag = useCallback((name: string, color: string) => {
    const cleanName = name.trim().replace(/^#/, '');
    if (!cleanName) return;
    const tag: Tag = {
      id: `tag-${Date.now()}`,
      name: cleanName,
      color,
    };
    setState(prev => {
      if (prev.tags.some(t => t.name.toLowerCase() === cleanName.toLowerCase())) {
        return prev;
      }
      const nextState: FamilyState = {
        ...prev,
        tags: [...prev.tags, tag],
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Etiqueta Creada', `#${cleanName}`);
  }, [pushToCloud]);

  const removeTag = useCallback((id: string) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        tags: prev.tags.filter(t => t.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
  }, [pushToCloud]);

  // Bank account management
  const addBankAccount = useCallback((bank: Omit<BankAccount, 'id' | 'lastSynced'>) => {
    const newBank: BankAccount = {
      ...bank,
      id: `bank-${Date.now()}`,
      lastSynced: 'Recién conectado',
    };
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        bankAccounts: [...prev.bankAccounts, newBank],
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Cuenta Vinculada', `Conexión establecida con ${bank.bankName}`);
  }, [pushToCloud]);

  const toggleBankAutoSync = useCallback((bankId: string) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        bankAccounts: prev.bankAccounts.map(b =>
          b.id === bankId ? { ...b, autoSync: !b.autoSync } : b
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
  }, [pushToCloud]);

  const updateBankAccount = useCallback((id: string, updated: Partial<BankAccount>) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        bankAccounts: prev.bankAccounts.map(b =>
          b.id === id ? { ...b, ...updated } : b
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Producto Bancario Actualizado', 'Los cambios se han guardado en el hogar');
  }, [pushToCloud]);

  const deleteBankAccount = useCallback((id: string) => {
    // Validar si la cuenta tiene ingresos recurrentes asignados
    const hasAssignedIncomes = (state.recurringIncomes || []).some(
      inc => inc.destinationAccountId === id
    );
    if (hasAssignedIncomes) {
      showToast(
        'Acción bloqueada',
        'No se puede eliminar una cuenta que tiene ingresos recurrentes asignados. Reasígnalos primero.',
        'warning'
      );
      return false;
    }

    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        bankAccounts: prev.bankAccounts.filter(b => b.id !== id),
        // Desvincular de gastos recurrentes si apuntaban a esta cuenta
        recurringExpenses: (prev.recurringExpenses || []).map(exp =>
          exp.paymentAccountId === id ? { ...exp, paymentAccountId: undefined } : exp
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Cuenta Desvinculada', 'Se ha eliminado la cuenta bancaria del hogar', 'info');
    return true;
  }, [state.recurringIncomes, pushToCloud]);

  // Custom bank entities management
  const addCustomBank = useCallback((bank: { name: string; shortName?: string; color?: string; categoryLabel?: string }) => {
    const trimmed = bank.name.trim();
    if (!trimmed) return;
    const newBank: BankEntity = {
      id: `bank-custom-${Date.now()}`,
      name: trimmed,
      shortName: bank.shortName?.trim() || trimmed,
      color: bank.color || '#004b87',
      category: 'custom',
      categoryLabel: bank.categoryLabel || 'Banco Agregado',
      isCustom: true,
    };
    setState(prev => {
      const existing = prev.customBanks || [];
      if (existing.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const nextState: FamilyState = {
        ...prev,
        customBanks: [...existing, newBank],
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Banco Agregado', `Se ha añadido ${trimmed} a la lista de entidades`);
  }, [pushToCloud]);

  const deleteCustomBank = useCallback((id: string) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        customBanks: (prev.customBanks || []).filter(b => b.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Banco Removido', 'Se ha eliminado la entidad de la lista personalizada', 'info');
  }, [pushToCloud]);

  // Update global budget
  const updateGlobalBudget = useCallback((globalMonthlyBudget: number, globalAlertThreshold: number) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        globalMonthlyBudget,
        globalAlertThreshold,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Presupuesto Global Guardado', `Límite mensual fijado en ${state.currency}${globalMonthlyBudget}`);
  }, [pushToCloud, state.currency]);

  // Update default currency
  const updateDefaultCurrency = useCallback((currencyCode: string, symbol: string) => {
    setState(prev => {
      const nextState: FamilyState = {
        ...prev,
        currency: symbol,
        currencyCode: currencyCode.toUpperCase(),
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Moneda Principal Actualizada', `Moneda base establecida en ${currencyCode} (${symbol})`);
  }, [pushToCloud]);

  // Update family reference code
  const switchFamilyCode = useCallback(async (newCode: string) => {
    const cleanCode = newCode.trim().toUpperCase();
    if (!cleanCode) return;
    setState(prev => {
      const nextState = { ...prev, familyCode: cleanCode, updatedAt: Date.now() };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Código Familiar Actualizado', `Referencia de hogar: ${cleanCode}`);
  }, [pushToCloud]);

  // Clean wipe data (keeps categories with 0 limits, removes all test data)
  const clearAllLocalData = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (_) {}
    const cleanState = resetToEmptyState(state);
    setState(cleanState);
    pushToCloud(cleanState);
    showToast('Datos de Prueba Eliminados', 'Se han eliminado todos los datos de prueba dejando las categorías con límites en 0');
  }, [state, pushToCloud]);

  // Reset/clean helper
  const loadAnonymousDemo = useCallback(() => {
    clearAllLocalData();
  }, [clearAllLocalData]);

  // 1. Savings Goals
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id' | 'contributions' | 'currentAmount'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      currentAmount: 0,
      contributions: [],
    };
    setState(prev => {
      const next = {
        ...prev,
        savingsGoals: [...(prev.savingsGoals || []), newGoal],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Meta de Ahorro Creada', `Meta "${goal.title}" configurada`);
  }, [pushToCloud]);

  const contributeToGoal = useCallback((goalId: string, amount: number, memberId: string, note?: string) => {
    setState(prev => {
      const goal = (prev.savingsGoals || []).find(g => g.id === goalId);
      if (!goal) return prev;

      const contribution: SavingsContribution = {
        id: `sc-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        amount,
        memberId,
        note,
      };

      const nextGoals = (prev.savingsGoals || []).map(g =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: g.currentAmount + amount,
              contributions: [contribution, ...g.contributions],
            }
          : g
      );

      const next: FamilyState = {
        ...prev,
        savingsGoals: nextGoals,
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Aporte Guardado', `Se han añadido fondos a la meta de ahorro`);
  }, [pushToCloud]);

  const deleteSavingsGoal = useCallback((goalId: string) => {
    setState(prev => {
      const next = {
        ...prev,
        savingsGoals: (prev.savingsGoals || []).filter(g => g.id !== goalId),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Meta Eliminada', 'La meta de ahorro ha sido eliminada');
  }, [pushToCloud]);

  // 2. Recurring Expenses
  const addRecurringExpense = useCallback((expense: Omit<RecurringExpense, 'id' | 'nextDueDate'>) => {
    // Validate that payment account cannot be of type 'loan'
    if (expense.paymentAccountId) {
      const assignedAcc = state.bankAccounts.find(b => b.id === expense.paymentAccountId);
      if (assignedAcc && assignedAcc.accountType === 'loan') {
        showToast('Cuenta no válida', 'No se puede asignar un gasto recurrente a cuentas tipo préstamo', 'warning');
        return;
      }
    }

    const now = new Date();
    const tempExpense = { ...expense, id: '', nextDueDate: '' } as RecurringExpense;
    const nextDueDate = computeEffectiveNextDueDate(tempExpense, false, now);

    const newExpense: RecurringExpense = {
      ...expense,
      id: `rec-${Date.now()}`,
      nextDueDate,
    };

    setState(prev => {
      const next = {
        ...prev,
        recurringExpenses: [...(prev.recurringExpenses || []), newExpense],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Factura Programada', `"${expense.title}" añadida. Próximo vencimiento: ${formatFullDate(nextDueDate)}`);
  }, [pushToCloud, state.bankAccounts]);

  const deleteRecurringExpense = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringExpenses: (prev.recurringExpenses || []).filter(r => r.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const toggleRecurringActive = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringExpenses: (prev.recurringExpenses || []).map(r =>
          r.id === id ? { ...r, isActive: !r.isActive } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const updateRecurringExpense = useCallback((id: string, updates: Partial<RecurringExpense>) => {
    // Validate that payment account cannot be of type 'loan'
    if (updates.paymentAccountId) {
      const assignedAcc = state.bankAccounts.find(b => b.id === updates.paymentAccountId);
      if (assignedAcc && assignedAcc.accountType === 'loan') {
        showToast('Cuenta no válida', 'No se puede asignar un gasto recurrente a cuentas tipo préstamo', 'warning');
        return;
      }
    }

    setState(prev => {
      const next = {
        ...prev,
        recurringExpenses: (prev.recurringExpenses || []).map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Factura Actualizada', 'Los datos del gasto recurrente han sido actualizados');
  }, [pushToCloud, state.bankAccounts]);

  const payRecurringExpense = useCallback((expense: RecurringExpense, paymentAccountId?: string) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const nextDueDate = computeEffectiveNextDueDate(expense, true, today);
    const targetAccountId = paymentAccountId || expense.paymentAccountId;

    if (targetAccountId) {
      const targetAcc = state.bankAccounts.find(b => b.id === targetAccountId);
      if (targetAcc && targetAcc.accountType === 'loan') {
        showToast('Débito no permitido', 'No se puede debitar un gasto a cuentas de tipo Préstamo', 'warning');
        return;
      }
    }

    const newTx: Transaction = {
      id: `tx-rec-${Date.now()}`,
      date: todayStr,
      description: `Pago factura: ${expense.title}`,
      amount: expense.amount,
      type: 'expense',
      category: expense.category,
      memberId: expense.memberId,
      bankAccountId: targetAccountId,
      tags: ['Fijo/Recurrente'],
      currency: expense.currency,
      originalAmount: expense.originalAmount,
      exchangeRate: expense.exchangeRate,
      recurringExpenseId: expense.id,
      createdAt: Date.now(),
    };

    setState(prev => {
      let updatedBankAccounts = prev.bankAccounts;
      if (newTx.bankAccountId) {
        updatedBankAccounts = prev.bankAccounts.map(b => {
          if (b.id === newTx.bankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, prev.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'expense', amtInAcc, false);
          }
          return b;
        });
      }

      const updatedRecurring = (prev.recurringExpenses || []).map(r => {
        if (r.id === expense.id) {
          return {
            ...r,
            lastPaidDate: todayStr,
            lastPaidMonth: ym,
            nextDueDate,
          };
        }
        return r;
      });

      const next = {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        bankAccounts: updatedBankAccounts,
        recurringExpenses: updatedRecurring,
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Pago Registrado', `"${expense.title}" pagada este mes. Próximo pago: ${formatFullDate(nextDueDate)}`);
  }, [pushToCloud]);

  // 2.1 Recurring Incomes (Nóminas, Rentas, Pensiones, etc.)
  const addRecurringIncome = useCallback((income: Omit<RecurringIncome, 'id' | 'nextDueDate'>) => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayStr = String(income.dueDay).padStart(2, '0');
    const nextDueDate = `${ym}-${dayStr}`;

    const newIncome: RecurringIncome = {
      ...income,
      id: `rec-inc-${Date.now()}`,
      nextDueDate,
    };

    setState(prev => {
      const next = {
        ...prev,
        recurringIncomes: [...(prev.recurringIncomes || []), newIncome],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Ingreso Fijo Guardado', `"${income.title}" programado en ingresos recurrentes`);
  }, [pushToCloud]);

  const deleteRecurringIncome = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringIncomes: (prev.recurringIncomes || []).filter(r => r.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Ingreso Fijo Eliminado', 'Se ha eliminado el ingreso fijo programado');
  }, [pushToCloud]);

  const toggleRecurringIncomeActive = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringIncomes: (prev.recurringIncomes || []).map(r =>
          r.id === id ? { ...r, isActive: !r.isActive } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const updateRecurringIncome = useCallback((id: string, updates: Partial<RecurringIncome>) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringIncomes: (prev.recurringIncomes || []).map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Ingreso Fijo Actualizado', 'Los datos del ingreso fijo se han actualizado');
  }, [pushToCloud]);

  const collectRecurringIncome = useCallback((income: RecurringIncome, installment?: RecurringIncomeInstallment) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthKey = todayStr.slice(0, 7);
    const txAmount = installment ? installment.amount : income.amount;
    const txOrigAmount = installment
      ? (installment.originalAmount !== undefined ? installment.originalAmount : installment.amount)
      : income.originalAmount;
    const desc = installment
      ? `Ingreso fijo (${installment.label}): ${income.title}`
      : `Ingreso fijo: ${income.title}`;

    const newTx: Transaction = {
      id: `tx-rec-inc-${Date.now()}`,
      date: todayStr,
      description: desc,
      amount: txAmount,
      type: 'income',
      category: income.category || 'Nómina / Sueldo',
      memberId: income.memberId,
      bankAccountId: income.destinationAccountId,
      tags: ['Fijo/Recurrente', 'Ingreso', ...(installment ? [installment.label || ''] : [])].filter(Boolean),
      currency: income.currency,
      originalAmount: txOrigAmount,
      exchangeRate: income.exchangeRate,
      createdAt: Date.now(),
      recurringIncomeId: income.id,
      recurringInstallmentId: installment?.id,
    };

    setState(prev => {
      let updatedBankAccounts = prev.bankAccounts;
      if (newTx.bankAccountId) {
        updatedBankAccounts = prev.bankAccounts.map(b => {
          if (b.id === newTx.bankAccountId) {
            const amtInAcc = getTxAmountInAccountCurrency(newTx, b, prev.currencyCode || 'DOP');
            return applyTransactionToAccount(b, 'income', amtInAcc, false);
          }
          return b;
        });
      }

      const updatedRecurringIncomes = (prev.recurringIncomes || []).map(r => {
        if (r.id === income.id) {
          if (installment && r.installments) {
            const updatedInsts = r.installments.map(inst => {
              if (inst.id === installment.id || inst.name === installment.name) {
                return {
                  ...inst,
                  lastRegisteredDate: todayStr,
                  lastRegisteredPeriod: `${currentMonthKey}-${installment.id || 'inst'}`,
                };
              }
              return inst;
            });
            return {
              ...r,
              installments: updatedInsts,
              lastRegisteredDate: todayStr,
              lastRegisteredPeriod: currentMonthKey,
            };
          }
          return {
            ...r,
            lastRegisteredDate: todayStr,
            lastRegisteredPeriod: currentMonthKey,
          };
        }
        return r;
      });

      const next = {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        bankAccounts: updatedBankAccounts,
        recurringIncomes: updatedRecurringIncomes,
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast(
      'Ingreso Contabilizado',
      installment
        ? `Se ha registrado ${installment.label} de "${income.title}" (${formatMoney(txAmount, state.currency)})`
        : `Se ha registrado el ingreso "${income.title}" este mes`
    );
  }, [pushToCloud, state.currency]);

  const toggleRecurringIncomeAutoRegister = useCallback((id: string) => {
    setState(prev => {
      let targetTitle = '';
      let isNowActive = false;
      const nextIncomes = (prev.recurringIncomes || []).map(r => {
        if (r.id === id) {
          targetTitle = r.title;
          isNowActive = !r.autoRegister;
          return { ...r, autoRegister: isNowActive };
        }
        return r;
      });

      const next = {
        ...prev,
        recurringIncomes: nextIncomes,
        updatedAt: Date.now(),
      };
      pushToCloud(next);

      showToast(
        isNowActive ? '⚡ Registro Automático Activado' : 'Registro Manual Activado',
        isNowActive
          ? `"${targetTitle}" se registrará automáticamente en los movimientos en cada fecha de cobro`
          : `"${targetTitle}" ahora requiere registro manual`,
        isNowActive ? 'success' : 'info'
      );

      return next;
    });
  }, [pushToCloud]);

  // Toggle auto-register on recurring expense
  const toggleRecurringExpenseAutoRegister = useCallback((id: string) => {
    setState(prev => {
      let targetTitle = '';
      let isNowActive = false;
      const nextExpenses = (prev.recurringExpenses || []).map(r => {
        if (r.id === id) {
          targetTitle = r.title;
          isNowActive = !(r.autoLogTransaction || (r as any).autoRegister);
          return { ...r, autoLogTransaction: isNowActive, autoRegister: isNowActive };
        }
        return r;
      });

      const next = {
        ...prev,
        recurringExpenses: nextExpenses,
        updatedAt: Date.now(),
      };
      pushToCloud(next);

      showToast(
        isNowActive ? '⚡ Registro Automático Activado' : 'Registro Manual Activado',
        isNowActive
          ? `"${targetTitle}" se contabilizará automáticamente en su fecha de cobro`
          : `"${targetTitle}" ahora requiere registro manual de pago`,
        isNowActive ? 'success' : 'info'
      );

      return next;
    });
  }, [pushToCloud]);

  // 2.2 Recurring Transfers (Transferencias Recurrentes entre cuentas de la familia)
  const addRecurringTransfer = useCallback((transfer: Omit<RecurringTransfer, 'id' | 'nextDueDate'>) => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayStr = String(transfer.dueDay).padStart(2, '0');
    const nextDueDate = `${ym}-${dayStr}`;

    const newTransfer: RecurringTransfer = {
      ...transfer,
      id: `rec-trans-${Date.now()}`,
      nextDueDate,
    };

    setState(prev => {
      const next = {
        ...prev,
        recurringTransfers: [...(prev.recurringTransfers || []), newTransfer],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Transferencia Programada Guardada', `"${transfer.title}" agregada a transferencias recurrentes`);
  }, [pushToCloud]);

  const deleteRecurringTransfer = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringTransfers: (prev.recurringTransfers || []).filter(r => r.id !== id),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Transferencia Eliminada', 'Se ha eliminado la transferencia recurrente');
  }, [pushToCloud]);

  const toggleRecurringTransferActive = useCallback((id: string) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringTransfers: (prev.recurringTransfers || []).map(r =>
          r.id === id ? { ...r, isActive: !r.isActive } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const updateRecurringTransfer = useCallback((id: string, updates: Partial<RecurringTransfer>) => {
    setState(prev => {
      const next = {
        ...prev,
        recurringTransfers: (prev.recurringTransfers || []).map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Transferencia Actualizada', 'Los datos de la transferencia programada se han actualizado');
  }, [pushToCloud]);

  const toggleRecurringTransferAutoRegister = useCallback((id: string) => {
    setState(prev => {
      let targetTitle = '';
      let isNowActive = false;
      const nextTransfers = (prev.recurringTransfers || []).map(r => {
        if (r.id === id) {
          targetTitle = r.title;
          isNowActive = !r.autoRegister;
          return { ...r, autoRegister: isNowActive };
        }
        return r;
      });

      const next = {
        ...prev,
        recurringTransfers: nextTransfers,
        updatedAt: Date.now(),
      };
      pushToCloud(next);

      showToast(
        isNowActive ? '⚡ Automatización Activada' : 'Transferencia Manual Activada',
        isNowActive
          ? `"${targetTitle}" se transferirá automáticamente entre las cuentas en su fecha programada`
          : `"${targetTitle}" ahora requiere ejecución manual`,
        isNowActive ? 'success' : 'info'
      );

      return next;
    });
  }, [pushToCloud]);

  const executeRecurringTransfer = useCallback((transfer: RecurringTransfer) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthKey = todayStr.slice(0, 7);

    const fromAcc = state.bankAccounts.find(b => b.id === transfer.fromBankAccountId);
    const toAcc = state.bankAccounts.find(b => b.id === transfer.toBankAccountId);
    const fromMember = state.members.find(m => m.id === transfer.fromMemberId);
    const senderName = fromMember?.name || fromAcc?.name || 'Emisor';

    const newTx: Transaction = {
      id: `tx-rec-trans-${Date.now()}`,
      date: todayStr,
      description: `${senderName} - Transferencia programada: ${transfer.title}`,
      amount: transfer.amount,
      type: 'transfer',
      category: transfer.category || 'Transferencia Interna',
      memberId: transfer.fromMemberId || state.members[0]?.id || '',
      toMemberId: transfer.toMemberId,
      bankAccountId: transfer.fromBankAccountId,
      toBankAccountId: transfer.toBankAccountId,
      tags: ['Fijo/Recurrente', 'Transferencia'],
      currency: transfer.currency,
      originalAmount: transfer.originalAmount,
      exchangeRate: transfer.exchangeRate,
      createdAt: Date.now(),
      recurringTransferId: transfer.id,
    };

    setState(prev => {
      let updatedBankAccounts = prev.bankAccounts.map(b => {
        if (b.id === transfer.fromBankAccountId) {
          const amtInAcc = getTxAmountInAccountCurrency(newTx, b, prev.currencyCode || 'DOP');
          return applyTransactionToAccount(b, 'transfer', amtInAcc, true);
        }
        if (b.id === transfer.toBankAccountId) {
          const amtInAcc = getTxAmountInAccountCurrency(newTx, b, prev.currencyCode || 'DOP');
          return applyTransactionToAccount(b, 'transfer', amtInAcc, false);
        }
        return b;
      });

      const updatedTransfers = (prev.recurringTransfers || []).map(r => {
        if (r.id === transfer.id) {
          return {
            ...r,
            lastTransferredDate: todayStr,
            lastTransferredPeriod: currentMonthKey,
          };
        }
        return r;
      });

      const next = {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        bankAccounts: updatedBankAccounts,
        recurringTransfers: updatedTransfers,
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });

    showToast(
      'Transferencia Registrada',
      `Se traspasaron ${formatMoney(transfer.amount, state.currency)}${fromAcc && toAcc ? ` de ${fromAcc.name} a ${toAcc.name}` : ''}`
    );
  }, [pushToCloud, state.currency, state.bankAccounts, state.members]);

  // 3. Child Allowances
  const addChildAllowance = useCallback((allowance: Omit<ChildAllowance, 'id' | 'currentSavings'>) => {
    const newAllowance: ChildAllowance = {
      ...allowance,
      id: `allow-${Date.now()}`,
      currentSavings: 0,
    };

    setState(prev => {
      const next = {
        ...prev,
        childAllowances: [...(prev.childAllowances || []), newAllowance],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Asignación Configurada', 'Paga periódica establecida');
  }, [pushToCloud]);

  const payAllowance = useCallback((allowanceId: string) => {
    setState(prev => {
      const allowance = (prev.childAllowances || []).find(a => a.id === allowanceId);
      if (!allowance) return prev;

      const child = prev.members.find(m => m.id === allowance.memberId);
      const childName = child?.name || 'Hijo/a';

      const tx: Transaction = {
        id: `tx-allow-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        description: `Paga semanal/mensual: ${childName}`,
        amount: allowance.amount,
        type: 'expense',
        category: 'Educación & Formación',
        memberId: allowance.memberId,
        tags: ['Paga Familiar', 'Fijo/Recurrente'],
        createdAt: Date.now(),
      };

      const nextAllowances = (prev.childAllowances || []).map(a =>
        a.id === allowanceId
          ? {
              ...a,
              currentSavings: a.currentSavings + a.amount,
              lastPayoutDate: new Date().toISOString().slice(0, 10),
            }
          : a
      );

      const next: FamilyState = {
        ...prev,
        childAllowances: nextAllowances,
        transactions: [tx, ...prev.transactions],
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Paga Entregada', `Se ha abonado la paga y transferido a sus ahorros personales`);
  }, [pushToCloud]);

  const deleteChildAllowance = useCallback((allowanceId: string) => {
    setState(prev => {
      const next = {
        ...prev,
        childAllowances: (prev.childAllowances || []).filter(a => a.id !== allowanceId),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const addTaskToAllowance = useCallback((allowanceId: string, taskText: string) => {
    setState(prev => {
      const next = {
        ...prev,
        childAllowances: (prev.childAllowances || []).map(a =>
          a.id === allowanceId
            ? { ...a, tasksRequired: [...(a.tasksRequired || []), taskText] }
            : a
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  const removeTaskFromAllowance = useCallback((allowanceId: string, taskIndex: number) => {
    setState(prev => {
      const next = {
        ...prev,
        childAllowances: (prev.childAllowances || []).map(a =>
          a.id === allowanceId
            ? { ...a, tasksRequired: (a.tasksRequired || []).filter((_, i) => i !== taskIndex) }
            : a
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
  }, [pushToCloud]);

  // 4. 50/30/20 Bucket update
  const updateCategoryBucket = useCallback((categoryId: string, bucket: 'needs' | 'wants' | 'savings') => {
    setState(prev => {
      const next = {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId ? { ...c, bucket503020: bucket } : c
        ),
        updatedAt: Date.now(),
      };
      pushToCloud(next);
      return next;
    });
    showToast('Clasificación Actualizada', 'Categoría reasignada para la regla 50/30/20');
  }, [pushToCloud]);

  // 6. Restore state from Backup
  const restoreState = useCallback((restoredState: FamilyState) => {
    setState(restoredState);
    pushToCloud(restoredState);
  }, [pushToCloud]);

  // 7. Alert & Notification settings
  const updateAlertSettings = useCallback((newSettings: Partial<AlertSettings>) => {
    setState(prev => {
      const current = prev.alertSettings || defaultAlertSettings;
      const nextSettings: AlertSettings = { ...current, ...newSettings };
      const nextState: FamilyState = {
        ...prev,
        alertSettings: nextSettings,
        updatedAt: Date.now(),
      };
      pushToCloud(nextState);
      return nextState;
    });
    showToast('Ajustes de Alertas Guardados', 'Preferencias de notificaciones actualizadas', 'success');
  }, [pushToCloud]);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    const currentAlertSettings = state.alertSettings || defaultAlertSettings;
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      showBrowserNotification('🔔 Finanzas Familiares: Notificación de Prueba', {
        body: '¡Todo listo! Las notificaciones del sistema están funcionando correctamente en este dispositivo.',
        playSound: currentAlertSettings.soundEnabled,
        soundType: 'success',
      });
      showToast('Notificación Enviada', 'Se ha emitido una notificación de prueba en tu navegador', 'success');
      return true;
    } else {
      showToast(
        'Permiso Requerido',
        perm === 'denied'
          ? 'Las notificaciones están bloqueadas en tu navegador. Puedes habilitarlas desde la configuración del sitio.'
          : 'Por favor autoriza los permisos de notificación en tu navegador para recibirlas.',
        'warning'
      );
      return false;
    }
  }, [state.alertSettings]);

  return {
    state,
    isDarkMode,
    toggleDarkMode,
    passphrase,
    updatePassphrase,
    updateDefaultCurrency,
    loadAnonymousDemo,
    clearAllLocalData,
    isCloudSyncing,
    cloudStatus,
    lastSyncText,
    isBankSyncing,
    alerts,
    toastMessage,
    showToast,
    syncBankAccounts,
    addTransaction,
    deleteTransaction,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    updateCategoryBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    removeTag,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addCustomBank,
    deleteCustomBank,
    toggleBankAutoSync,
    updateGlobalBudget,
    switchFamilyCode,
    pushToCloud,
    pullFromCloud,
    currentMonthKey,
    // New features
    addSavingsGoal,
    contributeToGoal,
    deleteSavingsGoal,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringActive,
    payRecurringExpense,
    toggleRecurringExpenseAutoRegister,
    addRecurringIncome,
    updateRecurringIncome,
    deleteRecurringIncome,
    toggleRecurringIncomeActive,
    toggleRecurringIncomeAutoRegister,
    collectRecurringIncome,
    addRecurringTransfer,
    updateRecurringTransfer,
    deleteRecurringTransfer,
    toggleRecurringTransferActive,
    toggleRecurringTransferAutoRegister,
    executeRecurringTransfer,
    addChildAllowance,
    payAllowance,
    deleteChildAllowance,
    addTaskToAllowance,
    removeTaskFromAllowance,
    updateCategoryBucket,
    restoreState,
    updateAlertSettings,
    sendTestNotification,
  };
}
