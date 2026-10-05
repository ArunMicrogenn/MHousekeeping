import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Building,
  User,
  CreditCard,
  Printer,
  Ban,
  Search,
  CheckCircle2,
  Percent,
  Clock,
  Boxes,
  Lock,
  ChevronRight,
  Eye,
  FileCheck
} from 'lucide-react';
import {
  getItems,
  getItemGroups,
  getInHouseGuests,
  getLots,
  getBills,
  createBill,
  cancelBill,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { BillItem, HKBill, InHouseGuest, ItemMaster, HKLot } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { InvoiceModal } from '../InvoiceModal';
import { ManagerAuthModal } from '../ManagerAuthModal';

export const BillingScreen: React.FC<{ onNavigateToSettlement?: (billNo: string) => void }> = ({
  onNavigateToSettlement
}) => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allItems = getItems().filter(i => i.active);
  const groups = getItemGroups().filter(g => g.active);
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');
  const openLots = getLots().filter(l => l.status === 'OPEN');
  const allBills = getBills();

  // Mode: 'FORM' (building new bill) vs 'LIST' (browsing bills)
  const [activeTab, setActiveTab] = useState<'CREATE' | 'HISTORY'>('CREATE');

  // Form State
  const [billType, setBillType] = useState<'REGULAR' | 'LOT_BASED'>('REGULAR');
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>(openLots[0]?.lotNumber || '');
  const [customerType, setCustomerType] = useState<'GUEST' | 'WALKIN'>('GUEST');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(inHouseGuests[0]?.roomNumber || '');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [billNotes, setBillNotes] = useState<string>('');

  // Discount
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [authorizedDiscountUser, setAuthorizedDiscountUser] = useState<string>('');

  // Items in bill
  const [items, setItems] = useState<BillItem[]>([]);

  // Item Selector Row
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedItemCode, setSelectedItemCode] = useState<string>(allItems[0]?.code || '');
  const [lineQty, setLineQty] = useState<number>(1);
  const [lineRateOverride, setLineRateOverride] = useState<number | ''>('');
  const [lineNotes, setLineNotes] = useState<string>('');

  // Modals & Authorization
  const [invoiceBill, setInvoiceBill] = useState<HKBill | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authAction, setAuthAction] = useState<{ type: 'DISCOUNT' | 'CANCEL_BILL'; payload?: unknown } | null>(null);
  
  // Cancel bill popup
  const [billToCancel, setBillToCancel] = useState<HKBill | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Filtered items in picker
  const filteredItems = useMemo(() => {
    return allItems.filter(i => selectedGroup === 'ALL' || i.groupCode === selectedGroup);
  }, [allItems, selectedGroup]);

  // Selected In-house guest details
  const selectedGuest = useMemo(() => {
    return inHouseGuests.find(g => g.roomNumber === selectedRoomNumber);
  }, [inHouseGuests, selectedRoomNumber]);

  // Auto-populate when lot is selected
  const handleSelectLot = (lotNum: string) => {
    setSelectedLotNumber(lotNum);
    const lot = openLots.find(l => l.lotNumber === lotNum);
    if (lot) {
      if (lot.roomNumber) {
        setCustomerType('GUEST');
        setSelectedRoomNumber(lot.roomNumber);
      }
      const loadedItems: BillItem[] = lot.items.map(li => {
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
      setItems(loadedItems);
    }
  };

  // Add Item to current bill
  const handleAddItem = () => {
    const master = allItems.find(i => i.code === selectedItemCode);
    if (!master) return;

    const rate = typeof lineRateOverride === 'number' && lineRateOverride >= 0 ? lineRateOverride : master.rate;
    const quantity = Math.max(1, lineQty);
    const amount = Number((quantity * rate).toFixed(2));
    const taxAmount = Number(((amount * master.taxPercent) / 100).toFixed(2));
    const netAmount = Number((amount + taxAmount).toFixed(2));

    const newItem: BillItem = {
      id: `bi-${Date.now()}-${Math.random()}`,
      itemCode: master.code,
      itemName: master.name,
      groupCode: master.groupCode,
      rate,
      taxPercent: master.taxPercent,
      quantity,
      amount,
      taxAmount,
      netAmount,
      notes: lineNotes
    };

    setItems([...items, newItem]);
    setLineQty(1);
    setLineRateOverride('');
    setLineNotes('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Computations
  const grossAmount = useMemo(() => items.reduce((sum, i) => sum + i.amount, 0), [items]);
  const discountAmount = useMemo(() => Number(((grossAmount * discountPercent) / 100).toFixed(2)), [grossAmount, discountPercent]);
  const discountedGross = grossAmount - discountAmount;
  
  // Tax calculation proportional to discounted gross
  const taxAmount = useMemo(() => {
    if (grossAmount === 0) return 0;
    const factor = discountedGross / grossAmount;
    const rawTax = items.reduce((sum, i) => sum + (i.taxAmount * factor), 0);
    return Number(rawTax.toFixed(2));
  }, [items, grossAmount, discountedGross]);

  const netAmount = Number((discountedGross + taxAmount).toFixed(2));

  // Handle Save Bill
  const handleSaveBill = (proceedToSettle: boolean) => {
    if (dayClose.isDayClosed) {
      alert('Day is closed. Reopen day or contact supervisor to bill.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item.');
      return;
    }
    if (discountPercent > 0 && !discountReason.trim()) {
      alert('A reason is mandatory when applying a discount.');
      return;
    }
    if (discountPercent > 0 && currentUser.role === 'operator' && !authorizedDiscountUser) {
      setAuthAction({ type: 'DISCOUNT', payload: proceedToSettle });
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const newBill = createBill({
        billDate: dayClose.businessDate,
        billType,
        lotNumber: billType === 'LOT_BASED' ? selectedLotNumber : undefined,
        customerType,
        roomNumber: customerType === 'GUEST' ? selectedRoomNumber : undefined,
        guestName: customerType === 'GUEST' ? selectedGuest?.guestName : walkinName || 'Walk-in Client',
        folioNumber: customerType === 'GUEST' ? selectedGuest?.folioNumber : undefined,
        customerPhone: customerType === 'WALKIN' ? walkinPhone : selectedGuest?.phone,
        items,
        grossAmount,
        discountPercent,
        discountAmount,
        discountReason: discountPercent > 0 ? discountReason : undefined,
        taxAmount,
        netAmount,
        status: 'UNSETTLED',
        notes: billNotes
      });

      // Reset form
      setItems([]);
      setDiscountPercent(0);
      setDiscountReason('');
      setBillNotes('');
      setAuthorizedDiscountUser('');

      if (proceedToSettle && onNavigateToSettlement) {
        onNavigateToSettlement(newBill.billNumber);
      } else {
        setInvoiceBill(newBill);
        setIsInvoiceOpen(true);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error generating bill');
    }
  };

  // Initiate Cancel Bill
  const handleInitiateCancel = (bill: HKBill) => {
    if (bill.status === 'CANCELLED') return;
    setBillToCancel(bill);
    setCancelReason('');

    if (currentUser.role === 'operator') {
      setAuthAction({ type: 'CANCEL_BILL', payload: bill });
      setIsAuthModalOpen(true);
    }
  };

  const handleConfirmCancel = (authorizedBy?: string) => {
    if (!billToCancel) return;
    if (!cancelReason.trim()) {
      alert('Cancellation reason is required.');
      return;
    }

    try {
      cancelBill(billToCancel.billNumber, cancelReason, authorizedBy || currentUser.name);
      setBillToCancel(null);
      setCancelReason('');
      alert(`Bill #${billToCancel.billNumber} has been successfully cancelled.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Housekeeping Billing Desk</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Standard Billing
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generate itemized bills, apply approved discounts, pull batch lots & manage guest folios
            </p>
          </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'CREATE'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            + Create New Bill
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bills Register ({allBills.length})
          </button>
        </div>
      </div>

      {activeTab === 'CREATE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left 8 Cols: Form & Line Items */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Header Settings Card */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Bill Type & Lot */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillType('REGULAR')}
                      className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                        billType === 'REGULAR'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Regular Items
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillType('LOT_BASED')}
                      className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                        billType === 'LOT_BASED'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Pull from Lot ({openLots.length})
                    </button>
                  </div>

                  {billType === 'LOT_BASED' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] text-cyan-400 font-semibold mb-1">Select Open Batch Lot</label>
                      <select
                        value={selectedLotNumber}
                        onChange={(e) => handleSelectLot(e.target.value)}
                        className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium"
                      >
                        {openLots.length === 0 ? (
                          <option value="">No open lots available</option>
                        ) : (
                          openLots.map(l => (
                            <option key={l.lotNumber} value={l.lotNumber}>
                              {l.lotNumber} – {l.title} ({l.items.length} items)
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Customer / In-House Guest */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Customer / Guest</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCustomerType('GUEST')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        customerType === 'GUEST'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      🏨 In-House Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('WALKIN')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        customerType === 'WALKIN'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      👤 Walk-in Client
                    </button>
                  </div>

                  {customerType === 'GUEST' ? (
                    <select
                      value={selectedRoomNumber}
                      onChange={(e) => setSelectedRoomNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                    >
                      {inHouseGuests.map(g => (
                        <option key={g.roomNumber} value={g.roomNumber}>
                          Room {g.roomNumber} – {g.guestName} ({g.folioNumber})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        placeholder="Client Name"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                        placeholder="Phone No"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Line Item Picker Bar */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Add Line Item
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-300"
                  >
                    <option value="ALL">All Groups</option>
                    {groups.map(g => (
                      <option key={g.code} value={g.code}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <select
                    value={selectedItemCode}
                    onChange={(e) => setSelectedItemCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100"
                  >
                    {filteredItems.map(item => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({formatCurrency(item.rate)} + {item.taxPercent}% Tax)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={lineQty}
                    onChange={(e) => setLineQty(parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-center font-mono font-bold text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* Added Items Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Bill Line Items ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    onClick={() => setItems([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear Items
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Tax (%)</th>
                      <th className="py-2.5 px-3 text-right">Net</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No items added yet. Choose items above to populate bill.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-200">{item.itemName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{item.itemCode}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {item.taxPercent}% ({formatCurrency(item.taxAmount)})
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(item.netAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right 4 Cols: Totals, Discounts & Actions */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Discount Section */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  Apply Discount
                </span>
                {currentUser.role === 'operator' && (
                  <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Auth Required
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Discount Amount</label>
                  <div className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold">
                    {formatCurrency(discountAmount)}
                  </div>
                </div>
              </div>

              {discountPercent > 0 && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mandatory Discount Reason *</label>
                  <input
                    type="text"
                    required
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. VIP Member courtesy, Management approval"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              )}
            </div>

            {/* Bill Summary & Grand Totals */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Financial Summary
              </span>

              <div className="space-y-2 text-xs border-b border-slate-800 pb-3">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono text-slate-200">{formatCurrency(grossAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Total Tax (GST):</span>
                  <span className="font-mono text-slate-200">{formatCurrency(taxAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-lg font-bold text-white">
                <span>Net Total:</span>
                <span className="font-mono text-amber-400 text-xl font-black">
                  {formatCurrency(netAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Invoice Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder="Special instructions or billing notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveBill(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                >
                  Save Bill (Unsettled)
                </button>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveBill(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  Save & Go to Settlement
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* HISTORY: Master Bills Register */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">All Housekeeping Bills</h3>
            <span className="text-xs text-slate-400">{allBills.length} records in system</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Bill Number</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Guest / Room</th>
                  <th className="py-3 px-3.5 text-right">Gross</th>
                  <th className="py-3 px-3.5 text-right">Tax</th>
                  <th className="py-3 px-3.5 text-right">Net Amount</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allBills.map(b => (
                  <tr key={b.billNumber} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3.5 font-mono font-bold text-cyan-400">{b.billNumber}</td>
                    <td className="py-3 px-3.5 text-slate-300">{formatDate(b.billDate)}</td>
                    <td className="py-3 px-3.5 text-slate-400">{b.billType}</td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-slate-200">{b.guestName}</span>
                      {b.roomNumber && <span className="text-amber-400 block font-mono text-[11px]">Room {b.roomNumber}</span>}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono">{formatCurrency(b.grossAmount)}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-400">{formatCurrency(b.taxAmount)}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-100">{formatCurrency(b.netAmount)}</td>
                    <td className="py-3 px-3.5 text-center">
                      {b.status === 'SETTLED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SETTLED
                        </span>
                      ) : b.status === 'CANCELLED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          CANCELLED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          UNSETTLED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setInvoiceBill(b);
                            setIsInvoiceOpen(true);
                          }}
                          title="View / Print Tax Invoice"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'UNSETTLED' && onNavigateToSettlement && (
                          <button
                            onClick={() => onNavigateToSettlement(b.billNumber)}
                            title="Settle Bill"
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleInitiateCancel(b)}
                            title="Cancel Bill"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white"
                          >
                            <Ban className="w-3.5 h-3.5" />
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
      )}

      {/* Bill Cancellation Dialog */}
      {billToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-red-500/30 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Bill {billToCancel.billNumber}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Are you sure you want to cancel this bill? This will reverse any settled folio charges.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Mandatory Cancellation Reason *</label>
              <textarea
                rows={2}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Duplicate bill generated, Customer disputed charge..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setBillToCancel(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Back
              </button>
              <button
                onClick={() => handleConfirmCancel()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-red-600/20"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Auth Modal */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title={authAction?.type === 'DISCOUNT' ? 'Authorize Rate / Discount' : 'Authorize Bill Cancellation'}
        actionDescription={
          authAction?.type === 'DISCOUNT'
            ? `Apply ${discountPercent}% discount (${formatCurrency(discountAmount)})`
            : `Cancel bill #${(authAction?.payload as HKBill)?.billNumber}`
        }
        requiredRole={authAction?.type === 'DISCOUNT' ? 'supervisor' : 'supervisor'}
        onSuccess={(authBy) => {
          setIsAuthModalOpen(false);
          if (authAction?.type === 'DISCOUNT') {
            setAuthorizedDiscountUser(authBy);
            handleSaveBill(Boolean(authAction.payload));
          } else if (authAction?.type === 'CANCEL_BILL') {
            handleConfirmCancel(authBy);
          }
          setAuthAction(null);
        }}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthAction(null);
        }}
      />

      {/* Tax Invoice Modal */}
      <InvoiceModal
        bill={invoiceBill}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};
