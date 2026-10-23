import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Flame, Award, Globe, User, Sparkles, X, ChevronUp, Clock, RefreshCw } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  level: number;
  skinName: string;
  skinIcon: string;
  country: string;
  flag: string;
  date: string;
}

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    username: 'EnnyRiche👑',
    score: 348500,
    level: 45,
    skinName: 'Enny VIP Creator',
    skinIcon: '🕶️',
    country: 'Nigeria',
    flag: '🇳🇬',
    date: 'Today'
  },
  {
    id: 'seed-2',
    username: 'AfroBeatKing',
    score: 298400,
    level: 38,
    skinName: 'Jude Bellingham',
    skinIcon: '⚡',
    country: 'United Kingdom',
    flag: '🇬🇧',
    date: 'Yesterday'
  },
  {
    id: 'seed-3',
    username: 'CyberLagos_99',
    score: 245200,
    level: 32,
    skinName: 'Neon Gold Ball',
    skinIcon: '✨',
    country: 'Ghana',
    flag: '🇬🇭',
    date: '2d ago'
  },
  {
    id: 'seed-4',
    username: 'OmahFan_Lover',
    score: 215000,
    level: 28,
    skinName: 'Shadow Ninja',
    skinIcon: '🥷',
    country: 'South Africa',
    flag: '🇿🇦',
    date: '3d ago'
  },
  {
    id: 'seed-5',
    username: 'SpeedDemon_USA',
    score: 189600,
    level: 25,
    skinName: 'Plasma Light',
    skinIcon: '🔮',
    country: 'United States',
    flag: '🇺🇸',
    date: '4d ago'
  },
  {
    id: 'seed-6',
    username: 'TokyoRacer',
    score: 164000,
    level: 22,
    skinName: 'Cyber Skateboard',
    skinIcon: '🛹',
    country: 'Japan',
    flag: '🇯🇵',
    date: '5d ago'
  },
  {
    id: 'seed-7',
    username: 'AmapianoVibes',
    score: 142000,
    level: 19,
    skinName: 'Enny VIP Creator',
    skinIcon: '🕶️',
    country: 'Kenya',
    flag: '🇰🇪',
    date: '5d ago'
  }
];

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayerName?: string;
  currentPlayerScore?: number;
  currentPlayerLevel?: number;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentPlayerName = 'You (Runner)',
  currentPlayerScore = 0,
  currentPlayerLevel = 1
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(SEED_LEADERBOARD);
  const [activeTab, setActiveTab] = useState<'all' | 'weekly' | 'my_rank'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: LeaderboardEntry[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              fetched.push({
                id: docSnap.id,
                username: data.username || 'Anonymous',
                score: Number(data.score) || 0,
                level: Number(data.level) || 1,
                skinName: data.skinName || 'Cyber Runner',
                skinIcon: data.skinIcon || '⚡',
                country: data.country || 'Global',
                flag: data.flag || '🌍',
                date: data.date ? new Date(data.date).toLocaleDateString() : 'Recent'
              });
            });
            setEntries(fetched);
          } else {
            setEntries(SEED_LEADERBOARD);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Leaderboard snapshot error, using seeded roster:', err);
          setEntries(SEED_LEADERBOARD);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch {
      setEntries(SEED_LEADERBOARD);
      setLoading(false);
    }
  }, [isOpen]);

  // Player position calculation
  const playerRankIndex = entries.findIndex(
    (e) => e.username.toLowerCase() === (currentPlayerName || '').toLowerCase()
  );
  const playerRank = playerRankIndex >= 0 ? playerRankIndex + 1 : 12;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-400 flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/30">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-black text-white">Global Live Leaderboard</h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-950 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  LIVE FIRESTORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Real-time rankings of the fastest highway runners</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 my-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> All-Time Legends
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'weekly' ? 'bg-cyan-600 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Weekly Rivals
          </button>
          <button
            onClick={() => setActiveTab('my_rank')}
            className={`py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'my_rank' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" /> My Record
          </button>
        </div>

        {/* Top 3 Podium Highlights */}
        {entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 mb-3 pt-1">
            {/* 2nd Place */}
            <div className="bg-slate-950/70 border border-slate-700/60 rounded-2xl p-2.5 text-center flex flex-col justify-between relative order-1">
              <span className="text-xl">🥈</span>
              <div className="font-black text-xs text-slate-200 truncate">{entries[1]?.username}</div>
              <div className="text-[11px] font-mono text-cyan-300 font-bold">{entries[1]?.score.toLocaleString()}</div>
              <span className="text-[9px] text-slate-400">LVL {entries[1]?.level}</span>
            </div>

            {/* 1st Place Champion */}
            <div className="bg-gradient-to-b from-amber-950/70 via-slate-950/90 to-purple-950/70 border-2 border-amber-400 rounded-2xl p-2.5 text-center flex flex-col justify-between relative order-2 shadow-lg shadow-amber-400/20 -translate-y-1">
              <span className="text-2xl animate-bounce">👑</span>
              <div className="font-black text-xs text-amber-300 truncate">{entries[0]?.username}</div>
              <div className="text-xs font-mono text-amber-400 font-extrabold">{entries[0]?.score.toLocaleString()}</div>
              <span className="text-[9px] text-amber-300/80 font-bold">LVL {entries[0]?.level}</span>
            </div>

            {/* 3rd Place */}
            <div className="bg-slate-950/70 border border-amber-900/50 rounded-2xl p-2.5 text-center flex flex-col justify-between relative order-3">
              <span className="text-xl">🥉</span>
              <div className="font-black text-xs text-amber-600 truncate">{entries[2]?.username}</div>
              <div className="text-[11px] font-mono text-pink-300 font-bold">{entries[2]?.score.toLocaleString()}</div>
              <span className="text-[9px] text-slate-400">LVL {entries[2]?.level}</span>
            </div>
          </div>
        )}

        {/* Scrollable Leaderboard List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const isUser = entry.username.toLowerCase() === (currentPlayerName || '').toLowerCase();

            return (
              <div
                key={entry.id || index}
                className={`flex items-center justify-between p-2.5 rounded-xl transition pt-2 ${
                  isUser
                    ? 'bg-purple-950/70 border border-purple-400'
                    : isTop3
                    ? 'bg-slate-950/60'
                    : 'hover:bg-slate-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 3
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{rank}
                  </div>

                  {/* Player Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm shrink-0">{entry.skinIcon || '⚡'}</span>
                      <span className="font-black text-xs text-white truncate max-w-[120px] sm:max-w-[180px]">
                        {entry.username}
                      </span>
                      <span className="text-xs shrink-0" title={entry.country}>{entry.flag || '🌍'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Lvl {entry.level}</span>
                      <span>•</span>
                      <span className="truncate">{entry.skinName}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-xs text-emerald-400">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">{entry.date}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Player Sticky Footer Rank */}
        <div className="mt-3 pt-3 border-t border-slate-800 bg-slate-950/80 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-black text-xs">
              #{playerRank}
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1">
                <span>{currentPlayerName}</span>
                <span className="text-[10px] text-purple-400">(Your Rank)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                High Score: <strong className="text-amber-400 font-mono">{currentPlayerScore.toLocaleString()}</strong> • Level {currentPlayerLevel}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (currentPlayerScore > 0) {
                try {
                  const entryId = `entry_${Date.now()}`;
                  setDoc(doc(db, 'leaderboard', entryId), {
                    username: currentPlayerName || 'Runner',
                    score: currentPlayerScore,
                    level: currentPlayerLevel,
                    skinName: 'Enny VIP Creator',
                    skinIcon: '🕶️',
                    country: 'Nigeria',
                    flag: '🇳🇬',
                    date: new Date().toISOString()
                  }).catch(() => {});
                } catch {}
              }
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl text-xs font-black shadow active:scale-95 transition"
          >
            Sync My Best 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
