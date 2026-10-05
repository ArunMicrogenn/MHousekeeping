import {
  User,
  ItemGroup,
  ItemMaster,
  ChargeHead,
  InHouseGuest,
  HKLot,
  HKBill,
  BillItem,
  ChargePosting,
  AuditLog,
  DayCloseConfig,
  PaymentSplit,
  LotItem,
  ResettlementLog
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ITEM_GROUPS,
  INITIAL_ITEMS,
  INITIAL_CHARGE_HEADS,
  INITIAL_IN_HOUSE_GUESTS,
  INITIAL_LOTS,
  INITIAL_BILLS,
  INITIAL_CHARGE_POSTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DAY_CLOSE
} from './mockData';

const KEYS = {
  USERS: 'hk_users_v1',
  CURRENT_USER: 'hk_current_user_v1',
  ITEM_GROUPS: 'hk_item_groups_v1',
  ITEMS: 'hk_items_v1',
  CHARGE_HEADS: 'hk_charge_heads_v1',
  GUESTS: 'hk_in_house_guests_v1',
  LOTS: 'hk_lots_v1',
  BILLS: 'hk_bills_v1',
  CHARGE_POSTINGS: 'hk_charge_postings_v1',
  AUDIT_LOGS: 'hk_audit_logs_v1',
  DAY_CLOSE: 'hk_day_close_v1',
  BILL_SEQ: 'hk_bill_seq_v1',
  LOT_SEQ: 'hk_lot_seq_v1',
  POSTING_SEQ: 'hk_posting_seq_v1'
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function subscribeStorage(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();
  } catch (err) {
    console.error('Storage write error:', err);
  }
}

// Current User State
export function getCurrentUser(): User {
  return getStored<User>(KEYS.CURRENT_USER, INITIAL_USERS[0]);
}

export function setCurrentUser(user: User): void {
  setStored(KEYS.CURRENT_USER, user);
}

export function getAllUsers(): User[] {
  return getStored<User[]>(KEYS.USERS, INITIAL_USERS);
}

// Item Groups
export function getItemGroups(): ItemGroup[] {
  return getStored<ItemGroup[]>(KEYS.ITEM_GROUPS, INITIAL_ITEM_GROUPS);
}

export function saveItemGroup(group: ItemGroup): void {
  const groups = getItemGroups();
  const idx = groups.findIndex(g => g.code === group.code);
  if (idx >= 0) {
    groups[idx] = group;
  } else {
    groups.push(group);
  }
  setStored(KEYS.ITEM_GROUPS, groups);
  logAudit('UPDATE_GROUP', 'MASTER', group.code, `Updated item group ${group.name}`);
}

// Items Master
export function getItems(): ItemMaster[] {
  return getStored<ItemMaster[]>(KEYS.ITEMS, INITIAL_ITEMS);
}

export function saveItem(item: ItemMaster): void {
  const items = getItems();
  const idx = items.findIndex(i => i.code === item.code);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  setStored(KEYS.ITEMS, items);
  logAudit('SAVE_ITEM', 'MASTER', item.code, `Saved item master: ${item.name} (Rate: ${item.rate}, Tax: ${item.taxPercent}%)`);
}

// Charge Heads
export function getChargeHeads(): ChargeHead[] {
  return getStored<ChargeHead[]>(KEYS.CHARGE_HEADS, INITIAL_CHARGE_HEADS);
}

export function saveChargeHead(chargeHead: ChargeHead): void {
  const heads = getChargeHeads();
  const idx = heads.findIndex(h => h.code === chargeHead.code);
  if (idx >= 0) {
    heads[idx] = chargeHead;
  } else {
    heads.push(chargeHead);
  }
  setStored(KEYS.CHARGE_HEADS, heads);
  logAudit('SAVE_CHARGE_HEAD', 'MASTER', chargeHead.code, `Saved charge head: ${chargeHead.name}`);
}

// In-House Guests
export function getInHouseGuests(): InHouseGuest[] {
  return getStored<InHouseGuest[]>(KEYS.GUESTS, INITIAL_IN_HOUSE_GUESTS);
}

export function findGuestByRoom(roomNumber: string): InHouseGuest | undefined {
  return getInHouseGuests().find(g => g.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase());
}

export function updateGuestBalance(roomNumber: string, deltaAmount: number): void {
  const guests = getInHouseGuests();
  const guest = guests.find(g => g.roomNumber === roomNumber);
  if (guest) {
    guest.balance = Number((guest.balance + deltaAmount).toFixed(2));
    setStored(KEYS.GUESTS, guests);
  }
}

// Sequence Generators
export function generateBillNumber(): string {
  const currentSeq = getStored<number>(KEYS.BILL_SEQ, 5);
  const nextSeq = currentSeq + 1;
  setStored(KEYS.BILL_SEQ, nextSeq);
  return `HK-2026-${String(nextSeq).padStart(4, '0')}`;
}

export function generateLotNumber(): string {
  const currentSeq = getStored<number>(KEYS.LOT_SEQ, 3);
  const nextSeq = currentSeq + 1;
  setStored(KEYS.LOT_SEQ, nextSeq);
  return `LOT-2026-${String(nextSeq).padStart(3, '0')}`;
}

export function generatePostingNumber(): string {
  const currentSeq = getStored<number>(KEYS.POSTING_SEQ, 4);
  const nextSeq = currentSeq + 1;
  setStored(KEYS.POSTING_SEQ, nextSeq);
  return `POST-2026-${String(nextSeq).padStart(4, '0')}`;
}

// Day Close
export function getDayCloseConfig(): DayCloseConfig {
  return getStored<DayCloseConfig>(KEYS.DAY_CLOSE, INITIAL_DAY_CLOSE);
}

export function toggleDayClose(closed: boolean, reason?: string): void {
  const user = getCurrentUser();
  const cfg = getDayCloseConfig();
  cfg.isDayClosed = closed;
  if (closed) {
    cfg.lastClosedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    cfg.lastClosedBy = user.name;
    logAudit('DAY_CLOSE', 'DAY_CLOSE', cfg.businessDate, `Day closed by ${user.name}. ${reason || ''}`);
  } else {
    logAudit('DAY_REOPEN', 'DAY_CLOSE', cfg.businessDate, `Day reopened by ${user.name}`);
  }
  setStored(KEYS.DAY_CLOSE, cfg);
}

// Audit Logs
export function getAuditLogs(): AuditLog[] {
  return getStored<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}

export function logAudit(action: string, entityType: AuditLog['entityType'], entityId: string, details: string): void {
  const user = getCurrentUser();
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action,
    entityType,
    entityId,
    details,
    user: user.name,
    role: user.role,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  logs.unshift(newLog);
  setStored(KEYS.AUDIT_LOGS, logs.slice(0, 500));
}

// Lots
export function getLots(): HKLot[] {
  return getStored<HKLot[]>(KEYS.LOTS, INITIAL_LOTS);
}

export function createLot(lot: Omit<HKLot, 'lotNumber' | 'status' | 'createdBy'>): HKLot {
  const user = getCurrentUser();
  const lots = getLots();
  const lotNumber = generateLotNumber();
  const newLot: HKLot = {
    ...lot,
    lotNumber,
    status: 'OPEN',
    createdBy: user.name
  };
  lots.unshift(newLot);
  setStored(KEYS.LOTS, lots);
  logAudit('CREATE_LOT', 'LOT', lotNumber, `Created batch lot ${lotNumber} (${lot.batchType}) with ${lot.items.length} items`);
  return newLot;
}

export function updateLot(lot: HKLot): void {
  const lots = getLots();
  const idx = lots.findIndex(l => l.lotNumber === lot.lotNumber);
  if (idx >= 0) {
    if (lots[idx].status === 'BILLED') {
      throw new Error('A billed lot cannot be modified.');
    }
    lots[idx] = lot;
    setStored(KEYS.LOTS, lots);
    logAudit('UPDATE_LOT', 'LOT', lot.lotNumber, `Updated lot ${lot.lotNumber} with ${lot.items.length} items`);
  }
}

export function cancelLot(lotNumber: string, reason: string): void {
  const lots = getLots();
  const lot = lots.find(l => l.lotNumber === lotNumber);
  if (!lot) throw new Error('Lot not found');
  if (lot.status === 'BILLED') throw new Error('Cannot cancel already billed lot.');
  lot.status = 'CANCELLED';
  setStored(KEYS.LOTS, lots);
  logAudit('CANCEL_LOT', 'LOT', lotNumber, `Cancelled lot ${lotNumber}. Reason: ${reason}`);
}

// Bills
export function getBills(): HKBill[] {
  return getStored<HKBill[]>(KEYS.BILLS, INITIAL_BILLS);
}

export function createBill(billData: Omit<HKBill, 'billNumber' | 'createdBy'> & { billNumber?: string }): HKBill {
  const user = getCurrentUser();
  const bills = getBills();
  const billNumber = billData.billNumber || generateBillNumber();
  
  const newBill: HKBill = {
    ...billData,
    billNumber,
    createdBy: user.name,
    resettlementHistory: []
  };

  bills.unshift(newBill);
  setStored(KEYS.BILLS, bills);

  // If lot-based, update lot status to BILLED
  if (newBill.lotNumber) {
    const lots = getLots();
    const lot = lots.find(l => l.lotNumber === newBill.lotNumber);
    if (lot) {
      lot.status = 'BILLED';
      lot.billedNumber = billNumber;
      lot.billedDate = newBill.billDate;
      setStored(KEYS.LOTS, lots);
    }
  }

  logAudit(
    'CREATE_BILL',
    'BILL',
    billNumber,
    `Created ${newBill.billType} bill ${billNumber} for ${newBill.guestName || newBill.roomNumber || 'Walk-in'} (Net: $${newBill.netAmount})`
  );

  return newBill;
}

export function settleBill(
  billNumber: string,
  settlementModes: PaymentSplit[],
  settledBy?: string
): HKBill {
  const bills = getBills();
  const bill = bills.find(b => b.billNumber === billNumber);
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'CANCELLED') throw new Error('Cannot settle a cancelled bill');

  const totalSettled = settlementModes.reduce((acc, s) => acc + Number(s.amount), 0);
  if (Math.abs(totalSettled - bill.netAmount) > 0.05) {
    throw new Error(`Settlement amount ($${totalSettled.toFixed(2)}) does not match bill net total ($${bill.netAmount.toFixed(2)})`);
  }

  // Handle room transfer folio checks and update guest balance
  settlementModes.forEach(split => {
    if (split.mode === 'ROOM_TRANSFER') {
      if (!split.roomNumber) throw new Error('Room number required for Room Transfer settlement');
      const guest = findGuestByRoom(split.roomNumber);
      if (!guest || guest.status !== 'checked_in') {
        throw new Error(`Room ${split.roomNumber} is not currently checked in`);
      }
      split.folioNumber = guest.folioNumber;
      updateGuestBalance(split.roomNumber, split.amount);
    }
  });

  const currentUser = getCurrentUser();
  bill.status = 'SETTLED';
  bill.settlementModes = settlementModes;
  bill.settledAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  bill.settledBy = settledBy || currentUser.name;

  setStored(KEYS.BILLS, bills);

  const modesStr = settlementModes.map(s => `${s.mode}: $${s.amount}`).join(', ');
  logAudit('SETTLE_BILL', 'SETTLEMENT', billNumber, `Settled bill ${billNumber} via [${modesStr}] by ${bill.settledBy}`);

  return bill;
}

export function cancelBill(billNumber: string, reason: string, authorizedBy?: string): void {
  const bills = getBills();
  const bill = bills.find(b => b.billNumber === billNumber);
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'CANCELLED') throw new Error('Bill is already cancelled');

  // If already settled via room transfer, revert room balance
  if (bill.status === 'SETTLED' && bill.settlementModes) {
    bill.settlementModes.forEach(s => {
      if (s.mode === 'ROOM_TRANSFER' && s.roomNumber) {
        updateGuestBalance(s.roomNumber, -s.amount);
      }
    });
  }

  // If was lot-based, revert lot to OPEN
  if (bill.lotNumber) {
    const lots = getLots();
    const lot = lots.find(l => l.lotNumber === bill.lotNumber);
    if (lot) {
      lot.status = 'OPEN';
      lot.billedNumber = undefined;
      lot.billedDate = undefined;
      setStored(KEYS.LOTS, lots);
    }
  }

  const user = getCurrentUser();
  bill.status = 'CANCELLED';
  bill.cancelledAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  bill.cancelledBy = authorizedBy || user.name;
  bill.cancelReason = reason;

  setStored(KEYS.BILLS, bills);
  logAudit('CANCEL_BILL', 'BILL', billNumber, `Cancelled bill ${billNumber}. Reason: ${reason} (Authorized by: ${bill.cancelledBy})`);
}

export function resettleBill(
  billNumber: string,
  newSettlement: PaymentSplit[],
  reason: string,
  authorizedBy: string,
  authorizedRole: string
): HKBill {
  const bills = getBills();
  const bill = bills.find(b => b.billNumber === billNumber);
  if (!bill) throw new Error('Bill not found');
  if (bill.status !== 'SETTLED') throw new Error('Only settled bills can be resettled');

  const totalNew = newSettlement.reduce((acc, s) => acc + Number(s.amount), 0);
  if (Math.abs(totalNew - bill.netAmount) > 0.05) {
    throw new Error(`New settlement amount ($${totalNew.toFixed(2)}) must equal bill total ($${bill.netAmount.toFixed(2)})`);
  }

  // 1. Revert previous settlement folio charges if any
  if (bill.settlementModes) {
    bill.settlementModes.forEach(oldSplit => {
      if (oldSplit.mode === 'ROOM_TRANSFER' && oldSplit.roomNumber) {
        updateGuestBalance(oldSplit.roomNumber, -oldSplit.amount);
      }
    });
  }

  // 2. Apply new settlement folio charges if any
  newSettlement.forEach(newSplit => {
    if (newSplit.mode === 'ROOM_TRANSFER') {
      if (!newSplit.roomNumber) throw new Error('Room number required for Room Transfer');
      const guest = findGuestByRoom(newSplit.roomNumber);
      if (!guest || guest.status !== 'checked_in') {
        throw new Error(`Target room ${newSplit.roomNumber} is not checked in`);
      }
      newSplit.folioNumber = guest.folioNumber;
      updateGuestBalance(newSplit.roomNumber, newSplit.amount);
    }
  });

  const previousSettlement = bill.settlementModes ? [...bill.settlementModes] : [];
  
  const logEntry: ResettlementLog = {
    id: `rst-${Date.now()}`,
    billNumber,
    previousSettlement,
    newSettlement: [...newSettlement],
    reason,
    authorizedBy,
    authorizedRole,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };

  if (!bill.resettlementHistory) {
    bill.resettlementHistory = [];
  }
  bill.resettlementHistory.unshift(logEntry);
  bill.settlementModes = newSettlement;

  setStored(KEYS.BILLS, bills);

  const prevDesc = previousSettlement.map(s => `${s.mode}($${s.amount})`).join('+');
  const newDesc = newSettlement.map(s => `${s.mode}($${s.amount})`).join('+');
  logAudit(
    'RESETTLE_BILL',
    'RESETTLEMENT',
    billNumber,
    `Resettled bill ${billNumber}: Changed from [${prevDesc}] to [${newDesc}]. Reason: ${reason} (Auth: ${authorizedBy})`
  );

  return bill;
}

// Charge Postings
export function getChargePostings(): ChargePosting[] {
  return getStored<ChargePosting[]>(KEYS.CHARGE_POSTINGS, INITIAL_CHARGE_POSTINGS);
}

export function postCharge(
  posting: Omit<ChargePosting, 'postingNumber' | 'status' | 'postedBy'>
): ChargePosting {
  const user = getCurrentUser();
  const postings = getChargePostings();

  // Validate room
  const guest = findGuestByRoom(posting.roomNumber);
  if (!guest || guest.status !== 'checked_in') {
    throw new Error(`Room ${posting.roomNumber} is not currently checked in.`);
  }

  const postingNumber = generatePostingNumber();
  const newPosting: ChargePosting = {
    ...posting,
    postingNumber,
    guestName: guest.guestName,
    folioNumber: guest.folioNumber,
    status: 'POSTED',
    postedBy: user.name
  };

  postings.unshift(newPosting);
  setStored(KEYS.CHARGE_POSTINGS, postings);

  // Update guest folio balance
  updateGuestBalance(posting.roomNumber, newPosting.netAmount);

  logAudit(
    'POST_CHARGE',
    'CHARGE',
    postingNumber,
    `Posted ${newPosting.chargeType} (${newPosting.chargeHeadName}) to Room ${newPosting.roomNumber} / ${newPosting.guestName} for $${newPosting.netAmount}`
  );

  return newPosting;
}

export function resettleChargePosting(
  originalPostingNumber: string,
  action: 'TRANSFER_ROOM' | 'MODIFY_AMOUNT' | 'CANCEL_POSTING',
  payload: {
    newRoomNumber?: string;
    newQuantity?: number;
    newRate?: number;
    newRemarks?: string;
    newChargeHeadCode?: string;
    reason: string;
    authorizedBy: string;
  }
): { reversedPosting: ChargePosting; newPosting?: ChargePosting } {
  const postings = getChargePostings();
  const original = postings.find(p => p.postingNumber === originalPostingNumber);
  if (!original) throw new Error('Posting not found');
  if (original.status !== 'POSTED') throw new Error('Only active postings can be resettled');

  // Revert old posting from guest balance
  updateGuestBalance(original.roomNumber, -original.netAmount);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
  original.status = action === 'TRANSFER_ROOM' ? 'TRANSFERRED' : 'REVERSED';
  original.reversedAt = timestamp;
  original.reversedBy = payload.authorizedBy;
  original.reversalReason = payload.reason;
  original.isResettled = true;

  let newPosting: ChargePosting | undefined;

  if (action === 'TRANSFER_ROOM') {
    if (!payload.newRoomNumber) throw new Error('Target room number is required for transfer');
    const targetGuest = findGuestByRoom(payload.newRoomNumber);
    if (!targetGuest || targetGuest.status !== 'checked_in') {
      throw new Error(`Target Room ${payload.newRoomNumber} is not checked in`);
    }

    const newPostingNumber = generatePostingNumber();
    original.newPostingNumber = newPostingNumber;

    newPosting = {
      postingNumber: newPostingNumber,
      postingDate: original.postingDate,
      chargeType: original.chargeType,
      roomNumber: targetGuest.roomNumber,
      guestName: targetGuest.guestName,
      folioNumber: targetGuest.folioNumber,
      chargeHeadCode: original.chargeHeadCode,
      chargeHeadName: original.chargeHeadName,
      quantity: original.quantity,
      rate: original.rate,
      amount: original.amount,
      taxPercent: original.taxPercent,
      taxAmount: original.taxAmount,
      netAmount: original.netAmount,
      remarks: `[Transferred from Room ${original.roomNumber} - Ref: ${original.postingNumber}] ${payload.newRemarks || original.remarks}`,
      postedBy: payload.authorizedBy,
      status: 'POSTED',
      reversalReference: original.postingNumber
    };

    postings.unshift(newPosting);
    updateGuestBalance(targetGuest.roomNumber, newPosting.netAmount);
    logAudit('RESETTLE_CHARGE', 'CHARGE', originalPostingNumber, `Transferred charge from Room ${original.roomNumber} to Room ${targetGuest.roomNumber}. New Ref: ${newPostingNumber}. Reason: ${payload.reason}`);

  } else if (action === 'MODIFY_AMOUNT') {
    const qty = payload.newQuantity ?? original.quantity;
    const rate = payload.newRate ?? original.rate;
    const amount = Number((qty * rate).toFixed(2));
    const taxAmount = Number(((amount * original.taxPercent) / 100).toFixed(2));
    const netAmount = Number((amount + taxAmount).toFixed(2));

    const newPostingNumber = generatePostingNumber();
    original.newPostingNumber = newPostingNumber;

    newPosting = {
      postingNumber: newPostingNumber,
      postingDate: original.postingDate,
      chargeType: original.chargeType,
      roomNumber: original.roomNumber,
      guestName: original.guestName,
      folioNumber: original.folioNumber,
      chargeHeadCode: original.chargeHeadCode,
      chargeHeadName: original.chargeHeadName,
      quantity: qty,
      rate,
      amount,
      taxPercent: original.taxPercent,
      taxAmount,
      netAmount,
      remarks: `[Corrected posting - Ref: ${original.postingNumber}] ${payload.newRemarks || original.remarks}`,
      postedBy: payload.authorizedBy,
      status: 'POSTED',
      reversalReference: original.postingNumber
    };

    postings.unshift(newPosting);
    updateGuestBalance(original.roomNumber, newPosting.netAmount);
    logAudit('RESETTLE_CHARGE', 'CHARGE', originalPostingNumber, `Modified charge amount from $${original.netAmount} to $${netAmount}. New Ref: ${newPostingNumber}. Reason: ${payload.reason}`);

  } else {
    // CANCEL_POSTING
    logAudit('CANCEL_CHARGE', 'CHARGE', originalPostingNumber, `Cancelled/Reversed charge ${originalPostingNumber} for Room ${original.roomNumber}. Reason: ${payload.reason}`);
  }

  setStored(KEYS.CHARGE_POSTINGS, postings);
  return { reversedPosting: original, newPosting };
}

// Check for duplicate extra bed posting on same room & date
export function checkDuplicateExtraBed(roomNumber: string, date: string): ChargePosting | undefined {
  const postings = getChargePostings();
  return postings.find(
    p => p.chargeType === 'EXTRA_BED' &&
         p.roomNumber === roomNumber &&
         p.postingDate === date &&
         p.status === 'POSTED'
  );
}

// Reset Database to pristine demo state
export function resetDatabase(): void {
  localStorage.clear();
  setStored(KEYS.USERS, INITIAL_USERS);
  setStored(KEYS.CURRENT_USER, INITIAL_USERS[0]);
  setStored(KEYS.ITEM_GROUPS, INITIAL_ITEM_GROUPS);
  setStored(KEYS.ITEMS, INITIAL_ITEMS);
  setStored(KEYS.CHARGE_HEADS, INITIAL_CHARGE_HEADS);
  setStored(KEYS.GUESTS, INITIAL_IN_HOUSE_GUESTS);
  setStored(KEYS.LOTS, INITIAL_LOTS);
  setStored(KEYS.BILLS, INITIAL_BILLS);
  setStored(KEYS.CHARGE_POSTINGS, INITIAL_CHARGE_POSTINGS);
  setStored(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  setStored(KEYS.DAY_CLOSE, INITIAL_DAY_CLOSE);
  setStored(KEYS.BILL_SEQ, 5);
  setStored(KEYS.LOT_SEQ, 3);
  setStored(KEYS.POSTING_SEQ, 4);
  notifyListeners();
}
