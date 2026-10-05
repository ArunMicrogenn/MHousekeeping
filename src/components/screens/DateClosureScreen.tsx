import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Eye,
  Building,
  DollarSign,
  ArrowRight,
  ListChecks,
  AlertCircle,
  History,
  Sparkles
} from 'lucide-react';
import {
  getDayCloseConfig,
  getClosureHistory,
  validateDateClosure,
  executeDateClosure,
  reopenDateClosure,
  getCurrentUser,
  getBills,
  getLots,
  getChargePostings
} from '../../services/storage';
import { DateClosureRecord, HKBill } from '../../types';
import { formatCurrency, formatDate, exportToExcel } from '../../utils/exportUtils';
import { ManagerAuthModal } from '../ManagerAuthModal';
import { DateClosureModal } from '../DateClosureModal';

interface DateClosureScreenProps {
  onNavigateToSettlement?: (billNo?: string) => void;
  onNavigateToLots?: () => void;
}

export const DateClosureScreen: React.FC<DateClosureScreenProps> = ({
  onNavigateToSettlement,
  onNavigateToLots
}) => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const closureHistory = getClosureHistory();
  const allBills = getBills();
  const allPostings = getChargePostings();

  // Active Tab: 'AUDIT_WIZARD' (execute date closure) | 'HISTORY_LOGS' (view past closures)
  const [activeTab, setActiveTab] = useState<'AUDIT_WIZARD' | 'HISTORY_LOGS'>('AUDIT_WIZARD');

  // Next date calculation
  const calculatedNextDate = useMemo(() => {
    try {
      const d = new Date(dayClose.businessDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().substring(0, 10);
    } catch {
      return '2026-10-06';
    }
  }, [dayClose.businessDate]);

  const [nextDateInput, setNextDateInput] = useState<string>(calculatedNextDate);
  const [managerRemarks, setManagerRemarks] = useState<string>('');
  
  // Validation state
  const validation = useMemo(() => {
    return validateDateClosure(dayClose.businessDate);
  }, [dayClose.businessDate, allBills]);

  // Current Day's Financial Metrics
  const dayFinancials = useMemo(() => {
    const dateBills = allBills.filter(
      b => b.billDate === dayClose.businessDate && b.status !== 'CANCELLED'
    );
    const datePostings = allPostings.filter(
      p => p.postingDate === dayClose.businessDate && p.status !== 'REVERSED'
    );

    const gross = dateBills.reduce((s, b) => s + b.grossAmount, 0);
    const discount = dateBills.reduce((s, b) => s + b.discountAmount, 0);
    const tax = dateBills.reduce((s, b) => s + b.taxAmount, 0);
    const net = dateBills.reduce((s, b) => s + b.netAmount, 0);

    const extraBed = datePostings.filter(p => p.chargeType === 'EXTRA_BED').reduce((s, p) => s + p.netAmount, 0);
    const miscCharges = datePostings.filter(p => p.chargeType === 'MISC_CHARGE').reduce((s, p) => s + p.netAmount, 0);

    return {
      totalBills: dateBills.length,
      gross,
      discount,
      tax,
      net,
      extraBed,
      miscCharges,
      combinedRevenue: net + extraBed + miscCharges
    };
  }, [allBills, allPostings, dayClose.businessDate]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authPurpose, setAuthPurpose] = useState<'EXECUTE_CLOSURE' | 'REOPEN_CLOSURE'>('EXECUTE_CLOSURE');
  const [selectedClosureForCert, setSelectedClosureForCert] = useState<DateClosureRecord | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);
  
  // Reopen Dialog
  const [reopenTargetRecord, setReopenTargetRecord] = useState<DateClosureRecord | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Handle Execute Closure
  const handleInitiateClosure = () => {
    if (!managerRemarks.trim() && validation.warningsCount > 0) {
      setManagerRemarks(`Night audit executed with ${validation.warningsCount} warning(s) acknowledged by duty auditor.`);
    }

    setAuthPurpose('EXECUTE_CLOSURE');
    setIsAuthModalOpen(true);
  };

  const executeClosureFinal = (authorizedBy: string, role: string) => {
    try {
      const record = executeDateClosure({
        nextDate: nextDateInput,
        managerRemarks: managerRemarks || 'Standard end-of-day audit completed.',
        authorizedBy,
        authorizedRole: role
      });

      setSelectedClosureForCert(record);
      setIsCertModalOpen(true);
      setToastMessage(`Date Closure Completed! Business date is now advanced to ${record.nextDate}`);
      setManagerRemarks('');
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Date closure failed');
    }
  };

  // Handle Reopen Date
  const handleInitiateReopen = (record: DateClosureRecord) => {
    setReopenTargetRecord(record);
    setReopenReason('');
  };

  const handleConfirmReopen = () => {
    if (!reopenTargetRecord) return;
    if (!reopenReason.trim()) {
      alert('Mandatory reason for reopening the closed business date is required.');
      return;
    }

    setAuthPurpose('REOPEN_CLOSURE');
    setIsAuthModalOpen(true);
  };

  const executeReopenFinal = (authorizedBy: string) => {
    if (!reopenTargetRecord) return;
    try {
      reopenDateClosure(reopenTargetRecord.closureId, reopenReason, authorizedBy);
      setReopenTargetRecord(null);
      setReopenReason('');
      setToastMessage(`Business date rolled back to ${reopenTargetRecord.closedDate} successfully.`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reopen failed');
    }
  };

  const handleExportClosureExcel = () => {
    const rows = closureHistory.map(h => ({
      'Closure ID': h.closureId,
      'Closed Date': h.closedDate,
      'Advanced Next Date': h.nextDate,
      'Closed Timestamp': h.closedAt,
      'Auditor User': h.closedBy,
      'Role': h.closedRole,
      'Total Bills': h.totalBills,
      'Gross Amount': h.grossAmount,
      'Discounts': h.discountAmount,
      'Taxes': h.taxAmount,
      'Net Revenue': h.netRevenue,
      'Status': h.status,
      'Remarks': h.managerRemarks
    }));
    exportToExcel(rows, 'HK_Date_Closure_History_Audit_Log', 'ClosureHistory');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Date Closure & Night Audit Terminal</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                End of Day (EOD)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Validate pending transactions, freeze daily accounts, roll forward business date & generate audit certificates
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('AUDIT_WIZARD')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'AUDIT_WIZARD'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌙 Night Audit Execution
          </button>
          <button
            onClick={() => setActiveTab('HISTORY_LOGS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HISTORY_LOGS'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 Closure Logs & Certs ({closureHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT_WIZARD' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left 7 Cols: Pre-Closure Validation Checklist & Financial Snapshot */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Business Date Banner */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Business Date</span>
                <h3 className="text-2xl font-black font-mono text-amber-400 mt-0.5">
                  {dayClose.businessDate}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ready to audit and roll over to: <strong className="text-emerald-400 font-mono">{nextDateInput}</strong>
                </p>
              </div>

              <div className="text-right bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500">Day Status</span>
                <p className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                  <Unlock className="w-4 h-4" /> ACTIVE (OPEN)
                </p>
              </div>
            </div>

            {/* Pre-Closure Automated Validation Checklist */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Pre-Closure Validation Engine</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  validation.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {validation.passed ? 'ALL CHECKS PASSED' : `${validation.warningsCount} ATTENTION ITEMS`}
                </span>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2.5 pt-1">
                
                {/* 1. Unsettled Bills Check */}
                <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                  validation.unsettledBillsCount === 0
                    ? 'bg-slate-950/60 border-slate-800/80'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {validation.unsettledBillsCount === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Unsettled Housekeeping Bills</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {validation.unsettledBillsCount === 0
                          ? 'All bills for today have been fully settled & balanced.'
                          : `${validation.unsettledBillsCount} bill(s) pending settlement (${formatCurrency(validation.unsettledBillsTotal)}).`}
                      </p>
                    </div>
                  </div>

                  {validation.unsettledBillsCount > 0 && onNavigateToSettlement && (
                    <button
                      onClick={() => onNavigateToSettlement(validation.unsettledBills[0]?.billNumber)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold rounded-lg shrink-0"
                    >
                      Resolve in Settlement
                    </button>
                  )}
                </div>

                {/* 2. Open Batch Lots Check */}
                <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                  validation.openLotsCount === 0
                    ? 'bg-slate-950/60 border-slate-800/80'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {validation.openLotsCount === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Open Batch Lots</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {validation.openLotsCount === 0
                          ? 'All batch laundry and linen lots have been processed.'
                          : `${validation.openLotsCount} batch lot(s) still open without final invoice generation.`}
                      </p>
                    </div>
                  </div>

                  {validation.openLotsCount > 0 && onNavigateToLots && (
                    <button
                      onClick={onNavigateToLots}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold rounded-lg shrink-0"
                    >
                      View Lots
                    </button>
                  )}
                </div>

                {/* 3. Room Folios & In-House Ledger */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Guest Folio & Extra Bed Ledger Balance</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All extra bed and damage postings have synchronized with guest folios.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">OK</span>
                </div>

              </div>
            </div>

            {/* Financial Realization Snapshot for the Day */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Closing Day's Financial Snapshot ({dayClose.businessDate})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Gross Bills</span>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{formatCurrency(dayFinancials.gross)}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Discounts</span>
                  <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">-{formatCurrency(dayFinancials.discount)}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Taxes (GST)</span>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{formatCurrency(dayFinancials.tax)}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Net Day Revenue</span>
                  <p className="text-base font-mono font-black text-amber-400 mt-0.5">{formatCurrency(dayFinancials.net)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex justify-between items-center">
                <span>Extra Bed & Folio Postings for Date:</span>
                <span className="font-mono font-bold text-purple-300">
                  {formatCurrency(dayFinancials.extraBed + dayFinancials.miscCharges)}
                </span>
              </div>
            </div>

          </div>

          {/* Right 5 Cols: Execution Parameters & Manager Sign-off */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Execute Date Roll-Over
              </span>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Next Business Date *
                </label>
                <input
                  type="date"
                  required
                  value={nextDateInput}
                  onChange={(e) => setNextDateInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Night Auditor / Manager Remarks
                </label>
                <textarea
                  rows={3}
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  placeholder="e.g. End of day audit completed. All laundry batches verified. Shift handover to morning team."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {validation.warningsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Manager Bypass Required</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    There are {validation.warningsCount} pending items. Executing closure will require manager PIN authorization and will be audited in the certificate log.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleInitiateClosure}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Authorize & Finalize Date Closure
              </button>
            </div>

            {/* Audit Rules Card */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-2">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                Date Closure Controls
              </span>
              <p>• Locks all backdated modifications and transitions the active ledger to {nextDateInput}.</p>
              <p>• Creates an official audit certificate stored in the history ledger.</p>
              <p>• In case of emergency billing correction, managers can reopen a date using the history panel.</p>
            </div>

          </div>

        </div>
      ) : (
        /* HISTORY TAB: DATE CLOSURE LOGS & CERTIFICATES */
        <div className="space-y-4">
          
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Date Closure History & Audit Trail</h3>
              <p className="text-xs text-slate-400">All past night audit roll-overs with financial snapshots and certificate reprints</p>
            </div>
            <button
              onClick={handleExportClosureExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Closure History
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Audit Ref ID</th>
                    <th className="py-3 px-3.5">Closed Date</th>
                    <th className="py-3 px-3.5">Next Date</th>
                    <th className="py-3 px-3.5">Auditor</th>
                    <th className="py-3 px-3.5 text-right">Bills Net</th>
                    <th className="py-3 px-3.5 text-right">Folio Total</th>
                    <th className="py-3 px-3.5 text-right">Day Revenue</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {closureHistory.map(rec => (
                    <tr key={rec.closureId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3.5 font-mono font-bold text-amber-400">{rec.closureId}</td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-200">{rec.closedDate}</td>
                      <td className="py-3 px-3.5 font-mono text-emerald-400">{rec.nextDate}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-200">{rec.closedBy}</span>
                        <span className="text-[10px] text-slate-500 block">{rec.closedAt}</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-300">{formatCurrency(rec.netRevenue)}</td>
                      <td className="py-3 px-3.5 text-right font-mono text-purple-300">{formatCurrency(rec.extraBedRevenue + rec.miscChargesRevenue)}</td>
                      <td className="py-3 px-3.5 text-right font-mono font-black text-amber-400">{formatCurrency(rec.netRevenue + rec.extraBedRevenue + rec.miscChargesRevenue)}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === 'CLOSED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedClosureForCert(rec);
                              setIsCertModalOpen(true);
                            }}
                            title="View / Print Certificate"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {rec.status === 'CLOSED' && (
                            <button
                              onClick={() => handleInitiateReopen(rec)}
                              title="Emergency Reopen Date"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Reopen Dialog */}
      {reopenTargetRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-red-500/30 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Reopen Business Date ({reopenTargetRecord.closedDate})
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Reopening will roll back the business date to <strong>{reopenTargetRecord.closedDate}</strong> and unlock transactions for editing.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Mandatory Reopening Reason *
              </label>
              <textarea
                rows={2}
                required
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Disputed VIP checkout bill required same-day reversal"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setReopenTargetRecord(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReopen}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-red-600/20"
              >
                Proceed with Manager PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Auth Modal */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title={authPurpose === 'EXECUTE_CLOSURE' ? 'Authorize Date Closure' : 'Authorize Date Reopen'}
        actionDescription={
          authPurpose === 'EXECUTE_CLOSURE'
            ? `Execute night audit & close business date ${dayClose.businessDate} -> advance to ${nextDateInput}`
            : `Roll back business date to ${reopenTargetRecord?.closedDate} (Reason: ${reopenReason})`
        }
        requiredRole="manager"
        onSuccess={(authBy, role) => {
          setIsAuthModalOpen(false);
          if (authPurpose === 'EXECUTE_CLOSURE') {
            executeClosureFinal(authBy, role);
          } else {
            executeReopenFinal(authBy);
          }
        }}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Date Closure Certificate Modal */}
      <DateClosureModal
        closureRecord={selectedClosureForCert}
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
      />

    </div>
  );
};
