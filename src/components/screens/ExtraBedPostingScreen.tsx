import React, { useState, useMemo } from 'react';
import {
  Bed,
  Building,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Printer,
  ShieldAlert,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getInHouseGuests,
  getChargeHeads,
  postCharge,
  checkDuplicateExtraBed,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { ChargePosting, ChargeHead, InHouseGuest } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ChargeSlipModal } from '../ChargeSlipModal';

export const ExtraBedPostingScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');
  const chargeHeads = getChargeHeads().filter(h => h.active && h.category === 'extra_bed');

  // Form State
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(inHouseGuests[0]?.roomNumber || '');
  const [selectedHeadCode, setSelectedHeadCode] = useState<string>(chargeHeads[0]?.code || '');
  const [nights, setNights] = useState<number>(1);
  const [rateOverride, setRateOverride] = useState<number | ''>('');
  const [postingDate, setPostingDate] = useState<string>(dayClose.businessDate);
  const [remarks, setRemarks] = useState<string>('Extra bed setup requested by guest');

  // Modals & Slips
  const [recentPosting, setRecentPosting] = useState<ChargePosting | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<ChargePosting | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Target guest
  const currentGuest = useMemo(() => {
    return inHouseGuests.find(g => g.roomNumber === selectedRoomNumber);
  }, [inHouseGuests, selectedRoomNumber]);

  // Selected charge head
  const currentHead = useMemo(() => {
    return chargeHeads.find(h => h.code === selectedHeadCode) || chargeHeads[0];
  }, [chargeHeads, selectedHeadCode]);

  const activeRate = typeof rateOverride === 'number' && rateOverride >= 0
    ? rateOverride
    : (currentHead?.defaultRate || 0);

  const subtotal = Number((nights * activeRate).toFixed(2));
  const taxAmount = Number(((subtotal * (currentHead?.taxPercent || 0)) / 100).toFixed(2));
  const netTotal = Number((subtotal + taxAmount).toFixed(2));

  // Check duplicate when room or date changes
  const handleRoomOrDateChange = (newRoom: string, newDate: string) => {
    const existing = checkDuplicateExtraBed(newRoom, newDate);
    setDuplicateWarning(existing || null);
  };

  const handlePostExtraBed = (bypassDuplicate: boolean = false) => {
    if (dayClose.isDayClosed) {
      alert('Business day is closed. Reopen day or contact supervisor.');
      return;
    }
    if (!currentGuest) {
      alert('Selected room is not checked in.');
      return;
    }

    // Check duplicate
    const existing = checkDuplicateExtraBed(selectedRoomNumber, postingDate);
    if (existing && !bypassDuplicate) {
      setDuplicateWarning(existing);
      return;
    }

    try {
      const posting = postCharge({
        postingDate,
        chargeType: 'EXTRA_BED',
        roomNumber: selectedRoomNumber,
        guestName: currentGuest.guestName,
        folioNumber: currentGuest.folioNumber,
        chargeHeadCode: currentHead.code,
        chargeHeadName: currentHead.name,
        quantity: nights,
        rate: activeRate,
        amount: subtotal,
        taxPercent: currentHead.taxPercent,
        taxAmount,
        netAmount: netTotal,
        remarks
      });

      setRecentPosting(posting);
      setIsSlipOpen(true);
      setDuplicateWarning(null);
      setToastMessage(`Extra Bed Posted to Room ${posting.roomNumber} (${formatCurrency(posting.netAmount)})`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error posting extra bed');
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
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Extra Bed Posting Terminal</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Folio Direct
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Post extra rollaway bed, baby cot or bedding charges directly to guest room folio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 font-mono">
          <span>Active In-House Rooms: {inHouseGuests.length}</span>
        </div>
      </div>

      {/* Main Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Posting Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            
            {/* Room Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-purple-400" />
                Select In-House Room *
              </label>
              <select
                value={selectedRoomNumber}
                onChange={(e) => {
                  setSelectedRoomNumber(e.target.value);
                  handleRoomOrDateChange(e.target.value, postingDate);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
              >
                {inHouseGuests.map(g => (
                  <option key={g.roomNumber} value={g.roomNumber}>
                    Room {g.roomNumber} – {g.guestName} (Folio: {g.folioNumber} • {g.vipStatus || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* In-House Guest Profile Preview */}
            {currentGuest && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Guest Name</span>
                  <p className="font-bold text-slate-200 mt-0.5">{currentGuest.guestName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Folio Number</span>
                  <p className="font-mono text-purple-300 font-bold mt-0.5">{currentGuest.folioNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Stay Period</span>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {formatDate(currentGuest.checkInDate)} → {formatDate(currentGuest.checkOutDate)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Balance</span>
                  <p className="font-mono font-bold text-amber-400 mt-0.5">{formatCurrency(currentGuest.balance)}</p>
                </div>
              </div>
            )}

            {/* Extra Bed Head & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Extra Bed Charge Head *</label>
                <select
                  value={selectedHeadCode}
                  onChange={(e) => setSelectedHeadCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  {chargeHeads.map(head => (
                    <option key={head.code} value={head.code}>
                      {head.name} ({formatCurrency(head.defaultRate)}/nt)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Posting Date</label>
                <input
                  type="date"
                  value={postingDate}
                  onChange={(e) => {
                    setPostingDate(e.target.value);
                    handleRoomOrDateChange(selectedRoomNumber, e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity / Number of Nights</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={nights}
                  onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex justify-between">
                  <span>Nightly Rate</span>
                  <span className="text-[10px] text-slate-500 font-mono">Default: {formatCurrency(currentHead?.defaultRate)}</span>
                </label>
                <input
                  type="number"
                  placeholder={String(currentHead?.defaultRate || 0)}
                  value={rateOverride}
                  onChange={(e) => setRateOverride(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Posting Remarks / Location within Room</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Set up in living area near balcony"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

          </div>
        </div>

        {/* Right 5 Cols: Calculation & Duplicate Warning */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Duplicate Warning Box */}
          {duplicateWarning && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Duplicate Posting Warning</span>
              </div>
              <p className="text-xs text-amber-200">
                An extra bed ({duplicateWarning.chargeHeadName}) is already posted for Room {duplicateWarning.roomNumber} on {formatDate(duplicateWarning.postingDate)} (Ref: #{duplicateWarning.postingNumber}).
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200"
                >
                  Change Date / Room
                </button>
                <button
                  type="button"
                  onClick={() => handlePostExtraBed(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Post Additional Bed
                </button>
              </div>
            </div>
          )}

          {/* Posting Summary Box */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Folio Charge Summary
            </span>

            <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
              <div className="flex justify-between text-slate-400">
                <span>Charge Head:</span>
                <span className="font-semibold text-slate-200">{currentHead?.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rate per Night:</span>
                <span className="font-mono text-slate-200">{formatCurrency(activeRate)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Number of Nights:</span>
                <span className="font-mono text-slate-200">x{nights}</span>
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
              <span>Total Posted to Folio:</span>
              <span className="font-mono text-purple-400 text-xl font-black">
                {formatCurrency(netTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handlePostExtraBed(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-slate-950 font-black text-sm shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirm & Post to Room Folio
            </button>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Posting Rules</span>
            </div>
            <p>• Automatically reflects in the guest's folio ledger at checkout.</p>
            <p>• Requires manager authorization via Charges Resettlement to cancel or re-route.</p>
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
