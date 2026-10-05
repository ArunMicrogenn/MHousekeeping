import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, X } from 'lucide-react';
import { getCurrentUser, getAllUsers } from '../services/storage';
import { UserRole } from '../types';

interface ManagerAuthModalProps {
  isOpen: boolean;
  title: string;
  actionDescription: string;
  requiredRole?: UserRole;
  onSuccess: (authorizedBy: string, role: string) => void;
  onClose: () => void;
}

export const ManagerAuthModal: React.FC<ManagerAuthModalProps> = ({
  isOpen,
  title,
  actionDescription,
  requiredRole = 'supervisor',
  onSuccess,
  onClose,
}) => {
  const currentUser = getCurrentUser();
  const allUsers = getAllUsers();
  const eligibleUsers = allUsers.filter(u => {
    if (requiredRole === 'manager') return u.role === 'manager';
    return u.role === 'supervisor' || u.role === 'manager';
  });

  const [selectedUserId, setSelectedUserId] = useState<string>(
    eligibleUsers.find(u => u.id === currentUser.id)?.id || eligibleUsers[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetUser = eligibleUsers.find(u => u.id === selectedUserId);
    if (!targetUser) {
      setError('Please select an authorized user.');
      return;
    }

    if (pin.trim() !== targetUser.pin) {
      setError(`Invalid PIN for ${targetUser.name}. (Demo PIN: ${targetUser.pin})`);
      return;
    }

    onSuccess(targetUser.name, targetUser.role);
    setPin('');
    setError('');
  };

  const handleQuickBypass = (user: typeof eligibleUsers[0]) => {
    onSuccess(user.name, user.role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-amber-300 font-medium">
              {requiredRole === 'manager' ? 'Manager Authorization Required' : 'Supervisor / Manager Authorization'}
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60 mb-5 text-xs text-slate-300">
          <span className="font-semibold text-amber-200">Action:</span> {actionDescription}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Authorizing User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setError('');
              }}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()} - {u.badgeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex justify-between">
              <span>Security PIN</span>
              <span className="text-slate-500 text-[11px]">
                Demo PIN: {eligibleUsers.find(u => u.id === selectedUserId)?.pin}
              </span>
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4-digit PIN"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 pl-9 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest"
                autoFocus
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
            >
              Authorize & Proceed
            </button>
          </div>
        </form>

        {/* Quick Demo Bypass Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Quick 1-Click Demo Auth</p>
          <div className="flex flex-wrap gap-1.5">
            {eligibleUsers.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickBypass(u)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded text-slate-300 hover:text-amber-300 transition-colors"
              >
                ⚡ {u.name.split(' ')[0]} ({u.role})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
