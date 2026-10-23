import React, { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, Shield, Check, X, ExternalLink, Zap } from 'lucide-react';

interface RewardedAdModalProps {
  isOpen: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
  sponsorName?: string;
}

export default function RewardedAdModal({
  isOpen,
  onRewardEarned,
  onClose,
  sponsorName = 'Spotify Worldwide Soundtracks'
}: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(10);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [rewardGranted, setRewardGranted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(10);
      setCanSkip(false);
      setRewardGranted(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          setRewardGranted(true);
          return 0;
        }
        if (prev <= 5) {
          setCanSkip(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClaimAndContinue = () => {
    onRewardEarned();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 text-white">
      <div className="bg-slate-900 border border-purple-500/60 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col">
        {/* Top Ad Network Banner */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-800">
              AD SPONSOR
            </span>
            <span className="font-bold text-slate-300 truncate">{sponsorName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {canSkip ? (
              <button
                onClick={handleClaimAndContinue}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 active:scale-95 transition"
              >
                <Check className="w-3 h-3" /> Claim Reward & Play
              </button>
            ) : (
              <div className="text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-500/40">
                Reward in {secondsLeft}s
              </div>
            )}
          </div>
        </div>

        {/* Video Commercial Screen */}
        <div className="relative aspect-video bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Animated Ambient Waves */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent animate-pulse" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white mb-3">
            <Zap className="w-8 h-8 fill-current animate-bounce" />
          </div>

          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">
            Featured Brand Experience
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-300 to-amber-300">
            {sponsorName}
          </h3>
          <p className="text-xs text-slate-300 max-w-sm mt-1 leading-relaxed">
            High-octane soundscapes for runners worldwide. Stream full mixes with zero ads and offline downloads.
          </p>

          {/* Call to action button */}
          <div className="mt-4">
            <a
              href="https://spotify.com"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg hover:bg-slate-200 transition"
            >
              <span>Explore Official Partner</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-white text-[11px]">Free Revive + 6-Second Shield</div>
              <div className="text-[10px] text-slate-400">Awarded as soon as video concludes</div>
            </div>
          </div>

          {rewardGranted ? (
            <button
              onClick={handleClaimAndContinue}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs shadow-lg active:scale-95 transition"
            >
              Resume Game Now 🚀
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-1.5 bg-slate-800 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed"
            >
              Watching Ad ({secondsLeft}s)...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
