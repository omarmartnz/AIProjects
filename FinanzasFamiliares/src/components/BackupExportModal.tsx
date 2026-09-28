import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  ShieldCheck,
  Check,
  X,
  FileText,
  AlertCircle,
  Database,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FamilyState } from '../types';
import { encryptState, decryptState } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';
import { exportFullFamilyToExcel } from '../utils/exportExcel';
import {
  exportTransactionsToCSV,
  exportBudgetsToCSV,
  exportBankAccountsToCSV,
  exportRecurringToCSV,
  exportSavingsGoalsToCSV,
} from '../utils/exportCsv';
import { validateBackupPackageStrict, validateRestoredFamilyStateStrict } from '../utils/backupValidation';

interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FamilyState;
  passphrase: string;
  onRestoreState: (restoredState: FamilyState) => void;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
  triggeredByShortcut?: boolean;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  state,
  passphrase,
  onRestoreState,
  onShowToast,
  triggeredByShortcut,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState(passphrase);
  const [showRestorePassphrase, setShowRestorePassphrase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, activeFamily, currentFamilyId, userFamilies } = useAuth();

  const members = state.members || [];
  const currentMember = user
    ? members.find(
        (m) =>
          (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
          m.id === `mem-${user.uid.slice(0, 8)}`
      )
    : null;

  const currentFamilyInfo = userFamilies.find(f => f.id === currentFamilyId || f.id === activeFamily?.id);
  const isCreator = Boolean(!user || (user && (activeFamily?.ownerId === user.uid || currentFamilyInfo?.isOwner)));
  const roleName = currentMember?.role || (isCreator ? 'Padre / Creador' : 'Miembro');
  const normalizedRole = roleName.toLowerCase();
  const isPadre = isCreator || normalizedRole.includes('padre') || roleName === 'Padre / Esposo' || roleName === 'Padre';
  const isPadreOrCreator = isCreator || isPadre;
  const targetFamilyName = activeFamily?.familyName || currentFamilyInfo?.familyName || state.familyName || 'Mi Hogar';
  const safeFamilyFileLabel = (targetFamilyName || 'Familia').replace(/[^a-zA-Z0-9_-]/g, '_');
  const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;

  if (!isOpen) return null;

  // 1. Export to Excel (.xls multi-hoja completo)
  const handleExportFullExcel = () => {
    try {
      exportFullFamilyToExcel(state, targetFamilyName);
      onShowToast('Excel Generado', 'Se ha exportado el libro completo con todas las 14 hojas a Excel');
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err);
      onShowToast('Error al exportar', err.message || 'No se pudo generar el archivo de Excel', 'warning');
    }
  };

  // 2. Export exhaustive Transactions to CSV
  const handleExportTransactionsCSV = () => {
    try {
      exportTransactionsToCSV(state, targetFamilyName);
      onShowToast('CSV de Transacciones Generado', 'Tus transacciones detalladas con cuentas y transferencias se han descargado listas para Excel o Google Sheets');
    } catch (err: any) {
      console.error('Error al exportar CSV:', err);
      onShowToast('Error al exportar CSV', err.message || 'Error al generar CSV', 'warning');
    }
  };

  // 3. Export specific modular CSVs
  const handleExportBudgetsCSV = () => {
    exportBudgetsToCSV(state, targetFamilyName);
    onShowToast('CSV de Presupuestos Generado', 'Límites mensuales y regla 50/30/20 descargados en CSV');
  };

  const handleExportAccountsCSV = () => {
    exportBankAccountsToCSV(state, targetFamilyName);
    onShowToast('CSV de Cuentas y Deudas Generado', 'Saldos bancarios, tarjetas y préstamos descargados en CSV');
  };

  const handleExportRecurringCSV = () => {
    exportRecurringToCSV(state, targetFamilyName);
    onShowToast('CSV de Recurrentes Generado', 'Gastos, nóminas y traspasos periódicos descargados en CSV');
  };

  const handleExportGoalsCSV = () => {
    exportSavingsGoalsToCSV(state, targetFamilyName);
    onShowToast('CSV de Metas de Ahorro Generado', 'Metas activas y progresos descargados en CSV');
  };

  // 2. Export Encrypted JSON Backup (E2EE)
  const handleExportEncryptedBackup = async () => {
    try {
      const encryptedData = await encryptState(state, passphrase);
      const backupPackage = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        familyName: targetFamilyName,
        encrypted: true,
        payload: encryptedData,
      };

      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Backup_Finanzas_E2EE_${safeFamilyFileLabel}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast('Copia de Seguridad Cifrada Creada', 'Archivo protegido con tu clave de seguridad familiar AES-GCM 256-bit');
    } catch (err) {
      console.error('Backup error:', err);
      onShowToast('Error', 'No se pudo generar la copia de seguridad', 'warning');
    }
  };

  // 3. Restore from Backup File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPadreOrCreator) {
      onShowToast('Acceso Denegado', 'Solo el Padre / Creador puede restaurar copias de seguridad.', 'warning');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKUP_FILE_BYTES) {
      onShowToast('Archivo demasiado grande', 'El backup excede el límite de 5 MB permitido para restauración segura.', 'warning');
      e.target.value = '';
      return;
    }

    const isJsonFile = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    if (!isJsonFile) {
      onShowToast('Tipo de archivo inválido', 'Solo se permiten archivos de backup en formato JSON.', 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        if (text.length > MAX_BACKUP_FILE_BYTES * 2) {
          throw new Error('Contenido de backup sobredimensionado');
        }

        const parsed = JSON.parse(text);
        const validated = validateBackupPackageStrict(parsed);

        let restoredState: FamilyState;
        if (validated.kind === 'encrypted') {
          const passToUse = restorePassphrase.trim() || passphrase;
          const decrypted = await decryptState<FamilyState>(validated.payload, passToUse);
          restoredState = validateRestoredFamilyStateStrict(decrypted);
        } else {
          restoredState = validateRestoredFamilyStateStrict(validated.state);
        }

        if (restoredState) {
          onRestoreState(restoredState);
          onShowToast('Copia de Seguridad Restaurada', `Se han cargado los datos familiares de ${restoredState.familyName || 'tu hogar'}`);
          onClose();
        }
      } catch (err: any) {
        console.error('Restore error:', err);
        onShowToast(
          'Fallo al Restaurar',
          err?.message || 'Clave de seguridad incorrecta o archivo de copia corrupto',
          'warning'
        );
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Copia de Seguridad & Exportación Abierta
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Soberanía de datos: descarga y resguarda tu información cuando quieras
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut Intercept Security Banner */}
        {triggeredByShortcut && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block text-amber-950 dark:text-amber-100">
                Atajo Interceptado (Ctrl + S / Cmd + S)
              </span>
              Se ha bloqueado la acción de guardar la página web en HTML para evitar exponer tus cuentas en texto plano en el disco. Para un respaldo 100% privado y seguro, utiliza la <strong>Copia de Seguridad Cifrada (AES-256)</strong>.
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4 text-xs">
          {/* Option 1: Libro Completo Excel (.xls Multi-Hoja) */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Libro Maestro Excel (.xls Multi-Hoja)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    14 Hojas
                  </span>
                </div>
                <p className="text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  Exporta toda la información del hogar: Resumen General, Transacciones, Presupuestos, Regla 50/30/20, Miembros, Cuentas Bancarias, Deudas y Préstamos, Metas de Ahorro, Aportaciones, Gastos Recurrentes, Ingresos Recurrentes, Transferencias, Mesadas y Etiquetas.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportFullExcel}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Excel (.xls)</span>
            </button>
          </div>

          {/* Option 2: Transacciones CSV Completo */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Exportación Exhaustiva en CSV (Excel / Sheets)
                  </h4>
                  <p className="text-stone-500 dark:text-stone-400 mt-0.5">
                    Descarga tablas en texto plano con codificación UTF-8 BOM para abrir directamente en Excel, Numbers o Google Sheets con caracteres y acentos correctos.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportTransactionsCSV}
                className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Transacciones CSV</span>
              </button>
            </div>

            {/* Sub-CSVs pills */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 mr-1">
                Otros módulos en CSV:
              </span>
              <button
                type="button"
                onClick={handleExportBudgetsCSV}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-stone-400" />
                <span>Presupuestos & 50/30/20</span>
              </button>
              <button
                type="button"
                onClick={handleExportAccountsCSV}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-stone-400" />
                <span>Cuentas & Deudas</span>
              </button>
              <button
                type="button"
                onClick={handleExportGoalsCSV}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-stone-400" />
                <span>Metas de Ahorro</span>
              </button>
              <button
                type="button"
                onClick={handleExportRecurringCSV}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-stone-400" />
                <span>Gastos & Ingresos Fijos</span>
              </button>
            </div>
          </div>

          {/* Option 3: Encrypted Backup .json */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-stone-600 dark:text-stone-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Copia de Seguridad Cifrada (.json E2EE)
                </h4>
                <p className="text-stone-500 dark:text-stone-400 mt-0.5">
                  Respaldo criptográfico completo con contraseña maestra para restaurar la aplicación en cualquier momento.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportEncryptedBackup}
              className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Backup .json</span>
            </button>
          </div>

          {/* Option 3: Restore Backup */}
          {isPadreOrCreator ? (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Restaurar Copia de Seguridad</span>
              </div>

              <p className="text-stone-500 dark:text-stone-400">
                Selecciona un archivo <code>.json</code> previamente exportado para restaurar tu estado financiero.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700 dark:text-stone-300">
                    Clave de Seguridad del Archivo (si estaba cifrado)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRestorePassphrase(!showRestorePassphrase)}
                    className="text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1 font-medium"
                  >
                    {showRestorePassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showRestorePassphrase ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <input
                  type={showRestorePassphrase ? 'text' : 'password'}
                  placeholder="Passphrase de descifrado"
                  value={restorePassphrase}
                  onChange={e => setRestorePassphrase(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-stone-900 dark:text-stone-100 tracking-wider"
                  autoComplete="off"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 text-stone-700 dark:text-stone-300 font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Subir Archivo .json y Restaurar</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  Restauración Reservada para el Padre / Creador
                </h4>
                <p className="text-amber-900/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  La restauración de datos sobrescribe la base de datos familiar actual y requiere privilegios de administración. Solo el <strong>Padre / Creador</strong> del hogar puede importar copias de seguridad.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-semibold text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
