import React, { useState } from 'react';
import {
  Database,
  Layers,
  Sparkles,
  Bed,
  Users,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Edit,
  CheckCircle2,
  AlertTriangle,
  History,
  Tag,
  Barcode
} from 'lucide-react';
import {
  getItems,
  saveItem,
  getItemGroups,
  saveItemGroup,
  getChargeHeads,
  saveChargeHead,
  getInHouseGuests,
  getDayCloseConfig,
  toggleDayClose,
  getAuditLogs,
  resetDatabase,
  getCurrentUser
} from '../../services/storage';
import { ItemMaster, ItemGroup, ChargeHead, InHouseGuest } from '../../types';
import { formatCurrency, formatDate } from '../../utils/exportUtils';
import { ManagerAuthModal } from '../ManagerAuthModal';

export const MastersScreen: React.FC = () => {
  const currentUser = getCurrentUser();
  const dayClose = getDayCloseConfig();
  const items = getItems();
  const groups = getItemGroups();
  const chargeHeads = getChargeHeads();
  const inHouseGuests = getInHouseGuests();
  const auditLogs = getAuditLogs();

  const [activeSubTab, setActiveSubTab] = useState<'ITEMS' | 'GROUPS' | 'CHARGE_HEADS' | 'GUESTS' | 'DAY_CLOSE' | 'AUDIT_TRAIL'>('ITEMS');

  // Edit / Add Item Modal State
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [itemForm, setItemForm] = useState<Partial<ItemMaster>>({
    code: '',
    name: '',
    groupCode: groups[0]?.code || 'GRP_LAUNDRY',
    rate: 100,
    taxPercent: 12,
    unit: 'Pcs',
    active: true,
    category: 'Laundry',
    barcode: ''
  });

  // Edit / Add Charge Head Modal State
  const [editingHead, setEditingHead] = useState<ChargeHead | null>(null);
  const [isHeadModalOpen, setIsHeadModalOpen] = useState<boolean>(false);
  const [headForm, setHeadForm] = useState<Partial<ChargeHead>>({
    code: '',
    name: '',
    defaultRate: 500,
    taxPercent: 12,
    category: 'extra_bed',
    active: true,
    description: ''
  });

  // Manager Auth
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authAction, setAuthAction] = useState<string>('');

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      code: `HK_${Date.now().toString().slice(-4)}`,
      name: '',
      groupCode: groups[0]?.code || 'GRP_LAUNDRY',
      rate: 100,
      taxPercent: 12,
      unit: 'Pcs',
      active: true,
      category: 'General',
      barcode: ''
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.code || !itemForm.name) return;

    saveItem({
      code: itemForm.code,
      name: itemForm.name,
      groupCode: itemForm.groupCode || 'GRP_LAUNDRY',
      rate: Number(itemForm.rate) || 0,
      taxPercent: Number(itemForm.taxPercent) || 0,
      unit: itemForm.unit || 'Pcs',
      active: itemForm.active ?? true,
      category: itemForm.category || 'General',
      barcode: itemForm.barcode
    });

    setIsItemModalOpen(false);
  };

  const handleOpenAddHead = () => {
    setEditingHead(null);
    setHeadForm({
      code: `CH_${Date.now().toString().slice(-4)}`,
      name: '',
      defaultRate: 500,
      taxPercent: 12,
      category: 'extra_bed',
      active: true,
      description: ''
    });
    setIsHeadModalOpen(true);
  };

  const handleOpenEditHead = (head: ChargeHead) => {
    setEditingHead(head);
    setHeadForm({ ...head });
    setIsHeadModalOpen(true);
  };

  const handleSaveHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headForm.code || !headForm.name) return;

    saveChargeHead({
      code: headForm.code,
      name: headForm.name,
      defaultRate: Number(headForm.defaultRate) || 0,
      taxPercent: Number(headForm.taxPercent) || 0,
      category: (headForm.category as ChargeHead['category']) || 'misc',
      active: headForm.active ?? true,
      description: headForm.description || ''
    });

    setIsHeadModalOpen(false);
  };

  const handleToggleDayClose = () => {
    if (currentUser.role === 'operator') {
      setAuthAction(dayClose.isDayClosed ? 'REOPEN_DAY' : 'CLOSE_DAY');
      setIsAuthModalOpen(true);
      return;
    }
    toggleDayClose(!dayClose.isDayClosed);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all hotel housekeeping data back to default demo state?')) {
      resetDatabase();
      alert('Database restored to default demo data.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Housekeeping System Masters & Admin</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Setup & Controls
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configure items, groups, charge heads, view in-house guest folios & audit day-close status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo DB
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ITEMS', label: `Item Master (${items.length})`, icon: Tag },
          { id: 'GROUPS', label: `Item Groups (${groups.length})`, icon: Layers },
          { id: 'CHARGE_HEADS', label: `Charge Heads (${chargeHeads.length})`, icon: Bed },
          { id: 'GUESTS', label: `In-House Folios (${inHouseGuests.length})`, icon: Users },
          { id: 'DAY_CLOSE', label: 'Day-Close Status', icon: dayClose.isDayClosed ? Lock : Unlock },
          { id: 'AUDIT_TRAIL', label: `Audit Trail (${auditLogs.length})`, icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: ITEM MASTER */}
      {activeSubTab === 'ITEMS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Item Master Catalog</h3>
              <p className="text-xs text-slate-400">Manage item codes, pricing rates, units and tax percentages</p>
            </div>
            <button
              onClick={handleOpenAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Item Master
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Tax (%)</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map(item => (
                  <tr key={item.code} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-amber-400">{item.code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">{item.name}</td>
                    <td className="py-2 px-3 text-slate-400">{item.groupCode}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">{formatCurrency(item.rate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{item.taxPercent}%</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{item.barcode || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ITEM GROUPS */}
      {activeSubTab === 'GROUPS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Item Group Master</h3>
            <p className="text-xs text-slate-400">Core department categories used for accounting & reporting aggregation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(grp => (
              <div key={grp.code} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-cyan-400">{grp.code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                    Active
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100">{grp.name}</h4>
                <p className="text-xs text-slate-400">{grp.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CHARGE HEADS */}
      {activeSubTab === 'CHARGE_HEADS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Charge Heads Master</h3>
              <p className="text-xs text-slate-400">Heads for extra beds, linen damage, minibar and incident surcharges</p>
            </div>
            <button
              onClick={handleOpenAddHead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Charge Head
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Head Code</th>
                  <th className="py-2.5 px-3">Charge Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Default Rate</th>
                  <th className="py-2.5 px-3 text-right">Tax (%)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {chargeHeads.map(head => (
                  <tr key={head.code} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono font-bold text-rose-400">{head.code}</td>
                    <td className="py-2 px-3">
                      <p className="font-semibold text-slate-200">{head.name}</p>
                      <p className="text-[10px] text-slate-500">{head.description}</p>
                    </td>
                    <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-400">{head.category}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">{formatCurrency(head.defaultRate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{head.taxPercent}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleOpenEditHead(head)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: IN-HOUSE FOLIOS */}
      {activeSubTab === 'GUESTS' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live In-House Guest Folios</h3>
            <p className="text-xs text-slate-400">Checked-in hotel guests with active folios and live ledger balances</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inHouseGuests.map(g => (
              <div key={g.roomNumber} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-black text-amber-400">Room {g.roomNumber}</span>
                    <h4 className="text-sm font-bold text-slate-100 mt-0.5">{g.guestName}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {g.vipStatus || 'Standard'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Folio Number:</span>
                    <span className="font-mono text-slate-200 font-bold">{g.folioNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stay Period:</span>
                    <span>{formatDate(g.checkInDate)} → {formatDate(g.checkOutDate)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span>Folio Balance:</span>
                    <span className="font-mono font-black text-amber-400 text-sm">{formatCurrency(g.balance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: DAY-CLOSE CONTROLS */}
      {activeSubTab === 'DAY_CLOSE' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 max-w-xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-slate-800 border border-slate-700">
            {dayClose.isDayClosed ? (
              <Lock className="w-8 h-8 text-red-400" />
            ) : (
              <Unlock className="w-8 h-8 text-emerald-400" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">
              Current Business Day: <span className="font-mono text-amber-400">{dayClose.businessDate}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Status: <strong className={dayClose.isDayClosed ? 'text-red-400' : 'text-emerald-400'}>
                {dayClose.isDayClosed ? 'DAY CLOSED (POSTINGS LOCKED)' : 'DAY OPEN (ACTIVE BILLING)'}
              </strong>
            </p>
            {dayClose.lastClosedAt && (
              <p className="text-[11px] text-slate-500 mt-1">
                Last day-close action on {dayClose.lastClosedAt} by {dayClose.lastClosedBy}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
            <span className="font-bold text-amber-300">Night Audit / Day-Close Rules:</span>
            <p>• Closing the day locks backdated billing and resettlements.</p>
            <p>• Night audit automatically archives daily totals into summary registers.</p>
            <p>• Managers can reopen the day for authorized administrative adjustments.</p>
          </div>

          <button
            onClick={handleToggleDayClose}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg ${
              dayClose.isDayClosed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
            }`}
          >
            {dayClose.isDayClosed ? '🔓 Reopen Business Day' : '🔒 Perform Day-Close (Night Audit)'}
          </button>
        </div>
      )}

      {/* SUBTAB 6: AUDIT TRAIL */}
      {activeSubTab === 'AUDIT_TRAIL' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Immutable System Audit Log</h3>
            <p className="text-xs text-slate-400">Chronological history of all creations, cancellations, settlements, and supervisor overrides</p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                      {log.action}
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{log.entityId}</span>
                  </div>
                  <p className="text-slate-200">{log.details}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 whitespace-nowrap">
                  <span className="text-slate-300 font-medium block">{log.user} ({log.role})</span>
                  <span className="font-mono">{formatDate(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">
              {editingItem ? 'Edit Item Master' : 'Add Item to Master Catalog'}
            </h3>
            <form onSubmit={handleSaveItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Code *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingItem)}
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Dry Clean Jacket"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Group</label>
                  <select
                    value={itemForm.groupCode}
                    onChange={(e) => setItemForm({ ...itemForm, groupCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  >
                    {groups.map(g => (
                      <option key={g.code} value={g.code}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="Pcs, Set, Job"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit Rate ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemForm.rate}
                    onChange={(e) => setItemForm({ ...itemForm, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tax Percent (%) *</label>
                  <input
                    type="number"
                    required
                    value={itemForm.taxPercent}
                    onChange={(e) => setItemForm({ ...itemForm, taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Barcode / SKU (Optional)</label>
                <input
                  type="text"
                  value={itemForm.barcode || ''}
                  onChange={(e) => setItemForm({ ...itemForm, barcode: e.target.value })}
                  placeholder="e.g. 8901009"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Charge Head Modal */}
      {isHeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">
              {editingHead ? 'Edit Charge Head' : 'Add New Charge Head'}
            </h3>
            <form onSubmit={handleSaveHeadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Head Code *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingHead)}
                  value={headForm.code}
                  onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Charge Description *</label>
                <input
                  type="text"
                  required
                  value={headForm.name}
                  onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                  placeholder="e.g. Extra Luxury Mattress"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={headForm.category}
                    onChange={(e) => setHeadForm({ ...headForm, category: e.target.value as ChargeHead['category'] })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  >
                    <option value="extra_bed">Extra Bed</option>
                    <option value="damage">Linen / Property Damage</option>
                    <option value="laundry">Laundry Express</option>
                    <option value="amenity">Amenity Package</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Rate ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={headForm.defaultRate}
                    onChange={(e) => setHeadForm({ ...headForm, defaultRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tax Percent (%)</label>
                <input
                  type="number"
                  value={headForm.taxPercent}
                  onChange={(e) => setHeadForm({ ...headForm, taxPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-100"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsHeadModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  Save Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Auth Modal */}
      <ManagerAuthModal
        isOpen={isAuthModalOpen}
        title="Authorize Day-Close Modification"
        actionDescription="Perform Night Audit or Day Reopen action"
        requiredRole="manager"
        onSuccess={() => {
          setIsAuthModalOpen(false);
          toggleDayClose(!dayClose.isDayClosed);
        }}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
