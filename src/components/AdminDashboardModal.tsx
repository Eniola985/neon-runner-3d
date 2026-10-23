import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  Sliders,
  ShieldAlert,
  Megaphone,
  Zap,
  Gauge,
  Trophy,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Save,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gift,
  X,
  Radio,
  PlusCircle,
  Coins,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';

export interface PlayerAccountRecord {
  id: string;
  username: string;
  role: 'player' | 'admin' | 'guest';
  walletBalance: number;
  bestLevel: number;
  highScore: number;
  registeredDate: string;
  lastActiveDate: string;
  isOnline?: boolean;
}

export interface SpinPrizeItem {
  points: number;
  label: string;
  color: string;
}

export interface GameMasterSettings {
  baseRunnerSpeed: number; // 10 to 35 MPH
  obstacleInterval: number; // 800 to 3000 ms
  obstacleSpawnRate: number; // 0.5 to 2.0x
  welcomeBonus: number; // e.g. 1000
  coinMultiplier: number; // 1.0, 1.5, 2.0, 3.0
  spinLineChance: number; // percentage (e.g. 22)
  spinPrizes: SpinPrizeItem[];
  announcement: {
    active: boolean;
    type: 'info' | 'event' | 'bonus' | 'alert';
    message: string;
    updatedAt: string;
    tag?: string;
  };
}

export const DEFAULT_SPIN_PRIZES: SpinPrizeItem[] = [
  { points: 10, label: '10 Points', color: '#ef4444' },
  { points: 10000, label: '10,000 Points', color: '#3b82f6' },
  { points: 50, label: '50 Points', color: '#10b981' },
  { points: 100000, label: '100,000 Points', color: '#8b5cf6' },
  { points: 60, label: '60 Points', color: '#f59e0b' },
  { points: 3000, label: '3,000 Points', color: '#ec4899' },
  { points: 100, label: '100 Points', color: '#06b6d4' },
  { points: 50000, label: '50,000 Points', color: '#f97316' },
];

export const DEFAULT_GAME_SETTINGS: GameMasterSettings = {
  baseRunnerSpeed: 18,
  obstacleInterval: 2200,
  obstacleSpawnRate: 1.0,
  welcomeBonus: 1000,
  coinMultiplier: 1.0,
  spinLineChance: 22,
  spinPrizes: DEFAULT_SPIN_PRIZES,
  announcement: {
    active: true,
    type: 'event',
    message: '⚡ Welcome to Neon Runner 3D! Enjoy procedural tracks, live music sync & daily rewards!',
    updatedAt: new Date().toISOString(),
    tag: 'GLOBAL BROADCAST'
  }
};

const SEED_PLAYERS: PlayerAccountRecord[] = [
  {
    id: 'seed-admin-01',
    username: 'admin123',
    role: 'admin',
    walletBalance: 250000,
    bestLevel: 30,
    highScore: 285400,
    registeredDate: '2026-10-10',
    lastActiveDate: new Date().toISOString().split('T')[0],
    isOnline: true
  },
  {
    id: 'seed-player-02',
    username: 'AfroBeatKing',
    role: 'player',
    walletBalance: 48500,
    bestLevel: 18,
    highScore: 164200,
    registeredDate: '2026-10-12',
    lastActiveDate: new Date().toISOString().split('T')[0],
    isOnline: true
  },
  {
    id: 'seed-player-03',
    username: 'CyberQueen',
    role: 'player',
    walletBalance: 72000,
    bestLevel: 22,
    highScore: 219800,
    registeredDate: '2026-10-14',
    lastActiveDate: new Date().toISOString().split('T')[0],
    isOnline: false
  },
  {
    id: 'seed-player-04',
    username: 'NeoDrifter',
    role: 'player',
    walletBalance: 14500,
    bestLevel: 9,
    highScore: 68900,
    registeredDate: '2026-10-15',
    lastActiveDate: new Date().toISOString().split('T')[0],
    isOnline: true
  },
  {
    id: 'seed-player-05',
    username: 'PulseRunner',
    role: 'player',
    walletBalance: 31200,
    bestLevel: 14,
    highScore: 112450,
    registeredDate: '2026-10-16',
    lastActiveDate: '2026-10-16',
    isOnline: false
  },
  {
    id: 'seed-player-06',
    username: 'LagosSpeedster',
    role: 'player',
    walletBalance: 89000,
    bestLevel: 26,
    highScore: 254100,
    registeredDate: '2026-10-11',
    lastActiveDate: new Date().toISOString().split('T')[0],
    isOnline: false
  }
];

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: GameMasterSettings;
  onUpdateSettings: (newSettings: GameMasterSettings) => void;
  currentUser?: { username: string; type: string } | null;
  currentCoins: number;
  currentHighScore: number;
  currentHighestLevel: number;
}

export default function AdminDashboardModal({
  isOpen,
  onClose,
  currentSettings,
  onUpdateSettings,
  currentUser,
  currentCoins,
  currentHighScore,
  currentHighestLevel
}: AdminDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'tuning' | 'economy' | 'announcement'>('roster');
  const [settings, setSettings] = useState<GameMasterSettings>(currentSettings);
  const [playersList, setPlayersList] = useState<PlayerAccountRecord[]>(SEED_PLAYERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'player' | 'admin' | 'active_today'>('all');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState<PlayerAccountRecord | null>(null);
  const [editCoinsBonus, setEditCoinsBonus] = useState<number>(1000);

  // Sync settings when props change
  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  // Load and merge registered players from local storage and firestore
  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Load registered accounts from localStorage 'neon_runner_players_db'
    let localAccounts: Record<string, string> = {};
    try {
      localAccounts = JSON.parse(localStorage.getItem('neon_runner_players_db') || '{}');
    } catch {}

    const combined: PlayerAccountRecord[] = [...SEED_PLAYERS];

    // Add current user if logged in
    if (currentUser?.username) {
      const existingIdx = combined.findIndex((p) => p.username.toLowerCase() === currentUser.username.toLowerCase());
      if (existingIdx >= 0) {
        combined[existingIdx].walletBalance = currentCoins;
        combined[existingIdx].highScore = Math.max(combined[existingIdx].highScore, currentHighScore);
        combined[existingIdx].bestLevel = Math.max(combined[existingIdx].bestLevel, currentHighestLevel);
        combined[existingIdx].isOnline = true;
        combined[existingIdx].lastActiveDate = todayStr;
      } else {
        combined.unshift({
          id: `local-current-${currentUser.username}`,
          username: currentUser.username,
          role: currentUser.type === 'admin' ? 'admin' : 'player',
          walletBalance: currentCoins,
          bestLevel: currentHighestLevel || 1,
          highScore: currentHighScore || 0,
          registeredDate: todayStr,
          lastActiveDate: todayStr,
          isOnline: true
        });
      }
    }

    // Add local registered users
    Object.keys(localAccounts).forEach((uName) => {
      const exists = combined.some((p) => p.username.toLowerCase() === uName.toLowerCase());
      if (!exists) {
        combined.push({
          id: `local-reg-${uName}`,
          username: uName,
          role: 'player',
          walletBalance: 1000,
          bestLevel: 1,
          highScore: 0,
          registeredDate: todayStr,
          lastActiveDate: todayStr,
          isOnline: false
        });
      }
    });

    setPlayersList(combined);

    // Try listening to Firestore users collection
    try {
      const usersCol = collection(db, 'users');
      const unsubscribe = onSnapshot(
        usersCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const fsUsers: PlayerAccountRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              fsUsers.push({
                id: docSnap.id,
                username: data.username || docSnap.id,
                role: data.role === 'admin' ? 'admin' : 'player',
                walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : 1000,
                bestLevel: typeof data.bestLevel === 'number' ? data.bestLevel : 1,
                highScore: typeof data.highScore === 'number' ? data.highScore : 0,
                registeredDate: data.createdAt ? data.createdAt.split('T')[0] : todayStr,
                lastActiveDate: data.lastActiveDate || todayStr,
                isOnline: data.isOnline ?? false
              });
            });

            // Merge with local accounts
            setPlayersList((prev) => {
              const map = new Map<string, PlayerAccountRecord>();
              prev.forEach((p) => map.set(p.username.toLowerCase(), p));
              fsUsers.forEach((p) => map.set(p.username.toLowerCase(), p));
              return Array.from(map.values());
            });
          }
        },
        (err) => {
          console.warn('Firestore users listener error (using local merged roster):', err.message);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not attach Firestore users listener:', err);
    }
  }, [isOpen, currentUser, currentCoins, currentHighScore, currentHighestLevel]);

  // Derived metrics
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const totalRegisteredPlayers = playersList.length;
  const dailyActivePlayers = useMemo(() => {
    return playersList.filter((p) => p.lastActiveDate === todayStr || p.isOnline).length;
  }, [playersList, todayStr]);

  const totalEconomyWealth = useMemo(() => {
    return playersList.reduce((sum, p) => sum + p.walletBalance, 0);
  }, [playersList]);

  // Filtered roster
  const filteredPlayers = useMemo(() => {
    return playersList.filter((p) => {
      const matchesSearch = p.username.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterRole === 'admin') return p.role === 'admin';
      if (filterRole === 'player') return p.role === 'player';
      if (filterRole === 'active_today') return p.lastActiveDate === todayStr || p.isOnline;
      return true;
    });
  }, [playersList, searchQuery, filterRole, todayStr]);

  // Save Settings Handlers
  const handleSaveSettings = async (override?: Partial<GameMasterSettings>) => {
    const updated = { ...settings, ...(override || {}) };
    setSettings(updated);
    onUpdateSettings(updated);

    // Save to localStorage
    try {
      localStorage.setItem('neon_runner_game_settings', JSON.stringify(updated));
    } catch {}

    // Save to Firestore gameConfig/global
    try {
      await setDoc(
        doc(db, 'gameConfig', 'global'),
        {
          baseRunnerSpeed: updated.baseRunnerSpeed,
          obstacleInterval: updated.obstacleInterval,
          obstacleSpawnRate: updated.obstacleSpawnRate,
          welcomeBonus: updated.welcomeBonus,
          coinMultiplier: updated.coinMultiplier,
          spinLineChance: updated.spinLineChance,
          spinPrizes: JSON.stringify(updated.spinPrizes),
          announcement: JSON.stringify(updated.announcement),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.username || 'admin'
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to save to Firestore gameConfig, saved locally:', err);
    }

    setSaveToast('✅ Game Master Settings Applied & Synced Live!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleGrantBonusCoins = (player: PlayerAccountRecord, amount: number) => {
    setPlayersList((prev) =>
      prev.map((p) => (p.username === player.username ? { ...p, walletBalance: p.walletBalance + amount } : p))
    );

    // If current player, update localStorage total coins
    if (currentUser?.username && currentUser.username.toLowerCase() === player.username.toLowerCase()) {
      const nextCoins = currentCoins + amount;
      try {
        localStorage.setItem('neon_runner_total_coins', nextCoins.toString());
      } catch {}
    }

    setSelectedPlayerForEdit(null);
    setSaveToast(`🪙 Granted +${amount.toLocaleString()} Coins to @${player.username}!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleTogglePlayerRole = (player: PlayerAccountRecord) => {
    const newRole = player.role === 'admin' ? 'player' : 'admin';
    setPlayersList((prev) =>
      prev.map((p) => (p.username === player.username ? { ...p, role: newRole } : p))
    );
    setSaveToast(`👑 Updated @${player.username} role to ${newRole.toUpperCase()}!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-4xl w-full text-left shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                  Admin Owner Command Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  LIVE 🟢
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Full-stack control over player roster, real-time economy tuning, speed gauntlets & broadcasts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
            title="Close Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Live Toast Notification */}
        {saveToast && (
          <div className="bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 text-center animate-bounce flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {saveToast}
          </div>
        )}

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-slate-800">
          {/* Total Registered Players */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Total Registered</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-cyan-300 font-mono">
                {totalRegisteredPlayers.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Real-time Accounts
              </div>
            </div>
          </div>

          {/* Daily Active Players (DAP) */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Daily Active (DAP)</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-emerald-300 font-mono">
                {dailyActivePlayers.toLocaleString()}
              </div>
              <div className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Playing Today
              </div>
            </div>
          </div>

          {/* Welcome Bonus & Multiplier */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Welcome Bonus</span>
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-amber-300 font-mono">
                +{settings.welcomeBonus.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-400 font-semibold">
                🪙 Coins per new signup
              </div>
            </div>
          </div>

          {/* Base Game Speed */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Base Speed Tuning</span>
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-purple-300 font-mono">
                {settings.baseRunnerSpeed} MPH
              </div>
              <div className="text-[10px] text-purple-400 font-semibold">
                Interval: {settings.obstacleInterval}ms
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'roster', label: 'Player Accounts Roster', icon: Users, badge: totalRegisteredPlayers },
            { id: 'tuning', label: 'Difficulty & Speed Sliders', icon: Sliders },
            { id: 'economy', label: 'Economy & Spin Controls', icon: DollarSign },
            { id: 'announcement', label: 'Global Announcement Banner', icon: Megaphone, badge: settings.announcement.active ? 'ACTIVE' : undefined }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-emerald-500 text-emerald-300 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: PLAYER ROSTER & DIRECTORY */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player by username..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: `All (${playersList.length})` },
                    { id: 'active_today', label: `Active Today (${dailyActivePlayers})` },
                    { id: 'player', label: 'Players Only' },
                    { id: 'admin', label: 'Admins' }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setFilterRole(chip.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                        filterRole === chip.id
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Player / Username</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Registered Date</th>
                        <th className="py-2.5 px-3">Wallet Balance</th>
                        <th className="py-2.5 px-3">Best Level</th>
                        <th className="py-2.5 px-3">High Score</th>
                        <th className="py-2.5 px-3 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                            No player accounts found matching "{searchQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredPlayers.map((player) => (
                          <tr key={player.id} className="hover:bg-slate-900/60 transition group">
                            {/* Username with Online Pulse */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-fuchsia-600 flex items-center justify-center font-black text-[11px] text-white">
                                    {player.username.charAt(0).toUpperCase()}
                                  </div>
                                  {player.isOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    {player.username}
                                    {player.username === currentUser?.username && (
                                      <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 rounded font-normal">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {player.isOnline ? '🟢 Live Now' : `Last active ${player.lastActiveDate}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  player.role === 'admin'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                }`}
                              >
                                {player.role === 'admin' ? '👑 ADMIN' : '🎮 PLAYER'}
                              </span>
                            </td>

                            {/* Registered Date */}
                            <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                              {player.registeredDate}
                            </td>

                            {/* Wallet Balance */}
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                              🪙 {player.walletBalance.toLocaleString()}
                            </td>

                            {/* Best Level */}
                            <td className="py-2.5 px-3 font-mono text-purple-300">
                              Lvl {player.bestLevel}
                            </td>

                            {/* High Score */}
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-300">
                              🏆 {player.highScore.toLocaleString()}
                            </td>

                            {/* Admin Actions */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedPlayerForEdit(player);
                                    setEditCoinsBonus(1000);
                                  }}
                                  className="px-2 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-bold active:scale-95 transition"
                                  title="Add bonus coins"
                                >
                                  + Grant Coins
                                </button>
                                <button
                                  onClick={() => handleTogglePlayerRole(player)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold active:scale-95 transition"
                                  title="Toggle admin permission"
                                >
                                  {player.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Summary Footer */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                <span>Showing {filteredPlayers.length} of {playersList.length} registered players</span>
                <span className="font-mono text-emerald-400">Total System Economy Wealth: 🪙 {totalEconomyWealth.toLocaleString()} Coins</span>
              </div>
            </div>
          )}

          {/* TAB 2: DIFFICULTY & SPEED SLIDERS */}
          {activeTab === 'tuning' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 border border-purple-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">Live Speed & Obstacle Physics Engine</h3>
                      <p className="text-[11px] text-slate-400">
                        Changes apply in real time to all running game instances!
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-950 border border-purple-500/50 rounded-xl text-xs font-mono font-black text-purple-300">
                    {settings.baseRunnerSpeed} MPH
                  </span>
                </div>

                {/* Speed Slider */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Base Runner Speed</span>
                    <span className="text-purple-300 font-mono">{settings.baseRunnerSpeed} MPH (Subway: 18 MPH)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="35"
                    step="1"
                    value={settings.baseRunnerSpeed}
                    onChange={(e) => setSettings({ ...settings, baseRunnerSpeed: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10 MPH (Chill)</span>
                    <span>18 MPH (Standard)</span>
                    <span>26 MPH (Overdrive)</span>
                    <span>35 MPH (Insane)</span>
                  </div>
                </div>

                {/* Obstacle Spawn Interval Slider */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Obstacle Spawn Interval (ms)</span>
                    <span className="text-cyan-300 font-mono">{settings.obstacleInterval} ms (Lower = More Frequent)</span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="3000"
                    step="100"
                    value={settings.obstacleInterval}
                    onChange={(e) => setSettings({ ...settings, obstacleInterval: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>800ms (Heavy Gauntlet)</span>
                    <span>1600ms (High Rhythm)</span>
                    <span>2200ms (Comfortable Standard)</span>
                    <span>3000ms (Relaxed)</span>
                  </div>
                </div>

                {/* Spawn Rate Multiplier */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Obstacle Frequency Multiplier</span>
                    <span className="text-emerald-300 font-mono">{settings.obstacleSpawnRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.obstacleSpawnRate}
                    onChange={(e) => setSettings({ ...settings, obstacleSpawnRate: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Speed & Difficulty Presets */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Quick Difficulty Presets:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: 'Casual Chill', speed: 14, interval: 2600, rate: 0.8, color: 'text-cyan-300' },
                      { name: 'Standard Pro', speed: 18, interval: 2200, rate: 1.0, color: 'text-emerald-300' },
                      { name: 'Cyber Rush', speed: 24, interval: 1600, rate: 1.3, color: 'text-amber-300' },
                      { name: 'Insane Reflexes', speed: 30, interval: 1100, rate: 1.6, color: 'text-rose-300' }
                    ].map((preset, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            baseRunnerSpeed: preset.speed,
                            obstacleInterval: preset.interval,
                            obstacleSpawnRate: preset.rate
                          })
                        }
                        className="bg-slate-900 border border-slate-700 hover:border-slate-500 p-2.5 rounded-xl text-left active:scale-95 transition"
                      >
                        <div className={`text-xs font-black ${preset.color}`}>{preset.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {preset.speed} MPH / {preset.interval}ms
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      baseRunnerSpeed: DEFAULT_GAME_SETTINGS.baseRunnerSpeed,
                      obstacleInterval: DEFAULT_GAME_SETTINGS.obstacleInterval,
                      obstacleSpawnRate: DEFAULT_GAME_SETTINGS.obstacleSpawnRate
                    })
                  }
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                </button>
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Apply Tuning Live
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ECONOMY CONTROLS & LUCKY SPIN TABLE */}
          {activeTab === 'economy' && (
            <div className="space-y-5">
              {/* Welcome Bonus & Multipliers */}
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">Player Economy & Welcome Bonus</h3>
                      <p className="text-[11px] text-slate-400">
                        Configure starting rewards, run multipliers, and Lucky Spin wheel odds
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-950 border border-amber-500/50 rounded-xl text-xs font-mono font-black text-amber-300">
                    🪙 +{settings.welcomeBonus.toLocaleString()}
                  </span>
                </div>

                {/* Welcome Bonus Controls */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">New Account Welcome Bonus</span>
                    <span className="text-amber-300 font-mono">+{settings.welcomeBonus.toLocaleString()} Coins</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={settings.welcomeBonus}
                    onChange={(e) => setSettings({ ...settings, welcomeBonus: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex gap-2">
                    {[500, 1000, 2500, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setSettings({ ...settings, welcomeBonus: amt })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                          settings.welcomeBonus === amt
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coin Multiplier */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Global In-Game Coin Multiplier</span>
                    <span className="text-cyan-300 font-mono">{settings.coinMultiplier.toFixed(1)}x Multiplier</span>
                  </div>
                  <div className="flex gap-2">
                    {[1.0, 1.5, 2.0, 3.0, 5.0].map((mult) => (
                      <button
                        key={mult}
                        onClick={() => setSettings({ ...settings, coinMultiplier: mult })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                          settings.coinMultiplier === mult
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {mult.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lucky Spin Free Respin Chance */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Lucky Spin: "Landed on Divider Line" (Free Re-Spin) Chance</span>
                    <span className="text-pink-300 font-mono">{settings.spinLineChance}% Probability</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="45"
                    step="1"
                    value={settings.spinLineChance}
                    onChange={(e) => setSettings({ ...settings, spinLineChance: Number(e.target.value) })}
                    className="w-full accent-pink-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="text-[10px] text-slate-400">
                    When active, 22% of daily wheel spins hit the sector divider line, awarding a dramatic Free Re-Spin without consuming their daily spin!
                  </div>
                </div>
              </div>

              {/* Lucky Spin Prize Table */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Lucky Spin 8-Sector Prize Table
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Editable prize values</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {settings.spinPrizes.map((prize, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between"
                      style={{ borderLeft: `4px solid ${prize.color}` }}
                    >
                      <div className="text-[10px] text-slate-400 font-bold mb-1">
                        Sector #{idx + 1}
                      </div>
                      <input
                        type="number"
                        value={prize.points}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const newPrizes = [...settings.spinPrizes];
                          newPrizes[idx] = {
                            ...newPrizes[idx],
                            points: val,
                            label: `${val.toLocaleString()} Points`
                          };
                          setSettings({ ...settings, spinPrizes: newPrizes });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-pink-500"
                      />
                      <div className="text-[10px] text-slate-500 mt-1 truncate">{prize.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      welcomeBonus: DEFAULT_GAME_SETTINGS.welcomeBonus,
                      coinMultiplier: DEFAULT_GAME_SETTINGS.coinMultiplier,
                      spinLineChance: DEFAULT_GAME_SETTINGS.spinLineChance,
                      spinPrizes: DEFAULT_SPIN_PRIZES
                    })
                  }
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Default Economy
                </button>
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <Save className="w-3.5 h-3.5" /> Save Economy Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GLOBAL ANNOUNCEMENT BANNER */}
          {activeTab === 'announcement' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-4 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">Live Broadcast Announcement Bar</h3>
                      <p className="text-[11px] text-slate-400">
                        Instantly display alerts, tournament announcements, or special event updates to all players
                      </p>
                    </div>
                  </div>
                  {/* Active Toggle Switch */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-300">
                      {settings.announcement.active ? 'Broadcasting 🟢' : 'Offline ⚪'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.announcement.active}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          announcement: { ...settings.announcement, active: e.target.checked }
                        })
                      }
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Announcement Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Banner Category & Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'event', label: '⚡ Event / Tourney', color: 'border-purple-500 text-purple-300' },
                      { id: 'bonus', label: '🎁 Reward / Multiplier', color: 'border-amber-500 text-amber-300' },
                      { id: 'info', label: '📢 Information / News', color: 'border-cyan-500 text-cyan-300' },
                      { id: 'alert', label: '⚠️ Urgent Warning', color: 'border-rose-500 text-rose-300' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            announcement: { ...settings.announcement, type: type.id as any }
                          })
                        }
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                          settings.announcement.type === type.id
                            ? `bg-slate-900 ${type.color} ring-1 ring-emerald-500 shadow`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Announcement Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Broadcast Message</label>
                  <textarea
                    rows={3}
                    value={settings.announcement.message}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        announcement: {
                          ...settings.announcement,
                          message: e.target.value,
                          updatedAt: new Date().toISOString()
                        }
                      })
                    }
                    placeholder="Type broadcast message for all players..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Player Home Screen Live Preview:
                  </div>
                  <div
                    className={`rounded-xl p-3 border flex items-center justify-between text-xs shadow-lg transition ${
                      settings.announcement.type === 'event'
                        ? 'bg-purple-950/80 border-purple-500/50 text-purple-200'
                        : settings.announcement.type === 'bonus'
                        ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                        : settings.announcement.type === 'alert'
                        ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                        : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-black/40 text-white shrink-0">
                        <Megaphone className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-wider opacity-80">
                          {settings.announcement.type.toUpperCase()} ANNOUNCEMENT
                        </div>
                        <div className="font-semibold text-xs leading-snug">
                          {settings.announcement.message || 'No broadcast message configured.'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-slate-300 shrink-0">
                      LIVE PREVIEW
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      announcement: {
                        ...settings.announcement,
                        message: '⚡ DOUBLE COINS WEEKEND: In-run pickups multiplied by 2x! Race to the top!',
                        type: 'bonus',
                        active: true
                      }
                    })
                  }
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold active:scale-95 transition"
                >
                  Load Promo Template
                </button>
                <button
                  onClick={() => handleSaveSettings()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <Megaphone className="w-3.5 h-3.5" /> Broadcast Announcement Live
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Granting Coins to Specific Player */}
        {selectedPlayerForEdit && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white">Grant Player Coins</h3>
                </div>
                <button
                  onClick={() => setSelectedPlayerForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300">
                Award instant bonus coins directly to{' '}
                <span className="font-bold text-white">@{selectedPlayerForEdit.username}</span>'s wallet.
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">Bonus Coin Amount</label>
                <input
                  type="number"
                  value={editCoinsBonus}
                  onChange={(e) => setEditCoinsBonus(Math.max(100, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-1.5">
                {[500, 1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setEditCoinsBonus(amt)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-300 active:scale-95 transition"
                  >
                    +{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedPlayerForEdit(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGrantBonusCoins(selectedPlayerForEdit, editCoinsBonus)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg"
                >
                  Confirm Award 🎁
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
