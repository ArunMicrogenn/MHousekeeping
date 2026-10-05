import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Calendar,
  Filter,
  Eye,
  Building,
  CreditCard,
  Ban,
  Boxes,
  Tag,
  PieChart,
  ListOrdered,
  FileText
} from 'lucide-react';
import {
  getBills,
  getLots,
  getChargePostings,
  getItems,
  getItemGroups,
  getDayCloseConfig
} from '../../services/storage';
import { HKBill, HKLot, ChargePosting } from '../../types';
import { formatCurrency, formatDate, exportToExcel, exportToCsv } from '../../utils/exportUtils';
import { InvoiceModal } from '../InvoiceModal';
import { ChargeSlipModal } from '../ChargeSlipModal';

type ReportType =
  | 'BILL_SUMMARY'
  | 'BILLS_LIST'
  | 'BILLS_CANCELED'
  | 'ITEM_WISE'
  | 'ITEM_GROUPWISE'
  | 'CHARGE_POSTINGS'
  | 'LOT_BILL_WISE';

export const ReportsScreen: React.FC = () => {
  const dayClose = getDayCloseConfig();
  const allBills = getBills();
  const allLots = getLots();
  const allPostings = getChargePostings();
  const allItems = getItems();
  const allGroups = getItemGroups();

  const [activeReport, setActiveReport] = useState<ReportType>('BILL_SUMMARY');
  const [dateFilterPreset, setDateFilterPreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-05');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modals
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<HKBill | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [selectedPostingForSlip, setSelectedPostingForSlip] = useState<ChargePosting | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);

  // Helper date filter matcher
  const isDateInRange = (dateStr: string | undefined): boolean => {
    if (!dateStr) return true;
    const itemDate = dateStr.substring(0, 10);
    if (dateFilterPreset === 'ALL') return true;
    if (dateFilterPreset === 'TODAY') return itemDate === dayClose.businessDate;
    if (dateFilterPreset === 'YESTERDAY') return itemDate === '2026-10-04';
    if (dateFilterPreset === 'THIS_WEEK') return itemDate >= '2026-09-29' && itemDate <= '2026-10-05';
    if (dateFilterPreset === 'THIS_MONTH') return itemDate >= '2026-10-01' && itemDate <= '2026-10-31';
    if (dateFilterPreset === 'CUSTOM') return itemDate >= startDate && itemDate <= endDate;
    return true;
  };

  // 1. Filtered Bills (Exclude cancelled for sales summary, include for registers)
  const nonCancelledBills = useMemo(() => {
    return allBills.filter(b => b.status !== 'CANCELLED' && isDateInRange(b.billDate));
  }, [allBills, dateFilterPreset, startDate, endDate]);

  const allFilteredBills = useMemo(() => {
    return allBills.filter(b => isDateInRange(b.billDate) && (
      !searchFilter ||
      b.billNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (b.guestName && b.guestName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (b.roomNumber && b.roomNumber.includes(searchFilter))
    ));
  }, [allBills, dateFilterPreset, startDate, endDate, searchFilter]);

  // 2. Cancelled Bills Report Data
  const cancelledBills = useMemo(() => {
    return allBills.filter(b => b.status === 'CANCELLED' && isDateInRange(b.cancelledAt || b.billDate));
  }, [allBills, dateFilterPreset, startDate, endDate]);

  // 3. Item-wise Aggregation
  const itemWiseData = useMemo(() => {
    const map: Record<string, { code: string; name: string; groupCode: string; qty: number; gross: number; tax: number; net: number }> = {};
    
    nonCancelledBills.forEach(b => {
      b.items.forEach(item => {
        if (!map[item.itemCode]) {
          map[item.itemCode] = {
            code: item.itemCode,
            name: item.itemName,
            groupCode: item.groupCode,
            qty: 0,
            gross: 0,
            tax: 0,
            net: 0
          };
        }
        map[item.itemCode].qty += item.quantity;
        map[item.itemCode].gross += item.amount;
        map[item.itemCode].tax += item.taxAmount;
        map[item.itemCode].net += item.netAmount;
      });
    });

    return Object.values(map).filter(i =>
      !searchFilter ||
      i.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.code.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [nonCancelledBills, searchFilter]);

  // 4. Group-wise Aggregation
  const groupWiseData = useMemo(() => {
    const map: Record<string, { groupCode: string; name: string; count: number; qty: number; gross: number; tax: number; net: number }> = {};

    allGroups.forEach(g => {
      map[g.code] = { groupCode: g.code, name: g.name, count: 0, qty: 0, gross: 0, tax: 0, net: 0 };
    });

    nonCancelledBills.forEach(b => {
      b.items.forEach(item => {
        if (!map[item.groupCode]) {
          map[item.groupCode] = { groupCode: item.groupCode, name: item.groupCode, count: 0, qty: 0, gross: 0, tax: 0, net: 0 };
        }
        map[item.groupCode].count += 1;
        map[item.groupCode].qty += item.quantity;
        map[item.groupCode].gross += item.amount;
        map[item.groupCode].tax += item.taxAmount;
        map[item.groupCode].net += item.netAmount;
      });
    });

    const list = Object.values(map).filter(g => g.net > 0 || !searchFilter);
    return list;
  }, [allGroups, nonCancelledBills, searchFilter]);

  // 5. Charge Postings Report Data
  const filteredPostings = useMemo(() => {
    return allPostings.filter(p => isDateInRange(p.postingDate) && (
      !searchFilter ||
      p.postingNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.roomNumber.includes(searchFilter) ||
      p.guestName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.chargeHeadName.toLowerCase().includes(searchFilter.toLowerCase())
    ));
  }, [allPostings, dateFilterPreset, startDate, endDate, searchFilter]);

  // 6. Lot Bill-wise Details Data
  const lotBillWiseData = useMemo(() => {
    return allLots.filter(l => isDateInRange(l.lotDate) && (
      !searchFilter ||
      l.lotNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (l.billedNumber && l.billedNumber.toLowerCase().includes(searchFilter.toLowerCase()))
    ));
  }, [allLots, dateFilterPreset, startDate, endDate, searchFilter]);

  // Summary Totals
  const summaryTotals = useMemo(() => {
    const totalBills = nonCancelledBills.length;
    const gross = nonCancelledBills.reduce((acc, b) => acc + b.grossAmount, 0);
    const discount = nonCancelledBills.reduce((acc, b) => acc + b.discountAmount, 0);
    const tax = nonCancelledBills.reduce((acc, b) => acc + b.taxAmount, 0);
    const net = nonCancelledBills.reduce((acc, b) => acc + b.netAmount, 0);

    // Payment Mode Breakdowns
    const modeTotals: Record<string, number> = {
      CASH: 0,
      CARD: 0,
      UPI: 0,
      ROOM_TRANSFER: 0,
      CREDIT: 0
    };

    nonCancelledBills.forEach(b => {
      if (b.status === 'SETTLED' && b.settlementModes) {
        b.settlementModes.forEach(s => {
          modeTotals[s.mode] = (modeTotals[s.mode] || 0) + Number(s.amount);
        });
      }
    });

    return { totalBills, gross, discount, tax, net, modeTotals };
  }, [nonCancelledBills]);

  // Export handlers
  const handleExportExcel = () => {
    if (activeReport === 'BILL_SUMMARY') {
      const rows = [
        { Metric: 'Total Active Bills', Value: summaryTotals.totalBills },
        { Metric: 'Total Gross Subtotal', Value: summaryTotals.gross },
        { Metric: 'Total Discounts Given', Value: summaryTotals.discount },
        { Metric: 'Total Tax Collected (GST)', Value: summaryTotals.tax },
        { Metric: 'Total Net Revenue', Value: summaryTotals.net },
        { Metric: 'Cash Collected', Value: summaryTotals.modeTotals.CASH },
        { Metric: 'Card Settled', Value: summaryTotals.modeTotals.CARD },
        { Metric: 'UPI Settled', Value: summaryTotals.modeTotals.UPI },
        { Metric: 'Room Folio Transfers', Value: summaryTotals.modeTotals.ROOM_TRANSFER },
        { Metric: 'Corporate Credit', Value: summaryTotals.modeTotals.CREDIT },
      ];
      exportToExcel(rows, 'HK_Bill_Summary_Report', 'Summary');
    } else if (activeReport === 'BILLS_LIST') {
      const rows = allFilteredBills.map(b => ({
        'Bill No': b.billNumber,
        'Date': b.billDate,
        'Type': b.billType,
        'Guest / Client': b.guestName,
        'Room': b.roomNumber || 'Walk-in',
        'Gross': b.grossAmount,
        'Discount': b.discountAmount,
        'Tax': b.taxAmount,
        'Net Total': b.netAmount,
        'Status': b.status,
        'Cashier': b.createdBy,
        'Settled By': b.settledBy || ''
      }));
      exportToExcel(rows, 'HK_Bills_Register_Report', 'Bills');
    } else if (activeReport === 'BILLS_CANCELED') {
      const rows = cancelledBills.map(b => ({
        'Bill No': b.billNumber,
        'Bill Date': b.billDate,
        'Net Amount': b.netAmount,
        'Cancelled At': b.cancelledAt || '',
        'Cancelled By': b.cancelledBy || '',
        'Reason': b.cancelReason || ''
      }));
      exportToExcel(rows, 'HK_Cancelled_Bills_Report', 'Cancelled');
    } else if (activeReport === 'ITEM_WISE') {
      const rows = itemWiseData.map(i => ({
        'Item Code': i.code,
        'Item Name': i.name,
        'Group': i.groupCode,
        'Total Qty': i.qty,
        'Gross Sales': i.gross,
        'Tax Amount': i.tax,
        'Net Sales': i.net
      }));
      exportToExcel(rows, 'HK_Item_Wise_Sales_Report', 'ItemWise');
    } else if (activeReport === 'ITEM_GROUPWISE') {
      const rows = groupWiseData.map(g => ({
        'Group Code': g.groupCode,
        'Group Name': g.name,
        'Total Qty': g.qty,
        'Gross Sales': g.gross,
        'Tax Amount': g.tax,
        'Net Revenue': g.net
      }));
      exportToExcel(rows, 'HK_Group_Wise_Sales_Report', 'GroupWise');
    } else if (activeReport === 'CHARGE_POSTINGS') {
      const rows = filteredPostings.map(p => ({
        'Posting No': p.postingNumber,
        'Date': p.postingDate,
        'Type': p.chargeType,
        'Room No': p.roomNumber,
        'Guest Name': p.guestName,
        'Charge Head': p.chargeHeadName,
        'Qty': p.quantity,
        'Rate': p.rate,
        'Amount': p.amount,
        'Tax': p.taxAmount,
        'Net Total': p.netAmount,
        'Status': p.status,
        'Posted By': p.postedBy,
        'Resettled': p.isResettled ? 'Yes' : 'No'
      }));
      exportToExcel(rows, 'HK_Charge_Postings_Report', 'Postings');
    } else if (activeReport === 'LOT_BILL_WISE') {
      const rows = lotBillWiseData.map(l => ({
        'Lot No': l.lotNumber,
        'Date': l.lotDate,
        'Title': l.title,
        'Category': l.batchType,
        'Target Room': l.roomNumber || 'Internal',
        'Items Count': l.items.length,
        'Status': l.status,
        'Linked Bill No': l.billedNumber || 'Unbilled',
        'Created By': l.createdBy
      }));
      exportToExcel(rows, 'HK_Lot_Bill_Wise_Report', 'Lots');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Housekeeping Intelligence & Reports Hub</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                7 Core HK Reports
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit trails, sales analytics, group summaries, room folio postings & lot traceability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* 7 Report Selector Tabs */}
      <div className="no-print flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'BILL_SUMMARY', label: '1. Bill Summary', icon: PieChart },
          { id: 'BILLS_LIST', label: '2. Bills Register', icon: ListOrdered },
          { id: 'BILLS_CANCELED', label: '3. Bills Canceled', icon: Ban },
          { id: 'ITEM_WISE', label: '4. Item wise Sales', icon: Tag },
          { id: 'ITEM_GROUPWISE', label: '5. Item Groupwise', icon: Boxes },
          { id: 'CHARGE_POSTINGS', label: '6. Charge Posting Report', icon: Building },
          { id: 'LOT_BILL_WISE', label: '7. Lot Bill-wise Details', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="no-print bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Preset Date Range Buttons */}
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setDateFilterPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateFilterPreset === preset
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {preset.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs if selected */}
        {dateFilterPreset === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search report records..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* REPORT CONTENT AREA */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 print:bg-white print:text-black print:p-0 print:border-none">
        
        {/* Printable Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight text-white print:text-black">
                GRAND ELYSIUM HOTEL & SUITES – HOUSEKEEPING DEPARTMENT
              </h1>
              <p className="text-xs text-blue-400 print:text-slate-700 font-semibold mt-0.5">
                Report: {activeReport.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-slate-600">
              <p>Period: <strong className="text-slate-200 print:text-black">{dateFilterPreset}</strong></p>
              <p className="text-[11px] font-mono">Generated on: {new Date().toISOString().substring(0, 16).replace('T', ' ')}</p>
            </div>
          </div>
        </div>

        {/* 1. BILL SUMMARY REPORT */}
        {activeReport === 'BILL_SUMMARY' && (
          <div className="space-y-6">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-950 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Active Bills</span>
                <p className="text-2xl font-black font-mono text-white print:text-black mt-1">{summaryTotals.totalBills}</p>
              </div>
              <div className="bg-slate-950 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Gross Subtotal</span>
                <p className="text-xl font-bold font-mono text-slate-300 print:text-black mt-1">{formatCurrency(summaryTotals.gross)}</p>
              </div>
              <div className="bg-slate-950 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Discounts Given</span>
                <p className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-700 mt-1">-{formatCurrency(summaryTotals.discount)}</p>
              </div>
              <div className="bg-slate-950 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Taxes Collected (GST)</span>
                <p className="text-xl font-bold font-mono text-slate-300 print:text-black mt-1">{formatCurrency(summaryTotals.tax)}</p>
              </div>
              <div className="bg-slate-950 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800 print:border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-blue-400 print:text-blue-700">Net Revenue</span>
                <p className="text-2xl font-black font-mono text-blue-400 print:text-black mt-1">{formatCurrency(summaryTotals.net)}</p>
              </div>
            </div>

            {/* Payment Mode Collection Breakdown */}
            <div className="bg-slate-950 print:bg-slate-50 p-5 rounded-xl border border-slate-800 print:border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Settlement & Payment Mode Realization
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-[11px] text-slate-400 print:text-slate-600 block">💵 Cash Desk</span>
                  <span className="text-base font-bold font-mono text-white print:text-black mt-1 block">
                    {formatCurrency(summaryTotals.modeTotals.CASH)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-[11px] text-slate-400 print:text-slate-600 block">💳 EDC Card Swipe</span>
                  <span className="text-base font-bold font-mono text-white print:text-black mt-1 block">
                    {formatCurrency(summaryTotals.modeTotals.CARD)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-[11px] text-slate-400 print:text-slate-600 block">📱 UPI / QR Pay</span>
                  <span className="text-base font-bold font-mono text-white print:text-black mt-1 block">
                    {formatCurrency(summaryTotals.modeTotals.UPI)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-[11px] text-slate-400 print:text-slate-600 block">🏨 Room Folio Post</span>
                  <span className="text-base font-bold font-mono text-amber-400 print:text-black mt-1 block">
                    {formatCurrency(summaryTotals.modeTotals.ROOM_TRANSFER)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 print:bg-white border border-slate-800 print:border-slate-300">
                  <span className="text-[11px] text-slate-400 print:text-slate-600 block">🏢 Corporate Credit</span>
                  <span className="text-base font-bold font-mono text-white print:text-black mt-1 block">
                    {formatCurrency(summaryTotals.modeTotals.CREDIT)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. BILLS REGISTER REPORT */}
        {activeReport === 'BILLS_LIST' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Guest / Room</th>
                  <th className="py-2.5 px-3 text-right">Gross</th>
                  <th className="py-2.5 px-3 text-right">Disc</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Net</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {allFilteredBills.map(b => (
                  <tr key={b.billNumber} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400 print:text-black">{b.billNumber}</td>
                    <td className="py-2 px-3 text-slate-300 print:text-slate-700">{formatDate(b.billDate)}</td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-200 print:text-black">{b.guestName}</span>
                      {b.roomNumber && <span className="text-[10px] text-amber-400 block font-mono">Room {b.roomNumber}</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300 print:text-black">{formatCurrency(b.grossAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 print:text-emerald-700">{formatCurrency(b.discountAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400 print:text-slate-600">{formatCurrency(b.taxAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white print:text-black">{formatCurrency(b.netAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-400' : b.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center no-print">
                      <button
                        onClick={() => {
                          setSelectedBillForInvoice(b);
                          setIsInvoiceOpen(true);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. BILLS CANCELED REPORT */}
        {activeReport === 'BILLS_CANCELED' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Original Date</th>
                  <th className="py-2.5 px-3 text-right">Net Amount</th>
                  <th className="py-2.5 px-3">Cancel Timestamp</th>
                  <th className="py-2.5 px-3">Authorized By</th>
                  <th className="py-2.5 px-3">Cancellation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {cancelledBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">No cancelled bills in this period.</td>
                  </tr>
                ) : (
                  cancelledBills.map(b => (
                    <tr key={b.billNumber} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-red-400 print:text-black">{b.billNumber}</td>
                      <td className="py-2.5 px-3 text-slate-300 print:text-slate-700">{formatDate(b.billDate)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200 print:text-black">{formatCurrency(b.netAmount)}</td>
                      <td className="py-2.5 px-3 text-slate-300 print:text-slate-700">{formatDate(b.cancelledAt)}</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-300 print:text-black">{b.cancelledBy}</td>
                      <td className="py-2.5 px-3 text-slate-300 print:text-slate-700 italic">{b.cancelReason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. ITEM-WISE SALES REPORT */}
        {activeReport === 'ITEM_WISE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3 text-center">Total Qty</th>
                  <th className="py-2.5 px-3 text-right">Gross Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Tax (GST)</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {itemWiseData.map(i => (
                  <tr key={i.code} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400 print:text-black">{i.code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200 print:text-black">{i.name}</td>
                    <td className="py-2 px-3 text-slate-400 print:text-slate-600">{i.groupCode}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-200 print:text-black">{i.qty}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300 print:text-black">{formatCurrency(i.gross)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400 print:text-slate-600">{formatCurrency(i.tax)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white print:text-black">{formatCurrency(i.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. ITEM GROUPWISE SALES REPORT */}
        {activeReport === 'ITEM_GROUPWISE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Group Code</th>
                  <th className="py-2.5 px-3">Group Name</th>
                  <th className="py-2.5 px-3 text-center">Total Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Gross Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Taxes Collected</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {groupWiseData.map(g => (
                  <tr key={g.groupCode} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 print:text-black">{g.groupCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200 print:text-black">{g.name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200 print:text-black">{g.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300 print:text-black">{formatCurrency(g.gross)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 print:text-slate-600">{formatCurrency(g.tax)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400 print:text-black">{formatCurrency(g.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. CHARGE POSTING REPORT */}
        {activeReport === 'CHARGE_POSTINGS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Posting No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Room & Guest</th>
                  <th className="py-2.5 px-3">Charge Head</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Net Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center no-print">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {filteredPostings.map(p => (
                  <tr key={p.postingNumber} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-purple-400 print:text-black">{p.postingNumber}</td>
                    <td className="py-2 px-3 text-slate-300 print:text-slate-700">{formatDate(p.postingDate)}</td>
                    <td className="py-2 px-3 text-slate-400 print:text-slate-600 uppercase text-[10px]">{p.chargeType}</td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-amber-300 print:text-black">Room {p.roomNumber}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.guestName}</span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200 print:text-black">{p.chargeHeadName}</td>
                    <td className="py-2 px-3 text-center font-mono">{p.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white print:text-black">{formatCurrency(p.netAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center no-print">
                      <button
                        onClick={() => {
                          setSelectedPostingForSlip(p);
                          setIsSlipOpen(true);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. LOT BILL-WISE DETAILS REPORT */}
        {activeReport === 'LOT_BILL_WISE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Lot Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Batch Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Target Room</th>
                  <th className="py-2.5 px-3 text-center">Items (Units)</th>
                  <th className="py-2.5 px-3 text-center">Lot Status</th>
                  <th className="py-2.5 px-3">Linked Bill No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {lotBillWiseData.map(l => (
                  <tr key={l.lotNumber} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 print:text-black">{l.lotNumber}</td>
                    <td className="py-2.5 px-3 text-slate-300 print:text-slate-700">{formatDate(l.lotDate)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200 print:text-black">{l.title}</td>
                    <td className="py-2.5 px-3 text-slate-400 print:text-slate-600">{l.batchType}</td>
                    <td className="py-2.5 px-3 text-amber-300 print:text-black font-mono">
                      {l.roomNumber ? `Room ${l.roomNumber}` : 'Internal'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {l.items.length} items ({l.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'BILLED' ? 'bg-emerald-500/10 text-emerald-400' : l.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200 print:text-black">
                      {l.billedNumber || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Invoices and Slip Modals */}
      <InvoiceModal
        bill={selectedBillForInvoice}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
      <ChargeSlipModal
        posting={selectedPostingForSlip}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
      />
    </div>
  );
};
