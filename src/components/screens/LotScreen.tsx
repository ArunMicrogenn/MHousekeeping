import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Receipt,
  FileText,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  Building,
  ArrowRight,
  AlertCircle,
  Printer
} from 'lucide-react';
import {
  getLots,
  createLot,
  updateLot,
  cancelLot,
  getItems,
  getInHouseGuests,
  createBill,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { HKLot, LotItem, ItemMaster } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ManagerAuthModal } from '../ManagerAuthModal';

export const LotScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allLots = getLots();
  const activeItems = getItems().filter(i => i.active);
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'BILLED' | 'CANCELLED'>('ALL');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingLot, setEditingLot] = useState<HKLot | null>(null);
  const [viewingLot, setViewingLot] = useState<HKLot | null>(null);
  const [cancellingLot, setCancellingLot] = useState<HKLot | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [lotToBill, setLotToBill] = useState<HKLot | null>(null);

  // New / Edit Lot Form State
  const [lotTitle, setLotTitle] = useState<string>('');
  const [batchType, setBatchType] = useState<HKLot['batchType']>('Guest Laundry');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [lotRemarks, setLotRemarks] = useState<string>('');
  const [formItems, setFormItems] = useState<LotItem[]>([]);
  
  // Item adding row inside modal
  const [selectedItemCode, setSelectedItemCode] = useState<string>(activeItems[0]?.code || '');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Filter lots
  const filteredLots = useMemo(() => {
    return allLots.filter(lot => {
      const matchStatus = statusFilter === 'ALL' || lot.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.title.toLowerCase().includes(q) ||
        (lot.roomNumber && lot.roomNumber.includes(q)) ||
        (lot.guestName && lot.guestName.toLowerCase().includes(q)) ||
        (lot.billedNumber && lot.billedNumber.toLowerCase().includes(q));
      return matchStatus && matchQ;
    });
  }, [allLots, statusFilter, searchQuery]);

  // Open Create Lot Modal
  const handleOpenCreate = () => {
    if (dayClose.isDayClosed) {
      alert('Day is closed. Reopen business day to create lots.');
      return;
    }
    setEditingLot(null);
    setLotTitle('');
    setBatchType('Guest Laundry');
    setSelectedRoomNumber(inHouseGuests[0]?.roomNumber || '');
    setLotRemarks('');
    setFormItems([]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Lot Modal
  const handleOpenEdit = (lot: HKLot) => {
    if (lot.status !== 'OPEN') {
      alert('Only Open lots can be modified.');
      return;
    }
    setEditingLot(lot);
    setLotTitle(lot.title);
    setBatchType(lot.batchType);
    setSelectedRoomNumber(lot.roomNumber || '');
    setLotRemarks(lot.remarks || '');
    setFormItems([...lot.items]);
    setIsCreateModalOpen(true);
  };

  // Add Item to lot form
  const handleAddItemToForm = () => {
    const item = activeItems.find(i => i.code === selectedItemCode);
    if (!item) return;

    const existingIdx = formItems.findIndex(fi => fi.itemCode === item.code);
    if (existingIdx >= 0) {
      const updated = [...formItems];
      updated[existingIdx].quantity += itemQty;
      if (itemNotes) updated[existingIdx].notes = itemNotes;
      setFormItems(updated);
    } else {
      setFormItems([
        ...formItems,
        {
          id: `li-${Date.now()}-${Math.random()}`,
          itemCode: item.code,
          itemName: item.name,
          groupCode: item.groupCode,
          rate: item.rate,
          taxPercent: item.taxPercent,
          quantity: itemQty,
          roomNumber: selectedRoomNumber || undefined,
          notes: itemNotes
        }
      ]);
    }
    setItemQty(1);
    setItemNotes('');
  };

  const handleRemoveFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  // Save Lot
  const handleSaveLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotTitle.trim()) {
      alert('Please enter a lot title.');
      return;
    }
    if (formItems.length === 0) {
      alert('Please add at least one item to the lot.');
      return;
    }

    const guest = inHouseGuests.find(g => g.roomNumber === selectedRoomNumber);

    if (editingLot) {
      updateLot({
        ...editingLot,
        title: lotTitle,
        batchType,
        roomNumber: selectedRoomNumber || undefined,
        guestName: guest?.guestName,
        remarks: lotRemarks,
        items: formItems
      });
    } else {
      createLot({
        lotDate: dayClose.businessDate,
        title: lotTitle,
        batchType,
        roomNumber: selectedRoomNumber || undefined,
        guestName: guest?.guestName,
        remarks: lotRemarks,
        items: formItems
      });
    }

    setIsCreateModalOpen(false);
  };

  // Trigger Bill Creation from Lot
  const handleInitiateBillFromLot = (lot: HKLot) => {
    if (lot.status !== 'OPEN') {
      alert('Only open lots can be converted into a bill.');
      return;
    }
    setLotToBill(lot);

    // If operator, require supervisor auth if configured, or direct generate
    if (currentUser.role === 'operator') {
      setIsAuthModalOpen(true);
    } else {
      executeLotBilling(lot, currentUser.name);
    }
  };

  const executeLotBilling = (lot: HKLot, authorizedBy: string) => {
    try {
      const guest = inHouseGuests.find(g => g.roomNumber === lot.roomNumber);

      const billItems = lot.items.map(li => {
        const amount = Number((li.quantity * li.rate).toFixed(2));
        const taxAmount = Number(((amount * li.taxPercent) / 100).toFixed(2));
        const netAmount = Number((amount + taxAmount).toFixed(2));
        return {
          id: `bi-${Date.now()}-${Math.random()}`,
          itemCode: li.itemCode,
          itemName: li.itemName,
          groupCode: li.groupCode,
          rate: li.rate,
          taxPercent: li.taxPercent,
          quantity: li.quantity,
          amount,
          taxAmount,
          netAmount,
          notes: li.notes
        };
      });

      const grossAmount = billItems.reduce((acc, i) => acc + i.amount, 0);
      const taxAmount = billItems.reduce((acc, i) => acc + i.taxAmount, 0);
      const netAmount = Number((grossAmount + taxAmount).toFixed(2));

      const bill = createBill({
        billDate: dayClose.businessDate,
        billType: 'LOT_BASED',
        lotNumber: lot.lotNumber,
        customerType: lot.roomNumber ? 'GUEST' : 'WALKIN',
        roomNumber: lot.roomNumber,
        guestName: lot.guestName || (guest ? guest.guestName : 'Batch Lot Client'),
        folioNumber: guest?.folioNumber,
        items: billItems,
        grossAmount,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount,
        netAmount,
        status: 'UNSETTLED',
        notes: `Generated from Lot ${lot.lotNumber} (${lot.title}) by ${authorizedBy}`
      });

      alert(`Successfully generated Bill #${bill.billNumber} from Lot #${lot.lotNumber}. Please proceed to Settlement to close the bill.`);
      setLotToBill(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error billing lot');
    }
  };

  // Cancel Lot
  const handleConfirmCancelLot = () => {
    if (!cancellingLot) return;
    if (!cancelReason.trim()) {
      alert('Please enter a cancellation reason.');
      return;
    }
    try {
      cancelLot(cancellingLot.lotNumber, cancelReason);
      setCancellingLot(null);
      setCancelReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel lot');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Batch Lot Management</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Batch Ops
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Group multiple laundry, linen, or room service items into lots for grouped billing
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Lot
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lot #, title, room or bill..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'OPEN', 'BILLED', 'CANCELLED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Lots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLots.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-sm">No batch lots found</p>
            <p className="text-xs text-slate-500 mt-0.5">Click "Create New Lot" to start a batch operation.</p>
          </div>
        ) : (
          filteredLots.map(lot => {
            const lotGross = lot.items.reduce((acc, i) => acc + i.quantity * i.rate, 0);
            const totalUnits = lot.items.reduce((acc, i) => acc + i.quantity, 0);

            return (
              <div
                key={lot.lotNumber}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-cyan-400">{lot.lotNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">• {formatDate(lot.lotDate)}</span>
                    </div>

                    {lot.status === 'OPEN' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> OPEN
                      </span>
                    ) : lot.status === 'BILLED' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> BILLED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <Ban className="w-3 h-3" /> CANCELLED
                      </span>
                    )}
                  </div>

                  {/* Title & Batch Type */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lot.batchType}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm mt-0.5 line-clamp-1">{lot.title}</h3>
                    {lot.roomNumber && (
                      <p className="text-xs text-amber-300/90 mt-1 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        Room {lot.roomNumber} ({lot.guestName || 'Guest'})
                      </p>
                    )}
                  </div>

                  {/* Items preview */}
                  <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                      <span>{lot.items.length} items ({totalUnits} pcs)</span>
                      <span className="font-mono text-slate-300">{formatCurrency(lotGross)}</span>
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                      {lot.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                          <span className="truncate pr-2">• {item.itemName}</span>
                          <span className="font-mono font-semibold text-slate-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {lot.billedNumber && (
                    <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex justify-between items-center font-mono">
                      <span>Billed In:</span>
                      <span className="font-bold">{lot.billedNumber}</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingLot(lot)}
                      title="View Lot Manifest"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {lot.status === 'OPEN' && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(lot)}
                          title="Edit Lot"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCancellingLot(lot)}
                          title="Cancel Lot"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {lot.status === 'OPEN' && (
                    <button
                      onClick={() => handleInitiateBillFromLot(lot)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Generate Bill
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Lot Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl text-slate-100 my-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-400" />
              {editingLot ? `Edit Batch Lot (${editingLot.lotNumber})` : 'Create Batch Lot for Housekeeping'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Accumulate items for scheduled laundry, linen replacement or bulk room services
            </p>

            <form onSubmit={handleSaveLot} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Lot Title / Batch Ref *</label>
                  <input
                    type="text"
                    required
                    value={lotTitle}
                    onChange={(e) => setLotTitle(e.target.value)}
                    placeholder="e.g. VIP 4th Floor Express Laundry"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Batch Category</label>
                  <select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value as HKLot['batchType'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Guest Laundry">Guest Laundry & Pressing</option>
                    <option value="Linen">Linen & Bedding Refresh</option>
                    <option value="Staff Uniforms">Staff Uniform Processing</option>
                    <option value="Room Amenities">Room Amenities Batch</option>
                    <option value="General">General Housekeeping</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Link In-House Room (Optional)</label>
                  <select
                    value={selectedRoomNumber}
                    onChange={(e) => setSelectedRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Internal / Multi-Room Batch --</option>
                    {inHouseGuests.map(g => (
                      <option key={g.roomNumber} value={g.roomNumber}>
                        Room {g.roomNumber} – {g.guestName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Remarks / Special Instructions</label>
                  <input
                    type="text"
                    value={lotRemarks}
                    onChange={(e) => setLotRemarks(e.target.value)}
                    placeholder="e.g. Starch shirts, deliver before 2 PM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Add Item Subsection */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-bold text-cyan-400 block uppercase tracking-wider">
                  Add Item to Lot Batch
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedItemCode}
                      onChange={(e) => setSelectedItemCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      {activeItems.map(item => (
                        <option key={item.code} value={item.code}>
                          {item.name} ({formatCurrency(item.rate)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-center text-slate-100 font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Items List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <span className="text-xs font-semibold text-slate-400">Current Items in Lot ({formItems.length})</span>
                {formItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No items added to this lot yet.</p>
                ) : (
                  formItems.map((fi, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{fi.itemName}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                          {formatCurrency(fi.rate)} each
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-cyan-400">Qty: {fi.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(idx)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-cyan-600/20"
                >
                  {editingLot ? 'Save Changes' : 'Create & Open Lot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Lot Manifest Modal */}
      {viewingLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono">{viewingLot.lotNumber}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{viewingLot.title}</h3>
                <p className="text-xs text-slate-400">Batch Category: {viewingLot.batchType}</p>
              </div>
              <button
                onClick={() => setViewingLot(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Target Room / Guest</span>
                  <p className="font-semibold text-slate-200">
                    {viewingLot.roomNumber ? `Room ${viewingLot.roomNumber} (${viewingLot.guestName})` : 'Internal Batch'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Created By</span>
                  <p className="font-semibold text-slate-200">{viewingLot.createdBy}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Batch Items Manifest</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {viewingLot.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                      <span>{it.itemName}</span>
                      <span className="font-mono font-bold text-cyan-300">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewingLot.remarks && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300">Remarks:</span> {viewingLot.remarks}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingLot(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Lot Confirmation Modal */}
      {cancellingLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-red-500/30 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Lot {cancellingLot.lotNumber}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Are you sure you want to cancel this lot? This action cannot be reversed.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Cancellation *</label>
              <textarea
                rows={2}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Guest canceled laundry request..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setCancellingLot(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Keep Lot
              </button>
              <button
                onClick={handleConfirmCancelLot}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-red-600/20"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Auth Modal for Lot Billing */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title="Authorize Batch Billing"
        actionDescription={`Convert Lot ${lotToBill?.lotNumber} into an official bill.`}
        requiredRole="supervisor"
        onSuccess={(authBy) => {
          setIsAuthModalOpen(false);
          if (lotToBill) executeLotBilling(lotToBill, authBy);
        }}
        onClose={() => {
          setIsAuthModalOpen(false);
          setLotToBill(null);
        }}
      />
    </div>
  );
};
