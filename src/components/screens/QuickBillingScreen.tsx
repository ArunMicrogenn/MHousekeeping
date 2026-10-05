import React, { useState, useMemo } from 'react';
import {
  Zap,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Building,
  User,
  ShoppingBag,
  Sparkles,
  Barcode,
  Layers,
  Percent,
  ReceiptText
} from 'lucide-react';
import {
  getItems,
  getItemGroups,
  getInHouseGuests,
  createBill,
  settleBill,
  getCurrentUser,
  getDayCloseConfig
} from '../../services/storage';
import { ItemMaster, BillItem, InHouseGuest, PaymentSplit, HKBill } from '../../types';
import { formatCurrency } from '../../utils/exportUtils';
import { InvoiceModal } from '../InvoiceModal';

interface CartItem extends BillItem {
  barcode?: string;
}

export const QuickBillingScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const allItems = getItems().filter(i => i.active);
  const groups = getItemGroups().filter(g => g.active);
  const inHouseGuests = getInHouseGuests().filter(g => g.status === 'checked_in');

  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Guest / Customer selection
  const [customerType, setCustomerType] = useState<'GUEST' | 'WALKIN'>('GUEST');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(inHouseGuests[0]?.roomNumber || '');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');

  // Settlement Popup State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [settlementMode, setSettlementMode] = useState<'ROOM_TRANSFER' | 'CASH' | 'CARD' | 'UPI'>('ROOM_TRANSFER');
  const [cardRef, setCardRef] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  
  // Generated bill & Invoice Modal
  const [generatedBill, setGeneratedBill] = useState<HKBill | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Filtered items for display
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchGroup = selectedGroup === 'ALL' || item.groupCode === selectedGroup;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        (item.barcode && item.barcode.includes(query));
      return matchGroup && matchQuery;
    });
  }, [allItems, selectedGroup, searchQuery]);

  // Selected In-house guest
  const currentGuest = useMemo(() => {
    return inHouseGuests.find(g => g.roomNumber === selectedRoomNumber);
  }, [inHouseGuests, selectedRoomNumber]);

  // Add Item to cart
  const handleAddToCart = (item: ItemMaster) => {
    if (dayClose.isDayClosed) {
      alert('Day is closed. Reopen day or contact supervisor to bill.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.itemCode === item.code);
      if (existing) {
        const newQty = existing.quantity + 1;
        const amount = Number((newQty * existing.rate).toFixed(2));
        const taxAmount = Number(((amount * existing.taxPercent) / 100).toFixed(2));
        const netAmount = Number((amount + taxAmount).toFixed(2));
        return prev.map(i => i.itemCode === item.code ? { ...i, quantity: newQty, amount, taxAmount, netAmount } : i);
      } else {
        const quantity = 1;
        const amount = Number((quantity * item.rate).toFixed(2));
        const taxAmount = Number(((amount * item.taxPercent) / 100).toFixed(2));
        const netAmount = Number((amount + taxAmount).toFixed(2));
        return [
          ...prev,
          {
            id: `bi-${Date.now()}-${Math.random()}`,
            itemCode: item.code,
            itemName: item.name,
            groupCode: item.groupCode,
            rate: item.rate,
            taxPercent: item.taxPercent,
            quantity,
            amount,
            taxAmount,
            netAmount,
            barcode: item.barcode
          }
        ];
      }
    });
  };

  const handleUpdateQty = (itemCode: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.itemCode === itemCode) {
          const newQty = Math.max(1, item.quantity + delta);
          const amount = Number((newQty * item.rate).toFixed(2));
          const taxAmount = Number(((amount * item.taxPercent) / 100).toFixed(2));
          const netAmount = Number((amount + taxAmount).toFixed(2));
          return { ...item, quantity: newQty, amount, taxAmount, netAmount };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (itemCode: string) => {
    setCart(prev => prev.filter(i => i.itemCode !== itemCode));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Computations
  const grossAmount = useMemo(() => cart.reduce((sum, i) => sum + i.amount, 0), [cart]);
  const taxAmount = useMemo(() => cart.reduce((sum, i) => sum + i.taxAmount, 0), [cart]);
  const netAmount = Number((grossAmount + taxAmount).toFixed(2));

  // Handle Save Bill (Unsettled)
  const handleSaveUnsettledBill = () => {
    if (cart.length === 0) {
      alert('Please add at least one item to create a bill.');
      return;
    }

    try {
      const bill = createBill({
        billDate: dayClose.businessDate,
        billType: 'QUICK',
        customerType,
        roomNumber: customerType === 'GUEST' ? selectedRoomNumber : undefined,
        guestName: customerType === 'GUEST' ? currentGuest?.guestName : walkinName || 'Walk-in Guest',
        folioNumber: customerType === 'GUEST' ? currentGuest?.folioNumber : undefined,
        customerPhone: customerType === 'WALKIN' ? walkinPhone : currentGuest?.phone,
        items: cart,
        grossAmount,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount,
        netAmount,
        status: 'UNSETTLED'
      });

      setToastMessage(`Created Bill #${bill.billNumber} successfully.`);
      setGeneratedBill(bill);
      setCart([]);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating bill');
    }
  };

  // Open Direct Settlement
  const handleOpenDirectSettle = () => {
    if (cart.length === 0) {
      alert('Please add at least one item before settlement.');
      return;
    }
    if (customerType === 'GUEST' && !selectedRoomNumber) {
      alert('Please select a valid in-house room.');
      return;
    }
    setIsSettleModalOpen(true);
  };

  // Complete Direct Settlement
  const handleCompleteSettlement = () => {
    try {
      // 1. Create bill
      const bill = createBill({
        billDate: dayClose.businessDate,
        billType: 'QUICK',
        customerType,
        roomNumber: customerType === 'GUEST' ? selectedRoomNumber : undefined,
        guestName: customerType === 'GUEST' ? currentGuest?.guestName : walkinName || 'Walk-in Guest',
        folioNumber: customerType === 'GUEST' ? currentGuest?.folioNumber : undefined,
        customerPhone: customerType === 'WALKIN' ? walkinPhone : currentGuest?.phone,
        items: cart,
        grossAmount,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount,
        netAmount,
        status: 'UNSETTLED'
      });

      // 2. Build payment splits
      const splits: PaymentSplit[] = [
        {
          mode: settlementMode,
          amount: netAmount,
          referenceNo: settlementMode === 'CARD' ? cardRef : settlementMode === 'UPI' ? upiRef : undefined,
          roomNumber: settlementMode === 'ROOM_TRANSFER' ? selectedRoomNumber : undefined,
          folioNumber: settlementMode === 'ROOM_TRANSFER' ? currentGuest?.folioNumber : undefined
        }
      ];

      // 3. Settle
      const settled = settleBill(bill.billNumber, splits, currentUser.name);

      setGeneratedBill(settled);
      setIsSettleModalOpen(false);
      setIsInvoiceOpen(true);
      setCart([]);
      setToastMessage(`Bill #${settled.billNumber} Settled & Posted Successfully!`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Settlement failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Quick Billing Terminal</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Speed POS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rapid single-screen entry for in-house guest services, express laundry & amenities
            </p>
          </div>
        </div>

        {/* Guest / Walkin Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCustomerType('GUEST')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              customerType === 'GUEST'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            In-House Room
          </button>
          <button
            onClick={() => {
              setCustomerType('WALKIN');
              if (settlementMode === 'ROOM_TRANSFER') setSettlementMode('CASH');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              customerType === 'WALKIN'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Walk-In Client
          </button>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Catalog & Search */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search Bar & Barcode scan simulation */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HK items, laundry codes, or barcode (e.g., 8901001)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedGroup === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Items ({allItems.length})
            </button>
            {groups.map(grp => (
              <button
                key={grp.code}
                onClick={() => setSelectedGroup(grp.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedGroup === grp.code
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.itemCode === item.code);
              return (
                <div
                  key={item.code}
                  onClick={() => handleAddToCart(item)}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    inCart
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {inCart && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span>{item.code}</span>
                      <span>•</span>
                      <span>{item.taxPercent}% Tax</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 mt-1 line-clamp-2 leading-tight">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {formatCurrency(item.rate)}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Active Billing Sheet & Folio Assignment */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Target Customer / Room Card */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-400" />
              {customerType === 'GUEST' ? 'In-House Room & Folio' : 'Walk-In Customer Details'}
            </h3>

            {customerType === 'GUEST' ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Select Occupied Room
                  </label>
                  <select
                    value={selectedRoomNumber}
                    onChange={(e) => setSelectedRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {inHouseGuests.map(g => (
                      <option key={g.roomNumber} value={g.roomNumber}>
                        Room {g.roomNumber} – {g.guestName} ({g.folioNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {currentGuest && (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">{currentGuest.guestName}</p>
                      <p className="text-[11px] text-slate-400">
                        Folio: <span className="font-mono text-amber-300">{currentGuest.folioNumber}</span> • {currentGuest.vipStatus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500">Folio Balance</p>
                      <p className="font-mono font-bold text-slate-300">{formatCurrency(currentGuest.balance)}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Guest / Client Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+1 555-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart & Billing Summary */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Bill Items ({cart.length})</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="py-2 space-y-2 max-h-[220px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <p>No items added yet.</p>
                    <p className="text-[11px] mt-1">Tap items on the left catalog to add to quick bill.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={item.itemCode}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/70 text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-slate-200 truncate">{item.itemName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(item.rate)} + {item.taxPercent}% Tax
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
                          <button
                            onClick={() => handleUpdateQty(item.itemCode, -1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-slate-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.itemCode, 1)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="w-16 text-right font-mono font-bold text-slate-100">
                          {formatCurrency(item.netAmount)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.itemCode)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Calculations & Action Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Amount:</span>
                  <span className="font-mono text-slate-200">{formatCurrency(grossAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax Total:</span>
                  <span className="font-mono text-slate-200">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-slate-800">
                  <span>Net Payable:</span>
                  <span className="font-mono text-amber-400">{formatCurrency(netAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveUnsettledBill}
                  disabled={cart.length === 0}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ReceiptText className="w-4 h-4" />
                  Save as Unsettled
                </button>
                <button
                  type="button"
                  onClick={handleOpenDirectSettle}
                  disabled={cart.length === 0}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  Save & Settle Now
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Direct Settlement Modal */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              Quick Settlement
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Closing bill for {customerType === 'GUEST' ? `Room ${selectedRoomNumber} (${currentGuest?.guestName})` : walkinName || 'Walk-in'}
            </p>

            <div className="my-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Net Amount</span>
              <p className="text-2xl font-black font-mono text-amber-400 mt-0.5">{formatCurrency(netAmount)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {customerType === 'GUEST' && (
                    <button
                      type="button"
                      onClick={() => setSettlementMode('ROOM_TRANSFER')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        settlementMode === 'ROOM_TRANSFER'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      🏨 Room Folio
                      <p className="text-[10px] font-normal text-slate-400">Post to Room {selectedRoomNumber}</p>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSettlementMode('CASH')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      settlementMode === 'CASH'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    💵 Cash
                    <p className="text-[10px] font-normal text-slate-400">Direct Cash desk</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementMode('CARD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      settlementMode === 'CARD'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    💳 Credit / Debit Card
                    <p className="text-[10px] font-normal text-slate-400">EDC Terminal swipe</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementMode('UPI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      settlementMode === 'UPI'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    📱 UPI / QR Pay
                    <p className="text-[10px] font-normal text-slate-400">Instant digital transfer</p>
                  </button>
                </div>
              </div>

              {settlementMode === 'CARD' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Card Approval / Batch Ref</label>
                  <input
                    type="text"
                    value={cardRef}
                    onChange={(e) => setCardRef(e.target.value)}
                    placeholder="e.g. TXN-VISA-94812"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {settlementMode === 'UPI' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">UPI Transaction Reference (UTR)</label>
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="e.g. 409823145678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSettlement}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20"
                >
                  Confirm & Settle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal Preview */}
      <InvoiceModal
        bill={generatedBill}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};
