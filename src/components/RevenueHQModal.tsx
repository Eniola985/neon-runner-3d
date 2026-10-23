import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Tv,
  Briefcase,
  TrendingUp,
  X,
  Check,
  Globe,
  Music,
  ExternalLink,
  Layers,
  ShieldCheck,
  Zap,
  HelpCircle,
  Copy,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  Mail
} from 'lucide-react';

export interface BillboardSponsor {
  id: string;
  brandName: string;
  tagline: string;
  category: 'music' | 'apparel' | 'beverage' | 'tech' | 'gaming';
  cpmRate: number; // e.g. $20 CPM
  monthlyRetainer: number; // e.g. $5000/mo
  accentColor: string;
  active: boolean;
  ctaText?: string;
  imageUrl?: string;
}

export interface AdNetworkConfig {
  provider: 'adsense' | 'adinplay' | 'crazygames' | 'direct';
  publisherId: string;
  rewardedSlotId: string;
  interstitialSlotId: string;
  status: 'live' | 'test' | 'pending';
}

export const DEFAULT_BILLBOARD_SPONSORS: BillboardSponsor[] = [
  {
    id: 'sponsor-enny-riche',
    brandName: 'Enny Riche • VIP Creator & Hitmaker',
    tagline: 'Official Cyberpunk Hitmaker & Neon Runner Executive',
    category: 'music',
    cpmRate: 35.0,
    monthlyRetainer: 25000,
    accentColor: '#a855f7',
    active: true,
    ctaText: 'Stream Enny Hits',
    imageUrl: '/enny_billboard.jpg'
  },
  {
    id: 'sponsor-spotify',
    brandName: 'Spotify Afrobeats',
    tagline: 'Stream Omah Lay & Top Worldwide Hits',
    category: 'music',
    cpmRate: 22.5,
    monthlyRetainer: 5000,
    accentColor: '#10b981',
    active: true,
    ctaText: 'Listen on Spotify'
  },
  {
    id: 'sponsor-sony',
    brandName: 'Sony Music Africa',
    tagline: 'Official Neon Runner Audio Partner',
    category: 'music',
    cpmRate: 18.0,
    monthlyRetainer: 3500,
    accentColor: '#f59e0b',
    active: true,
    ctaText: 'Discover Artists'
  },
  {
    id: 'sponsor-nike',
    brandName: 'Nike Cyber Run',
    tagline: 'High-Tech Streetwear for Runners',
    category: 'apparel',
    cpmRate: 28.0,
    monthlyRetainer: 18000,
    accentColor: '#ec4899',
    active: true,
    ctaText: 'Shop New Gear'
  },
  {
    id: 'sponsor-apple',
    brandName: 'Apple Music Live',
    tagline: 'Spatial Audio Game Soundtracks',
    category: 'music',
    cpmRate: 24.0,
    monthlyRetainer: 12000,
    accentColor: '#06b6d4',
    active: true,
    ctaText: 'Stream in Spatial'
  }
];

interface RevenueHQModalProps {
  isOpen: boolean;
  onClose: () => void;
  developerEarningsUSD: number;
  adImpressionsCount: number;
  onRecordImpression: (views: number, revenueUSD: number) => void;
  billboardSponsors: BillboardSponsor[];
  onUpdateSponsors: (sponsors: BillboardSponsor[]) => void;
  adConfig: AdNetworkConfig;
  onUpdateAdConfig: (config: AdNetworkConfig) => void;
  onSimulateAdBreak: () => void;
}

export default function RevenueHQModal({
  isOpen,
  onClose,
  developerEarningsUSD,
  adImpressionsCount,
  onRecordImpression,
  billboardSponsors,
  onUpdateSponsors,
  adConfig,
  onUpdateAdConfig,
  onSimulateAdBreak
}: RevenueHQModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'networks' | 'billboards' | 'artists' | 'cashout'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New Sponsor Form
  const [showAddSponsorModal, setShowAddSponsorModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newRetainer, setNewRetainer] = useState(3000);
  const [newColor, setNewColor] = useState('#06b6d4');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Ad Network form state
  const [netConfig, setNetConfig] = useState<AdNetworkConfig>(adConfig);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveNetworkConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdConfig(netConfig);
    setSaveSuccess('Ad Network Integration details saved and active!');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setNewImageUrl(event.target.result);
      }
      setImageUploadLoading(false);
    };
    reader.onerror = () => {
      setImageUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    const newSponsor: BillboardSponsor = {
      id: `sponsor-${Date.now()}`,
      brandName: newBrandName.trim(),
      tagline: newTagline.trim() || 'Official In-Game Sponsor',
      category: 'tech',
      cpmRate: 20.0,
      monthlyRetainer: newRetainer,
      accentColor: newColor,
      active: true,
      ctaText: 'Visit Partner',
      imageUrl: newImageUrl.trim() || undefined
    };

    onUpdateSponsors([...billboardSponsors, newSponsor]);
    setShowAddSponsorModal(false);
    setNewBrandName('');
    setNewTagline('');
    setNewImageUrl('');
    setSaveSuccess(`Added ${newBrandName} to 3D Roadside Billboards!`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleToggleSponsor = (id: string) => {
    const updated = billboardSponsors.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    onUpdateSponsors(updated);
  };

  // Monthly retainers total
  const totalMonthlyRetainers = useMemo(() => {
    return billboardSponsors.filter((s) => s.active).reduce((sum, s) => sum + s.monthlyRetainer, 0);
  }, [billboardSponsors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 text-slate-100">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-4xl w-full text-left shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                  Real Monetization & Ad Network HQ
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  REAL 0% IAP MODEL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                How you earn real revenue through Rewarded Ads, 3D In-Game Billboards & Paid Music Spotlights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Notification */}
        {saveSuccess && (
          <div className="bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 text-center flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4" /> {saveSuccess}
          </div>
        )}

        {/* Top Earnings & Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-slate-800">
          {/* Lifetime Generated Revenue */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Lifetime Ad Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-emerald-300 font-mono">
                ${developerEarningsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Accumulated Payouts
              </div>
            </div>
          </div>

          {/* Ad Impressions */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Verified Impressions</span>
              <Tv className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-cyan-300 font-mono">
                {adImpressionsCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-cyan-400 font-semibold">
                Billboards & Rewarded Views
              </div>
            </div>
          </div>

          {/* Monthly Active Sponsorship Deals */}
          <div className="bg-slate-900/90 border border-pink-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Active Brand Retainers</span>
              <Briefcase className="w-4 h-4 text-pink-400" />
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-pink-300 font-mono">
                ${(totalMonthlyRetainers / 1000).toFixed(1)}k/mo
              </div>
              <div className="text-[10px] text-pink-400 font-semibold">
                {billboardSponsors.filter((s) => s.active).length} Live Brand Deals
              </div>
            </div>
          </div>

          {/* Test Ad Break Action */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Rewarded Ad Trigger</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <button
              onClick={() => {
                onSimulateAdBreak();
                onRecordImpression(1, 0.04);
              }}
              className="mt-1 py-1.5 px-2 bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-slate-950 rounded-lg text-xs font-black flex items-center justify-center gap-1 active:scale-95 shadow transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Play Rewarded Ad (+$0.04)
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          {[
            { id: 'overview', label: '1. How Real Money Works', icon: HelpCircle },
            { id: 'networks', label: '2. Connect AdSense / AdinPlay', icon: Globe },
            { id: 'billboards', label: '3. 3D Highway Billboards', icon: Tv, badge: billboardSponsors.length },
            { id: 'artists', label: '4. Paid Music Spotlights', icon: Music },
            { id: 'cashout', label: '5. Cashout & Bank Setup', icon: DollarSign }
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
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-800 text-slate-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: HOW REAL MONEY WORKS EXPLAINED */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/40 rounded-2xl p-4 shadow-lg">
                <h3 className="text-sm font-black text-white flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> The 0% In-App Purchase (IAP) Model Explained
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In casual runner games (like <em>Subway Surfers</em> or <em>Temple Run</em>), less than 2% of players ever buy in-app items with a credit card.
                  Instead, the highest earning web games make <strong>100% of their money from corporate brand sponsors and advertisers</strong>. 
                  Players play for free, and brands pay you directly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pillar 1 */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                    <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">1</div>
                    <span>Rewarded Video Ads (Revive & Multipliers)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    When a player crashes on the 3D track, they click <strong>"Watch Video to Revive (6s Shield)"</strong>. 
                    Advertisers pay $0.02 to $0.06 per view. If 5,000 players watch a video daily, that is <strong>$100 to $300 USD every single day</strong> in passive ad income.
                  </p>
                  <div className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">
                    Average Web CPM: $20.00 – $40.00 USD
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-black text-xs">
                    <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center">2</div>
                    <span>3D Roadside Billboards (Programmatic & Direct)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    As players sprint down the neon highway, physical 3D billboards stand along the curb. 
                    You can either connect an in-game ad SDK (like AdinPlay or Anzu) or sell billboard slots directly to companies for a monthly fee.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-mono font-bold bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800">
                    Typical Retainer: $500 – $5,000/month per billboard
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-pink-400 font-black text-xs">
                    <div className="w-6 h-6 rounded-lg bg-pink-950 border border-pink-500/40 flex items-center justify-center">3</div>
                    <span>Artist & Record Label Track Takeovers</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    This game is powered by live procedural Afrobeats and global music. 
                    New artists and record labels constantly look for viral exposure. You charge artists $50 to $250 to feature their new single as the official race track song.
                  </p>
                  <div className="text-[10px] text-pink-300 font-mono font-bold bg-pink-950/60 px-2 py-1 rounded border border-pink-800">
                    Pricing: $50 / week or $180 / month per song
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-black text-xs">
                    <div className="w-6 h-6 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center">4</div>
                    <span>Sponsored Weekly Leaderboard Cups</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    You host a weekly leaderboard competition. A sponsor (e.g. Nike, a fintech app, or a drink brand) pays to have their logo on the trophy screen and home banner while players compete for high scores.
                  </p>
                  <div className="text-[10px] text-purple-300 font-mono font-bold bg-purple-950/60 px-2 py-1 rounded border border-purple-800">
                    Sponsorship Fee: $500 – $2,500 per tournament
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECT REAL AD NETWORKS */}
          {activeTab === 'networks' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-cyan-500/40 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">Ad Network Provider Settings</h3>
                      <p className="text-[11px] text-slate-400">
                        Connect Google AdSense H5, AdinPlay, or CrazyGames to serve real paying ads
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {netConfig.provider.toUpperCase()}
                  </span>
                </div>

                <form onSubmit={handleSaveNetworkConfig} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Select Ad Network</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'adinplay', name: 'AdinPlay (Recommended)', badge: 'HTML5 Web Game Ads' },
                        { id: 'adsense', name: 'Google AdSense (H5)', badge: 'Google Official' },
                        { id: 'crazygames', name: 'CrazyGames SDK', badge: 'Portal Revenue Share' },
                        { id: 'direct', name: 'Direct Sponsor Only', badge: 'Direct Invoicing' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNetConfig({ ...netConfig, provider: item.id as any })}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                            netConfig.provider === item.id
                              ? 'bg-slate-900 border-cyan-400 text-cyan-300 shadow'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>{item.name}</div>
                          <div className="text-[9px] text-slate-500 font-normal">{item.badge}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {netConfig.provider === 'adsense' ? 'AdSense Client ID (e.g. ca-pub-12345678)' : 'Publisher / Game ID (e.g. neon-runner-3d)'}
                      </label>
                      <input
                        type="text"
                        value={netConfig.publisherId}
                        onChange={(e) => setNetConfig({ ...netConfig, publisherId: e.target.value })}
                        placeholder={netConfig.provider === 'adsense' ? 'ca-pub-XXXXXXXXXXXXXXXX' : 'neon-runner-web-01'}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Rewarded Ad Slot Tag / ID
                      </label>
                      <input
                        type="text"
                        value={netConfig.rewardedSlotId}
                        onChange={(e) => setNetConfig({ ...netConfig, rewardedSlotId: e.target.value })}
                        placeholder="rewarded-revive-unit"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-400">
                      💡 Don't have an ID yet? Register for free at{' '}
                      <a href="https://adinplay.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">
                        adinplay.com
                      </a>{' '}
                      or Google AdSense.
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg active:scale-95 transition"
                    >
                      Save Ad Network Setup
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: 3D HIGHWAY ROADSIDE BILLBOARDS */}
          {activeTab === 'billboards' && (
            <div className="space-y-4">
              {/* Direct Explanation Answering User Questions */}
              <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-purple-300 font-black text-xs">
                    ★
                  </div>
                  <h3 className="text-sm font-black text-white">How Roadside Billboards Work (Direct Answer)</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-purple-300 font-bold">1. Do you have to partner with companies first, or do you provide images?</strong><br />
                    You do <strong>NOT</strong> have to wait for any company's permission to start! You can immediately put your own photo (like the VIP Enny Riche billboard below), your music/social media brand, or sample partner signs (Nike, Spotify) directly into the game. This makes the game look vibrant and gives you a working demo to show real sponsors.
                  </p>
                  <p>
                    <strong className="text-cyan-300 font-bold">2. How do you get paid by real companies?</strong><br />
                    When you contact music artists, local brands, or businesses, you show them this exact highway running on your phone or laptop. You say: <em>"My game gets thousands of views. For $500/month (or $20 CPM), your billboard will be seen by all players."</em> They pay you directly to your bank account (Payoneer, Wise, Stripe), and you simply click <strong>"Add Brand Sponsor"</strong> or upload their image below!
                  </p>
                  <p>
                    <strong className="text-emerald-300 font-bold">3. Are images added to the billboards while running?</strong><br />
                    <strong>YES!</strong> The 3D roadside gantries feature illuminated physical signs along the highway. Every time a player sprints down the road, the billboard image lights up and automatically registers impressions in your revenue counter.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Live 3D Roadside Billboards</h3>
                  <p className="text-[11px] text-slate-400">
                    These brand signs appear along the highway while players race. Toggle active sponsors or add your own!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSponsorModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Brand Sponsor
                </button>
              </div>

              {/* Sponsors List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {billboardSponsors.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className={`bg-slate-950/90 border rounded-2xl p-3.5 flex flex-col justify-between transition shadow-md ${
                      sponsor.active ? 'border-slate-700' : 'border-slate-800 opacity-60'
                    }`}
                    style={{ borderLeftWidth: '5px', borderLeftColor: sponsor.accentColor }}
                  >
                    <div>
                      {/* Billboard Graphic Banner if available */}
                      {sponsor.imageUrl && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-purple-500/40 relative aspect-video bg-black/60 shadow-inner">
                          <img
                            src={sponsor.imageUrl}
                            alt={sponsor.brandName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-black text-purple-300 border border-purple-500/50">
                            3D HIGHWAY BANNER
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-white">{sponsor.brandName}</span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            sponsor.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sponsor.active ? 'BILLBOARD LIVE 🟢' : 'DISABLED ⚪'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mb-2">{sponsor.tagline}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                      <span className="text-emerald-400 font-bold">
                        ${sponsor.monthlyRetainer.toLocaleString()}/mo retainer
                      </span>
                      <button
                        onClick={() => handleToggleSponsor(sponsor.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold active:scale-95 transition ${
                          sponsor.active ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-emerald-950 text-emerald-300'
                        }`}
                      >
                        {sponsor.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PAID MUSIC TAKEOVERS */}
          {activeTab === 'artists' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-pink-500/40 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-pink-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">Music Artist Promotion & Takeover Packages</h3>
                      <p className="text-[11px] text-slate-400">
                        How independent Afrobeats & global artists pay you to feature their songs
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-950 text-pink-300 border border-pink-500/40">
                    ARTIST DEALS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      title: 'Single Track Spotlight',
                      price: '$49 USD',
                      period: '7 Days',
                      features: ['Track plays in standard rotation', 'Album art on 3D highway boards', 'Song credits in HUD']
                    },
                    {
                      title: 'Headliner Takeover',
                      price: '$149 USD',
                      period: '30 Days',
                      features: ['Featured on Home Menu selector', 'Priority 3D billboard gantries', 'Direct Apple/Spotify stream links', 'Home announcement broadcast']
                    },
                    {
                      title: 'Label Exclusive Tourney',
                      price: '$499 USD',
                      period: 'Custom Event',
                      features: ['Custom branded tournament cup', 'Full catalogue DJ mix streaming', 'Exclusive themed runner skin drop', 'Dedicated promo push']
                    }
                  ].map((pkg, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-black text-pink-300 mb-1">{pkg.title}</div>
                        <div className="text-lg font-black text-white font-mono">{pkg.price}</div>
                        <div className="text-[10px] text-slate-400 mb-2">Duration: {pkg.period}</div>
                        <ul className="space-y-1 text-[10px] text-slate-300">
                          {pkg.features.map((f, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 text-center">
                        <span className="text-[9px] font-bold text-slate-400">Invoiced via Stripe or PayPal</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-xs text-slate-300">
                    Want artists to email you directly for promo inquiries?
                  </div>
                  <a
                    href="mailto:ennyriche001@gmail.com?subject=Neon%20Runner%20Music%20Promotion%20Inquiry"
                    className="px-3.5 py-1.5 bg-pink-500 hover:bg-pink-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow active:scale-95 transition whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5" /> Receive Inquiries at ennyriche001@gmail.com
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CASHOUT & BANK SETUP */}
          {activeTab === 'cashout' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">How You Receive Real Payouts to Your Bank</h3>
                      <p className="text-[11px] text-slate-400">
                        Step-by-step instructions on payout thresholds, payment methods, and schedules
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-0.5">Automated Ad Network Wire Transfers</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        When you connect Google AdSense or AdinPlay, they pay on a <strong>Net-30 schedule</strong> (earnings made in October are paid in late November). 
                        Minimum payout threshold is typically $50 or $100 USD sent via Direct Bank Wire, PayPal, or Payoneer.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-0.5">Direct Sponsor Invoicing</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        For music artists and corporate sponsors (like Nike or Spotify deals), you invoice them directly using PayPal Invoicing or Stripe Payment Links. 
                        Funds arrive in your bank account in 1-2 business days.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-pink-950 text-pink-400 flex items-center justify-center shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-0.5">Publishing on CrazyGames & Poki</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        If you upload Neon Runner 3D to <em>CrazyGames.com Developer Portal</em>, they provide 50% revenue share on all millions of impressions generated, with monthly automatic bank transfers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal to Add Custom Brand Sponsor */}
        {showAddSponsorModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 max-w-sm w-full space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-black text-white">Add 3D Highway Sponsor</h3>
                <button onClick={() => setShowAddSponsorModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSponsor} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Brand / Company Name</label>
                  <input
                    type="text"
                    required
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="e.g. Red Bull Energy"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Billboard Tagline</label>
                  <input
                    type="text"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    placeholder="e.g. Fuel Your Cyber Run"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Monthly Sponsorship Fee ($ USD)</label>
                  <input
                    type="number"
                    value={newRetainer}
                    onChange={(e) => setNewRetainer(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Billboard Graphic (Upload Photo or Paste URL)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-purple-950 file:text-purple-300 hover:file:bg-purple-900 cursor-pointer"
                    />
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Or paste image URL (e.g. /enny_billboard.jpg)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                    {newImageUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-purple-500/50 aspect-video bg-black/60">
                        <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-bold text-purple-300 px-1.5 py-0.5 rounded">
                          Image Loaded ✓
                        </span>
                      </div>
                    )}
                    {imageUploadLoading && (
                      <p className="text-[10px] text-cyan-400 font-bold animate-pulse">Processing image...</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Neon Glow Color</label>
                  <div className="flex gap-2">
                    {['#a855f7', '#06b6d4', '#10b981', '#ec4899', '#f59e0b', '#ef4444'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewColor(col)}
                        className={`w-7 h-7 rounded-lg border-2 transition ${
                          newColor === col ? 'border-white scale-110 shadow' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddSponsorModal(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs shadow-lg"
                  >
                    Add Billboard 🚀
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
