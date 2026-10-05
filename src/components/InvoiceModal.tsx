import React from 'react';
import { Printer, X, CheckCircle2, QrCode, Building2, User, CreditCard, ShieldAlert } from 'lucide-react';
import { HKBill } from '../types';
import { formatCurrency, formatDate } from '../utils/exportUtils';

interface InvoiceModalProps {
  bill: HKBill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bill, isOpen, onClose }) => {
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 my-8 overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Tax Invoice & Receipt
            </span>
            <span className="text-xs text-slate-400 font-mono">#{bill.billNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice" className="p-8 bg-slate-900 text-slate-100 print:bg-white print:text-black print:p-4 text-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-700 print:border-slate-300 pb-6 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-amber-400 print:text-black" />
                <h1 className="text-xl font-bold tracking-tight text-white print:text-black">
                  GRAND ELYSIUM HOTEL & SUITES
                </h1>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Department of Housekeeping & Guest Services
              </p>
              <p className="text-[11px] text-slate-400 print:text-slate-600">
                742 Royal Palm Blvd, Luxury District | GSTIN: 07AAACH7492M1Z8
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="inline-block px-3 py-1 rounded bg-slate-800 print:bg-slate-100 border border-slate-700 print:border-slate-300 font-mono font-bold text-sm text-emerald-400 print:text-black">
                {bill.billNumber}
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Date: <span className="font-mono text-slate-200 print:text-black">{formatDate(bill.billDate)}</span>
              </p>
              <div className="flex items-center justify-end gap-1">
                {bill.status === 'SETTLED' ? (
                  <span className="text-[11px] font-bold text-emerald-400 print:text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SETTLED
                  </span>
                ) : bill.status === 'CANCELLED' ? (
                  <span className="text-[11px] font-bold text-red-400 print:text-red-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> CANCELLED
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-400 print:text-amber-700">
                    UNSETTLED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Guest / Billed To Section */}
          <div className="grid grid-cols-2 gap-4 bg-slate-800/50 print:bg-slate-50 p-4 rounded-xl border border-slate-700/60 print:border-slate-200 mb-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500 tracking-wider">
                Billed Guest / Client
              </p>
              <p className="font-semibold text-white print:text-black mt-0.5">
                {bill.guestName || (bill.customerType === 'GUEST' ? `Room ${bill.roomNumber} Guest` : 'Walk-in Customer')}
              </p>
              {bill.customerPhone && (
                <p className="text-xs text-slate-400 print:text-slate-600">
                  Tel: {bill.customerPhone}
                </p>
              )}
              {bill.customerType === 'GUEST' && bill.roomNumber && (
                <p className="text-xs text-slate-300 print:text-slate-700">
                  Room No: <span className="font-bold font-mono text-amber-300 print:text-black">{bill.roomNumber}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500 tracking-wider">
                Billing Details
              </p>
              <p className="text-xs text-slate-300 print:text-slate-700 mt-0.5">
                Bill Type: <span className="font-semibold">{bill.billType}</span>
              </p>
              {bill.folioNumber && (
                <p className="text-xs text-slate-300 print:text-slate-700">
                  Folio Ref: <span className="font-mono">{bill.folioNumber}</span>
                </p>
              )}
              {bill.lotNumber && (
                <p className="text-xs text-slate-300 print:text-slate-700">
                  Lot Ref: <span className="font-mono text-cyan-400 print:text-cyan-800">{bill.lotNumber}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-400 print:text-slate-600">
                Cashier: {bill.createdBy}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-hidden rounded-lg border border-slate-700 print:border-slate-300">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 print:bg-slate-100 text-[11px] uppercase tracking-wider text-slate-400 print:text-slate-700 font-semibold border-b border-slate-700 print:border-slate-300">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item / Service Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-xs">
                {bill.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400 print:text-slate-600">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-slate-200 print:text-black">{item.itemName}</p>
                      <p className="text-[10px] text-slate-400 print:text-slate-600 font-mono">Code: {item.itemCode}</p>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.rate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400 print:text-slate-600">
                      {item.taxPercent}% ({formatCurrency(item.taxAmount)})
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-100 print:text-black">
                      {formatCurrency(item.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Summary */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              {bill.settlementModes && bill.settlementModes.length > 0 && (
                <div className="bg-slate-800/40 print:bg-slate-50 p-3 rounded-lg border border-slate-700/60 print:border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Settlement Method(s)
                  </p>
                  <div className="space-y-1 text-xs">
                    {bill.settlementModes.map((split, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-300 print:text-slate-700">
                        <span>
                          • {split.mode}
                          {split.referenceNo ? ` (Ref: ${split.referenceNo})` : ''}
                          {split.roomNumber ? ` (Folio: ${split.folioNumber || split.roomNumber})` : ''}
                        </span>
                        <span className="font-mono font-semibold text-white print:text-black">
                          {formatCurrency(split.amount)}
                        </span>
                      </div>
                    ))}
                    {bill.settledBy && (
                      <p className="text-[10px] text-slate-400 print:text-slate-500 pt-1 border-t border-slate-700/40">
                        Settled by {bill.settledBy} on {bill.settledAt}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {bill.cancelReason && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg text-xs text-red-300">
                  <p className="font-bold">Cancellation Reason:</p>
                  <p className="text-[11px]">{bill.cancelReason}</p>
                  <p className="text-[10px] text-red-400 mt-1">
                    By {bill.cancelledBy} on {bill.cancelledAt}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs bg-slate-800/60 print:bg-slate-50 p-4 rounded-xl border border-slate-700 print:border-slate-200">
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono text-slate-200 print:text-black">{formatCurrency(bill.grossAmount)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 print:text-emerald-700">
                  <span>Discount ({bill.discountPercent}%):</span>
                  <span className="font-mono">-{formatCurrency(bill.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>Applicable GST / Taxes:</span>
                <span className="font-mono text-slate-200 print:text-black">{formatCurrency(bill.taxAmount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 print:border-slate-300 flex justify-between text-base font-bold text-white print:text-black">
                <span>Net Total:</span>
                <span className="font-mono text-emerald-400 print:text-black">{formatCurrency(bill.netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature Blocks */}
          <div className="border-t border-slate-800 print:border-slate-300 pt-6 mt-6 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="flex flex-col items-center">
              <QrCode className="w-12 h-12 text-slate-500 print:text-black mb-1" />
              <span className="text-[9px] text-slate-400 print:text-slate-600">E-Invoice Validation</span>
            </div>
            <div className="flex flex-col justify-end">
              <div className="border-b border-slate-600 print:border-slate-400 w-32 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Guest Signature</span>
            </div>
            <div className="flex flex-col justify-end">
              <div className="border-b border-slate-600 print:border-slate-400 w-32 mx-auto mb-1"></div>
              <span className="text-[10px] text-slate-400 print:text-slate-600">Authorized Cashier</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 print:text-slate-600 mt-6">
            Thank you for staying with Grand Elysium Hotel & Suites. Computer generated tax invoice.
          </div>

        </div>

      </div>
    </div>
  );
};
