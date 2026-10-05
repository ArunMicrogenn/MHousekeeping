import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Zap,
  Boxes,
  Receipt,
  CreditCard,
  Bed,
  Tag,
  RotateCcw,
  Repeat,
  BarChart3,
  Database,
  Building2,
  Shield,
  Calendar,
  Lock,
  Unlock,
  UserCheck,
  ChevronDown,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import {
  getCurrentUser,
  setCurrentUser,
  getAllUsers,
  getDayCloseConfig,
  getBills,
  getLots,
  subscribeStorage
} from './services/storage';
import { User, UserRole } from './types';

// Screens
import { DashboardScreen } from './components/screens/DashboardScreen';
import { QuickBillingScreen } from './components/screens/QuickBillingScreen';
import { LotScreen } from './components/screens/LotScreen';
import { BillingScreen } from './components/screens/BillingScreen';
import { SettlementScreen } from './components/screens/SettlementScreen';
import { ExtraBedPostingScreen } from './components/screens/ExtraBedPostingScreen';
import { ChargesPostingScreen } from './components/screens/ChargesPostingScreen';
import { BillResettlementScreen } from './components/screens/BillResettlementScreen';
import { ChargesResettlementScreen } from './components/screens/ChargesResettlementScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { MastersScreen } from './components/screens/MastersScreen';

type NavScreen =
  | 'DASHBOARD'
  | 'QUICK_BILLING'
  | 'LOTS'
  | 'BILLING'
  | 'SETTLEMENT'
  | 'EXTRA_BED'
  | 'CHARGES_POSTING'
  | 'BILL_RESETTLEMENT'
  | 'CHARGES_RESETTLEMENT'
  | 'REPORTS'
  | 'MASTERS';

export default function App() {
  const [currentUser, setUser] = useState<User>(getCurrentUser());
  const [dayClose, setDayClose] = useState(getDayCloseConfig());
  const [activeScreen, setActiveScreen] = useState<NavScreen>('DASHBOARD');
  const [preselectedBillForSettlement, setPreselectedBillForSettlement] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);

  const allUsers = getAllUsers();
  const bills = getBills();
  const openLotsCount = getLots().filter(l => l.status === 'OPEN').length;
  const unsettledBillsCount = bills.filter(b => b.status === 'UNSETTLED').length;

  // Subscribe to storage updates so UI reflects state reactively
  useEffect(() => {
    const unsubscribe = subscribeStorage(() => {
      setUser(getCurrentUser());
      setDayClose(getDayCloseConfig());
    });
    return unsubscribe;
  }, []);

  const handleRoleSwitch = (selectedUser: User) => {
    setCurrentUser(selectedUser);
    setUser(selectedUser);
    setIsUserDropdownOpen(false);
  };

  const handleNavigateToSettlement = (billNumber: string) => {
    setPreselectedBillForSettlement(billNumber);
    setActiveScreen('SETTLEMENT');
  };

  const handleDashboardNavigate = (screenId: string, param?: string) => {
    if (screenId === 'SETTLEMENT' && param) {
      setPreselectedBillForSettlement(param);
    }
    setActiveScreen(screenId as NavScreen);
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard & Charts', badge: 'Live', icon: LayoutDashboard, color: 'text-amber-400' },
    { id: 'QUICK_BILLING', label: 'Quick Billing', badge: 'Fast POS', icon: Zap, color: 'text-amber-400' },
    { id: 'LOTS', label: 'Lot Management', count: openLotsCount, icon: Boxes, color: 'text-cyan-400' },
    { id: 'BILLING', label: 'Standard Billing', icon: Receipt, color: 'text-amber-300' },
    { id: 'SETTLEMENT', label: 'Settlement', count: unsettledBillsCount, icon: CreditCard, color: 'text-emerald-400' },
    { id: 'EXTRA_BED', label: 'Extra Bed Posting', icon: Bed, color: 'text-purple-400' },
    { id: 'CHARGES_POSTING', label: 'Charges Posting', icon: Tag, color: 'text-rose-400' },
    { id: 'BILL_RESETTLEMENT', label: 'Bill Resettlement', badge: 'Auth', icon: RotateCcw, color: 'text-amber-400' },
    { id: 'CHARGES_RESETTLEMENT', label: 'Charges Resettlement', badge: 'Auth', icon: Repeat, color: 'text-indigo-400' },
    { id: 'REPORTS', label: 'Reports Hub (7)', icon: BarChart3, color: 'text-blue-400' },
    { id: 'MASTERS', label: 'Masters & Setup', icon: Database, color: 'text-slate-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Enterprise App Header */}
      <header className="no-print sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Hotel ERP Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  GRAND ELYSIUM
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Housekeeping Module
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Billing, Folio Postings, Resettlement & Real-time Audit
              </p>
            </div>
          </div>

          {/* Right Status Controls & User Role Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Business Date & Day Close Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Date:</span>
              <span className="font-mono font-bold text-slate-200">{dayClose.businessDate}</span>
              <span className="text-slate-600">•</span>
              <span className={`flex items-center gap-1 font-bold ${
                dayClose.isDayClosed ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {dayClose.isDayClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {dayClose.isDayClosed ? 'Closed' : 'Open'}
              </span>
            </div>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold text-slate-200 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold font-mono">
                    {currentUser.role} ({currentUser.badgeId})
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-2xl z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Switch Active Persona</p>
                    <p className="text-xs text-slate-300">Test Operator, Supervisor, or Manager rights</p>
                  </div>
                  <div className="py-1 space-y-1">
                    {allUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleRoleSwitch(u)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                          currentUser.id === u.id
                            ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-left">
                          <p>{u.name}</p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            PIN: {u.pin} • {u.badgeId}
                          </span>
                        </div>
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Sidebar Navigation */}
        <aside className={`no-print lg:w-64 bg-slate-900/60 lg:bg-slate-900/40 border-r border-slate-800 p-3 lg:p-4 space-y-1 shrink-0 ${
          isMobileMenuOpen ? 'block' : 'hidden lg:block'
        }`}>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 py-1 mb-1">
            HK Operations
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id as NavScreen);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : item.color}`} />
                  <span>{item.label}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-300'
                  }`}>
                    {item.count}
                  </span>
                )}

                {item.badge && !item.count && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Dynamic Screen View */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeScreen === 'DASHBOARD' && (
            <DashboardScreen onNavigate={handleDashboardNavigate} />
          )}
          {activeScreen === 'QUICK_BILLING' && <QuickBillingScreen />}
          {activeScreen === 'LOTS' && <LotScreen />}
          {activeScreen === 'BILLING' && (
            <BillingScreen onNavigateToSettlement={handleNavigateToSettlement} />
          )}
          {activeScreen === 'SETTLEMENT' && (
            <SettlementScreen initialBillNumber={preselectedBillForSettlement} />
          )}
          {activeScreen === 'EXTRA_BED' && <ExtraBedPostingScreen />}
          {activeScreen === 'CHARGES_POSTING' && <ChargesPostingScreen />}
          {activeScreen === 'BILL_RESETTLEMENT' && <BillResettlementScreen />}
          {activeScreen === 'CHARGES_RESETTLEMENT' && <ChargesResettlementScreen />}
          {activeScreen === 'REPORTS' && <ReportsScreen />}
          {activeScreen === 'MASTERS' && <MastersScreen />}
        </main>

      </div>
    </div>
  );
}
