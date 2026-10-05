import React from 'react';
import { Printer, X, Building2, Bed, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { ChargePosting } from '../types';
import { formatCurrency, formatDate } from '../utils/exportUtils';

interface ChargeSlipModalProps {
  posting: ChargePosting | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChargeSlipModal: React.FC<ChargeSlipModalProps> = ({ posting, isOpen, onClose }) => {
  if (!isOpen || !posting) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Folio Charge Voucher
            </span>
            <span className="text-xs text-slate-400 font-mono">#{posting.postingNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip */}
        <div id="printable-charge-slip" className="p-6 bg-slate-900 text-slate-100 print:bg-white print:text-black print:p-4 text-xs">
          <div className="text-center border-b border-slate-700 print:border-slate-300 pb-4 mb-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-white print:text-black">
              GRAND ELYSIUM HOTEL & SUITES
            </h2>
            <p className="text-[11px] text-slate-400 print:text-slate-600 font-medium">
              ROOM FOLIO CHARGE VOUCHER - HOUSEKEEPING
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-800/40 print:bg-slate-50 p-3 rounded-lg border border-slate-700/60 print:border-slate-200">
            <div>
              <span className="text-[10px] uppercase text-slate-400 print:text-slate-600 font-semibold">Room Number</span>
              <p className="text-lg font-bold font-mono text-amber-400 print:text-black">{posting.roomNumber}</p>
              <span className="text-[10px] uppercase text-slate-400 print:text-slate-600 font-semibold mt-1 block">Guest Name</span>
              <p className="font-semibold text-slate-100 print:text-black">{posting.guestName}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 print:text-slate-600 font-semibold">Voucher No</span>
              <p className="font-mono font-bold text-cyan-400 print:text-black">{posting.postingNumber}</p>
              <span className="text-[10px] uppercase text-slate-400 print:text-slate-600 font-semibold mt-1 block">Folio Ref</span>
              <p className="font-mono text-slate-300 print:text-slate-800">{posting.folioNumber}</p>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Date: {formatDate(posting.postingDate)}</span>
            </div>
          </div>

          {/* Posting Details */}
          <div className="border border-slate-700 print:border-slate-300 rounded-lg p-3.5 mb-4 space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 print:border-slate-200 pb-2">
              <span className="font-bold text-slate-200 print:text-black text-sm">{posting.chargeHeadName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800 uppercase">
                {posting.chargeType}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-slate-300 print:text-slate-700 pt-1">
              <div>
                <span className="text-[10px] text-slate-500">Quantity / Nights:</span>
                <p className="font-mono font-bold">{posting.quantity}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Unit Rate:</span>
                <p className="font-mono">{formatCurrency(posting.rate)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500">Subtotal:</span>
                <p className="font-mono">{formatCurrency(posting.amount)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 print:border-slate-200 flex justify-between items-center">
              <span className="text-slate-400 print:text-slate-600">Tax ({posting.taxPercent}%):</span>
              <span className="font-mono text-slate-300 print:text-slate-800">{formatCurrency(posting.taxAmount)}</span>
            </div>

            <div className="pt-2 border-t border-slate-700 print:border-slate-300 flex justify-between items-center text-sm font-bold text-white print:text-black">
              <span>Total Posted to Folio:</span>
              <span className="text-emerald-400 print:text-black font-mono text-base">{formatCurrency(posting.netAmount)}</span>
            </div>
          </div>

          {posting.remarks && (
            <div className="mb-6 p-2.5 rounded bg-slate-800/60 print:bg-slate-100 border border-slate-700/60 print:border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Remarks / Description:</span>
              <p className="text-xs text-slate-200 print:text-black mt-0.5">{posting.remarks}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800 print:border-slate-300 text-center">
            <div>
              <div className="border-b border-slate-600 print:border-slate-400 w-3/4 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Guest Signature & Acknowledgement</span>
            </div>
            <div>
              <div className="border-b border-slate-600 print:border-slate-400 w-3/4 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Posted by {posting.postedBy}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
