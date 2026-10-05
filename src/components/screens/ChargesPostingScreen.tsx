import React, { useState, useMemo } from 'react';
import {
  Tag,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Printer,
  ShieldAlert,
  Info,
  Sparkles
} from 'lucide-react';
import {
  getInHouseGuests,
  getChargeHeads,
  postCharge,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { ChargePosting, ChargeHead, InHouseGuest } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ChargeSlipModal } from '../ChargeSlipModal';

export const ChargesPostingScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');
  const allChargeHeads = getChargeHeads().filter(h => h.active && h.category !== 'extra_bed');

  // Form State
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(inHouseGuests[0]?.roomNumber || '');
  const [selectedHeadCode, setSelectedHeadCode] = useState<string>(allChargeHeads[0]?.code || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [customRate, setCustomRate] = useState<number | ''>('');
  const [remarks, setRemarks] = useState<string>('');
  const [postingDate, setPostingDate] = useState<string>(dayClose.businessDate);

  // Modals & Slips
  const [recentPosting, setRecentPosting] = useState<ChargePosting | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Target guest
  const currentGuest = useMemo(() => {
    return inHouseGuests.find(g => g.roomNumber === selectedRoomNumber);
  }, [inHouseGuests, selectedRoomNumber]);

  // Selected charge head
  const currentHead = useMemo(() => {
    return allChargeHeads.find(h => h.code === selectedHeadCode) || allChargeHeads[0];
  }, [allChargeHeads, selectedHeadCode]);

  const effectiveRate = typeof customRate === 'number' && customRate >= 0
    ? customRate
    : (currentHead?.defaultRate || 0);

  const subtotal = Number((quantity * effectiveRate).toFixed(2));
  const taxAmount = Number(((subtotal * (currentHead?.taxPercent || 0)) / 100).toFixed(2));
  const netTotal = Number((subtotal + taxAmount).toFixed(2));

  const handlePostCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (dayClose.isDayClosed) {
      alert('Business day is closed. Reopen day or contact supervisor.');
      return;
    }
    if (!currentGuest) {
      alert('Selected room is not checked in.');
      return;
    }
    if (!remarks.trim()) {
      alert('Remarks / incident description is mandatory for HK miscellaneous charges.');
      return;
    }

    try {
      const posting = postCharge({
        postingDate,
        chargeType: 'MISC_CHARGE',
        roomNumber: selectedRoomNumber,
        guestName: currentGuest.guestName,
        folioNumber: currentGuest.folioNumber,
        chargeHeadCode: currentHead.code,
        chargeHeadName: currentHead.name,
        quantity,
        rate: effectiveRate,
        amount: subtotal,
        taxPercent: currentHead.taxPercent,
        taxAmount,
        netAmount: netTotal,
        remarks
      });

      setRecentPosting(posting);
      setIsSlipOpen(true);
      setRemarks('');
      setCustomRate('');
      setToastMessage(`Charge Posted to Room ${posting.roomNumber} (${formatCurrency(posting.netAmount)})`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error posting charge');
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
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Miscellaneous Charges Posting</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Folio Post
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Post room damages, linen penalties, minibar audits & express services directly to guest folios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 font-mono">
          <span>Charge Heads: {allChargeHeads.length}</span>
        </div>
      </div>

      {/* Main Form & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Form */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handlePostCharge} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            
            {/* Room Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-rose-400" />
                Select In-House Room *
              </label>
              <select
                value={selectedRoomNumber}
                onChange={(e) => setSelectedRoomNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-rose-500"
              >
                {inHouseGuests.map(g => (
                  <option key={g.roomNumber} value={g.roomNumber}>
                    Room {g.roomNumber} – {g.guestName} (Folio: {g.folioNumber} • {g.vipStatus || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Summary Card */}
            {currentGuest && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Guest</span>
                  <p className="font-bold text-slate-200 mt-0.5">{currentGuest.guestName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Folio Ref</span>
                  <p className="font-mono text-rose-300 font-bold mt-0.5">{currentGuest.folioNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Checkout Date</span>
                  <p className="text-slate-300 text-[11px] mt-0.5">{formatDate(currentGuest.checkOutDate)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Folio Balance</span>
                  <p className="font-mono font-bold text-amber-400 mt-0.5">{formatCurrency(currentGuest.balance)}</p>
                </div>
              </div>
            )}

            {/* Charge Head Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Charge Head *</label>
                <select
                  value={selectedHeadCode}
                  onChange={(e) => setSelectedHeadCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  {allChargeHeads.map(head => (
                    <option key={head.code} value={head.code}>
                      {head.name} ({formatCurrency(head.defaultRate)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Posting Date</label>
                <input
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Quantity & Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity / Incidents</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex justify-between">
                  <span>Unit Rate</span>
                  <span className="text-[10px] text-slate-500 font-mono">Default: {formatCurrency(currentHead?.defaultRate)}</span>
                </label>
                <input
                  type="number"
                  placeholder={String(currentHead?.defaultRate || 0)}
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
            </div>

            {/* Mandatory Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Mandatory Remarks / Incident Evidence Description *
              </label>
              <textarea
                rows={3}
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Red wine stain on master bedroom carpet, verified by supervisor Marcus"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Post Charge to Folio
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Breakdown & Policy */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Folio Ledger Impact
            </span>

            <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
              <div className="flex justify-between text-slate-400">
                <span>Charge Head:</span>
                <span className="font-semibold text-slate-200">{currentHead?.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Category:</span>
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{currentHead?.category}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Quantity:</span>
                <span className="font-mono text-slate-200">{quantity}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Unit Rate:</span>
                <span className="font-mono text-slate-200">{formatCurrency(effectiveRate)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax ({currentHead?.taxPercent}%):</span>
                <span className="font-mono text-slate-200">{formatCurrency(taxAmount)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-bold text-white">
              <span>Total Charge to Post:</span>
              <span className="font-mono text-rose-400 text-xl font-black">
                {formatCurrency(netTotal)}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info className="w-4 h-4 text-rose-400" />
              <span>Audit Guidelines</span>
            </div>
            <p>• Charge slips are generated for guest acknowledgment upon billing.</p>
            <p>• Folio balance increments immediately in real-time.</p>
            <p>• To correct or re-route a posted charge, use the Charges Resettlement tab.</p>
          </div>
        </div>

      </div>

      {/* Charge Slip Modal */}
      <ChargeSlipModal
        posting={recentPosting}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
      />
    </div>
  );
};
