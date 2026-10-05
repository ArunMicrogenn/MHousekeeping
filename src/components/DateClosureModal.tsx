import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, Building2, Calendar, DollarSign, Lock } from 'lucide-react';
import { DateClosureRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/exportUtils';

interface DateClosureModalProps {
  closureRecord: DateClosureRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DateClosureModal: React.FC<DateClosureModalProps> = ({ closureRecord, isOpen, onClose }) => {
  if (!isOpen || !closureRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl text-slate-100 my-8 overflow-hidden">
        
        {/* Top Bar */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Date Closure Certificate
            </span>
            <span className="text-xs text-slate-400 font-mono">#{closureRecord.closureId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Certificate
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Certificate */}
        <div id="printable-closure-cert" className="p-8 bg-slate-900 text-slate-100 print:bg-white print:text-black print:p-4 text-xs">
          
          {/* Header */}
          <div className="text-center border-b border-slate-700 print:border-slate-300 pb-5 mb-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="w-6 h-6 text-amber-400 print:text-black" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white print:text-black">
                GRAND ELYSIUM HOTEL & SUITES
              </h1>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 print:text-slate-800">
              OFFICIAL NIGHT AUDIT & DATE CLOSURE CERTIFICATE
            </p>
            <p className="text-[11px] text-slate-400 print:text-slate-600">
              Housekeeping & Guest Billing Ledger Control • Ref: {closureRecord.closureId}
            </p>
          </div>

          {/* Audit Date & Status Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/50 print:bg-slate-50 p-3.5 rounded-xl border border-slate-700/60 print:border-slate-200 mb-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Closed Date</span>
              <p className="text-sm font-mono font-bold text-amber-400 print:text-black mt-0.5">{closureRecord.closedDate}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Advanced To</span>
              <p className="text-sm font-mono font-bold text-emerald-400 print:text-black mt-0.5">{closureRecord.nextDate}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Executed At</span>
              <p className="text-xs font-mono text-slate-200 print:text-black mt-0.5">{closureRecord.closedAt}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Auditor</span>
              <p className="text-xs font-semibold text-slate-200 print:text-black mt-0.5">{closureRecord.closedBy} ({closureRecord.closedRole})</p>
            </div>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="mb-5 space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 print:text-slate-700 block">
              Financial Realization Summary
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300">
                <span className="text-[10px] text-slate-500">Gross Subtotal:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black text-sm">{formatCurrency(closureRecord.grossAmount)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300">
                <span className="text-[10px] text-slate-500">Total Discounts:</span>
                <p className="font-mono font-bold text-emerald-400 print:text-emerald-700 text-sm">-{formatCurrency(closureRecord.discountAmount)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300">
                <span className="text-[10px] text-slate-500">Taxes Collected:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black text-sm">{formatCurrency(closureRecord.taxAmount)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 print:bg-slate-100 border border-slate-800 print:border-slate-300">
                <span className="text-[10px] text-amber-400 font-bold">Total Net Revenue:</span>
                <p className="font-mono font-black text-amber-400 print:text-black text-base">{formatCurrency(closureRecord.netRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Payment Mode Tenders */}
          <div className="mb-5 p-3.5 rounded-xl bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 space-y-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 print:text-slate-700 block">
              Tender & Settlement Realization
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500">💵 Cash:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black">{formatCurrency(closureRecord.cashCollected)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">💳 EDC Card:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black">{formatCurrency(closureRecord.cardCollected)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">📱 UPI:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black">{formatCurrency(closureRecord.upiCollected)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">🏨 Room Folio:</span>
                <p className="font-mono font-bold text-amber-400 print:text-black">{formatCurrency(closureRecord.roomTransferTotal)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">🏢 Corporate:</span>
                <p className="font-mono font-bold text-slate-200 print:text-black">{formatCurrency(closureRecord.creditTotal)}</p>
              </div>
            </div>
          </div>

          {/* Pre-Closure Validation Checklist Snapshot */}
          <div className="mb-5 space-y-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 print:text-slate-700 block">
              Auditor Validation Checks
            </span>
            <div className="p-3 bg-slate-950 print:bg-slate-50 rounded-xl border border-slate-800 print:border-slate-300 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pre-closure checklist: {closureRecord.validationSummary.passed ? 'PASSED CLEAN' : 'AUTHORIZED WITH BYPASS'}</span>
              </div>
              {closureRecord.validationSummary.notes.map((note, idx) => (
                <p key={idx} className="text-slate-400 print:text-slate-600 pl-5">• {note}</p>
              ))}
            </div>
          </div>

          {/* Manager Remarks */}
          {closureRecord.managerRemarks && (
            <div className="mb-6 p-3 rounded-xl bg-slate-800/40 print:bg-slate-100 border border-slate-700/60 print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Auditor Notes:</span>
              <p className="text-xs text-slate-200 print:text-black mt-0.5">{closureRecord.managerRemarks}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-800 print:border-slate-300 text-center">
            <div>
              <div className="border-b border-slate-600 print:border-slate-400 w-3/4 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Night Auditor ({closureRecord.closedBy})</span>
            </div>
            <div>
              <div className="border-b border-slate-600 print:border-slate-400 w-3/4 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Duty Manager Sign-off</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
