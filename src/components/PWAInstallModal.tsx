import React from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, Check } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onInstall: () => void;
  isInstalled: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onInstall,
  isInstalled
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-slate-100 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center mb-5">
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full shadow">
              APP
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-wide flex items-center justify-center gap-1.5">
            Install Neon Runner 3D
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Play full-screen with zero browser address bar, instant offline launch, and buttery smooth 60 FPS!
          </p>
        </div>

        {/* Status / Instructions */}
        {isInstalled ? (
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-4 rounded-2xl text-center space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-black mb-1">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-emerald-300">Already Installed!</h4>
            <p className="text-xs text-slate-300">
              Neon Runner is installed on your device. Launch it anytime from your home screen or app drawer!
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Specific Step-by-Step Instructions */
          <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Quick 2-Step iOS Install:
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center shrink-0 font-black text-[11px] border border-cyan-500/30">
                1
              </div>
              <div className="leading-snug">
                Tap the <strong className="text-cyan-300 inline-flex items-center gap-0.5"><Share2 className="w-3.5 h-3.5 inline text-cyan-400" /> Share button</strong> in Safari’s bottom toolbar.
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-pink-950 text-pink-400 flex items-center justify-center shrink-0 font-black text-[11px] border border-pink-500/30">
                2
              </div>
              <div className="leading-snug">
                Scroll down and select <strong className="text-pink-300 inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 inline text-pink-400" /> "Add to Home Screen"</strong>, then tap <strong>Add</strong>!
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-center">
              The Neon Runner app icon will appear instantly on your iPhone / iPad home screen!
            </div>
          </div>
        ) : (
          /* Android / Chrome / Desktop One-Click Install */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-cyan-400 font-bold block text-sm">⚡ 0 MB</span>
                <span className="text-slate-400 text-[10px]">Instant Download</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-pink-400 font-bold block text-sm">🎮 Full Screen</span>
                <span className="text-slate-400 text-[10px]">True Native Feel</span>
              </div>
            </div>

            <button
              onClick={() => {
                onInstall();
                onClose();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 hover:from-cyan-300 hover:to-pink-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-95 transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Install to Home Screen Now
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Official PWA Certified</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> Offline Ready
          </span>
        </div>
      </div>
    </div>
  );
};
