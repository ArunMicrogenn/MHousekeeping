import {
  User,
  ItemGroup,
  ItemMaster,
  ChargeHead,
  InHouseGuest,
  HKLot,
  HKBill,
  ChargePosting,
  AuditLog,
  DayCloseConfig,
  DateClosureRecord
} from '../types';

export const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Elena Vance', role: 'manager', pin: '9999', badgeId: 'MGR-01' },
  { id: 'usr-2', name: 'Marcus Sterling', role: 'supervisor', pin: '5555', badgeId: 'SUP-04' },
  { id: 'usr-3', name: 'Priya Sharma', role: 'operator', pin: '1111', badgeId: 'OP-12' },
  { id: 'usr-4', name: 'David Chen', role: 'operator', pin: '2222', badgeId: 'OP-15' },
];

export const INITIAL_ITEM_GROUPS: ItemGroup[] = [
  { code: 'GRP_LAUNDRY', name: 'Laundry & Dry Clean', description: 'Guest garment cleaning, pressing & dry cleaning', icon: 'Shirt', active: true },
  { code: 'GRP_LINEN', name: 'Linen & Bedding', description: 'Bed sheets, duvet covers, pillowcases, bathrobes', icon: 'BedDouble', active: true },
  { code: 'GRP_AMENITIES', name: 'Guest Supplies & Amenities', description: 'Dental kits, premium shaving sets, slippers, extra water', icon: 'Sparkles', active: true },
  { code: 'GRP_MINIBAR', name: 'Minibar & Refreshments', description: 'Artisanal snacks, beverages, chocolates, sparkling water', icon: 'GlassWater', active: true },
  { code: 'GRP_EXTRAS', name: 'Extra Bed & Furniture', description: 'Rollaway beds, baby cribs, orthopaedic mattresses', icon: 'Bed', active: true },
  { code: 'GRP_SERVICES', name: 'Special HK Services', description: 'Deep carpet sanitization, emergency stain removal, urgent valet', icon: 'Clock', active: true },
];

export const INITIAL_ITEMS: ItemMaster[] = [
  // Laundry
  { code: 'HK_LND_01', name: 'Gents Shirt / Blouse (Wash & Press)', groupCode: 'GRP_LAUNDRY', rate: 180, taxPercent: 12, unit: 'Pcs', active: true, category: 'Laundry', barcode: '8901001' },
  { code: 'HK_LND_02', name: 'Trousers / Jeans (Dry Clean)', groupCode: 'GRP_LAUNDRY', rate: 250, taxPercent: 12, unit: 'Pcs', active: true, category: 'Laundry', barcode: '8901002' },
  { code: 'HK_LND_03', name: '2-Piece Suit (Premium Dry Clean)', groupCode: 'GRP_LAUNDRY', rate: 650, taxPercent: 18, unit: 'Set', active: true, category: 'Laundry', barcode: '8901003' },
  { code: 'HK_LND_04', name: 'Silk Saree / Evening Gown (Delicate)', groupCode: 'GRP_LAUNDRY', rate: 750, taxPercent: 18, unit: 'Pcs', active: true, category: 'Laundry', barcode: '8901004' },
  { code: 'HK_LND_05', name: 'Express 4-Hour Valet Pressing', groupCode: 'GRP_LAUNDRY', rate: 300, taxPercent: 18, unit: 'Pcs', active: true, category: 'Laundry', barcode: '8901005' },

  // Linen
  { code: 'HK_LIN_01', name: 'Egyptian Cotton Bath Towel (Replacement)', groupCode: 'GRP_LINEN', rate: 450, taxPercent: 12, unit: 'Pcs', active: true, category: 'Linen', barcode: '8902001' },
  { code: 'HK_LIN_02', name: 'Plush Microfiber Bathrobe', groupCode: 'GRP_LINEN', rate: 1200, taxPercent: 12, unit: 'Pcs', active: true, category: 'Linen', barcode: '8902002' },
  { code: 'HK_LIN_03', name: 'King Feather Pillow & Cover (Extra)', groupCode: 'GRP_LINEN', rate: 350, taxPercent: 12, unit: 'Pcs', active: true, category: 'Linen', barcode: '8902003' },
  { code: 'HK_LIN_04', name: 'Velvet Bed Runner (Replacement)', groupCode: 'GRP_LINEN', rate: 850, taxPercent: 12, unit: 'Pcs', active: true, category: 'Linen', barcode: '8902004' },

  // Amenities
  { code: 'HK_AMN_01', name: 'Executive Dental & Shaving Kit', groupCode: 'GRP_AMENITIES', rate: 120, taxPercent: 5, unit: 'Set', active: true, category: 'Amenities', barcode: '8903001' },
  { code: 'HK_AMN_02', name: 'Aromatherapy Bath Salt & Spa Set', groupCode: 'GRP_AMENITIES', rate: 400, taxPercent: 18, unit: 'Set', active: true, category: 'Amenities', barcode: '8903002' },
  { code: 'HK_AMN_03', name: 'Eco Waffle Slippers (Pair)', groupCode: 'GRP_AMENITIES', rate: 150, taxPercent: 5, unit: 'Pair', active: true, category: 'Amenities', barcode: '8903003' },
  { code: 'HK_AMN_04', name: 'Premium Natural Spring Water 1L (Pack of 2)', groupCode: 'GRP_AMENITIES', rate: 180, taxPercent: 5, unit: 'Pack', active: true, category: 'Amenities', barcode: '8903004' },

  // Minibar
  { code: 'HK_MNB_01', name: 'Imported Roasted Macadamia Nuts (80g)', groupCode: 'GRP_MINIBAR', rate: 320, taxPercent: 18, unit: 'Can', active: true, category: 'Minibar', barcode: '8904001' },
  { code: 'HK_MNB_02', name: 'Swiss Dark Truffles Box (100g)', groupCode: 'GRP_MINIBAR', rate: 450, taxPercent: 18, unit: 'Box', active: true, category: 'Minibar', barcode: '8904002' },
  { code: 'HK_MNB_03', name: 'Perrier Sparkling Water (330ml)', groupCode: 'GRP_MINIBAR', rate: 220, taxPercent: 18, unit: 'Btl', active: true, category: 'Minibar', barcode: '8904003' },
  { code: 'HK_MNB_04', name: 'Craft IPA Brewed Beer (330ml)', groupCode: 'GRP_MINIBAR', rate: 380, taxPercent: 18, unit: 'Btl', active: true, category: 'Minibar', barcode: '8904004' },

  // Extra Bed & Services
  { code: 'HK_EXT_01', name: 'Rollaway Premium Spring Bed (Per Night)', groupCode: 'GRP_EXTRAS', rate: 1500, taxPercent: 12, unit: 'Night', active: true, category: 'Extra Bed', barcode: '8905001' },
  { code: 'HK_EXT_02', name: 'Safety Wooden Baby Crib / Cot', groupCode: 'GRP_EXTRAS', rate: 600, taxPercent: 12, unit: 'Night', active: true, category: 'Extra Bed', barcode: '8905002' },
  { code: 'HK_SRV_01', name: 'Emergency Deep Carpet Stain Sanitization', groupCode: 'GRP_SERVICES', rate: 1800, taxPercent: 18, unit: 'Job', active: true, category: 'Services', barcode: '8906001' },
  { code: 'HK_SRV_02', name: 'Room Air Ozone Purification Treatment', groupCode: 'GRP_SERVICES', rate: 950, taxPercent: 18, unit: 'Job', active: true, category: 'Services', barcode: '8906002' },
];

export const INITIAL_CHARGE_HEADS: ChargeHead[] = [
  { code: 'CH_EXTRA_BED', name: 'Extra Rollaway Bed (Adult)', defaultRate: 1500, taxPercent: 12, category: 'extra_bed', active: true, description: 'Single rollaway bed setup with full linen and pillows' },
  { code: 'CH_BABY_COT', name: 'Baby Cot / Bassinet (Child)', defaultRate: 600, taxPercent: 12, category: 'extra_bed', active: true, description: 'Child wooden crib with sanitised infant bedding' },
  { code: 'CH_EXTRA_MATTRESS', name: 'Orthopaedic Extra Floor Mattress', defaultRate: 900, taxPercent: 12, category: 'extra_bed', active: true, description: 'Floor bedding setup with quilt and linens' },
  { code: 'CH_LINEN_DAMAGE', name: 'Linen Damage / Burn / Irremovable Stain', defaultRate: 850, taxPercent: 18, category: 'damage', active: true, description: 'Guest liability charge for permanently soiled/burned sheets/towels' },
  { code: 'CH_GLASS_BREAKAGE', name: 'Crystal / Mirror / Glassware Breakage', defaultRate: 600, taxPercent: 18, category: 'damage', active: true, description: 'Accidental breakage of in-room glass panels or barware' },
  { code: 'CH_SMOKING_PENALTY', name: 'Non-Smoking Room Deep Clean Surcharge', defaultRate: 3500, taxPercent: 18, category: 'damage', active: true, description: 'Restoration & ionizer purification for smoking violation' },
  { code: 'CH_MINIBAR_RESTOCK', name: 'Minibar Consumption Batch Posting', defaultRate: 500, taxPercent: 18, category: 'misc', active: true, description: 'Direct posting of audited minibar consumables' },
  { code: 'CH_SPECIAL_CLEAN', name: 'Pet / Chemical Deep Sanitation Charge', defaultRate: 2200, taxPercent: 18, category: 'misc', active: true, description: 'Extensive sanitization protocol after room checkout' },
];

export const INITIAL_IN_HOUSE_GUESTS: InHouseGuest[] = [
  { roomNumber: '102', guestName: 'Sir Arthur Sterling', folioNumber: 'FOL-88401', checkInDate: '2026-10-02', checkOutDate: '2026-10-08', status: 'checked_in', balance: 14500, phone: '+1 555-0192', vipStatus: 'VIP', adults: 2, children: 1 },
  { roomNumber: '205', guestName: 'Sophia Loren Martinez', folioNumber: 'FOL-88402', checkInDate: '2026-10-03', checkOutDate: '2026-10-07', status: 'checked_in', balance: 6200, phone: '+1 555-0144', vipStatus: 'Gold', adults: 1, children: 0 },
  { roomNumber: '304', guestName: 'Dr. Hiroshi Tanaka', folioNumber: 'FOL-88403', checkInDate: '2026-10-04', checkOutDate: '2026-10-09', status: 'checked_in', balance: 3100, phone: '+81 90-1234-5678', vipStatus: 'Silver', adults: 2, children: 0 },
  { roomNumber: '401', guestName: 'Ambassador Olivia Vance', folioNumber: 'FOL-88404', checkInDate: '2026-10-01', checkOutDate: '2026-10-10', status: 'checked_in', balance: 28900, phone: '+44 20 7946 0912', vipStatus: 'VIP', adults: 2, children: 2 },
  { roomNumber: '408', guestName: 'Liam O\'Connor', folioNumber: 'FOL-88405', checkInDate: '2026-10-05', checkOutDate: '2026-10-06', status: 'checked_in', balance: 1200, phone: '+353 1 496 0000', vipStatus: 'Standard', adults: 1, children: 0 },
  { roomNumber: '510', guestName: 'Aarav Patel & Family', folioNumber: 'FOL-88406', checkInDate: '2026-10-04', checkOutDate: '2026-10-11', status: 'checked_in', balance: 9400, phone: '+91 98765 43210', vipStatus: 'Gold', adults: 2, children: 1 },
];

export const INITIAL_LOTS: HKLot[] = [
  {
    lotNumber: 'LOT-2026-001',
    lotDate: '2026-10-05',
    title: 'Morning Executive Suite Laundry Batch',
    batchType: 'Guest Laundry',
    status: 'OPEN',
    createdBy: 'Marcus Sterling',
    remarks: 'Express guest laundry turnaround for 4th floor VIP suites',
    roomNumber: '401',
    guestName: 'Ambassador Olivia Vance',
    items: [
      { id: 'li-1', itemCode: 'HK_LND_01', itemName: 'Gents Shirt / Blouse (Wash & Press)', groupCode: 'GRP_LAUNDRY', rate: 180, taxPercent: 12, quantity: 4, roomNumber: '401', notes: 'Light starch' },
      { id: 'li-2', itemCode: 'HK_LND_03', itemName: '2-Piece Suit (Premium Dry Clean)', groupCode: 'GRP_LAUNDRY', rate: 650, taxPercent: 18, quantity: 1, roomNumber: '401', notes: 'Navy wool jacket' },
      { id: 'li-3', itemCode: 'HK_LND_05', itemName: 'Express 4-Hour Valet Pressing', groupCode: 'GRP_LAUNDRY', rate: 300, taxPercent: 18, quantity: 2, roomNumber: '401', notes: 'Before 2 PM meeting' },
    ]
  },
  {
    lotNumber: 'LOT-2026-002',
    lotDate: '2026-10-04',
    title: 'Floor 2 Linen Refresh & Replenishment',
    batchType: 'Linen',
    status: 'BILLED',
    billedNumber: 'HK-2026-0002',
    billedDate: '2026-10-04',
    createdBy: 'Marcus Sterling',
    remarks: 'Billed to Room 205 requested extra linen kit',
    roomNumber: '205',
    guestName: 'Sophia Loren Martinez',
    items: [
      { id: 'li-4', itemCode: 'HK_LIN_01', itemName: 'Egyptian Cotton Bath Towel (Replacement)', groupCode: 'GRP_LINEN', rate: 450, taxPercent: 12, quantity: 2, roomNumber: '205', notes: 'Extra plush' },
      { id: 'li-5', itemCode: 'HK_LIN_02', itemName: 'Plush Microfiber Bathrobe', groupCode: 'GRP_LINEN', rate: 1200, taxPercent: 12, quantity: 1, roomNumber: '205', notes: 'Gift souvenir bathrobe' },
    ]
  }
];

export const INITIAL_BILLS: HKBill[] = [
  {
    billNumber: 'HK-2026-0001',
    billDate: '2026-10-05',
    billType: 'QUICK',
    customerType: 'GUEST',
    roomNumber: '102',
    guestName: 'Sir Arthur Sterling',
    folioNumber: 'FOL-88401',
    customerPhone: '+1 555-0192',
    createdBy: 'Priya Sharma',
    grossAmount: 970,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 147.6,
    netAmount: 1117.6,
    status: 'SETTLED',
    settlementModes: [
      { mode: 'ROOM_TRANSFER', amount: 1117.6, roomNumber: '102', folioNumber: 'FOL-88401' }
    ],
    settledAt: '2026-10-05 09:30',
    settledBy: 'Priya Sharma',
    items: [
      { id: 'bi-1', itemCode: 'HK_AMN_01', itemName: 'Executive Dental & Shaving Kit', groupCode: 'GRP_AMENITIES', rate: 120, taxPercent: 5, quantity: 2, amount: 240, taxAmount: 12, netAmount: 252 },
      { id: 'bi-2', itemCode: 'HK_MNB_01', itemName: 'Imported Roasted Macadamia Nuts (80g)', groupCode: 'GRP_MINIBAR', rate: 320, taxPercent: 18, quantity: 1, amount: 320, taxAmount: 57.6, netAmount: 377.6 },
      { id: 'bi-3', itemCode: 'HK_MNB_04', itemName: 'Craft IPA Brewed Beer (330ml)', groupCode: 'GRP_MINIBAR', rate: 380, taxPercent: 18, quantity: 1, amount: 380, taxAmount: 68.4, netAmount: 448.4 },
    ]
  },
  {
    billNumber: 'HK-2026-0002',
    billDate: '2026-10-04',
    billType: 'LOT_BASED',
    lotNumber: 'LOT-2026-002',
    customerType: 'GUEST',
    roomNumber: '205',
    guestName: 'Sophia Loren Martinez',
    folioNumber: 'FOL-88402',
    createdBy: 'Marcus Sterling',
    grossAmount: 2100,
    discountPercent: 10,
    discountAmount: 210,
    discountReason: 'VIP Gold Member Courtesy Discount',
    taxAmount: 226.8,
    netAmount: 2116.8,
    status: 'SETTLED',
    settlementModes: [
      { mode: 'CARD', amount: 2116.8, referenceNo: 'TXN-VISA-99481' }
    ],
    settledAt: '2026-10-04 16:45',
    settledBy: 'Elena Vance',
    items: [
      { id: 'bi-4', itemCode: 'HK_LIN_01', itemName: 'Egyptian Cotton Bath Towel (Replacement)', groupCode: 'GRP_LINEN', rate: 450, taxPercent: 12, quantity: 2, amount: 900, taxAmount: 108, netAmount: 1008 },
      { id: 'bi-5', itemCode: 'HK_LIN_02', itemName: 'Plush Microfiber Bathrobe', groupCode: 'GRP_LINEN', rate: 1200, taxPercent: 12, quantity: 1, amount: 1200, taxAmount: 144, netAmount: 1344 },
    ]
  },
  {
    billNumber: 'HK-2026-0003',
    billDate: '2026-10-05',
    billType: 'REGULAR',
    customerType: 'WALKIN',
    guestName: 'Valet Client - Jonathan Hayes',
    customerPhone: '+1 555-0811',
    createdBy: 'David Chen',
    grossAmount: 1000,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 156,
    netAmount: 1156,
    status: 'UNSETTLED',
    items: [
      { id: 'bi-6', itemCode: 'HK_LND_03', itemName: '2-Piece Suit (Premium Dry Clean)', groupCode: 'GRP_LAUNDRY', rate: 650, taxPercent: 18, quantity: 1, amount: 650, taxAmount: 117, netAmount: 767 },
      { id: 'bi-7', itemCode: 'HK_LND_02', itemName: 'Trousers / Jeans (Dry Clean)', groupCode: 'GRP_LAUNDRY', rate: 250, taxPercent: 12, quantity: 1, amount: 250, taxAmount: 30, netAmount: 280 },
      { id: 'bi-8', itemCode: 'HK_AMN_03', itemName: 'Eco Waffle Slippers (Pair)', groupCode: 'GRP_AMENITIES', rate: 150, taxPercent: 5, quantity: 1, amount: 150, taxAmount: 7.5, netAmount: 157.5 },
    ]
  },
  {
    billNumber: 'HK-2026-0004',
    billDate: '2026-10-03',
    billType: 'QUICK',
    customerType: 'WALKIN',
    guestName: 'Conference Organizer - Tech Summit',
    createdBy: 'Priya Sharma',
    grossAmount: 3600,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 648,
    netAmount: 4248,
    status: 'CANCELLED',
    cancelledAt: '2026-10-03 14:10',
    cancelledBy: 'Elena Vance',
    cancelReason: 'Client requested single master invoice under Banquet department instead',
    items: [
      { id: 'bi-9', itemCode: 'HK_SRV_01', itemName: 'Emergency Deep Carpet Stain Sanitization', groupCode: 'GRP_SERVICES', rate: 1800, taxPercent: 18, quantity: 2, amount: 3600, taxAmount: 648, netAmount: 4248 },
    ]
  }
];

export const INITIAL_CHARGE_POSTINGS: ChargePosting[] = [
  {
    postingNumber: 'POST-2026-0001',
    postingDate: '2026-10-04',
    chargeType: 'EXTRA_BED',
    roomNumber: '401',
    guestName: 'Ambassador Olivia Vance',
    folioNumber: 'FOL-88404',
    chargeHeadCode: 'CH_EXTRA_BED',
    chargeHeadName: 'Extra Rollaway Bed (Adult)',
    quantity: 2,
    rate: 1500,
    amount: 3000,
    taxPercent: 12,
    taxAmount: 360,
    netAmount: 3360,
    remarks: 'Extra rollaway bed for 2 nights in master suite bedroom',
    postedBy: 'Marcus Sterling',
    status: 'POSTED'
  },
  {
    postingNumber: 'POST-2026-0002',
    postingDate: '2026-10-05',
    chargeType: 'EXTRA_BED',
    roomNumber: '510',
    guestName: 'Aarav Patel & Family',
    folioNumber: 'FOL-88406',
    chargeHeadCode: 'CH_BABY_COT',
    chargeHeadName: 'Baby Cot / Bassinet (Child)',
    quantity: 1,
    rate: 600,
    amount: 600,
    taxPercent: 12,
    taxAmount: 72,
    netAmount: 672,
    remarks: 'Sanitised infant wooden cot with organic cotton quilt',
    postedBy: 'Priya Sharma',
    status: 'POSTED'
  },
  {
    postingNumber: 'POST-2026-0003',
    postingDate: '2026-10-05',
    chargeType: 'MISC_CHARGE',
    roomNumber: '304',
    guestName: 'Dr. Hiroshi Tanaka',
    folioNumber: 'FOL-88403',
    chargeHeadCode: 'CH_LINEN_DAMAGE',
    chargeHeadName: 'Linen Damage / Burn / Irremovable Stain',
    quantity: 1,
    rate: 850,
    amount: 850,
    taxPercent: 18,
    taxAmount: 153,
    netAmount: 1003,
    remarks: 'Severe ink spill on master duvet cover noted during afternoon cleaning',
    postedBy: 'Marcus Sterling',
    status: 'POSTED'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', action: 'CREATE_BILL', entityType: 'BILL', entityId: 'HK-2026-0001', details: 'Quick bill generated for Room 102 (Amount: 1117.60)', user: 'Priya Sharma', role: 'operator', timestamp: '2026-10-05 09:28' },
  { id: 'aud-2', action: 'SETTLE_BILL', entityType: 'SETTLEMENT', entityId: 'HK-2026-0001', details: 'Settled via ROOM_TRANSFER to Folio FOL-88401', user: 'Priya Sharma', role: 'operator', timestamp: '2026-10-05 09:30' },
  { id: 'aud-3', action: 'POST_EXTRA_BED', entityType: 'CHARGE', entityId: 'POST-2026-0001', details: 'Posted 2 nights Extra Rollaway Bed to Room 401', user: 'Marcus Sterling', role: 'supervisor', timestamp: '2026-10-04 11:15' },
  { id: 'aud-4', action: 'CANCEL_BILL', entityType: 'BILL', entityId: 'HK-2026-0004', details: 'Bill cancelled: Re-invoiced via Banquets', user: 'Elena Vance', role: 'manager', timestamp: '2026-10-03 14:10' },
];

export const INITIAL_DAY_CLOSE: DayCloseConfig = {
  isDayClosed: false,
  businessDate: '2026-10-05',
};

export const INITIAL_CLOSURE_HISTORY: DateClosureRecord[] = [
  {
    closureId: 'AUD-CLOSE-20261004',
    closedDate: '2026-10-04',
    nextDate: '2026-10-05',
    closedAt: '2026-10-04 23:55',
    closedBy: 'Elena Vance',
    closedRole: 'manager',
    totalBills: 2,
    grossAmount: 5700,
    discountAmount: 210,
    taxAmount: 874.8,
    netRevenue: 6364.8,
    cashCollected: 0,
    cardCollected: 2116.8,
    upiCollected: 0,
    roomTransferTotal: 3360,
    creditTotal: 0,
    extraBedRevenue: 3360,
    miscChargesRevenue: 0,
    validationSummary: {
      unsettledBillsCount: 0,
      unsettledBillsTotal: 0,
      openLotsCount: 0,
      warningsCount: 0,
      passed: true,
      notes: ['All bills settled before midnight audit', 'No open lots remaining']
    },
    managerRemarks: 'Regular day close completed smoothly. All batch lots billed and accounts audited.',
    status: 'CLOSED'
  }
];
