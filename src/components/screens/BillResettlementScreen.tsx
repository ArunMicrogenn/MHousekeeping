import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Building,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Lock,
  Plus,
  Trash2,
  History,
  ShieldCheck,
  ArrowRight,
  ReceiptText
} from 'lucide-react';
import {
  getBills,
  resettleBill,
  getInHouseGuests,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { HKBill, PaymentMode, PaymentSplit } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ManagerAuthModal } from '../ManagerAuthModal';
import { InvoiceModal } from '../InvoiceModal';

export const BillResettlementScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allBills = getBills();
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');

  // Filter only settled bills
  const settledBills = useMemo(() => {
    return allBills.filter(b => b.status === 'SETTLED');
  }, [allBills]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>(
    settledBills[0]?.billNumber || ''
  );

  // New settlement splits
  const [newSplits, setNewSplits] = useState<PaymentSplit[]>([
    { mode: 'CARD', amount: 0 }
  ]);
  const [resettleReason, setResettleReason] = useState<string>('');

  // Modals & Authorization
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [updatedBill, setUpdatedBill] = useState<HKBill | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Active settled bill
  const selectedBill = useMemo(() => {
    return settledBills.find(b => b.billNumber === selectedBillNumber);
  }, [settledBills, selectedBillNumber]);

  // When selected bill changes by ID, populate current settlement into form as default starting point
  React.useEffect(() => {
    if (!selectedBillNumber) return;
    const targetBill = getBills().find(b => b.billNumber === selectedBillNumber);
    if (targetBill) {
      if (targetBill.settlementModes && targetBill.settlementModes.length > 0) {
        setNewSplits(targetBill.settlementModes.map(s => ({ ...s })));
      } else {
        setNewSplits([{ mode: 'CASH', amount: targetBill.netAmount }]);
      }
      setResettleReason('');
    }
  }, [selectedBillNumber]);

  // Split management
  const handleAddSplit = () => {
    const currentTotal = newSplits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const remaining = selectedBill ? Math.max(0, Number((selectedBill.netAmount - currentTotal).toFixed(2))) : 0;
    setNewSplits([...newSplits, { mode: 'CASH', amount: remaining }]);
  };

  const handleUpdateSplit = (index: number, field: keyof PaymentSplit, val: unknown) => {
    const updated = [...newSplits];
    updated[index] = { ...updated[index], [field]: val };
    
    if (field === 'roomNumber') {
      const g = inHouseGuests.find(guest => guest.roomNumber === String(val));
      if (g) updated[index].folioNumber = g.folioNumber;
    }
    setNewSplits(updated);
  };

  const handleRemoveSplit = (index: number) => {
    if (newSplits.length <= 1) return;
    setNewSplits(newSplits.filter((_, i) => i !== index));
  };

  const totalNewSplits = useMemo(() => {
    return newSplits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [newSplits]);

  const balanceDiff = selectedBill
    ? Number((selectedBill.netAmount - totalNewSplits).toFixed(2))
    : 0;

  const isBalanced = Math.abs(balanceDiff) < 0.01;

  // Initiate Resettlement
  const handleInitiateResettle = () => {
    if (!selectedBill) return;
    if (dayClose.isDayClosed) {
      alert('Day is closed. Resettlement is blocked after day-close.');
      return;
    }
    if (!isBalanced) {
      alert(`New settlement total must match bill total: ${formatCurrency(selectedBill.netAmount)}`);
      return;
    }
    if (!resettleReason.trim()) {
      alert('Mandatory resettlement reason is required.');
      return;
    }

    // Always require manager authorization
    setIsAuthModalOpen(true);
  };

  const executeResettlement = (authorizedBy: string, role: string) => {
    if (!selectedBill) return;
    try {
      const resettled = resettleBill(
        selectedBill.billNumber,
        newSplits,
        resettleReason,
        authorizedBy,
        role
      );

      setUpdatedBill(resettled);
      setToastMessage(`Bill #${resettled.billNumber} successfully resettled & audited!`);
      setIsInvoiceOpen(true);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to resettle bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Bill Resettlement Desk</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Manager Control
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Change payment mode or folio allocation on already settled bills with automated reversal & audit trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-slate-400">
          <History className="w-4 h-4 text-amber-400" />
          <span>Settled Bills: {settledBills.length}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 Cols: Settled Bills Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Settled Bill
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bill #, guest or room..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {settledBills
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
                  onClick={() => setSelectedBillNumber(b.billNumber)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    selectedBillNumber === b.billNumber
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-xs text-amber-400">{b.billNumber}</span>
                      <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{b.guestName}</h4>
                      {b.roomNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">Room {b.roomNumber}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-100 block">
                        {formatCurrency(b.netAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDate(b.billDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right 8 Cols: Resettlement Builder */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedBill ? (
            <div className="py-20 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              <RotateCcw className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">Select a settled bill from the list to modify</p>
            </div>
          ) : (
            <>
              {/* Existing Settlement Card */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Current Settlement Details</span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Bill #{selectedBill.billNumber} – {selectedBill.guestName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Fixed Net Amount</span>
                    <p className="text-xl font-black font-mono text-amber-400">
                      {formatCurrency(selectedBill.netAmount)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Original Settlement Mode(s):</span>
                  {selectedBill.settlementModes?.map((m, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>• {m.mode} {m.referenceNo ? `(Ref: ${m.referenceNo})` : ''} {m.roomNumber ? `(Room: ${m.roomNumber})` : ''}</span>
                      <span className="font-mono font-bold text-slate-200">{formatCurrency(m.amount)}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    Originally settled on {selectedBill.settledAt} by {selectedBill.settledBy}
                  </p>
                </div>
              </div>

              {/* Resettlement Configuration */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      New Settlement Allocation
                    </h3>
                    <p className="text-xs text-slate-400">Re-route payment mode or room folio assignment</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Tender
                  </button>
                </div>

                {/* Splits Input */}
                <div className="space-y-3">
                  {newSplits.map((split, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New Mode</label>
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

                        <div className="sm:col-span-4">
                          {split.mode === 'CARD' ? (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Card Approval #</label>
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'referenceNo', e.target.value)}
                                placeholder="TXN-XXXX-00"
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
                                placeholder="12-digit UTR"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          ) : split.mode === 'ROOM_TRANSFER' ? (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Transfer to Room</label>
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
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes</label>
                              <input
                                type="text"
                                value={split.referenceNo || ''}
                                onChange={(e) => handleUpdateSplit(idx, 'referenceNo', e.target.value)}
                                placeholder="Optional remarks"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                              />
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-1 text-right pt-4">
                          <button
                            type="button"
                            disabled={newSplits.length <= 1}
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

                {/* Mandatory Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mandatory Resettlement Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={resettleReason}
                    onChange={(e) => setResettleReason(e.target.value)}
                    placeholder="e.g. Guest paid cash upon check-out instead of charging room folio, or wrong EDC card swipe reversed"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Audit & Resettle Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isBalanced || !resettleReason.trim()}
                    onClick={handleInitiateResettle}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Authorize & Resettle Bill
                  </button>
                </div>

              </div>

              {/* Resettlement History Drilldown */}
              {selectedBill.resettlementHistory && selectedBill.resettlementHistory.length > 0 && (
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    Resettlement Audit History ({selectedBill.resettlementHistory.length})
                  </span>
                  <div className="space-y-2">
                    {selectedBill.resettlementHistory.map((hist, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Authorized by <strong className="text-slate-200">{hist.authorizedBy}</strong> ({hist.authorizedRole})</span>
                          <span className="font-mono">{formatDate(hist.timestamp)}</span>
                        </div>
                        <p className="text-slate-300 font-medium">Reason: {hist.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Manager Auth Modal */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title="Authorize Bill Resettlement"
        actionDescription={`Resettle Bill #${selectedBill?.billNumber} (Reason: ${resettleReason})`}
        requiredRole="manager"
        onSuccess={(authBy, role) => {
          setIsAuthModalOpen(false);
          executeResettlement(authBy, role);
        }}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Updated Invoice Modal */}
      <InvoiceModal
        bill={updatedBill}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};
