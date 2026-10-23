import React, { useState, useEffect, useRef } from 'react';
import { Gift, Sparkles, Trophy, Zap, Shield, Play, Check, Flame, X, Star } from 'lucide-react';

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCoins: (amount: number) => void;
  onGrantShield?: () => void;
  onGrantNitro?: () => void;
  onSimulateAdBreak?: () => void;
  onRecordImpression?: (views: number, rev: number) => void;
}

const STREAK_REWARDS = [
  { day: 1, reward: '5,000 Coins', coins: 5000, icon: '💰', type: 'coins' },
  { day: 2, reward: '12,500 Coins', coins: 12500, icon: '💰', type: 'coins' },
  { day: 3, reward: 'Energy Shield', coins: 5000, icon: '🛡️', type: 'shield' },
  { day: 4, reward: '25,000 Coins', coins: 25000, icon: '💰', type: 'coins' },
  { day: 5, reward: 'Hyper Nitro', coins: 10000, icon: '⚡', type: 'nitro' },
  { day: 6, reward: '50,000 Coins', coins: 50000, icon: '💰', type: 'coins' },
  { day: 7, reward: '100,000 Jackpot', coins: 100000, icon: '👑', type: 'jackpot' }
];

const WHEEL_PRIZES = [
  { label: '10,000 Coins', coins: 10000, color: '#9333ea', icon: '💰' },
  { label: '3x Hyper Nitro', coins: 5000, color: '#f59e0b', icon: '⚡', isNitro: true },
  { label: '2x Energy Shields', coins: 5000, color: '#06b6d4', icon: '🛡️', isShield: true },
  { label: '50,000 JACKPOT', coins: 50000, color: '#ec4899', icon: '💎' },
  { label: '20,000 Coins', coins: 20000, color: '#3b82f6', icon: '💰' },
  { label: 'Mega Magnet', coins: 8000, color: '#10b981', icon: '🧲' },
  { label: '15,000 Coins', coins: 15000, color: '#8b5cf6', icon: '💰' },
  { label: '2X Multiplier', coins: 12000, color: '#e11d48', icon: '⭐' }
];

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  isOpen,
  onClose,
  onAddCoins,
  onGrantShield,
  onGrantNitro,
  onSimulateAdBreak,
  onRecordImpression
}) => {
  const [activeTab, setActiveTab] = useState<'streak' | 'wheel'>('wheel');
  const [streakDay, setStreakDay] = useState<number>(1);
  const [hasClaimedToday, setHasClaimedToday] = useState<boolean>(false);
  const [spinsLeft, setSpinsLeft] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wonPrize, setWonPrize] = useState<{ label: string; coins: number; icon: string } | null>(null);
  const [streakToast, setStreakToast] = useState<string | null>(null);

  // Initialize streak & spins from storage
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastClaimDate = localStorage.getItem('neon_runner_last_claim_date');
      const currentStreak = Number(localStorage.getItem('neon_runner_streak_days') || '1');
      const lastSpinDate = localStorage.getItem('neon_runner_last_spin_date');

      if (lastClaimDate === today) {
        setHasClaimedToday(true);
      } else {
        setHasClaimedToday(false);
      }

      setStreakDay(currentStreak > 7 ? 1 : currentStreak);

      if (lastSpinDate === today) {
        setSpinsLeft(0);
      } else {
        setSpinsLeft(1);
      }
    } catch {}
  }, [isOpen]);

  const handleClaimStreak = () => {
    if (hasClaimedToday) return;
    const today = new Date().toISOString().split('T')[0];
    const reward = STREAK_REWARDS[streakDay - 1];

    onAddCoins(reward.coins);
    if (reward.type === 'shield' && onGrantShield) onGrantShield();
    if (reward.type === 'nitro' && onGrantNitro) onGrantNitro();

    const nextStreak = streakDay >= 7 ? 1 : streakDay + 1;
    setStreakDay(nextStreak);
    setHasClaimedToday(true);

    try {
      localStorage.setItem('neon_runner_last_claim_date', today);
      localStorage.setItem('neon_runner_streak_days', nextStreak.toString());
    } catch {}

    setStreakToast(`Claimed Day ${streakDay}: +${reward.coins.toLocaleString()} Coins! 🎁`);
    setTimeout(() => setStreakToast(null), 3000);
  };

  const handleSpinWheel = () => {
    if (isSpinning || spinsLeft <= 0) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Pick random prize index
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    // Extra rotations for excitement (5 to 8 full spins)
    const extraTurns = (5 + Math.floor(Math.random() * 3)) * 360;
    // Calculate final rotation so the arrow (at top 270 or 0 deg) lands on selected prize
    const targetAngle = extraTurns + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));

    setWheelRotation(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const prize = WHEEL_PRIZES[prizeIndex];
      setWonPrize(prize);
      onAddCoins(prize.coins);
      if (prize.isShield && onGrantShield) onGrantShield();
      if (prize.isNitro && onGrantNitro) onGrantNitro();

      setSpinsLeft((prev) => Math.max(0, prev - 1));
      try {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('neon_runner_last_spin_date', today);
      } catch {}
    }, 4200);
  };

  const handleWatchAdForSpin = () => {
    if (onSimulateAdBreak) onSimulateAdBreak();
    if (onRecordImpression) onRecordImpression(1, 0.04);
    setSpinsLeft((prev) => prev + 1);
    setStreakToast('Ad Watched! +1 Bonus Lucky Spin Awarded! 🎰');
    setTimeout(() => setStreakToast(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                Daily Rewards & Lucky Wheel
              </h2>
              <p className="text-[11px] text-slate-400">Claim free jackpot coins, power-ups, and daily gifts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {streakToast && (
          <div className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl text-center shadow-md animate-bounce flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" /> {streakToast}
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 my-3">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'wheel' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Lucky Wheel of Fortune
          </button>
          <button
            onClick={() => setActiveTab('streak')}
            className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'streak' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" /> 7-Day Login Streak
          </button>
        </div>

        {/* TAB 1: LUCKY WHEEL */}
        {activeTab === 'wheel' && (
          <div className="flex-1 overflow-y-auto space-y-4 text-center py-2">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto my-2">
              {/* Pointer Arrow at top */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400" />
              </div>

              {/* Rotating Wheel Canvas/SVG */}
              <div
                className="w-full h-full rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform duration-[4000ms] ease-out relative overflow-hidden"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)'
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {WHEEL_PRIZES.map((prize, idx) => {
                    const angle = 360 / WHEEL_PRIZES.length;
                    const startAngle = idx * angle;
                    const endAngle = startAngle + angle;
                    const rad1 = (startAngle * Math.PI) / 180;
                    const rad2 = (endAngle * Math.PI) / 180;
                    const x1 = 50 + 50 * Math.cos(rad1);
                    const y1 = 50 + 50 * Math.sin(rad1);
                    const x2 = 50 + 50 * Math.cos(rad2);
                    const y2 = 50 + 50 * Math.sin(rad2);

                    const textRad = ((startAngle + angle / 2) * Math.PI) / 180;
                    const textX = 50 + 32 * Math.cos(textRad);
                    const textY = 50 + 32 * Math.sin(textRad);

                    return (
                      <g key={idx}>
                        <path
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                          fill={prize.color}
                          stroke="#090514"
                          strokeWidth="1"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="#ffffff"
                          fontSize="4"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${startAngle + angle / 2 + 90}, ${textX}, ${textY})`}
                        >
                          {prize.icon} {prize.label.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="50" cy="50" r="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Center Spinner Button */}
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning || spinsLeft <= 0}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase shadow-xl flex items-center justify-center active:scale-95 transition disabled:opacity-60 cursor-pointer"
              >
                {isSpinning ? '...' : 'SPIN'}
              </button>
            </div>

            {/* Won Prize Celebration */}
            {wonPrize && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 p-3 rounded-2xl animate-in zoom-in-95 duration-200">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">🎉 You Won:</span>
                <span className="text-base font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-xl">{wonPrize.icon}</span> {wonPrize.label} (+{wonPrize.coins.toLocaleString()} Coins)
                </span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
              <div className="text-xs text-slate-400">
                Daily Spins Left: <strong className="text-amber-400 font-mono text-sm">{spinsLeft}</strong>
              </div>

              {spinsLeft <= 0 && (
                <button
                  onClick={handleWatchAdForSpin}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Watch Short Ad for +1 Spin
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 7-DAY LOGIN STREAK */}
        {activeTab === 'streak' && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase">Current Streak</span>
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" /> Day {streakDay} of 7 Days
                </h4>
              </div>
              <button
                onClick={handleClaimStreak}
                disabled={hasClaimedToday}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg ${
                  hasClaimedToday
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 active:scale-95'
                }`}
              >
                {hasClaimedToday ? 'Claimed Today ✓' : 'Claim Reward 🎁'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STREAK_REWARDS.map((item) => {
                const isCurrent = streakDay === item.day;
                const isCompleted = streakDay > item.day;

                return (
                  <div
                    key={item.day}
                    className={`rounded-2xl p-2.5 text-center flex flex-col justify-between border transition relative ${
                      isCurrent
                        ? 'bg-purple-950/70 border-amber-400 shadow-md shadow-amber-400/20'
                        : isCompleted
                        ? 'bg-slate-950/80 border-emerald-500/40 opacity-70'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-1.5 right-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">DAY {item.day}</span>
                    <div className="text-2xl my-1">{item.icon}</div>
                    <span className="text-[11px] font-black text-white">{item.reward}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
