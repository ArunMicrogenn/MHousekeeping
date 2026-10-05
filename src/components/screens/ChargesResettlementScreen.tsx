import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Search,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Edit,
  History,
  FileCheck
} from 'lucide-react';
import {
  getChargePostings,
  resettleChargePosting,
  getInHouseGuests,
  getChargeHeads,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { ChargePosting, InHouseGuest, ChargeHead } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ManagerAuthModal } from '../ManagerAuthModal';
import { ChargeSlipModal } from '../ChargeSlipModal';

export const ChargesResettlementScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allPostings = getChargePostings();
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');
  const allChargeHeads = getChargeHeads();

  // Filter active postings
  const activePostings = useMemo(() => {
    return allPostings.filter(p => p.status === 'POSTED');
  }, [allPostings]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPostingNo, setSelectedPostingNo] = useState<string>(
    activePostings[0]?.postingNumber || ''
  );

  // Resettlement Action: 'TRANSFER_ROOM' | 'MODIFY_AMOUNT' | 'CANCEL_POSTING'
  const [actionType, setActionType] = useState<'TRANSFER_ROOM' | 'MODIFY_AMOUNT' | 'CANCEL_POSTING'>('TRANSFER_ROOM');
  
  // Action Payloads
  const [targetRoomNumber, setTargetRoomNumber] = useState<string>(inHouseGuests[1]?.roomNumber || inHouseGuests[0]?.roomNumber || '');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newRate, setNewRate] = useState<number>(0);
  const [newRemarks, setNewRemarks] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Modals & Authorization
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [voucherPosting, setVoucherPosting] = useState<ChargePosting | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Selected Posting
  const selectedPosting = useMemo(() => {
    return allPostings.find(p => p.postingNumber === selectedPostingNo);
  }, [allPostings, selectedPostingNo]);

  // When posting changes by ID, update defaults
  React.useEffect(() => {
    if (!selectedPostingNo) return;
    const targetPosting = getChargePostings().find(p => p.postingNumber === selectedPostingNo);
    if (targetPosting) {
      setNewQuantity(targetPosting.quantity);
      setNewRate(targetPosting.rate);
      setNewRemarks(targetPosting.remarks || '');
      setReason('');
    }
  }, [selectedPostingNo]);

  const handleInitiateResettlement = () => {
    if (!selectedPosting) return;
    if (dayClose.isDayClosed) {
      alert('Day is closed. Charges resettlement is restricted.');
      return;
    }
    if (!reason.trim()) {
      alert('Mandatory reason for charges resettlement is required.');
      return;
    }
    if (actionType === 'TRANSFER_ROOM' && targetRoomNumber === selectedPosting.roomNumber) {
      alert('Please select a different target room for transfer.');
      return;
    }

    setIsAuthModalOpen(true);
  };

  const executeResettlement = (authorizedBy: string) => {
    if (!selectedPosting) return;
    try {
      const result = resettleChargePosting(
        selectedPosting.postingNumber,
        actionType,
        {
          newRoomNumber: targetRoomNumber,
          newQuantity,
          newRate,
          newRemarks,
          reason,
          authorizedBy
        }
      );

      setToastMessage(`Charge Posting #${selectedPosting.postingNumber} Resettled Successfully!`);
      if (result.newPosting) {
        setVoucherPosting(result.newPosting);
        setIsSlipOpen(true);
      }
      setTimeout(() => setToastMessage(''), 5000);
      
      const nextActive = activePostings.find(p => p.postingNumber !== selectedPosting.postingNumber);
      if (nextActive) setSelectedPostingNo(nextActive.postingNumber);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Resettlement failed');
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
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Charges Posting Resettlement</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Folio Correction
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Re-route charges posted to wrong rooms, adjust erroneous rates, or reverse charges with linked audit trails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-slate-400">
          <span>Active Postings: {activePostings.length}</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 Cols: Active Postings Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Active Folio Charge
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posting #, room or head..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {allPostings
              .filter(p => {
                const q = searchQuery.toLowerCase().trim();
                return (
                  !q ||
                  p.postingNumber.toLowerCase().includes(q) ||
                  p.roomNumber.includes(q) ||
                  p.guestName.toLowerCase().includes(q) ||
                  p.chargeHeadName.toLowerCase().includes(q)
                );
              })
              .map(p => (
                <div
                  key={p.postingNumber}
                  onClick={() => setSelectedPostingNo(p.postingNumber)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    selectedPostingNo === p.postingNumber
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-400">{p.postingNumber}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          p.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 mt-1">{p.chargeHeadName}</h4>
                      <span className="text-[10px] text-amber-300 font-mono block mt-0.5">
                        Room {p.roomNumber} ({p.guestName})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-100 block">
                        {formatCurrency(p.netAmount)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatDate(p.postingDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right 8 Cols: Resettlement Workbench */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedPosting ? (
            <div className="py-20 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              <Repeat className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">Select a charge posting to view or correct</p>
            </div>
          ) : (
            <>
              {/* Posting Overview Header */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-400">{selectedPosting.postingNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {selectedPosting.chargeType}
                      </span>
                      {selectedPosting.status !== 'POSTED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          {selectedPosting.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{selectedPosting.chargeHeadName}</h3>
                    <p className="text-xs text-slate-400">
                      Currently billed to: <strong className="text-amber-300">Room {selectedPosting.roomNumber} ({selectedPosting.guestName})</strong> • Folio: {selectedPosting.folioNumber}
                    </p>
                  </div>

                  <div className="text-right bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Posted Net Total</span>
                    <p className="text-2xl font-black font-mono text-indigo-400 mt-0.5">
                      {formatCurrency(selectedPosting.netAmount)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-slate-400">Original Remarks:</span> {selectedPosting.remarks || 'None'}
                  <p className="text-[10px] text-slate-500 mt-1">Posted by {selectedPosting.postedBy} on {formatDate(selectedPosting.postingDate)}</p>
                </div>
              </div>

              {selectedPosting.status === 'POSTED' ? (
                /* Resettlement Action Panel */
                <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/30 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Repeat className="w-4 h-4 text-indigo-400" />
                      Select Resettlement Action
                    </h3>
                    <p className="text-xs text-slate-400">Specify correction type to execute with manager sign-off</p>
                  </div>

                  {/* Action Mode Radio Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActionType('TRANSFER_ROOM')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        actionType === 'TRANSFER_ROOM'
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      🏨 Transfer Room
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">Re-route charge to correct room folio</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('MODIFY_AMOUNT')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        actionType === 'MODIFY_AMOUNT'
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✏️ Modify Rate / Qty
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">Correct quantity or amount billed</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('CANCEL_POSTING')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        actionType === 'CANCEL_POSTING'
                          ? 'bg-red-500/15 border-red-500 text-red-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      🚫 Void / Reverse Charge
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">Cancel charge completely from folio</p>
                    </button>
                  </div>

                  {/* Dynamic Action Fields */}
                  {actionType === 'TRANSFER_ROOM' && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <label className="block text-xs font-semibold text-slate-300">
                        Select Target In-House Room to Transfer Charge To *
                      </label>
                      <select
                        value={targetRoomNumber}
                        onChange={(e) => setTargetRoomNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold"
                      >
                        {inHouseGuests
                          .filter(g => g.roomNumber !== selectedPosting.roomNumber)
                          .map(g => (
                            <option key={g.roomNumber} value={g.roomNumber}>
                              Transfer to Room {g.roomNumber} – {g.guestName} (Folio: {g.folioNumber})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {actionType === 'MODIFY_AMOUNT' && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">New Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={newQuantity}
                          onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">New Unit Rate</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRate}
                          onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {actionType === 'CANCEL_POSTING' && (
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-xs text-red-300">
                      <p className="font-bold">Reversal Warning:</p>
                      <p className="text-[11px] mt-0.5">
                        This will completely reverse ${selectedPosting.netAmount} from Room {selectedPosting.roomNumber}'s folio ledger. An immutable reversal record will remain in reports.
                      </p>
                    </div>
                  )}

                  {/* Mandatory Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Mandatory Correction Reason *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Charge was mistakenly posted to Room 304 instead of Room 401, or guest disputed laundry count..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!reason.trim()}
                    onClick={handleInitiateResettlement}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-5 h-5" />
                    Authorize & Execute Resettlement
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-bold text-red-400 uppercase tracking-wider block">Posting Already Resettled / Reversed</span>
                  <p>Reversed on {formatDate(selectedPosting.reversedAt)} by {selectedPosting.reversedBy}</p>
                  <p>Reason: {selectedPosting.reversalReason}</p>
                  {selectedPosting.newPostingNumber && (
                    <p className="text-indigo-400 font-mono font-semibold">
                      Replacement Posting Reference: #{selectedPosting.newPostingNumber}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Manager Auth Modal */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title="Authorize Charge Resettlement"
        actionDescription={`Resettle Charge #${selectedPosting?.postingNumber} (${actionType}) - Reason: ${reason}`}
        requiredRole="manager"
        onSuccess={(authBy) => {
          setIsAuthModalOpen(false);
          executeResettlement(authBy);
        }}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Charge Slip Modal */}
      <ChargeSlipModal
        posting={voucherPosting}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
      />
    </div>
  );
};
