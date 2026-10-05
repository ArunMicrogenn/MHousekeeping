import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Building,
  Search,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Receipt,
  Eye,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  getBills,
  settleBill,
  getInHouseGuests,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { HKBill, PaymentMode, PaymentSplit } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { InvoiceModal } from '../InvoiceModal';

export const SettlementScreen: React.FC<{ initialBillNumber?: string }> = ({ initialBillNumber }) => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allBills = getBills();
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');

  // Unsettled bills queue
  const unsettledBills = useMemo(() => {
    return allBills.filter(b => b.status === 'UNSETTLED');
  }, [allBills]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBillId, setSelectedBillId] = useState<string>(
    initialBillNumber || (unsettledBills[0]?.billNumber || '')
  );

  // Settlement Splits
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { mode: 'CASH', amount: 0 }
  ]);

  // Modals
  const [invoiceBill, setInvoiceBill] = useState<HKBill | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Selected Bill
  const activeBill = useMemo(() => {
    return allBills.find(b => b.billNumber === selectedBillId);
  }, [allBills, selectedBillId]);

  // When active bill changes by ID, set default split
  React.useEffect(() => {
    if (!selectedBillId) return;
    const targetBill = getBills().find(b => b.billNumber === selectedBillId);
    if (targetBill) {
      if (targetBill.customerType === 'GUEST' && targetBill.roomNumber) {
        setSplits([
          {
            mode: 'ROOM_TRANSFER',
            amount: targetBill.netAmount,
            roomNumber: targetBill.roomNumber,
            folioNumber: targetBill.folioNumber
          }
        ]);
      } else {
        setSplits([
          {
            mode: 'CASH',
            amount: targetBill.netAmount
          }
        ]);
      }
    }
  }, [selectedBillId]);

  // Split management
  const handleAddSplit = () => {
    const currentTotal = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const remaining = activeBill ? Math.max(0, Number((activeBill.netAmount - currentTotal).toFixed(2))) : 0;
    setSplits([...splits, { mode: 'CARD', amount: remaining }]);
  };

  const handleUpdateSplit = (index: number, field: keyof PaymentSplit, val: unknown) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], [field]: val };
    
    // Auto populate room folio if room transfer
    if (field === 'roomNumber') {
      const g = inHouseGuests.find(guest => guest.roomNumber === String(val));
      if (g) updated[index].folioNumber = g.folioNumber;
    }
    setSplits(updated);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const totalSplits = useMemo(() => {
    return splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [splits]);

  const balanceRemaining = activeBill
    ? Number((activeBill.netAmount - totalSplits).toFixed(2))
    : 0;

  const isBalanced = Math.abs(balanceRemaining) < 0.01;

  // Execute Settlement
  const handleConfirmSettlement = () => {
    if (!activeBill) return;
    if (dayClose.isDayClosed) {
      alert('Day is closed. Settlement blocked.');
      return;
    }
    if (!isBalanced) {
      alert(`Settlement is not balanced. Difference: ${formatCurrency(balanceRemaining)}`);
      return;
    }

    try {
      const settled = settleBill(activeBill.billNumber, splits, currentUser.name);
      setToastMessage(`Bill #${settled.billNumber} settled successfully!`);
      setInvoiceBill(settled);
      setIsInvoiceOpen(true);
      setTimeout(() => setToastMessage(''), 4000);
      
      // Auto select next unsettled bill
      const nextUnsettled = unsettledBills.find(b => b.billNumber !== settled.billNumber);
      if (nextUnsettled) setSelectedBillId(nextUnsettled.billNumber);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error settling bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Settlement & Payment Desk</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Cashier Terminal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Close pending bills, process split payments (Cash / Card / UPI) & post charges to guest folios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Unsettled Queue:</span>
          <span className="font-bold font-mono text-amber-400">{unsettledBills.length} Bills</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 Cols: Unsettled Bills Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Bills ({unsettledBills.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by bill #, room or guest..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {unsettledBills.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1.5 opacity-80" />
                <p className="font-semibold text-slate-300">All Bills Settled</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No pending payments in cashier queue.</p>
              </div>
            ) : (
              unsettledBills
                .filter(b => {
                  const q = searchQuery.toLowerCase().trim();
                  return (
                    !q ||
                    b.billNumber.toLowerCase().includes(q) ||
                    (b.guestName && b.guestName.toLowerCase().includes(q)) ||
                    (b.roomNumber && b.roomNumber.includes(q))
                  );
                })
                .map(b => (
                  <div
                    key={b.billNumber}
                    onClick={() => setSelectedBillId(b.billNumber)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      selectedBillId === b.billNumber
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-xs text-emerald-400">{b.billNumber}</span>
                        <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{b.guestName}</h4>
                        {b.roomNumber && (
                          <span className="text-[10px] text-amber-300 font-mono flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3" /> Room {b.roomNumber} ({b.folioNumber})
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-slate-100 block">
                          {formatCurrency(b.netAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDate(b.billDate)}</span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right 8 Cols: Settlement Workbench */}
        <div className="lg:col-span-8 space-y-4">
          {!activeBill ? (
            <div className="py-20 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">Select an unsettled bill from the queue</p>
            </div>
          ) : (
            <>
              {/* Active Bill Banner */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-400">{activeBill.billNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {activeBill.billType}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {activeBill.guestName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeBill.roomNumber ? `In-House Room ${activeBill.roomNumber} • Folio: ${activeBill.folioNumber}` : 'Direct Walk-in Client'}
                  </p>
                </div>

                <div className="text-right bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payable Net Total</span>
                  <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    {formatCurrency(activeBill.netAmount)}
                  </p>
                </div>
              </div>

              {/* Items Breakdown Accordion Preview */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Bill Contents ({activeBill.items.length} items)
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activeBill.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 px-2 rounded bg-slate-950/70 border border-slate-800/70">
                      <span className="text-slate-300">• {it.itemName} (x{it.quantity})</span>
                      <span className="font-mono font-semibold text-slate-200">{formatCurrency(it.netAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split Payment Workbench */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Payment Method & Split Allocation</h3>
                    <p className="text-xs text-slate-400">Support split settlements across multiple tenders</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Split Tender
                  </button>
                </div>

                {/* Splits Rows */}
                <div className="space-y-3">
                  {splits.map((split, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        {/* Mode */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mode</label>
                          <select
                            value={split.mode}
                            onChange={(e) => handleUpdateSplit(idx, 'mode', e.target.value as PaymentMode)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold"
                          >
                            <option value="CASH">💵 Cash</option>
                            <option value="CARD">💳 Card (Credit/Debit)</option>
                            <option value="UPI">📱 UPI / QR Code</option>
                            <option value="ROOM_TRANSFER">🏨 Room Transfer (Folio)</option>
                            <option value="CREDIT">🏢 Corporate Account</option>
                          </select>
                        </div>

                        {/* Amount */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={split.amount}
                            onChange={(e) => handleUpdateSplit(idx, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold"
                          />
                        </div>

                        {/* Mode-specific Fields */}
                        <div className="sm:col-span-4">
                          {split.mode === 'CARD' ? (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Card Approval / Ref</label>
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'referenceNo', e.target.value)}
                                placeholder="TXN-XXXX-99"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          ) : split.mode === 'UPI' ? (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">UPI UTR Ref</label>
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'referenceNo', e.target.value)}
                                placeholder="UTR 12-digit"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          ) : split.mode === 'ROOM_TRANSFER' ? (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target In-House Room</label>
                              <select
                                value={split.roomNumber || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'roomNumber', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              >
                                {inHouseGuests.map(g => (
                                  <option key={g.roomNumber} value={g.roomNumber}>
                                    Room {g.roomNumber} ({g.guestName})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes / Reference</label>
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'referenceNo', e.target.value)}
                                placeholder="Optional receipt #"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <div className="sm:col-span-1 text-right pt-4">
                          <button
                            type="button"
                            disabled={splits.length <= 1}
                            onClick={() => handleRemoveSplit(idx)}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Split Balance Verification Footer */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Allocated Tender Total:</span>
                    <span className="font-mono text-slate-200">{formatCurrency(totalSplits)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-slate-800">
                    <span>Remaining Balance:</span>
                    <span
                      className={`font-mono ${
                        isBalanced ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(balanceRemaining)}
                    </span>
                  </div>

                  {!isBalanced && (
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-[11px] text-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Tender sum must equal bill net amount
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (splits.length > 0) {
                            handleUpdateSplit(0, 'amount', activeBill.netAmount);
                          }
                        }}
                        className="text-[11px] text-emerald-400 hover:underline font-semibold"
                      >
                        Auto-Balance to First Tender
                      </button>
                    </div>
                  )}
                </div>

                {/* Confirm Settlement Button */}
                <button
                  type="button"
                  disabled={!isBalanced}
                  onClick={handleConfirmSettlement}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 text-sm font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm & Finalize Settlement (Print Invoice)
                </button>

              </div>
            </>
          )}
        </div>

      </div>

      {/* Tax Invoice Modal */}
      <InvoiceModal
        bill={invoiceBill}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};
