/**
 * House Keeping (HK) Module Data Models & Interfaces
 */

export type UserRole = 'operator' | 'supervisor' | 'manager';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  badgeId: string;
}

export interface ItemGroup {
  code: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

export interface ItemMaster {
  code: string;
  name: string;
  groupCode: string;
  rate: number;
  taxPercent: number;
  unit: string;
  active: boolean;
  category: string;
  barcode?: string;
  imageUrl?: string;
}

export interface ChargeHead {
  code: string;
  name: string;
  defaultRate: number;
  taxPercent: number;
  category: 'extra_bed' | 'damage' | 'laundry' | 'amenity' | 'misc';
  active: boolean;
  description: string;
}

export interface InHouseGuest {
  roomNumber: string;
  guestName: string;
  folioNumber: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'checked_in' | 'checked_out';
  balance: number;
  phone: string;
  vipStatus?: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  adults: number;
  children: number;
}

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'ROOM_TRANSFER';

export interface PaymentSplit {
  mode: PaymentMode;
  amount: number;
  referenceNo?: string;
  roomNumber?: string;
  folioNumber?: string;
}

export interface LotItem {
  id: string;
  itemCode: string;
  itemName: string;
  groupCode: string;
  rate: number;
  taxPercent: number;
  quantity: number;
  roomNumber?: string;
  notes?: string;
}

export interface HKLot {
  lotNumber: string;
  lotDate: string;
  status: 'OPEN' | 'BILLED' | 'CANCELLED';
  title: string;
  batchType: 'Linen' | 'Guest Laundry' | 'Staff Uniforms' | 'Room Amenities' | 'General';
  items: LotItem[];
  createdBy: string;
  billedNumber?: string;
  billedDate?: string;
  remarks?: string;
  roomNumber?: string;
  guestName?: string;
}

export interface BillItem {
  id: string;
  itemCode: string;
  itemName: string;
  groupCode: string;
  rate: number;
  taxPercent: number;
  quantity: number;
  amount: number;
  taxAmount: number;
  netAmount: number;
  notes?: string;
}

export interface ResettlementLog {
  id: string;
  billNumber: string;
  previousSettlement: PaymentSplit[];
  newSettlement: PaymentSplit[];
  reason: string;
  authorizedBy: string;
  authorizedRole: string;
  timestamp: string;
}

export interface HKBill {
  billNumber: string;
  billDate: string;
  billType: 'REGULAR' | 'QUICK' | 'LOT_BASED';
  lotNumber?: string;
  customerType: 'GUEST' | 'WALKIN';
  roomNumber?: string;
  guestName?: string;
  folioNumber?: string;
  customerPhone?: string;
  items: BillItem[];
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  netAmount: number;
  status: 'UNSETTLED' | 'SETTLED' | 'CANCELLED';
  settlementModes?: PaymentSplit[];
  settledAt?: string;
  settledBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdBy: string;
  resettlementHistory?: ResettlementLog[];
  notes?: string;
}

export interface ChargePosting {
  postingNumber: string;
  postingDate: string;
  chargeType: 'EXTRA_BED' | 'MISC_CHARGE';
  roomNumber: string;
  guestName: string;
  folioNumber: string;
  chargeHeadCode: string;
  chargeHeadName: string;
  quantity: number;
  rate: number;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  netAmount: number;
  remarks: string;
  postedBy: string;
  status: 'POSTED' | 'REVERSED' | 'TRANSFERRED';
  reversalReference?: string;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  newPostingNumber?: string;
  isResettled?: boolean;
}

export interface ChargeResettlementLog {
  id: string;
  originalPostingNumber: string;
  action: 'TRANSFER_ROOM' | 'MODIFY_CHARGE' | 'CANCEL_POSTING';
  originalRoom: string;
  newRoom?: string;
  originalAmount: number;
  newAmount?: number;
  originalHead: string;
  newHead?: string;
  reason: string;
  authorizedBy: string;
  newPostingNumber?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'BILL' | 'LOT' | 'CHARGE' | 'SETTLEMENT' | 'RESETTLEMENT' | 'MASTER' | 'DAY_CLOSE';
  entityId: string;
  details: string;
  user: string;
  role: string;
  timestamp: string;
}

export interface DateClosureValidationSummary {
  unsettledBillsCount: number;
  unsettledBillsTotal: number;
  openLotsCount: number;
  warningsCount: number;
  passed: boolean;
  notes: string[];
}

export interface DateClosureRecord {
  closureId: string;
  closedDate: string;
  nextDate: string;
  closedAt: string;
  closedBy: string;
  closedRole: string;
  totalBills: number;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netRevenue: number;
  cashCollected: number;
  cardCollected: number;
  upiCollected: number;
  roomTransferTotal: number;
  creditTotal: number;
  extraBedRevenue: number;
  miscChargesRevenue: number;
  validationSummary: DateClosureValidationSummary;
  managerRemarks: string;
  status: 'CLOSED' | 'REOPENED';
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
}

export interface DayCloseConfig {
  isDayClosed: boolean;
  businessDate: string;
  lastClosedAt?: string;
  lastClosedBy?: string;
}
