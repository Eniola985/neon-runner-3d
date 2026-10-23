import React, {useRef, useState, useEffect, useCallback, useMemo} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import {PerspectiveCamera} from '@react-three/drei';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Music,
  Search,
  Volume2,
  VolumeX,
  Award,
  Zap,
  Disc3,
  Sparkles,
  Pause,
  ChevronRight,
  Flame,
  ArrowUp,
  Shield,
  Radio,
  Square,
  Trophy,
  Sliders,
  CheckCircle2,
  User,
  Users,
  LogOut,
  Settings as SettingsIcon,
  MessageSquare,
  Send,
  ShoppingBag,
  Check,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  Tv,
  Briefcase,
  Megaphone,
  Gift,
  Smartphone,
  Rocket
} from 'lucide-react';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from '../firebase';
import { signInWithPopup, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import AdminDashboardModal, { GameMasterSettings, DEFAULT_GAME_SETTINGS, DEFAULT_SPIN_PRIZES } from './AdminDashboardModal';
import RevenueHQModal, { BillboardSponsor, DEFAULT_BILLBOARD_SPONSORS, AdNetworkConfig } from './RevenueHQModal';
import RewardedAdModal from './RewardedAdModal';
import { PWAInstallModal } from './PWAInstallModal';
import { DailyRewardsModal } from './DailyRewardsModal';
import { GlobalLeaderboardModal } from './GlobalLeaderboardModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

export interface RealSongItem {
  id: string | number;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  duration?: number;
  durationFormatted?: string;
  isFullLength?: boolean;
  tempo: number;
  genre: string;
  year: string;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface ObstacleEntity {
  id: number;
  lane: number; // -1, 0, 1
  z: number;
  type:
    // 20 Obstacles from Reference Board
    | 'barrier'           // 1. Barrier (Jump Over)
    | 'spikes'            // 2. Spikes (Jump Over)
    | 'laser_beam'        // 3. Laser Beam (Crouch Under)
    | 'hanging_block'     // 4. Hanging Block (Slide Under)
    | 'truck'             // 5. Truck (Jump Over)
    | 'cyber_car'         // 6. Car (Jump Over)
    | 'side_wall'         // 7. Side Wall (Move Left/Right)
    | 'gap'               // 8. Gap (Jump Over)
    | 'rolling_rock'      // 9. Rolling Rock (Jump Over)
    | 'low_tunnel'        // 10. Low Tunnel (Crouch Under)
    | 'jump_pad'          // 11. Jump Pad (High Jump)
    | 'moving_platform'   // 12. Moving Platform (Jump On)
    | 'electric_fence'    // 13. Electric Fence (Jump Over)
    | 'flying_drone'      // 14. Flying Drone (Dodge Left/Right)
    | 'stack_boxes'       // 15. Stack of Boxes (Jump Over)
    | 'swinging_ball'     // 16. Swinging Ball (Jump or Move)
    | 'narrow_path'       // 17. Narrow Path (Stay Center)
    | 'water_pool'        // 18. Water Pool (Jump Over)
    | 'collapsing_bridge' // 19. Collapsing Bridge (Quick Move)
    | 'high_wall'         // 20. High Wall (Climb / High Jump)
    // Legacy / existing types compatibility
    | 'traffic_barrier'
    | 'low_hurdle'
    | 'overhead_stick'
    | 'overhead_gate'
    | 'high_laser_stick'
    | 'overhead_pipe'
    | 'train_block'
    | 'fire_pit'
    | 'glass_barrier'
    | 'neon_sticks'
    | 'broken_bottle'
    | 'broken_road_gap'
    | 'water_hazard'
    | 'wooden_logs';
  width: number;
  height: number;
  color: string;
  clearedJump?: boolean;
}

export interface CollectibleEntity {
  id: number;
  lane: number;
  z: number;
  type: 'coin' | 'shield' | 'magnet' | 'multiplier_coin' | 'nitro';
  multiplier?: number; // 2 or 3
  collected: boolean;
}

const LANE_COORDS = [-2.2, 0, 2.2];

// Popular Global & Afrobeats Superstars + Full Non-Stop DJ Mixes
const FEATURED_ARTISTS = [
  {name: 'Omah Lay', flag: '🇳🇬', tag: 'Soso (Full Song) / Reason'},
  {name: 'DJ Mix', flag: '🎛️', tag: '54 Min Non-Stop Party Hits'},
  {name: 'Asake', flag: '🇳🇬', tag: 'Best of Asake Non-Stop Mix'},
  {name: 'Davido', flag: '🇳🇬', tag: 'One Thing / High'},
  {name: 'Burna Boy', flag: '🇳🇬', tag: 'City Boys / Last Last'},
  {name: 'Wizkid', flag: '🇳🇬', tag: 'Essence / Bad To Me'},
  {name: 'Rema', flag: '🇳🇬', tag: 'Calm Down / Charm'}
];

// Customizable Runner Skins (Balls, Lights, Skateboards, Characters & Pets)
export interface RunnerSkin {
  id: string;
  name: string;
  category: 'balls' | 'skateboards' | 'characters' | 'pets';
  modelType: 'ball' | 'light_orb' | 'skateboard' | 'cat' | 'dog' | 'human' | 'baby' | 'ninja' | 'creator';
  color: string;
  emissive: string;
  ring?: string;
  accentColor?: string;
  price: number;
  description: string;
  iconTag: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  perk?: string;
  minLevel?: number;
  avatarUrl?: string;
}

export const RUNNER_SKINS: RunnerSkin[] = [
  // BALLS & LIGHTS
  {
    id: 'cyan',
    name: 'Cyber Neon Sphere',
    category: 'balls',
    modelType: 'ball',
    color: '#06b6d4',
    emissive: '#22d3ee',
    ring: '#ec4899',
    price: 0,
    description: 'High-speed neon sphere with anti-gravity orbital ring.',
    iconTag: '🌐',
    rarity: 'Common',
    minLevel: 1
  },
  {
    id: 'plasma_light',
    name: 'Plasma Light Orb',
    category: 'balls',
    modelType: 'light_orb',
    color: '#ffffff',
    emissive: '#38bdf8',
    ring: '#f43f5e',
    price: 10000,
    description: 'Pulsing celestial light with rotating hyper-rings.',
    iconTag: '✨',
    rarity: 'Epic',
    minLevel: 5
  },
  {
    id: 'gold',
    name: 'Amapiano 24K Gold',
    category: 'balls',
    modelType: 'ball',
    color: '#f59e0b',
    emissive: '#fbbf24',
    ring: '#3b82f6',
    price: 50000,
    description: '24K pure polished gold sphere for luxury runners.',
    iconTag: '🪙',
    rarity: 'Legendary',
    minLevel: 20
  },
  {
    id: 'diamond_frost',
    name: 'Diamond Ice Prism',
    category: 'balls',
    modelType: 'ball',
    color: '#67e8f9',
    emissive: '#a5f3fc',
    ring: '#c084fc',
    price: 100000,
    description: 'Sub-zero crystal sphere sparkling with frozen energy.',
    iconTag: '💎',
    rarity: 'Mythic',
    minLevel: 30
  },
  {
    id: 'lightning_spark',
    name: 'Hyper Lightning Core',
    category: 'balls',
    modelType: 'light_orb',
    color: '#38bdf8',
    emissive: '#06b6d4',
    ring: '#a855f7',
    price: 25000,
    description: 'High-voltage electric aura surging with kinetic power.',
    iconTag: '⚡',
    rarity: 'Legendary',
    minLevel: 10
  },
  {
    id: 'lava',
    name: 'Lava Flame Core',
    category: 'balls',
    modelType: 'ball',
    color: '#ef4444',
    emissive: '#f97316',
    ring: '#eab308',
    price: 15000,
    description: 'Molten volcanic magma core radiating intense heat.',
    iconTag: '🔥',
    rarity: 'Epic',
    minLevel: 8
  },

  // SKATEBOARDS
  {
    id: 'cyber_deck',
    name: 'Cyber Hoverboard',
    category: 'skateboards',
    modelType: 'skateboard',
    color: '#0f172a',
    emissive: '#06b6d4',
    accentColor: '#ec4899',
    price: 8000,
    description: 'Anti-gravity maglev hoverboard with twin turbo thrusters.',
    iconTag: '🛹',
    rarity: 'Rare',
    minLevel: 3
  },
  {
    id: 'gold_carver',
    name: 'Gold Carver Skateboard',
    category: 'skateboards',
    modelType: 'skateboard',
    color: '#b45309',
    emissive: '#fbbf24',
    accentColor: '#ffffff',
    price: 35000,
    description: 'Carved maple deck with golden wheels & high grip.',
    iconTag: '🛹',
    rarity: 'Epic',
    minLevel: 15
  },
  {
    id: 'neon_deck',
    name: 'Tokyo Drift Neon Deck',
    category: 'skateboards',
    modelType: 'skateboard',
    color: '#1e1b4b',
    emissive: '#ec4899',
    accentColor: '#06b6d4',
    price: 75000,
    description: 'Street-racing deck with underglow neon and speed grip.',
    iconTag: '🛹',
    rarity: 'Legendary',
    minLevel: 25
  },

  // CHARACTERS & HEROES (Including Baby & Human)
  {
    id: 'baby_dash',
    name: 'Baby Dash (Super Kid)',
    category: 'characters',
    modelType: 'baby',
    color: '#ec4899',
    emissive: '#f43f5e',
    accentColor: '#38bdf8',
    price: 40000,
    description: 'Adorable superhero baby runner with glowing pacifier & mini cape!',
    iconTag: '👶',
    rarity: 'Legendary',
    minLevel: 15
  },
  {
    id: 'human_runner',
    name: 'Street Parkour Hero',
    category: 'characters',
    modelType: 'human',
    color: '#10b981',
    emissive: '#34d399',
    accentColor: '#f43f5e',
    price: 60000,
    description: 'Stylized arcade human parkour athlete sprinting to the beat.',
    iconTag: '🏃',
    rarity: 'Legendary',
    minLevel: 20
  },
  {
    id: 'cyber_ninja',
    name: 'Shadow Cyber Ninja',
    category: 'characters',
    modelType: 'ninja',
    color: '#0f172a',
    emissive: '#a855f7',
    accentColor: '#06b6d4',
    price: 120000,
    description: 'Master stealth assassin with back katana and laser eye visor.',
    iconTag: '🥷',
    rarity: 'Mythic',
    minLevel: 30
  },

  // PETS & ANIMALS (Cat & Dog)
  {
    id: 'cyber_cat',
    name: 'Neon Cyber Cat',
    category: 'pets',
    modelType: 'cat',
    color: '#a855f7',
    emissive: '#c084fc',
    accentColor: '#38bdf8',
    price: 12000,
    description: 'Agile cybernetic feline with neon tail and pointed ears.',
    iconTag: '🐱',
    rarity: 'Epic',
    minLevel: 5
  },
  {
    id: 'robo_pup',
    name: 'Robo Cyber Pup',
    category: 'pets',
    modelType: 'dog',
    color: '#0284c7',
    emissive: '#38bdf8',
    accentColor: '#f59e0b',
    price: 18000,
    description: 'Loyal high-tech canine runner with radar ears and wagging tail.',
    iconTag: '🐶',
    rarity: 'Epic',
    minLevel: 8
  },
  // --- 40+ CINEMATIC PREMIUM SKINS (Football Legends, World Superstars, Political Icons & Music Giants) ---
  {
    id: 'messi_goat',
    name: 'Lionel Messi GOAT Edition',
    category: 'characters',
    modelType: 'human',
    color: '#0284c7',
    emissive: '#38bdf8',
    accentColor: '#f59e0b',
    price: 1000000,
    description: 'Cinematic 3D legendary football icon with world cup golden aura and unstoppable speed.',
    iconTag: '⚽',
    rarity: 'Mythic',
    minLevel: 45
  },
  {
    id: 'ronaldo_cr7',
    name: 'Cristiano Ronaldo CR7 Legend',
    category: 'characters',
    modelType: 'human',
    color: '#dc2626',
    emissive: '#ef4444',
    accentColor: '#facc15',
    price: 1000000,
    description: 'Elite football machine with laser focus and explosive SIUUU energy.',
    iconTag: '⚽',
    rarity: 'Mythic',
    minLevel: 45
  },
  {
    id: 'tinubu_grand',
    name: 'President Bola Tinubu Grand Icon',
    category: 'characters',
    modelType: 'human',
    color: '#15803d',
    emissive: '#22c55e',
    accentColor: '#eab308',
    price: 1000000,
    description: 'Majestic presidential leader outfit with gold-embroidered cap and executive aura.',
    iconTag: '🏛️',
    rarity: 'Mythic',
    minLevel: 50
  },
  {
    id: 'burna_boy_odogwu',
    name: 'Burna Boy Odogwu Giant',
    category: 'characters',
    modelType: 'human',
    color: '#b45309',
    emissive: '#f59e0b',
    accentColor: '#10b981',
    price: 1000000,
    description: 'African Giant global superstar with diamond chains and Grammy-winning swagger.',
    iconTag: '🦍',
    rarity: 'Mythic',
    minLevel: 45
  },
  {
    id: 'wizkid_starboy',
    name: 'Wizkid Starboy Machine',
    category: 'characters',
    modelType: 'human',
    color: '#1e1b4b',
    emissive: '#6366f1',
    accentColor: '#38bdf8',
    price: 1000000,
    description: 'Effortless silk-smooth superstar with multi-platinum vibe and iced-out neck.',
    iconTag: '🦅',
    rarity: 'Mythic',
    minLevel: 45
  },
  {
    id: 'davido_obo',
    name: 'Davido OBO 001',
    category: 'characters',
    modelType: 'human',
    color: '#991b1b',
    emissive: '#f87171',
    accentColor: '#fbbf24',
    price: 1000000,
    description: 'Timeless 30BG chairman with 30 Billion Gang medallion and stadium lights.',
    iconTag: '🦁',
    rarity: 'Mythic',
    minLevel: 45
  },
  {
    id: 'michael_jackson_pop',
    name: 'Michael Jackson King of Pop',
    category: 'characters',
    modelType: 'human',
    color: '#18181b',
    emissive: '#e4e4e7',
    accentColor: '#f59e0b',
    price: 1000000,
    description: 'Legendary sparkly rhinestone jacket, fedora hat, and moonwalk kinetic aura.',
    iconTag: '🎤',
    rarity: 'Mythic',
    minLevel: 50
  },
  {
    id: 'mbappe_lightning',
    name: 'Kylian Mbappe Speed Demon',
    category: 'characters',
    modelType: 'human',
    color: '#1d4ed8',
    emissive: '#3b82f6',
    accentColor: '#ffffff',
    price: 750000,
    description: 'Supersonic French striker leaving lightning trails on the tarmac.',
    iconTag: '⚡',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'enny_creator',
    name: 'Enny Riche • VIP Creator & Maestro',
    category: 'characters',
    modelType: 'creator',
    color: '#64748b',
    emissive: '#a855f7',
    ring: '#e2e8f0',
    accentColor: '#9333ea',
    price: 0,
    avatarUrl: '/enny_avatar.jpg',
    description: 'The Game Architect & Afrobeats Hitmaker. Fitted grey sweater, royal purple collar, signature purple-tinted shades & luxury silver watch.',
    iconTag: '🕶️',
    rarity: 'Mythic',
    perk: 'Creator Aura: +50% Coin Magnet Range & Purple Neon Trail',
    minLevel: 1
  },
  {
    id: 'bellingham_king',
    name: 'Jude Bellingham Midfield King',
    category: 'characters',
    modelType: 'human',
    color: '#ffffff',
    emissive: '#cbd5e1',
    accentColor: '#d97706',
    price: 600000,
    description: 'Clutch playmaker with iconic arms-outstretched celebration pose.',
    iconTag: '👑',
    rarity: 'Legendary',
    minLevel: 38
  },
  {
    id: 'haaland_viking',
    name: 'Erling Haaland Cyborg Viking',
    category: 'characters',
    modelType: 'human',
    color: '#38bdf8',
    emissive: '#7dd3fc',
    accentColor: '#0f172a',
    price: 600000,
    description: 'Unstoppable Nordic goal machine scoring from every angle.',
    iconTag: '🛡️',
    rarity: 'Legendary',
    minLevel: 38
  },
  {
    id: 'vinicius_samba',
    name: 'Vinicius Jr Samba Dancer',
    category: 'characters',
    modelType: 'human',
    color: '#facc15',
    emissive: '#eab308',
    accentColor: '#1d4ed8',
    price: 500000,
    description: 'Dazzling Brazilian winger dancing past every obstacle with flair.',
    iconTag: '🌟',
    rarity: 'Legendary',
    minLevel: 35
  },
  {
    id: 'debruyne_assist',
    name: 'Kevin De Bruyne Mastermind',
    category: 'characters',
    modelType: 'human',
    color: '#60a5fa',
    emissive: '#93c5fd',
    accentColor: '#ffffff',
    price: 500000,
    description: 'Precision vision midfielder calculating every step with perfection.',
    iconTag: '🎯',
    rarity: 'Legendary',
    minLevel: 35
  },
  {
    id: 'saka_starboy',
    name: 'Bukayo Saka London Starboy',
    category: 'characters',
    modelType: 'human',
    color: '#ef4444',
    emissive: '#f87171',
    accentColor: '#ffffff',
    price: 450000,
    description: 'Electric right winger with smile and explosive acceleration.',
    iconTag: '⭐',
    rarity: 'Legendary',
    minLevel: 32
  },
  {
    id: 'salah_pharaoh',
    name: 'Mohamed Salah Egyptian King',
    category: 'characters',
    modelType: 'human',
    color: '#dc2626',
    emissive: '#b91c1c',
    accentColor: '#fbbf24',
    price: 550000,
    description: 'Anfield legend with golden boot precision and blistering speed.',
    iconTag: '🏺',
    rarity: 'Legendary',
    minLevel: 36
  },
  {
    id: 'mandela_legacy',
    name: 'Nelson Mandela Freedom Icon',
    category: 'characters',
    modelType: 'human',
    color: '#15803d',
    emissive: '#4ade80',
    accentColor: '#facc15',
    price: 1000000,
    description: 'Timeless global icon of peace, resilience, and unity.',
    iconTag: '🕊️',
    rarity: 'Mythic',
    minLevel: 50
  },
  {
    id: 'obama_hope',
    name: 'Barack Obama Hope & Vision',
    category: 'characters',
    modelType: 'human',
    color: '#1e3a8a',
    emissive: '#3b82f6',
    accentColor: '#ef4444',
    price: 850000,
    description: 'Inspiring statesman with charismatic leadership stride.',
    iconTag: '🗽',
    rarity: 'Mythic',
    minLevel: 42
  },
  {
    id: 'elon_mars',
    name: 'Elon Musk Mars Pioneer',
    category: 'characters',
    modelType: 'human',
    color: '#09090b',
    emissive: '#71717a',
    accentColor: '#f97316',
    price: 900000,
    description: 'Futuristic tech visionary building rockets for interplanetary travel.',
    iconTag: '🚀',
    rarity: 'Mythic',
    minLevel: 44
  },
  {
    id: 'steve_jobs',
    name: 'Steve Jobs Visionary',
    category: 'characters',
    modelType: 'human',
    color: '#27272a',
    emissive: '#a1a1aa',
    accentColor: '#ffffff',
    price: 750000,
    description: 'Minimalist black turtleneck innovator changing the universe.',
    iconTag: '💻',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'rema_rave',
    name: 'Rema Rave & Roses Prince',
    category: 'characters',
    modelType: 'human',
    color: '#3f3f46',
    emissive: '#f43f5e',
    accentColor: '#a855f7',
    price: 800000,
    description: 'Calm Down global hitmaker with mystical bat insignia and futuristic shades.',
    iconTag: '🦇',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'asake_money',
    name: 'Asake Mr Money with the Vibe',
    category: 'characters',
    modelType: 'human',
    color: '#b45309',
    emissive: '#fbbf24',
    accentColor: '#10b981',
    price: 800000,
    description: 'Fuji-inflected Afrobeat icon with designer lace and energetic chants.',
    iconTag: '💸',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'omah_lay_soso',
    name: 'Omah Lay Soso Melancholy',
    category: 'characters',
    modelType: 'human',
    color: '#0f172a',
    emissive: '#06b6d4',
    accentColor: '#ec4899',
    price: 750000,
    description: 'Soulful dark-pop maestro bringing deep emotional rhythms to the track.',
    iconTag: '🎧',
    rarity: 'Legendary',
    minLevel: 38
  },
  {
    id: 'drake_papi',
    name: 'Drake Champagne Papi',
    category: 'characters',
    modelType: 'human',
    color: '#27272a',
    emissive: '#fbbf24',
    accentColor: '#3b82f6',
    price: 900000,
    description: 'OVO sound general with diamond owl pendant and luxury track jacket.',
    iconTag: '🦉',
    rarity: 'Mythic',
    minLevel: 42
  },
  {
    id: 'taylor_swift_eras',
    name: 'Taylor Swift Eras Queen',
    category: 'characters',
    modelType: 'human',
    color: '#fbcfe8',
    emissive: '#f43f5e',
    accentColor: '#eab308',
    price: 900000,
    description: 'Global pop songwriter icon sparkling in glittering concert attire.',
    iconTag: '✨',
    rarity: 'Mythic',
    minLevel: 42
  },
  {
    id: 'the_weeknd_starboy',
    name: 'The Weeknd After Hours',
    category: 'characters',
    modelType: 'human',
    color: '#dc2626',
    emissive: '#ef4444',
    accentColor: '#18181b',
    price: 850000,
    description: 'Synthwave neon star in red blazer and cinematic nocturnal shades.',
    iconTag: '🕶️',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'bob_marley_prophet',
    name: 'Bob Marley Reggae Prophet',
    category: 'characters',
    modelType: 'human',
    color: '#15803d',
    emissive: '#22c55e',
    accentColor: '#eab308',
    price: 800000,
    description: 'Legendary Rastafarian icon spreading peace, love, and One Love vibrations.',
    iconTag: '🌿',
    rarity: 'Legendary',
    minLevel: 38
  },
  {
    id: 'rihanna_badgal',
    name: 'Rihanna BadGal Riri',
    category: 'characters',
    modelType: 'human',
    color: '#be185d',
    emissive: '#ec4899',
    accentColor: '#f59e0b',
    price: 850000,
    description: 'Fenty fashion icon and billionaire mogul with unstoppable aura.',
    iconTag: '💎',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: 'selena_gomez_pop',
    name: 'Selena Gomez Pop Star',
    category: 'characters',
    modelType: 'human',
    color: '#4f46e5',
    emissive: '#818cf8',
    accentColor: '#f43f5e',
    price: 600000,
    description: 'Charming pop royalty with sparkling stage presence.',
    iconTag: '🎵',
    rarity: 'Legendary',
    minLevel: 35
  },
  {
    id: 'justin_bieber_believe',
    name: 'Justin Bieber Believe Icon',
    category: 'characters',
    modelType: 'human',
    color: '#0284c7',
    emissive: '#38bdf8',
    accentColor: '#ffffff',
    price: 600000,
    description: 'Global pop icon with streetwear style and dynamic sprint.',
    iconTag: '🎤',
    rarity: 'Legendary',
    minLevel: 35
  },
  {
    id: 'kendrick_lamar_gnx',
    name: 'Kendrick Lamar GNX King',
    category: 'characters',
    modelType: 'human',
    color: '#b91c1c',
    emissive: '#ef4444',
    accentColor: '#facc15',
    price: 900000,
    description: 'West Coast Pulitzer-winning lyrical titan with crown of thorns.',
    iconTag: '👑',
    rarity: 'Mythic',
    minLevel: 42
  },
  {
    id: 'tiwa_savage_diva',
    name: 'Tiwa Savage African Diva',
    category: 'characters',
    modelType: 'human',
    color: '#9333ea',
    emissive: '#a855f7',
    accentColor: '#ec4899',
    price: 700000,
    description: 'Queen of Afrobeats with majestic regal poise and golden mic.',
    iconTag: '👑',
    rarity: 'Legendary',
    minLevel: 36
  },
  {
    id: 'tems_rebel',
    name: 'Tems Rebel Leader',
    category: 'characters',
    modelType: 'human',
    color: '#0369a1',
    emissive: '#0284c7',
    accentColor: '#f59e0b',
    price: 700000,
    description: 'Grammy-winning celestial voice with ethereal floating aura.',
    iconTag: '🌊',
    rarity: 'Legendary',
    minLevel: 36
  },
  {
    id: 'ayra_starr_sabi',
    name: 'Ayra Starr Sabi Girl',
    category: 'characters',
    modelType: 'human',
    color: '#e11d48',
    emissive: '#fb7185',
    accentColor: '#38bdf8',
    price: 650000,
    description: 'Celestial Mavin superstar with edgy blue hair and rebellious swagger.',
    iconTag: '💫',
    rarity: 'Legendary',
    minLevel: 34
  },
  {
    id: 'fireboy_dml',
    name: 'Fireboy DML Playboy',
    category: 'characters',
    modelType: 'human',
    color: '#c2410c',
    emissive: '#f97316',
    accentColor: '#facc15',
    price: 650000,
    description: 'Melodic sensation with fiery vocals and smooth stride.',
    iconTag: '🔥',
    rarity: 'Legendary',
    minLevel: 34
  },
  {
    id: 'ckay_love',
    name: 'CKay Love Nwantiti',
    category: 'characters',
    modelType: 'human',
    color: '#be123c',
    emissive: '#fb7185',
    accentColor: '#fde047',
    price: 600000,
    description: 'Global chart-topping romantic vibe maestro.',
    iconTag: '🌹',
    rarity: 'Legendary',
    minLevel: 32
  },
  {
    id: 'portable_zazu',
    name: 'Portable Zazu Zeh',
    category: 'characters',
    modelType: 'human',
    color: '#ca8a04',
    emissive: '#eab308',
    accentColor: '#000000',
    price: 500000,
    description: 'Unpredictable street-hop warlord with pure wild energy and hype.',
    iconTag: '🐯',
    rarity: 'Legendary',
    minLevel: 30
  },
  {
    id: 'seyi_vibez',
    name: 'Seyi Vibez Loafers',
    category: 'characters',
    modelType: 'human',
    color: '#374151',
    emissive: '#6b7280',
    accentColor: '#f59e0b',
    price: 500000,
    description: 'Street spiritualist delivering street hymns and infectious grooves.',
    iconTag: '🍞',
    rarity: 'Legendary',
    minLevel: 30
  },
  {
    id: 'zlatan_zanku',
    name: 'Zlatan Ibile Zanku King',
    category: 'characters',
    modelType: 'human',
    color: '#b45309',
    emissive: '#f59e0b',
    accentColor: '#ffffff',
    price: 500000,
    description: 'Zanku dance originator with dyed hair and maximum muscle strength.',
    iconTag: '🕺',
    rarity: 'Legendary',
    minLevel: 30
  },
  {
    id: 'phyno_eze',
    name: 'Phyno Eze Nnu',
    category: 'characters',
    modelType: 'human',
    color: '#1e293b',
    emissive: '#475569',
    accentColor: '#eab308',
    price: 500000,
    description: 'Indigenous rap heavyweight with traditional beads and modern drip.',
    iconTag: '👑',
    rarity: 'Legendary',
    minLevel: 30
  },
  {
    id: 'olamide_baddo',
    name: 'Olamide Baddo Sneh',
    category: 'characters',
    modelType: 'human',
    color: '#0f172a',
    emissive: '#334155',
    accentColor: '#22c55e',
    price: 800000,
    description: 'YBNL godfather and legendary hitmaker shaping African music history.',
    iconTag: '🐐',
    rarity: 'Legendary',
    minLevel: 40
  },
  {
    id: '2baba_queen',
    name: '2Baba African Queen Legend',
    category: 'characters',
    modelType: 'human',
    color: '#b45309',
    emissive: '#d97706',
    accentColor: '#ffffff',
    price: 700000,
    description: 'Pioneering legend of modern Nigerian pop music and timeless melodies.',
    iconTag: '👑',
    rarity: 'Legendary',
    minLevel: 36
  },
  {
    id: 'dbanj_koko',
    name: 'Dbanj Kokomaster',
    category: 'characters',
    modelType: 'human',
    color: '#ca8a04',
    emissive: '#facc15',
    accentColor: '#dc2626',
    price: 700000,
    description: 'High-energy entertainer with harmonica and unmatched charisma.',
    iconTag: '🔥',
    rarity: 'Legendary',
    minLevel: 36
  },
  {
    id: 'cyber_samurai',
    name: 'Cyber Samurai Katana',
    category: 'characters',
    modelType: 'ninja',
    color: '#ef4444',
    emissive: '#f87171',
    accentColor: '#ffffff',
    price: 250000,
    description: 'Master swordsman slicing through neon obstacles with blade precision.',
    iconTag: '⚔️',
    rarity: 'Mythic',
    minLevel: 15
  },
  {
    id: 'astro_runner',
    name: 'Interstellar Astro Runner',
    category: 'characters',
    modelType: 'ball',
    color: '#6366f1',
    emissive: '#818cf8',
    accentColor: '#38bdf8',
    price: 150000,
    description: 'Extra-planetary explorer equipped with anti-gravity thrusters.',
    iconTag: '👨‍🚀',
    rarity: 'Legendary',
    minLevel: 10
  },
  {
    id: 'zenith_dj',
    name: 'Zenith Afrobeats DJ King',
    category: 'characters',
    modelType: 'human',
    color: '#ec4899',
    emissive: '#f472b6',
    accentColor: '#fbbf24',
    price: 300000,
    description: 'Master DJ mixing club anthems while sprinting down the highway.',
    iconTag: '🎧',
    rarity: 'Mythic',
    minLevel: 20
  }
];

export const BALL_SKINS = RUNNER_SKINS;

export interface ThemedTournament {
  id: string;
  title: string;
  sponsor: string;
  prizePool: string;
  duration: string;
  theme: string;
  status: 'Active' | 'Upcoming';
  entryFee: number;
  icon: string;
}

export const THEMED_TOURNAMENTS: ThemedTournament[] = [
  {
    id: 'tournament-afro-gold',
    title: 'Afrobeats Gold Cup Championship',
    sponsor: 'Spotify Afrobeats',
    prizePool: '250,000 Coins + VIP Spotlight',
    duration: 'Ends in 2 Days',
    theme: 'Afrobeats Full Mix',
    status: 'Active',
    entryFee: 0,
    icon: '🎵'
  },
  {
    id: 'tournament-nike-cyber',
    title: 'Nike Cyber Street Cup',
    sponsor: 'Nike Cyber Run',
    prizePool: '500,000 Coins + Exclusive Skin',
    duration: 'Ends in 5 Days',
    theme: 'High Speed Neon Sprint',
    status: 'Active',
    entryFee: 0,
    icon: '⚡'
  },
  {
    id: 'tournament-sony-world',
    title: 'Sony Music World Series',
    sponsor: 'Sony Music Africa',
    prizePool: '1,000,000 Coins Grand Prize',
    duration: 'Starts Monday',
    theme: 'Global Hit Takeover',
    status: 'Upcoming',
    entryFee: 0,
    icon: '🏆'
  }
];

export interface GameChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  type: 'distance' | 'coins' | 'level' | 'skins_unlocked';
  rewardCoins: number;
  icon: string;
}

export const GAME_CHALLENGES: GameChallenge[] = [
  {
    id: 'daily_jog',
    title: 'Daily Morning Sprint',
    description: 'Run a total distance of 10,000 meters across runs.',
    target: 10000,
    type: 'distance',
    rewardCoins: 50000,
    icon: '🏃'
  },
  {
    id: 'coin_tycoon',
    title: 'Coin Tycoon Collector',
    description: 'Accumulate 500 lifetime coins across all runs.',
    target: 500,
    type: 'coins',
    rewardCoins: 75000,
    icon: '🪙'
  },
  {
    id: 'level_20_master',
    title: 'Level 20 Master Pro',
    description: 'Reach Level 20 or higher in any continuous run.',
    target: 20,
    type: 'level',
    rewardCoins: 100000,
    icon: '⭐'
  },
  {
    id: 'legendary_wardrobe',
    title: 'Legendary Wardrobe Icon',
    description: 'Unlock and own at least 3 purchased runner skins.',
    target: 3,
    type: 'skins_unlocked',
    rewardCoins: 150000,
    icon: '💎'
  }
];

// Ultra-fast level scaling: Level 2 reached in ~2-3s (60 pts), Level 3 in ~5s (140 pts)!
export function getLevelFromScore(currentScore: number): number {
  if (currentScore < 60) return 1;
  if (currentScore < 140) return 2;  // Level 2 reached very fast (under 3s)!
  if (currentScore < 240) return 3;  // Level 3 reached very fast (under 6s)!
  if (currentScore < 380) return 4;  // Level 4 (~9s)
  if (currentScore < 560) return 5;  // Level 5 (~14s)
  if (currentScore < 780) return 6;
  if (currentScore < 1050) return 7;
  if (currentScore < 1400) return 8;
  if (currentScore < 1850) return 9;
  if (currentScore < 2400) return 10;
  return 10 + Math.floor((currentScore - 2400) / 750);
}

// Full Studio Master Track
const INITIAL_SONG: RealSongItem = {
  id: 'omah_soso_full',
  title: 'Soso (Extended Afro House Mix - Full Song)',
  artist: 'Omah Lay',
  album: 'Boy Alone (Full Mix)',
  artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
  previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
  duration: 208,
  durationFormatted: '3:28',
  isFullLength: true,
  tempo: 112,
  genre: 'Afrobeats',
  year: '2023'
};

// ========================================================
// 3D HIGHWAY & SUBWAY SURFERS ENVIRONMENT
// ========================================================
function HighwayScene({
  speed,
  level,
  artistName,
  artworkUrl,
  roadLayoutMode = '3_ROADS',
  billboardTextureUrl = '/enny_billboard.jpg'
}: {
  speed: number;
  level: number;
  artistName: string;
  artworkUrl: string;
  roadLayoutMode?: '3_ROADS' | '2_ROADS' | '1_ROAD';
  billboardTextureUrl?: string;
}) {
  const roadStripesRef = useRef<THREE.Group>(null);
  const sceneryGroupRef = useRef<THREE.Group>(null);

  // Load High-Def Roadside Billboard Banner Texture
  const billboardTexture = useMemo(() => {
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(billboardTextureUrl || '/enny_billboard.jpg', (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.generateMipmaps = true;
        t.needsUpdate = true;
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    } catch {
      return null;
    }
  }, [billboardTextureUrl]);

  // Dynamic theme & floor style per level tier (changes every 5 levels!)
  const theme = useMemo(() => {
    let roadColor = '#090d16';
    let sidewalkColor = '#1e293b';
    let glowColor = '#06b6d4';
    let curbColor = '#3b82f6';

    if (level >= 5 && level < 10) {
      roadColor = '#1e1b4b'; // Level 5-9: Amapiano Gold theme
      sidewalkColor = '#292524';
      glowColor = '#f59e0b';
      curbColor = '#ef4444';
    } else if (level >= 10 && level < 15) {
      roadColor = '#022c22'; // Level 10-14: Emerald Mystic theme
      sidewalkColor = '#065f46';
      glowColor = '#10b981';
      curbColor = '#a855f7';
    } else if (level >= 15 && level < 20) {
      roadColor = '#450a0a'; // Level 15-19: Crimson High-Tech theme
      sidewalkColor = '#7f1d1d';
      glowColor = '#ef4444';
      curbColor = '#ec4899';
    } else if (level >= 20) {
      roadColor = '#311042'; // Level 20+: Hyperspace Neon theme
      sidewalkColor = '#4c1d95';
      glowColor = '#ec4899';
      curbColor = '#06b6d4';
    }

    return {
      road: roadColor,
      sidewalk: sidewalkColor,
      glow: new THREE.Color(glowColor),
      curb: new THREE.Color(curbColor)
    };
  }, [level]);

  useFrame((_, delta) => {
    const travel = delta * speed * 3.4;
    if (roadStripesRef.current) {
      roadStripesRef.current.position.z += travel;
      if (roadStripesRef.current.position.z > 24) {
        roadStripesRef.current.position.z = 0;
      }
    }
    if (sceneryGroupRef.current) {
      sceneryGroupRef.current.position.z += travel;
      if (sceneryGroupRef.current.position.z > 52) {
        sceneryGroupRef.current.position.z -= 52;
      }
    }
  });

  return (
    <group>
      {/* Endless Level-Themed Highway Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -30]} receiveShadow>
        <planeGeometry args={[roadLayoutMode === '1_ROAD' ? 3.8 : 8.2, 160]} />
        <meshStandardMaterial color={theme.road} roughness={0.65} metalness={0.3} />
      </mesh>

      {/* Sidewalks with curbs for 3_ROADS and 2_ROADS */}
      {roadLayoutMode !== '1_ROAD' && (
        <>
          <mesh position={[-4.7, 0.12, -30]}>
            <boxGeometry args={[1.3, 0.35, 160]} />
            <meshStandardMaterial color={theme.sidewalk} roughness={0.8} />
          </mesh>
          <mesh position={[4.7, 0.12, -30]}>
            <boxGeometry args={[1.3, 0.35, 160]} />
            <meshStandardMaterial color={theme.sidewalk} roughness={0.8} />
          </mesh>
          <mesh position={[-4.02, 0.3, -30]}>
            <boxGeometry args={[0.18, 0.3, 160]} />
            <meshStandardMaterial color={theme.curb} emissive={theme.curb} emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[4.02, 0.3, -30]}>
            <boxGeometry args={[0.18, 0.3, 160]} />
            <meshStandardMaterial color={theme.glow} emissive={theme.glow} emissiveIntensity={1.4} />
          </mesh>
        </>
      )}

      {/* 2_ROADS Center Median: Clearly shows Middle is CLOSED */}
      {roadLayoutMode === '2_ROADS' && (
        <group position={[0, 0.25, -30]}>
          <mesh>
            <boxGeometry args={[0.55, 0.5, 160]} />
            <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.2, 0.08, 160]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      )}

      {/* 1_ROAD Side Glowing Warning Railings */}
      {roadLayoutMode === '1_ROAD' && (
        <group>
          <mesh position={[-1.9, 0.4, -30]}>
            <boxGeometry args={[0.25, 0.75, 160]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.2} />
          </mesh>
          <mesh position={[1.9, 0.4, -30]}>
            <boxGeometry args={[0.25, 0.75, 160]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.2} />
          </mesh>
        </group>
      )}

      {/* Moving Highway Lane Dash Lines */}
      <group ref={roadStripesRef}>
        {Array.from({length: 20}).map((_, i) => (
          <group key={i} position={[0, 0.02, -i * 8]}>
            <mesh position={[-1.1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 3.4]} />
              <meshBasicMaterial color={theme.glow} />
            </mesh>
            <mesh position={[1.1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 3.4]} />
              <meshBasicMaterial color={theme.glow} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Roadside Props & 3D Brand Sponsor Billboards */}
      <group ref={sceneryGroupRef}>
        {Array.from({length: 6}).map((_, i) => {
          const zOffset = -i * 26;
          return (
            <group key={i} position={[0, 0, zOffset]}>
              {/* Street Lamps */}
              <group position={[-5.1, 0, 0]}>
                <mesh position={[0, 2.5, 0]}>
                  <cylinderGeometry args={[0.08, 0.1, 5, 10]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                <mesh position={[0.8, 4.65, 0]}>
                  <sphereGeometry args={[0.22, 12, 12]} />
                  <meshBasicMaterial color="#fef08a" />
                </mesh>
              </group>
              <group position={[5.1, 0, 0]}>
                <mesh position={[0, 2.5, 0]}>
                  <cylinderGeometry args={[0.08, 0.1, 5, 10]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                <mesh position={[-0.8, 4.65, 0]}>
                  <sphereGeometry args={[0.22, 12, 12]} />
                  <meshBasicMaterial color="#fef08a" />
                </mesh>
              </group>

              {/* 3D Roadside Sponsor Billboard Gantry (Alternating Curbs, Angled Toward Camera) */}
              {i % 2 === 0 ? (
                <group position={[-4.9, 0, 0]} rotation={[0, 0.38, 0]}>
                  {/* Heavy Steel Support Pole */}
                  <mesh position={[0, 1.8, 0]}>
                    <cylinderGeometry args={[0.13, 0.17, 3.8, 12]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.8} />
                  </mesh>
                  {/* Dark Cyberpunk Billboard Backing Frame */}
                  <mesh position={[0, 3.6, 0]}>
                    <boxGeometry args={[4.8, 2.7, 0.2]} />
                    <meshStandardMaterial color="#0b0f19" roughness={0.4} />
                  </mesh>
                  {/* Glowing Outer Neon Bezel Frame */}
                  <mesh position={[0, 3.6, 0.1]}>
                    <boxGeometry args={[4.84, 2.74, 0.04]} />
                    <meshBasicMaterial color="#a855f7" />
                  </mesh>
                  {/* Illuminated High-Res Screen (Crystal Clear, True Color) */}
                  <mesh position={[0, 3.6, 0.12]}>
                    <planeGeometry args={[4.6, 2.5]} />
                    <meshBasicMaterial
                      map={billboardTexture || undefined}
                      color="#ffffff"
                      toneMapped={false}
                    />
                  </mesh>
                  {/* Overhead Dual Floodlight Bar */}
                  <mesh position={[0, 5.02, 0.2]}>
                    <boxGeometry args={[4.4, 0.1, 0.35]} />
                    <meshBasicMaterial color="#1e293b" />
                  </mesh>
                  <mesh position={[-1.3, 4.96, 0.28]}>
                    <sphereGeometry args={[0.14, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[1.3, 4.96, 0.28]}>
                    <sphereGeometry args={[0.14, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              ) : (
                <group position={[4.9, 0, 0]} rotation={[0, -0.38, 0]}>
                  {/* Heavy Steel Support Pole */}
                  <mesh position={[0, 1.8, 0]}>
                    <cylinderGeometry args={[0.13, 0.17, 3.8, 12]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.8} />
                  </mesh>
                  {/* Dark Cyberpunk Billboard Backing Frame */}
                  <mesh position={[0, 3.6, 0]}>
                    <boxGeometry args={[4.8, 2.7, 0.2]} />
                    <meshStandardMaterial color="#0b0f19" roughness={0.4} />
                  </mesh>
                  {/* Glowing Outer Neon Bezel Frame */}
                  <mesh position={[0, 3.6, 0.1]}>
                    <boxGeometry args={[4.84, 2.74, 0.04]} />
                    <meshBasicMaterial color="#06b6d4" />
                  </mesh>
                  {/* Illuminated High-Res Screen (Crystal Clear, True Color) */}
                  <mesh position={[0, 3.6, 0.12]}>
                    <planeGeometry args={[4.6, 2.5]} />
                    <meshBasicMaterial
                      map={billboardTexture || undefined}
                      color="#ffffff"
                      toneMapped={false}
                    />
                  </mesh>
                  {/* Overhead Dual Floodlight Bar */}
                  <mesh position={[0, 5.02, 0.2]}>
                    <boxGeometry args={[4.4, 0.1, 0.35]} />
                    <meshBasicMaterial color="#1e293b" />
                  </mesh>
                  <mesh position={[-1.3, 4.96, 0.28]}>
                    <sphereGeometry args={[0.14, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[1.3, 4.96, 0.28]}>
                    <sphereGeometry args={[0.14, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

// ========================================================
// 3D PLAYER RUNNER (SPHERES, LIGHTS, SKATEBOARDS, PETS & CHARACTERS)
// ========================================================
function PlayerBall({
  playerX,
  playerY,
  isJumping,
  isSliding,
  hasShield,
  hasMagnet,
  hasNitro = false,
  skin
}: {
  playerX: number;
  playerY: number;
  isJumping: boolean;
  isSliding: boolean;
  hasShield: boolean;
  hasMagnet: boolean;
  hasNitro?: boolean;
  skin: RunnerSkin;
}) {
  const runnerGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const magnetRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const animTimeRef = useRef<number>(0);

  useFrame((_, delta) => {
    animTimeRef.current += delta;
    const time = animTimeRef.current;

    if (runnerGroupRef.current) {
      runnerGroupRef.current.position.x = playerX;
      runnerGroupRef.current.position.y = isSliding ? playerY - 0.25 : playerY;
      runnerGroupRef.current.scale.y = isSliding ? 0.6 : 1;

      if (skin.modelType === 'skateboard') {
        runnerGroupRef.current.rotation.x = isJumping ? -0.35 : Math.sin(time * 12) * 0.04;
        runnerGroupRef.current.rotation.z = Math.sin(time * 8) * 0.06;
      } else if (
        skin.modelType === 'cat' ||
        skin.modelType === 'dog' ||
        skin.modelType === 'human' ||
        skin.modelType === 'baby' ||
        skin.modelType === 'ninja' ||
        skin.modelType === 'creator'
      ) {
        runnerGroupRef.current.rotation.x = isJumping ? -0.25 : 0;
        runnerGroupRef.current.rotation.y = Math.sin(time * 14) * 0.08;
      }
    }

    if (coreRef.current && (skin.modelType === 'ball' || skin.modelType === 'light_orb')) {
      coreRef.current.rotation.x += delta * (isJumping ? 18 : 14);
    }

    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * 4;
      ringRef1.current.rotation.y += delta * 2;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.x += delta * 3;
      ringRef2.current.rotation.z -= delta * 2.5;
    }

    if (shieldRef.current) {
      shieldRef.current.position.x = playerX;
      shieldRef.current.position.y = playerY;
      shieldRef.current.rotation.y += delta * 3;
    }
    if (magnetRef.current) {
      magnetRef.current.position.x = playerX;
      magnetRef.current.position.y = playerY;
      magnetRef.current.rotation.x += delta * 4;
    }
    if (shadowRef.current) {
      shadowRef.current.position.x = playerX;
      const shadowScale = Math.max(0.3, 1 - (playerY - 0.55) * 0.45);
      shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
    }
  });

  return (
    <group position={[0, 0, -2]}>
      {/* Dynamic Ground Shadow */}
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[skin.modelType === 'skateboard' ? 0.75 : 0.55, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>

      <group ref={runnerGroupRef} position={[0, 0.55, 0]}>
        {/* MODEL: BALL */}
        {skin.modelType === 'ball' && (
          <group>
            <mesh ref={coreRef} castShadow>
              <sphereGeometry args={[0.55, 32, 32]} />
              <meshStandardMaterial
                color={skin.color}
                emissive={skin.emissive}
                emissiveIntensity={0.8}
                metalness={0.85}
                roughness={0.15}
              />
            </mesh>
            <mesh ref={ringRef1} rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[0.78, 0.045, 16, 32]} />
              <meshBasicMaterial color={isJumping ? '#f59e0b' : skin.ring || '#06b6d4'} />
            </mesh>
          </group>
        )}

        {/* MODEL: PLASMA LIGHT ORB */}
        {skin.modelType === 'light_orb' && (
          <group>
            <mesh ref={coreRef}>
              <sphereGeometry args={[0.52, 32, 32]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={skin.emissive}
                emissiveIntensity={2.5}
                roughness={0.05}
              />
            </mesh>
            <mesh ref={ringRef1} rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[0.74, 0.04, 16, 32]} />
              <meshBasicMaterial color={skin.ring || '#38bdf8'} />
            </mesh>
            <mesh ref={ringRef2} rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
              <torusGeometry args={[0.84, 0.03, 16, 32]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <pointLight intensity={3.5} color={skin.emissive} distance={5} />
          </group>
        )}

        {/* MODEL: SKATEBOARD / HOVERBOARD */}
        {skin.modelType === 'skateboard' && (
          <group position={[0, -0.15, 0]}>
            {/* Deck */}
            <mesh castShadow>
              <boxGeometry args={[0.62, 0.08, 1.55]} />
              <meshStandardMaterial color={skin.color} roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Deck Grip Stripe */}
            <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.42, 1.35]} />
              <meshBasicMaterial color={skin.accentColor || '#38bdf8'} />
            </mesh>
            {/* 4 Hover Thrusters / Wheels */}
            {[-0.24, 0.24].map((xOff) =>
              [-0.48, 0.48].map((zOff) => (
                <group key={`${xOff}-${zOff}`} position={[xOff, -0.06, zOff]}>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
                    <meshStandardMaterial color={skin.emissive} emissive={skin.emissive} emissiveIntensity={1.8} />
                  </mesh>
                </group>
              ))
            )}
            {/* Twin Rear Turbo Thruster Exhausts */}
            {[-0.15, 0.15].map((xOff, i) => (
              <group key={i} position={[xOff, 0, 0.85]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.1, 0.35, 12]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* MODEL: CYBER CAT */}
        {skin.modelType === 'cat' && (
          <group position={[0, -0.1, 0]}>
            {/* Cat Body */}
            <mesh castShadow>
              <boxGeometry args={[0.48, 0.44, 0.78]} />
              <meshStandardMaterial color={skin.color} roughness={0.5} />
            </mesh>
            {/* Cat Head */}
            <group position={[0, 0.24, -0.42]}>
              <mesh castShadow>
                <boxGeometry args={[0.42, 0.38, 0.38]} />
                <meshStandardMaterial color={skin.color} roughness={0.5} />
              </mesh>
              {/* Pointed Ears */}
              {[-0.14, 0.14].map((ex, i) => (
                <mesh key={i} position={[ex, 0.26, 0]}>
                  <coneGeometry args={[0.08, 0.18, 4]} />
                  <meshStandardMaterial color={skin.accentColor || '#ec4899'} emissive={skin.accentColor || '#ec4899'} emissiveIntensity={1.2} />
                </mesh>
              ))}
              {/* Cyber Visor */}
              <mesh position={[0, 0.02, -0.2]}>
                <planeGeometry args={[0.3, 0.09]} />
                <meshBasicMaterial color="#22d3ee" />
              </mesh>
            </group>
            {/* 4 Running Paws */}
            {[-0.18, 0.18].map((px) =>
              [-0.26, 0.26].map((pz) => (
                <mesh key={`${px}-${pz}`} position={[px, -0.28, pz]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.22, 10]} />
                  <meshStandardMaterial color={skin.accentColor || '#38bdf8'} />
                </mesh>
              ))
            )}
            {/* Tail */}
            <mesh position={[0, 0.18, 0.46]} rotation={[-0.6, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.04, 0.45, 8]} />
              <meshStandardMaterial color={skin.emissive} emissive={skin.emissive} emissiveIntensity={1.5} />
            </mesh>
          </group>
        )}

        {/* MODEL: CYBER DOG */}
        {skin.modelType === 'dog' && (
          <group position={[0, -0.08, 0]}>
            {/* Dog Body */}
            <mesh castShadow>
              <boxGeometry args={[0.52, 0.46, 0.86]} />
              <meshStandardMaterial color={skin.color} roughness={0.4} />
            </mesh>
            {/* Dog Head with Snout */}
            <group position={[0, 0.24, -0.46]}>
              <mesh castShadow>
                <boxGeometry args={[0.42, 0.38, 0.38]} />
                <meshStandardMaterial color={skin.color} roughness={0.4} />
              </mesh>
              {/* Muzzle / Snout */}
              <mesh position={[0, -0.06, -0.24]}>
                <boxGeometry args={[0.22, 0.18, 0.2]} />
                <meshStandardMaterial color={skin.accentColor || '#f59e0b'} />
              </mesh>
              {/* Floppy Ears */}
              {[-0.22, 0.22].map((dx, i) => (
                <mesh key={i} position={[dx, 0.06, 0]} rotation={[0, 0, i === 0 ? 0.3 : -0.3]}>
                  <boxGeometry args={[0.1, 0.26, 0.18]} />
                  <meshStandardMaterial color={skin.accentColor || '#f59e0b'} />
                </mesh>
              ))}
              {/* Eye Visor */}
              <mesh position={[0, 0.08, -0.2]}>
                <planeGeometry args={[0.32, 0.08]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            </group>
            {/* 4 Cyber Paws */}
            {[-0.2, 0.2].map((px) =>
              [-0.28, 0.28].map((pz) => (
                <mesh key={`${px}-${pz}`} position={[px, -0.3, pz]}>
                  <cylinderGeometry args={[0.08, 0.08, 0.24, 10]} />
                  <meshStandardMaterial color={skin.emissive} emissive={skin.emissive} emissiveIntensity={1.2} />
                </mesh>
              ))
            )}
            {/* Wagging Tail */}
            <mesh position={[0, 0.25, 0.48]} rotation={[0.5, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.04, 0.38, 8]} />
              <meshStandardMaterial color={skin.color} />
            </mesh>
          </group>
        )}

        {/* MODEL: HUMAN STREET RUNNER */}
        {skin.modelType === 'human' && (
          <group position={[0, 0.05, 0]}>
            {/* Torso / Jacket */}
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.46, 0.52, 0.28]} />
              <meshStandardMaterial color={skin.color} roughness={0.6} />
            </mesh>
            {/* Head with Headphones */}
            <group position={[0, 0.58, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.2, 20, 20]} />
                <meshStandardMaterial color="#fcd34d" roughness={0.8} />
              </mesh>
              {/* Cyber Visor */}
              <mesh position={[0, 0.02, -0.18]}>
                <boxGeometry args={[0.26, 0.08, 0.06]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
              {/* Headphones */}
              <mesh position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.22, 0.04, 8, 16]} />
                <meshBasicMaterial color={skin.accentColor || '#ec4899'} />
              </mesh>
            </group>
            {/* Left & Right Running Arms */}
            <mesh position={[-0.32, 0.14, 0]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.1, 0.38, 0.12]} />
              <meshStandardMaterial color={skin.color} />
            </mesh>
            <mesh position={[0.32, 0.14, 0]} rotation={[-0.4, 0, 0]}>
              <boxGeometry args={[0.1, 0.38, 0.12]} />
              <meshStandardMaterial color={skin.color} />
            </mesh>
            {/* Left & Right Running Legs with Sneakers */}
            <mesh position={[-0.14, -0.28, 0]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.14, 0.44, 0.16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0.14, -0.28, 0]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.14, 0.44, 0.16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        )}

        {/* MODEL: ENNY - THE VIP CREATOR & MAESTRO (MATCHING PHOTO) */}
        {skin.modelType === 'creator' && (
          <group position={[0, 0.05, 0]}>
            {/* Torso: Grey Crewneck Knit Sweater */}
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.48, 0.52, 0.28]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>

            {/* Royal Purple Collared Shirt Peeking Out at Neck */}
            <group position={[0, 0.44, -0.02]}>
              {/* Left Collar Flap */}
              <mesh position={[-0.09, 0, -0.1]} rotation={[0.2, 0, 0.3]}>
                <boxGeometry args={[0.12, 0.08, 0.04]} />
                <meshStandardMaterial color="#9333ea" emissive="#9333ea" emissiveIntensity={0.6} />
              </mesh>
              {/* Right Collar Flap */}
              <mesh position={[0.09, 0, -0.1]} rotation={[0.2, 0, -0.3]}>
                <boxGeometry args={[0.12, 0.08, 0.04]} />
                <meshStandardMaterial color="#9333ea" emissive="#9333ea" emissiveIntensity={0.6} />
              </mesh>
              {/* Inner Purple Collar V-Neck Accent */}
              <mesh position={[0, -0.03, -0.12]}>
                <planeGeometry args={[0.12, 0.1]} />
                <meshStandardMaterial color="#7e22ce" />
              </mesh>
            </group>

            {/* Handsome Head with Clean Fade Haircut */}
            <group position={[0, 0.6, 0]}>
              {/* Face & Head */}
              <mesh castShadow>
                <sphereGeometry args={[0.2, 22, 22]} />
                <meshStandardMaterial color="#8d5b4c" roughness={0.8} />
              </mesh>
              {/* Clean Dark Fade Hairstyle */}
              <mesh position={[0, 0.08, 0.01]}>
                <sphereGeometry args={[0.205, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#171717" roughness={0.9} />
              </mesh>

              {/* Signature Rectangular Purple-Tinted Sunglasses */}
              <group position={[0, 0.03, -0.18]}>
                {/* Left Purple Lens */}
                <mesh position={[-0.08, 0, 0]}>
                  <boxGeometry args={[0.11, 0.07, 0.02]} />
                  <meshStandardMaterial
                    color="#a855f7"
                    emissive="#a855f7"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
                {/* Right Purple Lens */}
                <mesh position={[0.08, 0, 0]}>
                  <boxGeometry args={[0.11, 0.07, 0.02]} />
                  <meshStandardMaterial
                    color="#a855f7"
                    emissive="#a855f7"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
                {/* Silver Glasses Bridge & Temples */}
                <mesh position={[0, 0.015, 0]}>
                  <boxGeometry args={[0.07, 0.015, 0.02]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
                </mesh>
                <mesh position={[-0.14, 0.01, 0.08]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[0.16, 0.012, 0.01]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
                </mesh>
                <mesh position={[0.14, 0.01, 0.08]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[0.16, 0.012, 0.01]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
                </mesh>
              </group>
            </group>

            {/* Left Running Arm with Grey Sweater Sleeve + Purple Cuff + Luxury Silver Watch */}
            <group position={[-0.32, 0.16, 0]} rotation={[0.4, 0, 0]}>
              {/* Grey Sleeve */}
              <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[0.11, 0.32, 0.12]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              {/* Purple Shirt Cuff */}
              <mesh position={[0, -0.23, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.05, 10]} />
                <meshStandardMaterial color="#9333ea" emissive="#9333ea" emissiveIntensity={0.5} />
              </mesh>
              {/* Silver Luxury Watch on Left Wrist */}
              <group position={[0, -0.26, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.07, 0.035, 12]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
                </mesh>
                <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.015, 10]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </group>
              {/* Hand */}
              <mesh position={[0, -0.32, 0]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color="#8d5b4c" />
              </mesh>
            </group>

            {/* Right Running Arm */}
            <group position={[0.32, 0.16, 0]} rotation={[-0.4, 0, 0]}>
              <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[0.11, 0.32, 0.12]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              <mesh position={[0, -0.23, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.05, 10]} />
                <meshStandardMaterial color="#9333ea" emissive="#9333ea" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, -0.32, 0]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color="#8d5b4c" />
              </mesh>
            </group>

            {/* Tailored Dark Pants & Running Legs */}
            <mesh position={[-0.14, -0.26, 0]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.15, 0.44, 0.17]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.14, -0.26, 0]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.15, 0.44, 0.17]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* White & Purple Street Sneakers */}
            <mesh position={[-0.14, -0.5, 0.04]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.16, 0.1, 0.24]} />
              <meshStandardMaterial color="#ffffff" emissive="#a855f7" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0.14, -0.5, 0.04]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.16, 0.1, 0.24]} />
              <meshStandardMaterial color="#ffffff" emissive="#a855f7" emissiveIntensity={0.3} />
            </mesh>

            {/* Ambient Purple Creator Aura */}
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.6, 0.68, 24]} />
              <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
            </mesh>
          </group>
        )}

        {/* MODEL: BABY DASH (SUPER KID RUNNER) */}
        {skin.modelType === 'baby' && (
          <group position={[0, -0.05, 0]}>
            {/* Baby Onesie / Diaper Body */}
            <mesh position={[0, 0.12, 0]} castShadow>
              <sphereGeometry args={[0.34, 20, 20]} />
              <meshStandardMaterial color={skin.color} roughness={0.5} />
            </mesh>
            {/* Diaper band */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.34, 0.32, 0.14, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            {/* Baby Head */}
            <group position={[0, 0.46, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.26, 24, 24]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.7} />
              </mesh>
              {/* Baby Pacifier */}
              <group position={[0, -0.06, -0.24]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
                  <meshStandardMaterial color={skin.emissive} emissive={skin.emissive} emissiveIntensity={1.8} />
                </mesh>
                <mesh position={[0, 0, -0.05]}>
                  <torusGeometry args={[0.06, 0.02, 8, 16]} />
                  <meshBasicMaterial color={skin.accentColor || '#38bdf8'} />
                </mesh>
              </group>
              {/* Cute Big Eyes */}
              {[-0.09, 0.09].map((bx, i) => (
                <mesh key={i} position={[bx, 0.05, -0.23]}>
                  <sphereGeometry args={[0.045, 12, 12]} />
                  <meshBasicMaterial color="#0f172a" />
                </mesh>
              ))}
              {/* Baby Hero Headband */}
              <mesh position={[0, 0.12, 0]}>
                <torusGeometry args={[0.26, 0.025, 8, 20]} />
                <meshBasicMaterial color={skin.emissive} />
              </mesh>
            </group>
            {/* Superhero Mini Cape fluttering behind */}
            <mesh position={[0, 0.22, 0.32]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[0.36, 0.44, 0.04]} />
              <meshStandardMaterial color={skin.emissive} emissive={skin.emissive} emissiveIntensity={0.8} />
            </mesh>
            {/* Chubby Baby Arms */}
            <mesh position={[-0.26, 0.12, 0]} rotation={[0.3, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.24, 8]} />
              <meshStandardMaterial color="#fed7aa" />
            </mesh>
            <mesh position={[0.26, 0.12, 0]} rotation={[-0.3, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.24, 8]} />
              <meshStandardMaterial color="#fed7aa" />
            </mesh>
            {/* Chubby Baby Running Legs & Booties */}
            <mesh position={[-0.12, -0.22, 0]} rotation={[-0.3, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.09, 0.26, 10]} />
              <meshStandardMaterial color={skin.accentColor || '#38bdf8'} />
            </mesh>
            <mesh position={[0.12, -0.22, 0]} rotation={[0.3, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.09, 0.26, 10]} />
              <meshStandardMaterial color={skin.accentColor || '#38bdf8'} />
            </mesh>
          </group>
        )}

        {/* MODEL: CYBER NINJA */}
        {skin.modelType === 'ninja' && (
          <group position={[0, 0.05, 0]}>
            {/* Ninja Torso / Robe */}
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.44, 0.52, 0.26]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Neon Chest Emblem */}
            <mesh position={[0, 0.22, -0.14]}>
              <planeGeometry args={[0.18, 0.18]} />
              <meshBasicMaterial color={skin.emissive} />
            </mesh>
            {/* Masked Ninja Head */}
            <group position={[0, 0.58, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.2, 20, 20]} />
                <meshStandardMaterial color="#1e293b" roughness={0.3} />
              </mesh>
              {/* Glowing Visor Slit */}
              <mesh position={[0, 0.02, -0.18]}>
                <planeGeometry args={[0.24, 0.05]} />
                <meshBasicMaterial color={skin.emissive} />
              </mesh>
              {/* Headband Tails flowing back */}
              <mesh position={[0, 0.08, 0.22]} rotation={[-0.4, 0, 0]}>
                <boxGeometry args={[0.12, 0.35, 0.02]} />
                <meshBasicMaterial color={skin.emissive} />
              </mesh>
            </group>
            {/* Back Katana Sheath */}
            <mesh position={[0, 0.24, 0.18]} rotation={[0, 0, 0.6]}>
              <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.9} />
            </mesh>
            {/* Ninja Arms & Hands */}
            <mesh position={[-0.3, 0.16, 0]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.1, 0.38, 0.1]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.3, 0.16, 0]} rotation={[-0.4, 0, 0]}>
              <boxGeometry args={[0.1, 0.38, 0.1]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Ninja Legs */}
            <mesh position={[-0.14, -0.28, 0]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.12, 0.44, 0.14]} />
              <meshStandardMaterial color="#020617" />
            </mesh>
            <mesh position={[0.14, -0.28, 0]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.12, 0.44, 0.14]} />
              <meshStandardMaterial color="#020617" />
            </mesh>
          </group>
        )}
      </group>

      {/* SHIELD OVERLAY (Protects any runner model!) */}
      {hasShield && (
        <mesh ref={shieldRef} position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.96, 24, 24]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.4}
            transparent
            opacity={0.45}
            wireframe
          />
        </mesh>
      )}

      {/* MAGNET ENERGY RING */}
      {hasMagnet && (
        <mesh ref={magnetRef} position={[0, 0.55, 0]}>
          <torusGeometry args={[1.25, 0.05, 16, 32]} />
          <meshBasicMaterial color="#ec4899" />
        </mesh>
      )}

      {/* HYPER NITRO FLAME & SPEED TRAIL */}
      {hasNitro && (
        <group position={[0, 0.5, 0.8]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.45, 1.6, 16]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={3.5} transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.35]}>
            <coneGeometry args={[0.26, 1.1, 12]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.9} />
          </mesh>
          <mesh rotation={[0, 0, 0]} position={[0, 0, -0.4]}>
            <torusGeometry args={[0.9, 0.04, 12, 24]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ========================================================
// 3D MODEL PREVIEW SHOWCASE FOR PRO SKINS SHOP
// ========================================================
function SkinPreviewStage({ skin }: { skin: RunnerSkin }) {
  return (
    <div className="w-full h-36 bg-slate-950/90 rounded-2xl overflow-hidden border border-slate-800 relative mb-3 shadow-inner">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] text-cyan-300 font-bold shadow-md">
        <span>3D Preview:</span>
        <span className="text-white font-black">{skin.name}</span>
      </div>
      <div className="absolute top-2 right-2 z-10 text-[9px] text-amber-300 bg-amber-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/50 font-bold shadow-md">
        {skin.perk || 'Special Model'}
      </div>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.4, 3.8]} fov={48} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 8, 4]} intensity={2.2} />
        <pointLight position={[0, 2, 2]} intensity={2.5} color={skin.emissive} />
        <group position={[0, -0.15, 0]}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[1.3, 1.4, 0.1, 32]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.0, 1.25, 32]} />
            <meshBasicMaterial color={skin.emissive} />
          </mesh>
          <PlayerBall
            playerX={0}
            playerY={0.55}
            isJumping={false}
            isSliding={false}
            hasShield={false}
            hasMagnet={false}
            skin={skin}
          />
        </group>
      </Canvas>
    </div>
  );
}

// ========================================================
// ANIMATED 3D OBSTACLE MESHES (REFERENCE BOARD)
// ========================================================

// 9. Rolling Rock (Jump Over) - Continuously rolling cracked boulder
function RollingRockMesh({xPos, z}: {xPos: number; z: number}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x -= delta * 9;
    }
  });

  return (
    <group position={[xPos, 0.75, z]}>
      <mesh ref={meshRef} castShadow>
        <dodecahedronGeometry args={[0.74, 2]} />
        <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.2} flatShading />
      </mesh>
      {/* Cyan speed streak rings behind rolling rock */}
      {[-0.35, 0, 0.35].map((oy, i) => (
        <mesh key={i} position={[0, oy, 0.85]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.55 - i * 0.1, 0.02, 6, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.35 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

// 16. Swinging Ball (Jump or Move) - Pendulum demolition wrecking ball
function SwingingBallMesh({xPos, z}: {xPos: number; z: number}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.z = Math.sin(t * 3.2) * 0.65;
    }
  });

  return (
    <group position={[xPos, 3.8, z]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.6, 0.12, 0.6]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>
      <group ref={groupRef}>
        {Array.from({length: 8}).map((_, i) => (
          <mesh key={i} position={[0, -i * 0.32 - 0.2, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.28, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
        <group position={[0, -2.8, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.57, 12, 12]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.8} wireframe />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// 14. Flying Drone (Dodge Left/Right / Duck) - Hovering combat quadcopter
function FlyingDroneMesh({xPos, z}: {xPos: number; z: number}) {
  const rotorsRef = useRef<THREE.Group>(null);
  const droneRef = useRef<THREE.Group>(null);

  useFrame(({clock}, delta) => {
    const t = clock.getElapsedTime();
    if (droneRef.current) {
      droneRef.current.position.y = 1.3 + Math.sin(t * 4) * 0.12;
      droneRef.current.rotation.z = Math.sin(t * 3) * 0.08;
    }
    if (rotorsRef.current) {
      rotorsRef.current.children.forEach((c) => {
        c.rotation.y += delta * 24;
      });
    }
  });

  return (
    <group ref={droneRef} position={[xPos, 1.3, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.26]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4.5} />
      </mesh>
      <mesh position={[0, -0.65, 0.1]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 6]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
      </mesh>
      <group ref={rotorsRef}>
        {[
          [-0.45, 0.08, 0.3],
          [0.45, 0.08, 0.3],
          [-0.45, 0.08, -0.3],
          [0.45, 0.08, -0.3]
        ].map(([ax, ay, az], i) => (
          <group key={i} position={[ax, ay, az]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.18, 0.025, 8, 16]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2.5} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.32, 0.015, 0.04]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// 11. Jump Pad (High Jump) - Holographic launching pad
function JumpPadMesh({xPos, z}: {xPos: number; z: number}) {
  const chevronsRef = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (chevronsRef.current) {
      const t = clock.getElapsedTime();
      chevronsRef.current.position.y = 0.45 + Math.sin(t * 6) * 0.08;
      chevronsRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
    }
  });

  return (
    <group position={[xPos, 0, z]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.9, 0.98, 0.16, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.04, 16]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3.5} />
      </mesh>
      <group ref={chevronsRef} position={[0, 0.45, 0]}>
        {[0, 0.28, 0.56].map((cy, i) => (
          <mesh key={i} position={[0, cy, 0]}>
            <coneGeometry args={[0.26 - i * 0.03, 0.18, 4]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3.8 - i * 0.6} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// 12. Moving Platform (Jump On) - Floating thruster platform
function MovingPlatformMesh({xPos, z}: {xPos: number; z: number}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = 1.15 + Math.sin(t * 3) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[xPos, 1.15, z]}>
      <mesh castShadow>
        <boxGeometry args={[1.9, 0.2, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.94, 0.12, 2.24]} />
        <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.6} />
      </mesh>
      {[-0.55, 0.55].map((tx, i) => (
        <group key={i} position={[tx, -0.16, 0]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.06, 0.15, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <coneGeometry args={[0.15, 0.4, 8]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={4.0} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ========================================================
// 3D SUBWAY SURFERS OBSTACLES & LEVEL PROGRESSION BARRIERS
// ========================================================
function ObstaclesRenderer({obstacles}: {obstacles: ObstacleEntity[]}) {
  return (
    <group>
      {obstacles.map((obs) => {
        const xPos = LANE_COORDS[obs.lane + 1];

        // ========================================================
        // 20 NEON OBSTACLES (FROM USER REFERENCE BOARD)
        // ========================================================

        // 1. Barrier (Jump Over)
        if (obs.type === 'barrier' || obs.type === 'traffic_barrier') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 0.48, 0]} castShadow>
                <boxGeometry args={[1.88, 0.76, 0.34]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.52, 0.18]}>
                <planeGeometry args={[1.82, 0.6]} />
                <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.2} />
              </mesh>
              {[-0.6, -0.3, 0, 0.3, 0.6].map((sx, i) => (
                <mesh key={i} position={[sx, 0.52, 0.185]} rotation={[0, 0, Math.PI / 4]}>
                  <planeGeometry args={[0.14, 0.85]} />
                  <meshBasicMaterial color="#09090b" />
                </mesh>
              ))}
              {[-0.55, 0, 0.55].map((bx, i) => (
                <mesh key={i} position={[bx, 0.08, 0]}>
                  <boxGeometry args={[0.34, 0.16, 0.38]} />
                  <meshBasicMaterial color="#020617" />
                </mesh>
              ))}
            </group>
          );
        }

        // 2. Spikes (Jump Over)
        if (obs.type === 'spikes') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 0.07, 0]}>
                <boxGeometry args={[1.92, 0.14, 0.38]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[1.9, 0.04, 0.42]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.5} />
              </mesh>
              {[-0.68, -0.34, 0, 0.34, 0.68].map((sx, i) => (
                <mesh key={i} position={[sx, 0.52, 0]} castShadow>
                  <coneGeometry args={[0.15, 0.88, 12]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
                </mesh>
              ))}
            </group>
          );
        }

        // 3. Laser Beam (Crouch Under)
        if (obs.type === 'laser_beam') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.94, 0.94].map((sideX, i) => (
                <group key={i} position={[sideX, 0, 0]}>
                  <mesh position={[0, 0.72, 0]} castShadow>
                    <boxGeometry args={[0.16, 1.44, 0.22]} />
                    <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 0.72, 0.12]}>
                    <planeGeometry args={[0.06, 1.3]} />
                    <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={4.0} />
                  </mesh>
                  <mesh position={[0, 1.48, 0]}>
                    <sphereGeometry args={[0.08, 12, 12]} />
                    <meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={3.5} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.045, 0.045, 1.94, 16]} />
                <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={5.0} />
              </mesh>
              <mesh position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 1.96, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          );
        }

        // 4. Hanging Block (Slide Under)
        if (obs.type === 'hanging_block') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.6, 0.6].map((bx, i) => (
                <mesh key={i} position={[bx, 1.78, 0]}>
                  <boxGeometry args={[0.14, 0.7, 0.22]} />
                  <meshStandardMaterial color="#334155" metalness={0.8} />
                </mesh>
              ))}
              <group position={[0, 1.45, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[1.88, 0.44, 0.48]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.25]}>
                  <planeGeometry args={[1.82, 0.38]} />
                  <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={1.6} />
                </mesh>
                {[-0.6, -0.3, 0, 0.3, 0.6].map((sx, i) => (
                  <mesh key={i} position={[sx, 0, 0.255]} rotation={[0, 0, Math.PI / 4]}>
                    <planeGeometry args={[0.12, 0.55]} />
                    <meshBasicMaterial color="#09090b" />
                  </mesh>
                ))}
              </group>
            </group>
          );
        }

        // 5. Truck (Jump Over / Dodge)
        if (obs.type === 'truck') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 1.45, 0]} castShadow>
                <boxGeometry args={[1.86, 2.3, 4.4]} />
                <meshStandardMaterial color="#3b0764" roughness={0.4} metalness={0.5} />
              </mesh>
              <mesh position={[0, 1.45, 2.21]}>
                <planeGeometry args={[1.76, 2.1]} />
                <meshStandardMaterial color="#581c87" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.45, 2.22]}>
                <boxGeometry args={[0.04, 2.1, 0.02]} />
                <meshBasicMaterial color="#cbd5e1" />
              </mesh>
              {[-0.65, 0.65].map((lx, i) => (
                <mesh key={i} position={[lx, 0.48, 2.23]}>
                  <boxGeometry args={[0.3, 0.12, 0.04]} />
                  <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={3.5} />
                </mesh>
              ))}
              {[-0.92, 0.92].map((wx, i) => (
                <group key={i}>
                  <mesh position={[wx, 0.35, 1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.34, 0.34, 0.25, 12]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.9} />
                  </mesh>
                  <mesh position={[wx, 0.35, -1.2]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.34, 0.34, 0.25, 12]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.9} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        }

        // 6. Car (Jump Over)
        if (obs.type === 'cyber_car') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 0.38, 0]} castShadow>
                <boxGeometry args={[1.68, 0.5, 3.2]} />
                <meshStandardMaterial color="#1d4ed8" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, 0.72, -0.2]}>
                <boxGeometry args={[1.28, 0.36, 1.5]} />
                <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.05} transparent opacity={0.8} />
              </mesh>
              <mesh position={[0, 0.48, 1.62]}>
                <boxGeometry args={[1.5, 0.08, 0.04]} />
                <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={4.0} />
              </mesh>
              <mesh position={[0, 0.78, 1.45]}>
                <boxGeometry args={[1.55, 0.06, 0.25]} />
                <meshStandardMaterial color="#1e3a8a" metalness={0.8} />
              </mesh>
            </group>
          );
        }

        // 7. Side Wall (Move Left/Right)
        if (obs.type === 'side_wall') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 1.05, 0]} castShadow>
                <boxGeometry args={[1.92, 2.1, 0.36]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.05, 0.19]}>
                <planeGeometry args={[1.6, 1.6]} />
                <meshStandardMaterial color="#c026d3" emissive="#a21caf" emissiveIntensity={3.5} transparent opacity={0.9} />
              </mesh>
              {[-0.88, 0.88].map((lx, i) => (
                <group key={i} position={[lx, 1.05, 0.19]}>
                  {[-0.6, -0.2, 0.2, 0.6].map((ly, j) => (
                    <mesh key={j} position={[0, ly, 0]}>
                      <sphereGeometry args={[0.06, 8, 8]} />
                      <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={3.5} />
                    </mesh>
                  ))}
                </group>
              ))}
            </group>
          );
        }

        // 8. Gap (Jump Over)
        if (obs.type === 'gap') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, -0.15, 0]}>
                <boxGeometry args={[2.0, 0.3, 2.6]} />
                <meshStandardMaterial color="#020617" roughness={1.0} />
              </mesh>
              <mesh position={[0, 0.08, 1.25]}>
                <boxGeometry args={[1.94, 0.18, 0.2]} />
                <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.8} />
              </mesh>
              <mesh position={[0, 0.08, -1.25]}>
                <boxGeometry args={[1.94, 0.18, 0.2]} />
                <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.8} />
              </mesh>
            </group>
          );
        }

        // 9. Rolling Rock (Jump Over)
        if (obs.type === 'rolling_rock') {
          return <RollingRockMesh key={obs.id} xPos={xPos} z={obs.z} />;
        }

        // 10. Low Tunnel (Crouch Under)
        if (obs.type === 'low_tunnel') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.92, 0.92].map((px, i) => (
                <mesh key={i} position={[px, 0.58, 0]} castShadow>
                  <boxGeometry args={[0.22, 1.16, 1.6]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
              <mesh position={[0, 1.25, 0]} castShadow>
                <boxGeometry args={[2.06, 0.28, 1.6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
              </mesh>
              {[-0.82, 0.82].map((px, i) => (
                <mesh key={i} position={[px, 0.55, 0.82]}>
                  <boxGeometry args={[0.06, 1.05, 0.06]} />
                  <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={4.0} />
                </mesh>
              ))}
              <mesh position={[0, 1.12, 0.82]}>
                <boxGeometry args={[1.7, 0.06, 0.06]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={4.0} />
              </mesh>
              <mesh position={[0, 1.32, 0.82]}>
                <planeGeometry args={[1.96, 0.16]} />
                <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.5} />
              </mesh>
            </group>
          );
        }

        // 11. Jump Pad (High Jump)
        if (obs.type === 'jump_pad') {
          return <JumpPadMesh key={obs.id} xPos={xPos} z={obs.z} />;
        }

        // 12. Moving Platform (Jump On)
        if (obs.type === 'moving_platform') {
          return <MovingPlatformMesh key={obs.id} xPos={xPos} z={obs.z} />;
        }

        // 13. Electric Fence (Jump Over)
        if (obs.type === 'electric_fence') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.94, 0.94].map((px, i) => (
                <group key={i} position={[px, 0, 0]}>
                  <mesh position={[0, 0.65, 0]} castShadow>
                    <cylinderGeometry args={[0.06, 0.08, 1.3, 10]} />
                    <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                  </mesh>
                  {[0.35, 0.7, 1.05].map((ry, j) => (
                    <mesh key={j} position={[0, ry, 0]}>
                      <torusGeometry args={[0.1, 0.025, 8, 16]} />
                      <meshStandardMaterial color="#0284c7" metalness={0.8} />
                    </mesh>
                  ))}
                </group>
              ))}
              {[0.35, 0.7, 1.05].map((ly, j) => (
                <group key={j} position={[0, ly, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.028, 0.028, 1.88, 8]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={4.5} />
                  </mesh>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.012, 0.012, 1.9, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              ))}
            </group>
          );
        }

        // 14. Flying Drone (Dodge Left/Right / Duck)
        if (obs.type === 'flying_drone') {
          return <FlyingDroneMesh key={obs.id} xPos={xPos} z={obs.z} />;
        }

        // 15. Stack of Boxes (Jump Over)
        if (obs.type === 'stack_boxes') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.45, 0.45].map((bx, i) => (
                <mesh key={i} position={[bx, 0.38, 0]} castShadow>
                  <boxGeometry args={[0.76, 0.76, 0.76]} />
                  <meshStandardMaterial color="#b45309" roughness={0.8} />
                </mesh>
              ))}
              <mesh position={[0, 1.14, 0]} castShadow>
                <boxGeometry args={[0.74, 0.74, 0.74]} />
                <meshStandardMaterial color="#92400e" roughness={0.8} />
              </mesh>
            </group>
          );
        }

        // 16. Swinging Ball (Jump or Move)
        if (obs.type === 'swinging_ball') {
          return <SwingingBallMesh key={obs.id} xPos={xPos} z={obs.z} />;
        }

        // 17. Narrow Path (Stay Center)
        if (obs.type === 'narrow_path') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.78, 0.78].map((bx, i) => (
                <group key={i} position={[bx, 0, 0]}>
                  <mesh position={[0, 0.45, 0]} castShadow>
                    <boxGeometry args={[0.24, 0.9, 3.2]} />
                    <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 0.92, 0]}>
                    <boxGeometry args={[0.26, 0.06, 3.2]} />
                    <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={3.5} />
                  </mesh>
                  {[-1.0, 0, 1.0].map((lz, j) => (
                    <mesh key={j} position={[0, 0.45, lz]}>
                      <sphereGeometry args={[0.06, 8, 8]} />
                      <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={3.0} />
                    </mesh>
                  ))}
                </group>
              ))}
            </group>
          );
        }

        // 18. Water Pool (Jump Over)
        if (obs.type === 'water_pool') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[1.96, 0.16, 2.6]} />
                <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={2.0} metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.86, 2.5]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.5} roughness={0.05} metalness={0.9} transparent opacity={0.85} />
              </mesh>
            </group>
          );
        }

        // 19. Collapsing Bridge (Quick Move)
        if (obs.type === 'collapsing_bridge') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {[-0.55, 0.55].map((sx, i) => (
                <mesh key={i} position={[sx, 0.12, 0]} castShadow>
                  <boxGeometry args={[0.82, 0.18, 2.6]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
              ))}
              {[-0.95, 0.95].map((bx, i) => (
                <mesh key={i} position={[bx, 0.18, 0]}>
                  <boxGeometry args={[0.08, 0.08, 2.6]} />
                  <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={2.0} />
                </mesh>
              ))}
            </group>
          );
        }

        // 20. High Wall (Climb / High Jump)
        if (obs.type === 'high_wall') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[0, 1.8, 0]} castShadow>
                <boxGeometry args={[1.92, 3.6, 0.38]} />
                <meshStandardMaterial color="#4c1d95" metalness={0.8} roughness={0.2} />
              </mesh>
              {[-0.32, 0.32].map((lx, i) => (
                <mesh key={i} position={[lx, 1.8, 0.22]}>
                  <boxGeometry args={[0.04, 3.5, 0.04]} />
                  <meshStandardMaterial color="#c026d3" emissive="#a21caf" emissiveIntensity={3.5} />
                </mesh>
              ))}
              {Array.from({length: 9}).map((_, i) => (
                <mesh key={i} position={[0, 0.4 + i * 0.36, 0.22]}>
                  <boxGeometry args={[0.62, 0.04, 0.04]} />
                  <meshStandardMaterial color="#e879f9" emissive="#c026d3" emissiveIntensity={3.5} />
                </mesh>
              ))}
              {[1.2, 2.2].map((ay, i) => (
                <mesh key={i} position={[0.65, ay, 0.22]}>
                  <coneGeometry args={[0.16, 0.24, 4]} />
                  <meshStandardMaterial color="#d946ef" emissive="#a21caf" emissiveIntensity={3.0} />
                </mesh>
              ))}
            </group>
          );
        }

        if (obs.type === 'train_block') {
          return (
            <group key={obs.id} position={[xPos, 1.3, obs.z]}>
              <mesh castShadow>
                <boxGeometry args={[1.9, 2.4, 4.8]} />
                <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.45, 2.42]}>
                <planeGeometry args={[1.6, 0.9]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'low_hurdle') {
          return (
            <group key={obs.id} position={[xPos, 0.35, obs.z]}>
              <mesh castShadow>
                <boxGeometry args={[1.85, 0.48, 0.35]} />
                <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.8} />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'fire_pit') {
          return (
            <group key={obs.id} position={[xPos, 0.2, obs.z]}>
              <mesh>
                <boxGeometry args={[1.9, 0.25, 1.4]} />
                <meshStandardMaterial color="#292524" roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[1.75, 0.08, 1.25]} />
                <meshStandardMaterial color="#ef4444" emissive="#ea580c" emissiveIntensity={3.0} />
              </mesh>
              {[-0.65, -0.32, 0, 0.32, 0.65].map((xOff, i) => (
                <group key={i} position={[xOff, 0.45, (i % 2 === 0 ? 0.2 : -0.2)]}>
                  <mesh>
                    <coneGeometry args={[0.26, 0.95, 8]} />
                    <meshBasicMaterial color={i % 2 === 0 ? '#f97316' : '#ef4444'} />
                  </mesh>
                  <mesh position={[0, -0.1, 0]}>
                    <coneGeometry args={[0.16, 0.6, 8]} />
                    <meshBasicMaterial color="#fef08a" />
                  </mesh>
                </group>
              ))}
            </group>
          );
        }

        if (obs.type === 'water_hazard') {
          return (
            <group key={obs.id} position={[xPos, 0.08, obs.z]}>
              <mesh>
                <boxGeometry args={[1.95, 0.16, 2.8]} />
                <meshStandardMaterial color="#0369a1" roughness={0.1} metalness={0.9} />
              </mesh>
              <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.88, 2.7]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={1.4}
                  roughness={0.05}
                  metalness={0.8}
                  transparent
                  opacity={0.85}
                />
              </mesh>
              {[-0.8, 0.8].map((bx, i) => (
                <group key={i} position={[bx, 0.22, 0]}>
                  <mesh>
                    <torusGeometry args={[0.15, 0.06, 8, 16]} />
                    <meshBasicMaterial color="#facc15" />
                  </mesh>
                  <mesh position={[0, 0.12, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
                    <meshBasicMaterial color="#ef4444" />
                  </mesh>
                </group>
              ))}
            </group>
          );
        }

        if (obs.type === 'wooden_logs') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              <mesh position={[-0.45, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.95, 12]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              <mesh position={[0.45, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.95, 12]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.58, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.23, 0.23, 1.85, 12]} />
                <meshStandardMaterial color="#92400e" roughness={0.85} />
              </mesh>
              {[-0.6, 0.6].map((sx, i) => (
                <mesh key={i} position={[sx, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.42, 0.03, 8, 16]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
                </mesh>
              ))}
            </group>
          );
        }

        if (obs.type === 'glass_barrier') {
          return (
            <group key={obs.id} position={[xPos, 0.9, obs.z]}>
              <mesh>
                <boxGeometry args={[1.85, 1.8, 0.2]} />
                <meshStandardMaterial color="#06b6d4" emissive="#22d3ee" emissiveIntensity={1.5} transparent opacity={0.7} />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'neon_sticks') {
          return (
            <group key={obs.id} position={[xPos, 0.7, obs.z]}>
              {[-0.6, 0, 0.6].map((xOff, i) => (
                <mesh key={i} position={[xOff, 0, 0]}>
                  <cylinderGeometry args={[0.1, 0.1, 1.6, 12]} />
                  <meshBasicMaterial color={i === 1 ? '#a855f7' : '#06b6d4'} />
                </mesh>
              ))}
            </group>
          );
        }

        if (obs.type === 'broken_bottle') {
          return (
            <group key={obs.id} position={[xPos, 0.4, obs.z]}>
              {Array.from({length: 4}).map((_, i) => (
                <mesh key={i} position={[(i - 1.5) * 0.4, 0, 0]} rotation={[0.3, i * 0.8, 0.2]}>
                  <coneGeometry args={[0.2, 0.7, 8]} />
                  <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={2.0} />
                </mesh>
              ))}
            </group>
          );
        }

        if (obs.type === 'broken_road_gap') {
          return (
            <group key={obs.id} position={[xPos, 0.08, obs.z]}>
              <mesh>
                <boxGeometry args={[1.9, 0.18, 2.4]} />
                <meshStandardMaterial color="#020617" roughness={1.0} />
              </mesh>
              <mesh position={[0, 0.1, 1.1]}>
                <boxGeometry args={[1.85, 0.2, 0.1]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
              <mesh position={[0, 0.1, -1.1]}>
                <boxGeometry args={[1.85, 0.2, 0.1]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
            </group>
          );
        }

        // ========================================================
        // SLIDABLE OVERHEAD BARRIERS (HIGH STICK / GATES WITH SPACE UNDER)
        // ========================================================
        if (obs.type === 'overhead_stick') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {/* Left & Right Support Upright Posts */}
              {[-0.95, 0.95].map((sideX, i) => (
                <group key={i} position={[sideX, 0, 0]}>
                  {/* Heavy Base Footing */}
                  <mesh position={[0, 0.06, 0]}>
                    <boxGeometry args={[0.22, 0.12, 0.22]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.7} />
                  </mesh>
                  {/* Upright Pole */}
                  <mesh position={[0, 0.78, 0]} castShadow>
                    <cylinderGeometry args={[0.045, 0.05, 1.44, 12]} />
                    <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
                  </mesh>
                  {/* Flashing Amber Warning Light on top of post */}
                  <mesh position={[0, 1.54, 0]}>
                    <sphereGeometry args={[0.09, 12, 12]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={3.0} />
                  </mesh>
                </group>
              ))}

              {/* The Elevated Stick Barrier - Suspended horizontally in the air at y = 1.45 */}
              <group position={[0, 1.45, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.075, 0.075, 1.98, 16]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} roughness={0.3} />
                </mesh>

                {/* Alternating Black Hazard Warning Stripes on Stick */}
                {[-0.65, -0.35, 0, 0.35, 0.65].map((bx, idx) => (
                  <mesh key={idx} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.078, 0.078, 0.12, 16]} />
                    <meshBasicMaterial color="#09090b" />
                  </mesh>
                ))}

                {/* Central "MOVE BELOW" chevron plate hanging on the stick */}
                <mesh position={[0, -0.12, 0.08]}>
                  <boxGeometry args={[0.7, 0.18, 0.02]} />
                  <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={1.8} />
                </mesh>
              </group>

              {/* Hanging Warning Tails / Fringe Strips */}
              {[-0.6, -0.3, 0, 0.3, 0.6].map((tx, idx) => (
                <group key={idx} position={[tx, 1.25, 0]}>
                  {/* Connector link */}
                  <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
                    <meshBasicMaterial color="#94a3b8" />
                  </mesh>
                  {/* Hanging rubber warning tail / flap dangling down to y=1.05 */}
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.08, 0.34, 0.02]} />
                    <meshStandardMaterial
                      color={idx % 2 === 0 ? '#ef4444' : '#f59e0b'}
                      emissive={idx % 2 === 0 ? '#dc2626' : '#d97706'}
                      emissiveIntensity={1.6}
                      roughness={0.4}
                    />
                  </mesh>
                </group>
              ))}

              {/* Road Ground Clearance Guide: Clearly open space beneath the stick */}
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.4, 0.7]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.22} />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'overhead_gate') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {/* Left and Right Arch Truss Columns */}
              {[-0.94, 0.94].map((sideX, i) => (
                <group key={i} position={[sideX, 0, 0]}>
                  <mesh position={[0, 0.8, 0]} castShadow>
                    <boxGeometry args={[0.16, 1.6, 0.22]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, 1.65, 0]}>
                    <sphereGeometry args={[0.1, 12, 12]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
                  </mesh>
                </group>
              ))}

              {/* Overhead Heavy Gantry Crossbeam at y = 1.55 */}
              <group position={[0, 1.55, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[2.08, 0.26, 0.3]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Yellow hazard warning stripe along beam */}
                <mesh position={[0, 0, 0.16]}>
                  <planeGeometry args={[1.98, 0.18]} />
                  <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={1.5} />
                </mesh>
              </group>

              {/* Hanging Clearance Limit Stick at y = 1.34 */}
              <group position={[0, 1.34, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.05, 0.05, 1.9, 12]} />
                  <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
                </mesh>
              </group>

              {/* Dangling clearance tails */}
              {[-0.55, -0.2, 0.2, 0.55].map((tx, idx) => (
                <mesh key={idx} position={[tx, 1.18, 0]}>
                  <boxGeometry args={[0.07, 0.26, 0.02]} />
                  <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={1.4} />
                </mesh>
              ))}

              {/* Ground guide */}
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.3, 0.6]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'high_laser_stick') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {/* Side Cyber Pylons */}
              {[-0.94, 0.94].map((sideX, i) => (
                <group key={i} position={[sideX, 0, 0]}>
                  <mesh position={[0, 0.72, 0]}>
                    <cylinderGeometry args={[0.07, 0.09, 1.44, 12]} />
                    <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[0, 1.48, 0]}>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3.5} />
                  </mesh>
                </group>
              ))}

              {/* High glowing laser beam stick at y = 1.4 */}
              <group position={[0, 1.4, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.05, 0.05, 1.95, 16]} />
                  <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={4.0} />
                </mesh>
                {/* Glowing laser core */}
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.025, 0.025, 1.96, 16]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>

              {/* Energy plasma tails dangling from laser stick */}
              {[-0.5, 0, 0.5].map((tx, idx) => (
                <mesh key={idx} position={[tx, 1.22, 0]}>
                  <cylinderGeometry args={[0.015, 0.02, 0.28, 8]} />
                  <meshStandardMaterial color="#a855f7" emissive="#9333ea" emissiveIntensity={2.5} />
                </mesh>
              ))}

              {/* Underneath projection showing slide zone */}
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.3, 0.6]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.25} />
              </mesh>
            </group>
          );
        }

        if (obs.type === 'overhead_pipe') {
          return (
            <group key={obs.id} position={[xPos, 0, obs.z]}>
              {/* Scaffolding legs */}
              {[-0.94, 0.94].map((sideX, i) => (
                <group key={i} position={[sideX, 0, 0]}>
                  <mesh position={[0, 0.75, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
                  </mesh>
                </group>
              ))}

              {/* Industrial pipeline held aloft at y = 1.44 */}
              <group position={[0, 1.44, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.09, 0.09, 1.96, 16]} />
                  <meshStandardMaterial color="#ea580c" roughness={0.5} />
                </mesh>
                {/* Metallic pipe rings */}
                {[-0.6, -0.2, 0.2, 0.6].map((rx, idx) => (
                  <mesh key={idx} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <torusGeometry args={[0.1, 0.02, 8, 16]} />
                    <meshStandardMaterial color="#f1f5f9" metalness={0.9} roughness={0.2} />
                  </mesh>
                ))}
              </group>

              {/* Dangling safety ribbons / tails */}
              {[-0.5, -0.15, 0.15, 0.5].map((tx, idx) => (
                <mesh key={idx} position={[tx, 1.2, 0]}>
                  <boxGeometry args={[0.06, 0.32, 0.015]} />
                  <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={1.5} />
                </mesh>
              ))}
            </group>
          );
        }

        return (
          <group key={obs.id} position={[xPos, 0.65, obs.z]}>
            <mesh castShadow>
              <boxGeometry args={[1.9, 1.2, 0.42]} />
              <meshStandardMaterial color="#ea580c" roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ========================================================
// 3D COLLECTIBLES (COINS, MULTIPLIERS, MAGNETS, SHIELDS)
// ========================================================
function CollectiblesRenderer({items}: {items: CollectibleEntity[]}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((c) => {
        c.rotation.y += delta * 4.5;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {items.map((item) => {
        if (item.collected) return null;
        const xPos = LANE_COORDS[item.lane + 1];

        if (item.type === 'shield') {
          return (
            <group key={item.id} position={[xPos, 0.85, item.z]}>
              <mesh>
                <sphereGeometry args={[0.42, 20, 20]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.2} />
              </mesh>
            </group>
          );
        }

        if (item.type === 'magnet') {
          return (
            <group key={item.id} position={[xPos, 0.85, item.z]}>
              <mesh>
                <torusGeometry args={[0.38, 0.08, 16, 24, Math.PI]} />
                <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={2.5} />
              </mesh>
            </group>
          );
        }

        if (item.type === 'nitro') {
          return (
            <group key={item.id} position={[xPos, 0.85, item.z]}>
              <mesh>
                <octahedronGeometry args={[0.42, 0]} />
                <meshStandardMaterial color="#f59e0b" emissive="#ea580c" emissiveIntensity={3.0} />
              </mesh>
              <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.2, 0.45, 8]} />
                <meshBasicMaterial color="#a855f7" />
              </mesh>
            </group>
          );
        }

        if (item.type === 'multiplier_coin') {
          const isThree = item.multiplier === 3;
          return (
            <group key={item.id} position={[xPos, 0.65, item.z]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.12, 20]} />
                <meshStandardMaterial color={isThree ? '#10b981' : '#ec4899'} emissive={isThree ? '#059669' : '#db2777'} emissiveIntensity={2.2} />
              </mesh>
            </group>
          );
        }

        return (
          <group key={item.id} position={[xPos, 0.65, item.z]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.4, 0.4, 0.1, 20]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ========================================================
// 60FPS GAME ENGINE CONTROLLER
// ========================================================
function GameEngine({
  gameState,
  gameSpeed,
  playerX,
  playerY,
  isSliding,
  roadLayoutMode,
  hasShield,
  hasMagnet,
  hasNitro = false,
  onCrash,
  onCollectCoin,
  onCollectShield,
  onCollectMagnet,
  onCollectNitro,
  onSmashObstacle,
  onJumpOverHurdle,
  onSlideUnderObstacle,
  onTriggerSuperJump,
  onAdvanceDistance,
  level,
  obstacleBaseInterval = 2200,
  obstacleSpawnRate = 1.0
}: {
  gameState: 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  gameSpeed: number;
  playerX: number;
  playerY: number;
  isSliding: boolean;
  roadLayoutMode: '3_ROADS' | '2_ROADS' | '1_ROAD';
  hasShield: boolean;
  hasMagnet: boolean;
  hasNitro?: boolean;
  onCrash: () => void;
  onCollectCoin: (multiplier: number) => void;
  onCollectShield: () => void;
  onCollectMagnet: () => void;
  onCollectNitro: () => void;
  onSmashObstacle: () => void;
  onJumpOverHurdle: () => void;
  onSlideUnderObstacle: () => void;
  onTriggerSuperJump: () => void;
  onAdvanceDistance: (dist: number) => void;
  level: number;
  obstacleBaseInterval?: number;
  obstacleSpawnRate?: number;
}) {
  const [obstacles, setObstacles] = useState<ObstacleEntity[]>([]);
  const [collectibles, setCollectibles] = useState<CollectibleEntity[]>([]);

  const lastObstacleSpawn = useRef<number>(0);
  const lastCoinSpawn = useRef<number>(0);
  const lastShieldSpawnTime = useRef<number>(0);
  const distanceSinceLastShield = useRef<number>(0);
  const nextId = useRef<number>(1000);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const initObstacles: ObstacleEntity[] = [
        {id: 1, lane: 0, z: -45, type: 'laser_beam', width: 1.8, height: 1.2, color: '#f43f5e'},
        {id: 2, lane: 1, z: -70, type: 'spikes', width: 1.8, height: 1.2, color: '#ef4444'},
        {id: 3, lane: -1, z: -95, type: 'jump_pad', width: 1.8, height: 1.2, color: '#06b6d4'}
      ];
      const initCoins: CollectibleEntity[] = [
        {id: 101, lane: 0, z: -14, type: 'coin', multiplier: 2, collected: false},
        {id: 102, lane: 0, z: -22, type: 'multiplier_coin', multiplier: 2, collected: false},
        {id: 103, lane: 0, z: -30, type: 'coin', multiplier: 2, collected: false},
        {id: 104, lane: 0, z: -38, type: 'multiplier_coin', multiplier: 3, collected: false},
        {id: 105, lane: 0, z: -46, type: 'shield', collected: false},
        {id: 106, lane: -1, z: -56, type: 'magnet', collected: false}
      ];

      setObstacles(initObstacles);
      setCollectibles(initCoins);

      lastObstacleSpawn.current = Date.now() + 2200;
      lastCoinSpawn.current = Date.now();
      lastShieldSpawnTime.current = Date.now();
      distanceSinceLastShield.current = 0;
    } else {
      setObstacles([]);
      setCollectibles([]);
    }
  }, [gameState]);

  useFrame((_, delta) => {
    if (gameState !== 'PLAYING') return;

    const moveDistance = delta * gameSpeed;
    onAdvanceDistance(moveDistance);
    distanceSinceLastShield.current += moveDistance;

    const now = Date.now();

    // Dynamically tuned obstacle interval from Game Master controls & level progression!
    const baseInterval = obstacleBaseInterval || 2200;
    const rate = obstacleSpawnRate || 1.0;
    let obstacleInterval = baseInterval / rate;
    if (level === 1) {
      obstacleInterval = baseInterval / rate;
    } else if (level === 2) {
      obstacleInterval = (baseInterval * 0.84) / rate;
    } else if (level >= 3 && level < 5) {
      obstacleInterval = (baseInterval * 0.72) / rate;
    } else if (level >= 5 && level < 10) {
      obstacleInterval = (baseInterval * 0.63) / rate;
    } else {
      obstacleInterval = (baseInterval * 0.54) / rate;
    }

    if (now - lastObstacleSpawn.current > obstacleInterval) {
      lastObstacleSpawn.current = now;

      // Spawn lane according to roadLayoutMode
      let lane = 0;
      if (roadLayoutMode === '3_ROADS') {
        lane = Math.floor(Math.random() * 3) - 1;
      } else if (roadLayoutMode === '2_ROADS') {
        lane = Math.random() < 0.5 ? -1 : 1;
      } else {
        lane = 0;
      }

      // Barrier types according to level progression & 20 Reference Obstacles
      let types: ObstacleEntity['type'][] = ['barrier', 'spikes', 'laser_beam', 'hanging_block', 'jump_pad'];
      if (roadLayoutMode === '1_ROAD') {
        // In 1_ROAD gauntlet: strictly jumpable, slidable, or jump pad
        const jumpList: ObstacleEntity['type'][] = ['barrier', 'spikes', 'gap', 'rolling_rock', 'electric_fence', 'stack_boxes', 'collapsing_bridge'];
        const slideList: ObstacleEntity['type'][] = ['laser_beam', 'hanging_block', 'low_tunnel', 'overhead_stick'];
        types = Math.random() < 0.45 ? slideList : Math.random() < 0.85 ? jumpList : ['jump_pad', 'flying_drone'];
      } else if (level >= 1 && level < 3) {
        types = ['barrier', 'spikes', 'laser_beam', 'hanging_block', 'stack_boxes', 'jump_pad', 'cyber_car'];
      } else if (level >= 3 && level < 6) {
        types = ['barrier', 'spikes', 'laser_beam', 'hanging_block', 'rolling_rock', 'low_tunnel', 'jump_pad', 'electric_fence', 'moving_platform', 'truck'];
      } else if (level >= 6 && level < 10) {
        types = ['barrier', 'spikes', 'laser_beam', 'hanging_block', 'gap', 'rolling_rock', 'low_tunnel', 'jump_pad', 'flying_drone', 'swinging_ball', 'water_pool', 'side_wall'];
      } else {
        // Full array of all 20 reference obstacles!
        types = [
          'barrier', 'spikes', 'laser_beam', 'hanging_block', 'truck',
          'cyber_car', 'side_wall', 'gap', 'rolling_rock', 'low_tunnel',
          'jump_pad', 'moving_platform', 'electric_fence', 'flying_drone', 'stack_boxes',
          'swinging_ball', 'narrow_path', 'water_pool', 'collapsing_bridge', 'high_wall'
        ];
      }

      const chosenType = types[Math.floor(Math.random() * types.length)];
      nextId.current += 1;

      setObstacles((prev) => [
        ...prev,
        {
          id: nextId.current,
          lane,
          z: -92,
          type: chosenType,
          width: 1.8,
          height: 1.2,
          color: '#ea580c'
        }
      ]);
    }

    // Shield strict limits: At least 8 seconds and 250 meters since last shield spawn
    if (now - lastCoinSpawn.current > 750) {
      lastCoinSpawn.current = now;
      let coinLane = 0;
      if (roadLayoutMode === '3_ROADS') {
        coinLane = Math.floor(Math.random() * 3) - 1;
      } else if (roadLayoutMode === '2_ROADS') {
        coinLane = Math.random() < 0.5 ? -1 : 1;
      } else {
        coinLane = 0;
      }

      const canSpawnShield = !hasShield && (now - lastShieldSpawnTime.current > 8000 || distanceSinceLastShield.current > 250);
      const rand = Math.random();

      let itemType: CollectibleEntity['type'] = 'coin';
      let multiplier = 2;

      if (canSpawnShield && rand < 0.12) {
        itemType = 'shield';
        lastShieldSpawnTime.current = now;
        distanceSinceLastShield.current = 0;
      } else if (!hasNitro && rand >= 0.12 && rand < 0.22) {
        itemType = 'nitro';
      } else if (!hasMagnet && rand >= 0.22 && rand < 0.32) {
        itemType = 'magnet';
      } else if (rand >= 0.32 && rand < 0.65) {
        itemType = 'multiplier_coin';
        multiplier = Math.random() < 0.5 ? 2 : 3;
      } else {
        itemType = 'coin';
        multiplier = 2;
      }

      nextId.current += 1;

      setCollectibles((prev) => [
        ...prev,
        {
          id: nextId.current,
          lane: coinLane,
          z: -85,
          type: itemType,
          multiplier,
          collected: false
        }
      ]);
    }

    const playerZ = -2;

    setObstacles((prev) => {
      const nextList: ObstacleEntity[] = [];
      for (const obs of prev) {
        const nextZ = obs.z + moveDistance;
        const targetX = LANE_COORDS[obs.lane + 1];
        const distToPlayerX = Math.abs(playerX - targetX);
        const distToPlayerZ = Math.abs(nextZ - playerZ);

        // 11. Jump Pad (High Jump) - Boost player into super jump!
        if (obs.type === 'jump_pad' && distToPlayerZ < 1.35 && distToPlayerX < 0.95) {
          if (!obs.clearedJump) {
            obs.clearedJump = true;
            onTriggerSuperJump();
          }
        } else if (distToPlayerZ < 1.35 && distToPlayerX < 0.95) {
          // If Nitro Boost is active, smash right through obstacle!
          if (hasNitro) {
            onSmashObstacle();
            continue;
          }

          const isJumpable =
            obs.type === 'barrier' ||
            obs.type === 'spikes' ||
            obs.type === 'gap' ||
            obs.type === 'rolling_rock' ||
            obs.type === 'electric_fence' ||
            obs.type === 'stack_boxes' ||
            obs.type === 'water_pool' ||
            obs.type === 'collapsing_bridge' ||
            obs.type === 'cyber_car' ||
            obs.type === 'moving_platform' ||
            obs.type === 'low_hurdle' ||
            obs.type === 'fire_pit' ||
            obs.type === 'water_hazard' ||
            obs.type === 'wooden_logs' ||
            obs.type === 'broken_road_gap';

          const isSlidable =
            obs.type === 'laser_beam' ||
            obs.type === 'hanging_block' ||
            obs.type === 'low_tunnel' ||
            obs.type === 'overhead_stick' ||
            obs.type === 'overhead_gate' ||
            obs.type === 'high_laser_stick' ||
            obs.type === 'overhead_pipe';

          if (obs.type === 'high_wall') {
            // High wall: cleared with super jump (playerY > 1.8) or regular jump (playerY > 1.0)
            if (playerY > 1.0) {
              if (!obs.clearedJump) {
                obs.clearedJump = true;
                onJumpOverHurdle();
              }
            } else {
              onCrash();
              return [];
            }
          } else if (obs.type === 'flying_drone') {
            // Drone: can slide/duck below or high jump over
            if (isSliding || playerY > 1.8) {
              if (!obs.clearedJump) {
                obs.clearedJump = true;
                onSlideUnderObstacle();
              }
            } else {
              onCrash();
              return [];
            }
          } else if (obs.type === 'swinging_ball') {
            // Swinging ball: can jump over
            if (playerY > 1.0) {
              if (!obs.clearedJump) {
                obs.clearedJump = true;
                onJumpOverHurdle();
              }
            } else {
              onCrash();
              return [];
            }
          } else if (isJumpable) {
            if (playerY > 1.0) {
              if (!obs.clearedJump) {
                obs.clearedJump = true;
                onJumpOverHurdle();
              }
            } else {
              onCrash();
              return [];
            }
          } else if (isSlidable) {
            // Must MOVE BELOW / slide UNDER the elevated obstacle
            if (isSliding) {
              if (!obs.clearedJump) {
                obs.clearedJump = true;
                onSlideUnderObstacle();
              }
            } else {
              // Running upright or jumping slams into the overhead obstacle
              onCrash();
              return [];
            }
          } else {
            // Solid obstacles like truck, side_wall - must dodge laterally!
            onCrash();
            return [];
          }
        }

        if (nextZ < 8) {
          nextList.push({...obs, z: nextZ});
        }
      }
      return nextList;
    });

    setCollectibles((prev) => {
      const nextList: CollectibleEntity[] = [];
      let playerLaneIndex = 0;
      let minLaneDist = 999;
      LANE_COORDS.forEach((xCoord, idx) => {
        const d = Math.abs(playerX - xCoord);
        if (d < minLaneDist) {
          minLaneDist = d;
          playerLaneIndex = idx - 1;
        }
      });

      for (const c of prev) {
        if (c.collected) continue;
        let nextZ = c.z + moveDistance;
        let targetLane = c.lane;

        const isPulling = (hasMagnet || hasNitro) && (c.type === 'coin' || c.type === 'multiplier_coin');
        if (isPulling && nextZ < 4 && nextZ > -15) {
          if (c.lane !== playerLaneIndex) {
            targetLane = c.lane + (playerLaneIndex > c.lane ? 0.2 : -0.2);
          }
          nextZ += (playerZ - nextZ) * 0.16;
        }

        const targetX = LANE_COORDS[Math.round(targetLane + 1)];
        const distToPlayerX = Math.abs(playerX - targetX);
        const distToPlayerZ = Math.abs(nextZ - playerZ);
        const pickupRange = (hasMagnet || hasNitro) && (c.type === 'coin' || c.type === 'multiplier_coin') ? 3.4 : 1.2;

        if (distToPlayerZ < pickupRange && distToPlayerX < ((hasMagnet || hasNitro) ? 2.6 : 0.95)) {
          if (c.type === 'shield') {
            onCollectShield();
          } else if (c.type === 'magnet') {
            onCollectMagnet();
          } else if (c.type === 'nitro') {
            onCollectNitro();
          } else if (c.type === 'multiplier_coin') {
            onCollectCoin(c.multiplier || 2);
          } else {
            onCollectCoin(2);
          }
          continue;
        }

        if (nextZ < 8) {
          nextList.push({...c, lane: Math.round(targetLane), z: nextZ});
        }
      }
      return nextList;
    });
  });

  return (
    <group>
      <ObstaclesRenderer obstacles={obstacles} />
      <CollectiblesRenderer items={collectibles} />
    </group>
  );
}

// ========================================================
// MAIN COMPONENT
// ========================================================
export default function ThreeDRunner() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('MENU');
  const [score, setScore] = useState<number>(0);
  const [coinsCount, setCoinsCount] = useState<number>(0);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [hasMagnet, setHasMagnet] = useState<boolean>(false);
  const [level, setLevel] = useState<number>(1);
  const [purchasedSkins, setPurchasedSkins] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_purchased_skins');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (!parsed.includes('enny_creator')) parsed.push('enny_creator');
        return parsed;
      }
    } catch {}
    return ['cyan', 'plasma_light', 'gold', 'enny_creator'];
  });

  const [selectedSkin, setSelectedSkin] = useState<RunnerSkin>(() => {
    try {
      const storedId = localStorage.getItem('neon_runner_selected_skin');
      const hasAutoEquippedCreator = localStorage.getItem('neon_runner_enny_autoequipped');
      if (!hasAutoEquippedCreator) {
        localStorage.setItem('neon_runner_enny_autoequipped', 'true');
        const creator = RUNNER_SKINS.find((s) => s.id === 'enny_creator');
        if (creator) {
          localStorage.setItem('neon_runner_selected_skin', 'enny_creator');
          return creator;
        }
      }
      if (storedId) {
        const found = RUNNER_SKINS.find((s) => s.id === storedId);
        if (found) return found;
      }
    } catch {}
    const creatorSkin = RUNNER_SKINS.find((s) => s.id === 'enny_creator');
    return creatorSkin || RUNNER_SKINS[0];
  });

  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [showObstaclesModal, setShowObstaclesModal] = useState<boolean>(false);
  const [showRevenueModal, setShowRevenueModal] = useState<boolean>(false);
  const [showDailyRewardsModal, setShowDailyRewardsModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showPWAModal, setShowPWAModal] = useState<boolean>(false);

  // Hyper Nitro Boost power-up state
  const [hasNitro, setHasNitro] = useState<boolean>(false);
  const [nitroTimeLeft, setNitroTimeLeft] = useState<number>(0);
  const nitroTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nitroCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Progressive Web App (PWA) installation
  const { isInstallable, isInstalled, isIOS, install: triggerPWAInstall } = usePWAInstall();

  const [gameAccount, setGameAccount] = useState<{ type: 'player' | 'admin' | 'guest'; username: string } | null>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_game_account');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });
  const [authRole, setAuthRole] = useState<'player' | 'admin' | 'guest'>('player');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [gameSettings, setGameSettings] = useState<GameMasterSettings>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_game_settings');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_GAME_SETTINGS;
  });
  const [showAdminDashboardModal, setShowAdminDashboardModal] = useState<boolean>(false);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('neon_runner_is_admin') === 'true';
    } catch { return false; }
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');

  // Live Firestore gameConfig sync across all devices
  useEffect(() => {
    try {
      const configDoc = doc(db, 'gameConfig', 'global');
      const unsubscribe = onSnapshot(configDoc, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setGameSettings((prev) => {
            const nextSettings: GameMasterSettings = {
              baseRunnerSpeed: typeof data.baseRunnerSpeed === 'number' ? data.baseRunnerSpeed : prev.baseRunnerSpeed,
              obstacleInterval: typeof data.obstacleInterval === 'number' ? data.obstacleInterval : prev.obstacleInterval,
              obstacleSpawnRate: typeof data.obstacleSpawnRate === 'number' ? data.obstacleSpawnRate : prev.obstacleSpawnRate,
              welcomeBonus: typeof data.welcomeBonus === 'number' ? data.welcomeBonus : prev.welcomeBonus,
              coinMultiplier: typeof data.coinMultiplier === 'number' ? data.coinMultiplier : prev.coinMultiplier,
              spinLineChance: typeof data.spinLineChance === 'number' ? data.spinLineChance : prev.spinLineChance,
              spinPrizes: data.spinPrizes ? JSON.parse(data.spinPrizes) : prev.spinPrizes,
              announcement: data.announcement ? JSON.parse(data.announcement) : prev.announcement,
            };
            try {
              localStorage.setItem('neon_runner_game_settings', JSON.stringify(nextSettings));
            } catch {}
            return nextSettings;
          });
        }
      }, (err) => {
        console.warn('Firestore gameConfig note:', err.message);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not attach Firestore gameConfig listener:', err);
    }
  }, []);

  // Check Firebase Auth state: auto-unlock owner dashboard if user email matches ennyriche001@gmail.com
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'ennyriche001@gmail.com') {
        setIsAdminUnlocked(true);
        try {
          localStorage.setItem('neon_runner_is_admin', 'true');
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authRole === 'admin') {
      if (authUsername.trim() === 'admin123' && authPassword === 'admin12345678') {
        const userObj = { type: 'admin' as const, username: authUsername.trim() };
        setGameAccount(userObj);
        setIsAdminUnlocked(true);
        setShowAdminDashboardModal(true);
        try {
          localStorage.setItem('neon_runner_game_account', JSON.stringify(userObj));
          localStorage.setItem('neon_runner_is_admin', 'true');
        } catch {}
        playSfx('levelup');
        setMilestoneToast("👑 Welcome Admin (admin123)");
        setTimeout(() => setMilestoneToast(null), 2500);
      } else {
        playSfx('crash');
        setAuthError('Invalid Admin Username or Password. Please check your credentials.');
      }
    } else if (authRole === 'player') {
      if (!authUsername.trim() || !authPassword) {
        setAuthError('Please enter both username and password.');
        return;
      }
      try {
        const registeredUsers = JSON.parse(localStorage.getItem('neon_runner_players_db') || '{}');
        if (authTab === 'register') {
          if (registeredUsers[authUsername.trim()]) {
            setAuthError('Username already exists. Please login instead.');
            return;
          }
          // Register new player account
          registeredUsers[authUsername.trim()] = authPassword;
          localStorage.setItem('neon_runner_players_db', JSON.stringify(registeredUsers));

          // Fresh new account state: high score 0, highest level 0, tuned welcome coins
          setHighScore(0);
          setHighestLevel(0);
          try {
            localStorage.setItem('neon_runner_high_score', '0');
            localStorage.setItem('neon_runner_highest_level', '0');
          } catch {}

          const welcomeCoins = gameSettings.welcomeBonus;
          setTotalCoins(welcomeCoins);
          setWelcomeBonusClaimed(true);
          try {
            localStorage.setItem('neon_runner_total_coins', welcomeCoins.toString());
            localStorage.setItem('neon_runner_welcome_claimed', 'true');
          } catch {}

          const defaultSkins = ['cyan', 'plasma_light', 'gold'];
          setPurchasedSkins(defaultSkins);
          setSelectedSkin(RUNNER_SKINS[0]);
          try {
            localStorage.setItem('neon_runner_purchased_skins', JSON.stringify(defaultSkins));
            localStorage.setItem('neon_runner_selected_skin', RUNNER_SKINS[0].id);
          } catch {}

          // Write to Firestore users collection so the live player roster immediately updates
          try {
            setDoc(doc(db, 'users', authUsername.trim()), {
              username: authUsername.trim(),
              role: 'player',
              walletBalance: welcomeCoins,
              bestLevel: 1,
              highScore: 0,
              createdAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              lastActiveDate: new Date().toISOString().split('T')[0],
              isOnline: true
            }, { merge: true }).catch(() => {});
          } catch {}

          playSfx('levelup');
          setMilestoneToast(`🎉 Account Created! +${welcomeCoins.toLocaleString()} Welcome Coins Awarded! 🎁`);
          setTimeout(() => setMilestoneToast(null), 3000);
        } else {
          // Login check: must be registered first
          if (!registeredUsers[authUsername.trim()]) {
            playSfx('crash');
            setAuthError('Account not found! Please create an account first.');
            return;
          }
          if (registeredUsers[authUsername.trim()] !== authPassword) {
            playSfx('crash');
            setAuthError('Incorrect password! Please check your credentials.');
            return;
          }

          // Update active timestamp in Firestore
          try {
            setDoc(doc(db, 'users', authUsername.trim()), {
              username: authUsername.trim(),
              lastActiveAt: new Date().toISOString(),
              lastActiveDate: new Date().toISOString().split('T')[0],
              isOnline: true
            }, { merge: true }).catch(() => {});
          } catch {}

          playSfx('levelup');
          setMilestoneToast(`🎮 Welcome Back, ${authUsername.trim()}!`);
          setTimeout(() => setMilestoneToast(null), 2500);
        }

        const userObj = { type: 'player' as const, username: authUsername.trim() };
        setGameAccount(userObj);
        setIsAdminUnlocked(false);
        try {
          localStorage.setItem('neon_runner_game_account', JSON.stringify(userObj));
          localStorage.removeItem('neon_runner_is_admin');
        } catch {}
      } catch (err) {
        setAuthError('Authentication error occurred.');
      }
    } else if (authRole === 'guest') {
      const guestName = authUsername.trim() || `Guest_${Math.floor(Math.random() * 9000 + 1000)}`;
      const userObj = { type: 'guest' as const, username: guestName };
      setGameAccount(userObj);
      setIsAdminUnlocked(false);
      try {
        localStorage.setItem('neon_runner_game_account', JSON.stringify(userObj));
        localStorage.removeItem('neon_runner_is_admin');
      } catch {}
      playSfx('levelup');
      setMilestoneToast(`👋 Welcome Guest (${guestName})!`);
      setTimeout(() => setMilestoneToast(null), 2500);
    }
  };

  const handleLogoutAccount = () => {
    setGameAccount(null);
    setIsAdminUnlocked(false);
    try {
      localStorage.removeItem('neon_runner_game_account');
      localStorage.removeItem('neon_runner_is_admin');
    } catch {}
    playSfx('click' as any);
    setMilestoneToast("🔒 Logged out successfully");
    setTimeout(() => setMilestoneToast(null), 2000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === '1234' || adminPinInput === '0000' || adminPinInput === 'admin') {
      setIsAdminUnlocked(true);
      try {
        localStorage.setItem('neon_runner_is_admin', 'true');
      } catch {}
      setShowAdminLoginModal(false);
      setShowAdminDashboardModal(true);
      setAdminPinInput('');
      setMilestoneToast("👑 Admin Owner Command Center Unlocked!");
      setTimeout(() => setMilestoneToast(null), 2500);
      playSfx('levelup');
    } else {
      playSfx('crash');
      setMilestoneToast("⚠️ Incorrect Admin PIN! (Default: 1234)");
      setTimeout(() => setMilestoneToast(null), 2500);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminUnlocked(false);
    try {
      localStorage.removeItem('neon_runner_is_admin');
    } catch {}
    setMilestoneToast("🔒 Locked to Player View");
    setTimeout(() => setMilestoneToast(null), 2000);
    playSfx('click' as any);
  };
  const [developerEarningsUSD, setDeveloperEarningsUSD] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('neon_runner_dev_earnings') || '1428.50');
    } catch { return 1428.50; }
  });
  const [adImpressionsCount, setAdImpressionsCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_runner_ad_impressions') || '48200', 10);
    } catch { return 48200; }
  });
  const [billboardSponsors, setBillboardSponsors] = useState<BillboardSponsor[]>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_billboard_sponsors');
      if (stored) {
        const parsed: BillboardSponsor[] = JSON.parse(stored);
        if (!parsed.some((s) => s.id === 'sponsor-enny-riche')) {
          return [DEFAULT_BILLBOARD_SPONSORS[0], ...parsed];
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_BILLBOARD_SPONSORS;
  });
  const [adConfig, setAdConfig] = useState<AdNetworkConfig>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_ad_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      provider: 'adinplay',
      publisherId: 'neon-runner-web-01',
      rewardedSlotId: 'rewarded-revive-01',
      interstitialSlotId: 'interstitial-gameover-01',
      status: 'live'
    };
  });
  const [showRewardedAdModal, setShowRewardedAdModal] = useState<boolean>(false);

  const handleRewardAdCompleted = () => {
    const nextUSD = developerEarningsUSD + 0.04;
    const nextImpressions = adImpressionsCount + 1;
    setDeveloperEarningsUSD(nextUSD);
    setAdImpressionsCount(nextImpressions);
    try {
      localStorage.setItem('neon_runner_dev_earnings', nextUSD.toFixed(2));
      localStorage.setItem('neon_runner_ad_impressions', nextImpressions.toString());
    } catch {}

    setHasShield(true);
    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    shieldTimerRef.current = setTimeout(() => {
      setHasShield(false);
      setMilestoneToast("⚠️ Shield expired (6s limit)!");
      setTimeout(() => setMilestoneToast(null), 2000);
    }, 6000);

    setGameState('PLAYING');
    if (audioElementRef.current) audioElementRef.current.play().catch(() => {});
    playSfx('shield');
    setMilestoneToast("🎉 Rewarded Ad Completed! Revived with 6s Shield & +$0.04 Recorded! 🛡️");
    setTimeout(() => setMilestoneToast(null), 3000);
  };
  const [shopCategory, setShopCategory] = useState<'all' | 'balls' | 'skateboards' | 'characters' | 'pets'>('all');
  const [previewSkin, setPreviewSkin] = useState<RunnerSkin>(() => {
    try {
      const storedId = localStorage.getItem('neon_runner_selected_skin');
      if (storedId) {
        const found = RUNNER_SKINS.find((s) => s.id === storedId);
        if (found) return found;
      }
    } catch {}
    return RUNNER_SKINS[0];
  });
  const [welcomeBonusClaimed, setWelcomeBonusClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('neon_runner_welcome_claimed') === 'true';
    } catch {
      return false;
    }
  });
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_runner_high_score') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [totalCoins, setTotalCoins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_runner_total_coins') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [highestLevel, setHighestLevel] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_runner_highest_level') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [totalDistance, setTotalDistance] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('neon_runner_total_distance') || '0', 10);
    } catch { return 0; }
  });
  const [claimedChallenges, setClaimedChallenges] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('neon_runner_claimed_challenges');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });
  const [showChallengesModal, setShowChallengesModal] = useState<boolean>(false);
  const [showTournamentsModal, setShowTournamentsModal] = useState<boolean>(false);
  const [showSpinModal, setShowSpinModal] = useState<boolean>(false);
  const [showGachaModal, setShowGachaModal] = useState<boolean>(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [gachaResult, setGachaResult] = useState<RunnerSkin | null>(null);

  const SPIN_PRIZES = useMemo(() => {
    return gameSettings.spinPrizes && gameSettings.spinPrizes.length > 0
      ? gameSettings.spinPrizes
      : DEFAULT_SPIN_PRIZES;
  }, [gameSettings.spinPrizes]);

  const [spinAvailable, setSpinAvailable] = useState<boolean>(true);

  useEffect(() => {
    try {
      const username = gameAccount?.username || 'guest';
      const lastSpin = localStorage.getItem(`neon_runner_last_spin_date_${username}`);
      const today = new Date().toDateString();
      setSpinAvailable(lastSpin !== today);
    } catch {
      setSpinAvailable(true);
    }
  }, [gameAccount]);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isFreeRespin, setIsFreeRespin] = useState<boolean>(false);

  const handleSpinWheel = () => {
    if (!spinAvailable || isSpinning) return;
    setIsSpinning(true);
    setSpinResult(null);
    playSfx('click' as any);

    // Tuned probability to land right on the divider line between sectors for free respin!
    const lineProbability = (gameSettings.spinLineChance || 22) / 100;
    const landsOnLine = Math.random() < lineProbability;
    const extraSpins = 360 * 5;
    const baseRotation = wheelRotation - (wheelRotation % 360);
    const segmentAngle = 360 / SPIN_PRIZES.length;

    if (landsOnLine) {
      // Pick a divider line (k * 45 deg)
      const lineIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
      const lineAngle = lineIndex * segmentAngle;
      // To place lineAngle under top pointer (0 deg):
      const targetDelta = (360 - lineAngle) % 360;
      const targetRotation = baseRotation + extraSpins + targetDelta;
      setWheelRotation(targetRotation);

      const prevSector = SPIN_PRIZES[(lineIndex - 1 + SPIN_PRIZES.length) % SPIN_PRIZES.length].label;
      const nextSector = SPIN_PRIZES[lineIndex].label;

      setTimeout(() => {
        setIsSpinning(false);
        setIsFreeRespin(true);
        // Free re-spin! Daily spin is NOT consumed
        setSpinAvailable(true);
        setSpinResult(`⚖️ Landed right on the line between ${prevSector} and ${nextSector}! You get a FREE RE-SPIN! Spin again! 🎯`);
        playSfx('levelup');
      }, 3000);
    } else {
      const randomIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
      const prize = SPIN_PRIZES[randomIndex];
      const sectorCenter = randomIndex * segmentAngle + segmentAngle / 2;
      // Controlled jitter inside the sector so it never touches the border line
      const jitter = (Math.random() - 0.5) * 8;
      const targetDelta = (360 - (sectorCenter + jitter)) % 360;
      const targetRotation = baseRotation + extraSpins + targetDelta;
      setWheelRotation(targetRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setIsFreeRespin(false);
        setSpinAvailable(false);
        const nextTotal = totalCoins + prize.points;
        setTotalCoins(nextTotal);
        try {
          localStorage.setItem('neon_runner_total_coins', nextTotal.toString());
          const username = gameAccount?.username || 'guest';
          localStorage.setItem(`neon_runner_last_spin_date_${username}`, new Date().toDateString());
        } catch {}
        setSpinResult(`🎉 Amazing! You won +${prize.points.toLocaleString()} Points on the Lucky Spin!`);
        playSfx('coin');
      }, 3000);
    }
  };

  const handleOpenGachaBox = () => {
    const COST = 50000;
    if (totalCoins < COST) {
      setMilestoneToast('❌ Need 50,000 Coins to open a Mystery Crate!');
      setTimeout(() => setMilestoneToast(null), 2500);
      return;
    }
    const nextTotal = totalCoins - COST;
    setTotalCoins(nextTotal);
    try {
      localStorage.setItem('neon_runner_total_coins', nextTotal.toString());
    } catch {}

    const unowned = RUNNER_SKINS.filter((s) => !purchasedSkins.includes(s.id) && s.price > 0);
    if (unowned.length === 0) {
      setMilestoneToast('✨ You already own all shop skins! Bonus +100k coins awarded!');
      setTotalCoins(nextTotal + 100000);
      return;
    }
    const prizeSkin = unowned[Math.floor(Math.random() * unowned.length)];
    const nextPurchased = [...purchasedSkins, prizeSkin.id];
    setPurchasedSkins(nextPurchased);
    try {
      localStorage.setItem('neon_runner_purchased_skins', JSON.stringify(nextPurchased));
    } catch {}
    setGachaResult(prizeSkin);
    playSfx('levelup');
  };

  const handleClaimChallenge = (challengeId: string, rewardCoins: number) => {
    if (claimedChallenges.includes(challengeId)) return;
    const nextClaimed = [...claimedChallenges, challengeId];
    setClaimedChallenges(nextClaimed);
    try {
      localStorage.setItem('neon_runner_claimed_challenges', JSON.stringify(nextClaimed));
    } catch {}

    const newTotal = totalCoins + rewardCoins;
    setTotalCoins(newTotal);
    try {
      localStorage.setItem('neon_runner_total_coins', newTotal.toString());
    } catch {}

    playSfx('coin');
    setMilestoneToast(`🏆 Claimed +${rewardCoins.toLocaleString()} Coins Challenge Reward!`);
    setTimeout(() => setMilestoneToast(null), 3000);
  };


  // Squad Battle Royale ("Squad Rush") states
  const [squadMembers, setSquadMembers] = useState<Array<{name: string; level: number; status: 'Ready' | 'Waiting'}>>([
    { name: 'You (Leader)', level: highestLevel, status: 'Ready' },
    { name: 'OmahFan99', level: 9, status: 'Ready' },
    { name: 'Afreaks_King', level: 14, status: 'Ready' },
    { name: 'LagosRunner', level: 7, status: 'Ready' }
  ]);
  const [squadMatchRunning, setSquadMatchRunning] = useState<boolean>(false);
  const [squadResult, setSquadResult] = useState<{rank: number; reward: number; message: string} | null>(null);

  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isWatchingAd, setIsWatchingAd] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showMultiplayer, setShowMultiplayer] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // New User Settings states
  const [graphicsQuality, setGraphicsQuality] = useState<'High' | 'Medium' | 'Low'>('High');
  const [controlSensitivity, setControlSensitivity] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Powerup timers
  const shieldTimerRef = useRef<any>(null);
  const magnetTimerRef = useRef<any>(null);

  // Audio / Song states & Artist Catalog
  const [selectedSong, setSelectedSong] = useState<RealSongItem>(INITIAL_SONG);
  const [searchedSongs, setSearchedSongs] = useState<RealSongItem[]>([
    INITIAL_SONG,
    {
      id: 'omah_understand',
      title: 'Understand (Afrobeat Club Mix)',
      artist: 'Omah Lay',
      album: 'Boy Alone',
      artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
      duration: 180,
      durationFormatted: '3:00',
      tempo: 108,
      genre: 'Afrobeats',
      year: '2023'
    },
    {
      id: 'omah_holy_ghost',
      title: 'Holy Ghost (Fire Dance Mix)',
      artist: 'Omah Lay',
      album: 'Holy Ghost Single',
      artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
      duration: 195,
      durationFormatted: '3:15',
      tempo: 115,
      genre: 'Afrobeats',
      year: '2024'
    },
    {
      id: 'omah_bad_influence',
      title: 'Bad Influence (Acoustic Beats)',
      artist: 'Omah Lay',
      album: 'Get Layd',
      artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
      duration: 172,
      durationFormatted: '2:52',
      tempo: 100,
      genre: 'Afrobeats',
      year: '2020'
    },
    {
      id: 'omah_reason',
      title: 'Reason (Summer Groove)',
      artist: 'Omah Lay',
      album: 'Boy Alone Deluxe',
      artworkUrl: 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
      previewUrl: 'https://discoveryprovider.audius.co/v1/tracks/KdYw2BO/stream?app_name=neon_runner',
      duration: 190,
      durationFormatted: '3:10',
      tempo: 110,
      genre: 'Afrobeats',
      year: '2023'
    }
  ]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [currentArtistName, setCurrentArtistName] = useState<string>('Omah Lay');
  const [searchInput, setSearchInput] = useState<string>('Omah Lay');
  const [audioProgress, setAudioProgress] = useState<{current: number; total: number}>({current: 0, total: 208});
  const [audioError, setAudioError] = useState<string | null>(null);

  // Multiplayer Rooms & Chat states
  const [multiplayerTab, setMultiplayerTab] = useState<'LOBBY' | 'ROOM_LIST' | 'ROOM' | 'SQUAD_RUSH'>('LOBBY');
  const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
  const [roomChatMessages, setRoomChatMessages] = useState<Array<{user: string; text: string; time: string}>>([
    { user: 'SosoFan99', text: 'Anyone playing Level 10?', time: 'Just now' },
    { user: 'NeonMaster', text: 'Beat high score 5200 points!', time: '1m ago' }
  ]);
  const [chatInputText, setChatInputText] = useState<string>('');

  // Player position & physics
  const [currentLane, setCurrentLane] = useState<number>(0);
  const [playerTargetX, setPlayerTargetX] = useState<number>(0);
  const [playerY, setPlayerY] = useState<number>(0.55);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const jumpVelocity = useRef<number>(0);
  const [gameSpeed, setGameSpeed] = useState<number>(18);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [roadLayoutMode, setRoadLayoutMode] = useState<'3_ROADS' | '2_ROADS' | '1_ROAD'>('3_ROADS');

  // Dynamic Level 20+ road transformations:
  // Sequence: 2_ROADS (12s) -> 3_ROADS (12s) -> 2_ROADS (12s) -> 1_ROAD (12s) -> 3_ROADS (12s)...
  const roadCycleIndexRef = useRef<number>(0);
  useEffect(() => {
    if (gameState !== 'PLAYING' || level < 20) {
      setRoadLayoutMode('3_ROADS');
      roadCycleIndexRef.current = 0;
      return;
    }

    const CYCLE: Array<'2_ROADS' | '3_ROADS' | '2_ROADS' | '1_ROAD' | '3_ROADS'> = [
      '2_ROADS',
      '3_ROADS',
      '2_ROADS',
      '1_ROAD',
      '3_ROADS'
    ];

    const timer = setInterval(() => {
      roadCycleIndexRef.current = (roadCycleIndexRef.current + 1) % CYCLE.length;
      const nextMode = CYCLE[roadCycleIndexRef.current];
      setRoadLayoutMode(nextMode);

      if (nextMode === '2_ROADS') {
        setMilestoneToast("⚡ DOUBLE ROAD (2 LANES)! Left & Right Only (Middle Closed)!");
        setCurrentLane((prev) => {
          if (prev === 0) {
            const shift = Math.random() < 0.5 ? -1 : 1;
            setPlayerTargetX(LANE_COORDS[shift + 1]);
            return shift;
          }
          return prev;
        });
      } else if (nextMode === '1_ROAD') {
        setMilestoneToast("⚠️ SINGLE ROAD RUNWAY! Jump & Drag Down / Move Below Obstacles!");
        setCurrentLane(0);
        setPlayerTargetX(LANE_COORDS[1]);
      } else {
        setMilestoneToast("🛣️ TRIPLE ROAD! All 3 Lanes Reopened!");
      }
      setTimeout(() => setMilestoneToast(null), 2500);
    }, 12000);

    return () => clearInterval(timer);
  }, [gameState, level]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSfx = useCallback((type: 'jump' | 'coin' | 'shield' | 'crash' | 'levelup' | 'slide') => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'jump') {
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'slide') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.26);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'coin') {
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'shield') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'levelup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.5, now + 0.24);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {}
  }, [isMuted, getAudioContext]);

  const triggerSlide = useCallback(() => {
    if (isSliding || gameState !== 'PLAYING') return;
    setIsSliding(true);
    playSfx('slide');
    setTimeout(() => setIsSliding(false), 650);
  }, [isSliding, gameState, playSfx]);

  const triggerJump = useCallback(() => {
    if (isJumping || gameState !== 'PLAYING') return;
    setIsJumping(true);
    jumpVelocity.current = 15;
    playSfx('jump');
  }, [isJumping, gameState, playSfx]);

  useEffect(() => {
    if (!isJumping) return;
    let animId: number;
    const tick = () => {
      setPlayerY((prevY) => {
        const nextY = prevY + jumpVelocity.current * 0.024;
        jumpVelocity.current -= 38 * 0.024;
        if (nextY <= 0.55) {
          setIsJumping(false);
          jumpVelocity.current = 0;
          return 0.55;
        }
        return nextY;
      });
      if (isJumping) {
        animId = requestAnimationFrame(tick);
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isJumping]);

  const shiftLane = useCallback((direction: 'left' | 'right') => {
    if (gameState !== 'PLAYING') return;
    if (roadLayoutMode === '1_ROAD') {
      setCurrentLane(0);
      setPlayerTargetX(LANE_COORDS[1]);
      return;
    }
    if (roadLayoutMode === '2_ROADS') {
      setCurrentLane((_prevLane) => {
        const target = direction === 'left' ? -1 : 1;
        setPlayerTargetX(LANE_COORDS[target + 1]);
        return target;
      });
      return;
    }
    setCurrentLane((prevLane) => {
      let target = prevLane;
      if (direction === 'left' && prevLane > -1) target = prevLane - 1;
      if (direction === 'right' && prevLane < 1) target = prevLane + 1;
      setPlayerTargetX(LANE_COORDS[target + 1]);
      return target;
    });
  }, [gameState, roadLayoutMode]);

  const renderedPlayerX = playerTargetX;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    const touch = e.touches[0];
    (window as any)._touchStart = {x: touch.clientX, y: touch.clientY, time: Date.now()};
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING' || !(window as any)._touchStart) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - (window as any)._touchStart.x;
    const diffY = (window as any)._touchStart.y - touch.clientY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) shiftLane('right');
      else shiftLane('left');
      (window as any)._touchStart = {x: touch.clientX, y: touch.clientY, time: Date.now()};
    } else if (diffY > 35) {
      triggerJump();
      (window as any)._touchStart = {x: touch.clientX, y: touch.clientY, time: Date.now()};
    } else if (diffY < -35) {
      // Swiping or dragging DOWN triggers slide / ducking below obstacles
      triggerSlide();
      (window as any)._touchStart = {x: touch.clientX, y: touch.clientY, time: Date.now()};
    }
  };

  const handleTouchEnd = () => {
    (window as any)._touchStart = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== 'PLAYING') return;
    (window as any)._pointerStart = {x: e.clientX, y: e.clientY, time: Date.now()};
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gameState !== 'PLAYING' || !(window as any)._pointerStart) return;
    const diffX = e.clientX - (window as any)._pointerStart.x;
    const diffY = (window as any)._pointerStart.y - e.clientY;

    if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) shiftLane('right');
      else shiftLane('left');
      (window as any)._pointerStart = {x: e.clientX, y: e.clientY, time: Date.now()};
    } else if (diffY > 30) {
      triggerJump();
      (window as any)._pointerStart = {x: e.clientX, y: e.clientY, time: Date.now()};
    } else if (diffY < -30) {
      // Dragging down triggers slide / ducking below obstacles
      triggerSlide();
      (window as any)._pointerStart = {x: e.clientX, y: e.clientY, time: Date.now()};
    }
  };

  const handlePointerUp = () => {
    (window as any)._pointerStart = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') shiftLane('left');
      if (e.key === 'ArrowRight' || e.key === 'd') shiftLane('right');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') triggerJump();
      if (e.key === 'ArrowDown' || e.key === 's') triggerSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, shiftLane, triggerJump, triggerSlide]);

  const handleStartGame = () => {
    setScore(0);
    setCoinsCount(0);
    setHasShield(false);
    setHasMagnet(false);
    setLevel(1);
    setGameSpeed(gameSettings.baseRunnerSpeed || 18);
    setCurrentLane(0);
    setPlayerTargetX(0);
    setPlayerY(0.55);
    setIsNewHighScore(false);
    setIsWatchingAd(false);
    setGameState('PLAYING');

    if (audioElementRef.current && selectedSong?.previewUrl) {
      audioElementRef.current.src = selectedSong.previewUrl;
      audioElementRef.current.muted = isMuted;
      audioElementRef.current.play().catch(() => setAudioError("Audio autoplay blocked - click sound icon."));
    }
  };

  const handleResumeGame = () => {
    setGameState('PLAYING');
    if (audioElementRef.current) audioElementRef.current.play().catch(() => {});
  };

  const handleCrash = () => {
    if (hasNitro) {
      handleSmashObstacle();
      return;
    }

    if (hasShield) {
      // Shield absorbs crash!
      setHasShield(false);
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
      playSfx('shield');
      setMilestoneToast("🛡️ Shield Protected You from Crash!");
      setTimeout(() => setMilestoneToast(null), 2500);
      return;
    }

    playSfx('crash');
    setGameState('GAME_OVER');
    if (audioElementRef.current) audioElementRef.current.pause();

    // Update lifetime total coins & high score
    const newTotal = totalCoins + coinsCount;
    setTotalCoins(newTotal);
    try {
      localStorage.setItem('neon_runner_total_coins', newTotal.toString());
    } catch {}

    const newHighScoreAchieved = score > highScore;
    if (newHighScoreAchieved) {
      setHighScore(score);
      setIsNewHighScore(true);
      try {
        localStorage.setItem('neon_runner_high_score', score.toString());
      } catch {}
    }

    const newBestLevel = Math.max(level, highestLevel);
    if (level > highestLevel) {
      setHighestLevel(level);
      try {
        localStorage.setItem('neon_runner_highest_level', level.toString());
      } catch {}
    }

    // Live sync stats to Firestore users roster & Global Leaderboard
    const activeUsername = gameAccount?.username || 'Guest Runner';
    try {
      setDoc(
        doc(db, 'users', activeUsername),
        {
          walletBalance: newTotal,
          highScore: newHighScoreAchieved ? score : highScore,
          bestLevel: newBestLevel,
          lastActiveAt: new Date().toISOString(),
          lastActiveDate: new Date().toISOString().split('T')[0]
        },
        { merge: true }
      ).catch(() => {});

      // Auto-submit to Global Leaderboard if score > 0
      if (score > 1000) {
        setDoc(
          doc(db, 'leaderboard', `entry_${activeUsername.replace(/\s+/g, '_')}`),
          {
            username: activeUsername,
            score: Math.max(score, highScore),
            level: newBestLevel,
            skinName: selectedSkin.name,
            skinIcon: selectedSkin.iconTag || '⚡',
            country: 'Global',
            flag: '🌍',
            date: new Date().toISOString()
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch {}
  };

  const handleWatchAdToContinue = () => {
    setShowRewardedAdModal(true);
  };

  const handleCollectCoin = (multiplier: number) => {
    playSfx('coin');
    const effectiveMult = Math.round(multiplier * (gameSettings.coinMultiplier || 1.0));
    const gained = effectiveMult;
    setCoinsCount((prev) => prev + gained);
    setScore((prev) => prev + (effectiveMult * 15));
    setMilestoneToast(`🪙 +${gained} Coins (×${effectiveMult})!`);
    setTimeout(() => setMilestoneToast(null), 1200);
  };

  const handleCollectShield = () => {
    playSfx('shield');
    setHasShield(true);
    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    // Shield strictly lasts for 6 seconds max
    shieldTimerRef.current = setTimeout(() => {
      setHasShield(false);
      setMilestoneToast("⚠️ Shield expired (6s limit)!");
      setTimeout(() => setMilestoneToast(null), 2000);
    }, 6000);
    setMilestoneToast("🛡️ Shield Acquired! (Lasts 6s)");
    setTimeout(() => setMilestoneToast(null), 2000);
  };

  const handleCollectMagnet = () => {
    playSfx('shield');
    setHasMagnet(true);
    if (magnetTimerRef.current) clearTimeout(magnetTimerRef.current);
    magnetTimerRef.current = setTimeout(() => {
      setHasMagnet(false);
    }, 8000);
    setMilestoneToast("🧲 Coin Magnet Active!");
    setTimeout(() => setMilestoneToast(null), 2000);
  };

  const handleCollectNitro = () => {
    playSfx('levelup');
    setHasNitro(true);
    setNitroTimeLeft(8);

    if (nitroTimerRef.current) clearTimeout(nitroTimerRef.current);
    if (nitroCountdownRef.current) clearInterval(nitroCountdownRef.current);

    setGameSpeed((prev) => prev + 16);
    setMilestoneToast("⚡ HYPER NITRO WARP ACTIVATED! (8s Invincible + Vacuum!) 🚀");
    setTimeout(() => setMilestoneToast(null), 2500);

    nitroCountdownRef.current = setInterval(() => {
      setNitroTimeLeft((prev) => {
        if (prev <= 1) {
          if (nitroCountdownRef.current) clearInterval(nitroCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    nitroTimerRef.current = setTimeout(() => {
      setHasNitro(false);
      setGameSpeed((prev) => Math.max(gameSettings.baseRunnerSpeed || 18, prev - 16));
      setMilestoneToast("⚠️ Hyper Nitro Expired!");
      setTimeout(() => setMilestoneToast(null), 1800);
    }, 8000);
  };

  const handleSmashObstacle = () => {
    playSfx('levelup');
    setScore((prev) => prev + 500);
    setMilestoneToast("💥 NITRO SMASH! Hazard Obliterated (+500 Pts)!");
    setTimeout(() => setMilestoneToast(null), 1200);
  };

  const handleJumpOverHurdle = () => {
    playSfx('jump');
    setScore((prev) => prev + 35);
    setMilestoneToast("⬆️ Clean Jump Over Hurdle! +35 Pts");
    setTimeout(() => setMilestoneToast(null), 1200);
  };

  const handleSlideUnderObstacle = () => {
    playSfx('slide');
    setScore((prev) => prev + 50);
    setMilestoneToast("⬇️ DUCK & SLIDE UNDER STICK! +50 Pts");
    setTimeout(() => setMilestoneToast(null), 1200);
  };

  const handleTriggerSuperJump = () => {
    setIsJumping(true);
    jumpVelocity.current = 24;
    playSfx('levelup');
    setScore((prev) => prev + 100);
    setMilestoneToast("🚀 JUMP PAD SUPER LAUNCH! +100 Pts");
    setTimeout(() => setMilestoneToast(null), 1500);
  };

  const billboardImpressionTrackerRef = useRef<number>(0);

  const handleAdvanceDistance = (dist: number) => {
    const addedDist = Math.round(dist * 120);

    // Track 3D roadside billboard impressions as runner sprints past highway gantries
    billboardImpressionTrackerRef.current += addedDist;
    if (billboardImpressionTrackerRef.current >= 65) {
      billboardImpressionTrackerRef.current = 0;
      setAdImpressionsCount((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem('neon_runner_ad_impressions', next.toString());
        } catch {}
        return next;
      });
      setDeveloperEarningsUSD((prev) => {
        const next = prev + 0.00003;
        try {
          localStorage.setItem('neon_runner_dev_earnings', next.toFixed(4));
        } catch {}
        return next;
      });
    }

    setTotalDistance((prev) => {
      const next = prev + addedDist;
      try {
        localStorage.setItem('neon_runner_total_distance', next.toString());
      } catch {}
      return next;
    });

    setScore((prev) => {
      const nextScore = prev + Math.round(dist * 2.2);
      const newLevel = getLevelFromScore(nextScore);

      setLevel((prevLevel) => {
        if (newLevel !== prevLevel) {
          setHighestLevel((prevHighest) => {
            if (newLevel > prevHighest) {
              const nextHighest = newLevel;
              try {
                localStorage.setItem('neon_runner_highest_level', nextHighest.toString());
              } catch {}
              return nextHighest;
            }
            return prevHighest;
          });

          const newSpeed = 30 + Math.min(30, (newLevel - 1) * 3.5);
          setGameSpeed(newSpeed);
          playSfx('levelup');
          setMilestoneToast(`⚡ LEVEL ${newLevel} UNLOCKED! Blazing Speed ${Math.round(newSpeed)} MPH!`);
          setTimeout(() => setMilestoneToast(null), 2500);
          return newLevel;
        }
        return prevLevel;
      });

      return nextScore;
    });
  };

  const handleEquipOrBuySkin = (skin: RunnerSkin) => {
    if (purchasedSkins.includes(skin.id)) {
      setSelectedSkin(skin);
      try {
        localStorage.setItem('neon_runner_selected_skin', skin.id);
      } catch {}
      playSfx('levelup');
      setMilestoneToast(`✓ Equipped ${skin.name}!`);
      setTimeout(() => setMilestoneToast(null), 2000);
      return;
    }

    if (totalCoins < skin.price) {
      playSfx('crash');
      setMilestoneToast(`⚠️ Need ${skin.price - totalCoins} more coins! Earn in runs or win Squad Rush!`);
      setTimeout(() => setMilestoneToast(null), 3000);
      return;
    }

    const nextTotal = totalCoins - skin.price;
    setTotalCoins(nextTotal);
    const nextPurchased = [...purchasedSkins, skin.id];
    setPurchasedSkins(nextPurchased);
    setSelectedSkin(skin);
    try {
      localStorage.setItem('neon_runner_total_coins', nextTotal.toString());
      localStorage.setItem('neon_runner_purchased_skins', JSON.stringify(nextPurchased));
      localStorage.setItem('neon_runner_selected_skin', skin.id);
    } catch {}
    playSfx('coin');
    setMilestoneToast(`🎉 ${skin.name} Unlocked & Equipped!`);
    setTimeout(() => setMilestoneToast(null), 2500);
  };

  const handleClaimWelcomeBonus = () => {
    if (welcomeBonusClaimed) return;
    setWelcomeBonusClaimed(true);
    const bonus = gameSettings.welcomeBonus || 1000;
    const nextTotal = totalCoins + bonus;
    setTotalCoins(nextTotal);
    try {
      localStorage.setItem('neon_runner_welcome_claimed', 'true');
      localStorage.setItem('neon_runner_total_coins', nextTotal.toString());
    } catch {}
    playSfx('levelup');
    setMilestoneToast(`🎁 +${bonus.toLocaleString()} Welcome Bonus Coins Claimed! Enjoy the Pro Skins Shop!`);
    setTimeout(() => setMilestoneToast(null), 3000);
  };

  const handleSearchArtist = async (queryName: string) => {
    if (!queryName.trim()) return;
    setIsSearching(true);
    setCurrentArtistName(queryName);
    setAudioError(null);
    try {
      const res = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(queryName)}&app_name=neon_runner`);
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        const mapped: RealSongItem[] = data.data.slice(0, 8).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.user?.name || queryName,
          album: t.genre || 'Afrobeats Mix',
          artworkUrl: t.artwork?.['480x480'] || 'https://v.monophonic.digital/content/baeaaaiqsebctf5mfpyk6lisudvz3t2gm6jlmdhpqvyutt7mqkdzn25wgnr5uu/480x480.jpg',
          previewUrl: `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=neon_runner`,
          duration: t.duration || 195,
          durationFormatted: formatTime(t.duration || 195),
          tempo: 115,
          genre: t.genre || 'Afrobeats',
          year: '2024'
        }));
        setSearchedSongs(mapped);
        if (mapped.length > 0) setSelectedSong(mapped[0]);
      } else {
        setAudioError("No tracks found. Using default mix.");
      }
    } catch {
      setAudioError("Network error. Using default mix.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleTogglePreview = (song: RealSongItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingPreview && selectedSong?.id === song.id) {
      setIsPlayingPreview(false);
      if (audioElementRef.current) audioElementRef.current.pause();
    } else {
      setSelectedSong(song);
      setIsPlayingPreview(true);
      if (audioElementRef.current) {
        audioElementRef.current.src = song.previewUrl;
        audioElementRef.current.play().catch(() => {});
      }
    }
  };

  const handleTrackEnded = () => {
    if (gameState === 'PLAYING') {
      const currentArtist = (selectedSong?.artist || currentArtistName || 'Omah Lay').trim().toLowerCase();
      // Filter tracks specifically under the same artist
      const sameArtistSongs = searchedSongs.filter((s) =>
        s.artist.trim().toLowerCase().includes(currentArtist) ||
        currentArtist.includes(s.artist.trim().toLowerCase())
      );

      let nextSong: RealSongItem;
      if (sameArtistSongs.length > 1) {
        const currentIndex = sameArtistSongs.findIndex((s) => s.id === selectedSong?.id);
        const nextIndex = (currentIndex + 1) % sameArtistSongs.length;
        nextSong = sameArtistSongs[nextIndex];
      } else if (searchedSongs.length > 0) {
        const currentIndex = searchedSongs.findIndex((s) => s.id === selectedSong?.id);
        const nextIndex = (currentIndex + 1) % searchedSongs.length;
        nextSong = searchedSongs[nextIndex];
      } else {
        nextSong = selectedSong;
      }

      setSelectedSong(nextSong);
      if (audioElementRef.current && nextSong.previewUrl) {
        audioElementRef.current.src = nextSong.previewUrl;
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.muted = isMuted;
        audioElementRef.current.play().catch(() => {});
      }
      playSfx('levelup');
      setMilestoneToast(`🎵 Auto-playing next by ${nextSong.artist}: "${nextSong.title}"`);
      setTimeout(() => setMilestoneToast(null), 3000);
    } else {
      setIsPlayingPreview(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioElementRef.current) audioElementRef.current.muted = next;
  };

  return (
    <div
      className="relative w-full h-screen bg-slate-950 select-none overflow-hidden font-sans touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <audio
        ref={audioElementRef}
        playsInline
        preload="auto"
        onEnded={handleTrackEnded}
        onTimeUpdate={(e) => {
          const el = e.target as HTMLAudioElement;
          const current = el.currentTime || 0;
          const total = el.duration || selectedSong.duration || 208;
          setAudioProgress({current, total});
        }}
      />

      <div className="absolute inset-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 4.3, 4.8]} rotation={[-0.44, 0, 0]} fov={62} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[6, 16, 6]} intensity={1.5} castShadow />
          <pointLight position={[0, 4, -4]} intensity={2.5} color="#22d3ee" distance={22} />

          <HighwayScene
            speed={gameSpeed}
            level={level}
            artistName={selectedSong.artist}
            artworkUrl={selectedSong.artworkUrl}
            roadLayoutMode={roadLayoutMode}
            billboardTextureUrl={billboardSponsors.find((s) => s.active && s.imageUrl)?.imageUrl || '/enny_billboard.jpg'}
          />
          <PlayerBall
            playerX={renderedPlayerX}
            playerY={playerY}
            isJumping={isJumping}
            isSliding={isSliding}
            hasShield={hasShield}
            hasMagnet={hasMagnet}
            hasNitro={hasNitro}
            skin={selectedSkin}
          />
          <GameEngine
            gameState={gameState}
            gameSpeed={gameSpeed}
            playerX={renderedPlayerX}
            playerY={playerY}
            isSliding={isSliding}
            roadLayoutMode={roadLayoutMode}
            hasShield={hasShield}
            hasMagnet={hasMagnet}
            hasNitro={hasNitro}
            onCrash={handleCrash}
            onCollectCoin={handleCollectCoin}
            onCollectShield={handleCollectShield}
            onCollectMagnet={handleCollectMagnet}
            onCollectNitro={handleCollectNitro}
            onSmashObstacle={handleSmashObstacle}
            onJumpOverHurdle={handleJumpOverHurdle}
            onSlideUnderObstacle={handleSlideUnderObstacle}
            onTriggerSuperJump={handleTriggerSuperJump}
            onAdvanceDistance={handleAdvanceDistance}
            level={level}
            obstacleBaseInterval={gameSettings.obstacleInterval}
            obstacleSpawnRate={gameSettings.obstacleSpawnRate}
          />
        </Canvas>
      </div>

      {milestoneToast && (
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 w-11/12 max-w-xs flex justify-center opacity-75">
          <div className="bg-slate-950/65 backdrop-blur-sm text-cyan-300/85 border border-cyan-500/20 px-3 py-1 rounded-full shadow-sm text-[10px] font-medium tracking-wide flex items-center gap-1 text-center">
            <Sparkles className="w-3 h-3 text-cyan-400/80 shrink-0" />
            <span className="truncate">{milestoneToast}</span>
          </div>
        </div>
      )}

      {/* PLAYING HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
          {/* Top Control Cluster (Mobile & Desktop Responsive) */}
          <div className="flex flex-col gap-1.5 pointer-events-auto w-full max-w-full">
            {/* Top Primary Row */}
            <div className="flex items-center justify-between gap-1 w-full">
              {/* Compact Song Pill (Shrinks cleanly on narrow mobile) */}
              <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1 pr-2 rounded-xl border border-cyan-500/40 shadow-lg min-w-0 max-w-[110px] sm:max-w-[210px] shrink">
                {selectedSong.artworkUrl ? (
                  <img src={selectedSong.artworkUrl} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover shrink-0 border border-slate-700" />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-950 flex items-center justify-center shrink-0">
                    <Disc3 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col min-w-0 truncate">
                  <span className="text-[9px] sm:text-[10px] font-black text-white truncate leading-tight">{selectedSong.title}</span>
                  <span className="text-[8px] text-cyan-400 font-mono leading-tight truncate">
                    {formatTime(audioProgress.current)}
                  </span>
                </div>
              </div>

              {/* Stats & Pause Cluster (Always 100% visible on mobile without horizontal clipping!) */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Coins / Stars */}
                <div className="flex items-center gap-1 bg-amber-950/95 border border-amber-500/60 px-1.5 sm:px-2 py-1 rounded-xl text-amber-300 text-[11px] sm:text-xs font-black shadow-md shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-mono tabular-nums leading-none">{coinsCount}</span>
                </div>

                {/* Points */}
                <div className="bg-slate-900/95 border border-pink-500/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl text-right shadow-md shrink-0 min-w-[50px] sm:min-w-[62px]">
                  <span className="text-[7px] sm:text-[8px] text-slate-400 block font-semibold leading-none">PTS</span>
                  <span className="text-[11px] sm:text-xs font-black text-pink-400 font-mono tabular-nums leading-none">{score}</span>
                </div>

                {/* Pause Button */}
                <button
                  onClick={() => {
                    setGameState('PAUSED');
                    if (audioElementRef.current) audioElementRef.current.pause();
                  }}
                  className="p-1.5 sm:p-2 bg-slate-900/95 border border-slate-700 text-slate-200 hover:text-white rounded-xl active:scale-90 transition shadow-md shrink-0"
                  aria-label="Pause game"
                >
                  <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Sub-Row: Level, Speed & Active Power-Ups */}
            <div className="flex items-center justify-between gap-1 w-full flex-wrap">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {/* Level Badge */}
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border border-purple-500/40 px-1.5 sm:px-2 py-0.5 rounded-lg text-purple-200 font-black text-[9px] sm:text-[10px] shadow-sm">
                  <Award className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>LVL {level}</span>
                </div>

                {/* Speed Badge */}
                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/40 px-1.5 sm:px-2 py-0.5 rounded-lg text-rose-300 font-bold text-[9px] sm:text-[10px] shadow-sm">
                  <Flame className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{Math.round(gameSpeed)} MPH</span>
                </div>

                {/* Current Runner Skin / Quick Creator Switch */}
                <button
                  onClick={() => {
                    const creatorSkin = RUNNER_SKINS.find((s) => s.id === 'enny_creator');
                    if (creatorSkin) {
                      handleEquipOrBuySkin(creatorSkin);
                    }
                  }}
                  className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg font-black text-[9px] sm:text-[10px] shadow-sm transition active:scale-95 pointer-events-auto ${
                    selectedSkin.id === 'enny_creator'
                      ? 'bg-purple-950 border border-purple-400 text-purple-300'
                      : 'bg-slate-900/90 border border-amber-500/50 text-amber-300 hover:text-white'
                  }`}
                  title="Equip Creator Skin"
                >
                  <span>🕶️</span>
                  <span>{selectedSkin.id === 'enny_creator' ? 'Enny (Creator)' : 'Equip Enny Skin'}</span>
                </button>

                {/* Level 20+ Dynamic Road Status Badge */}
                {roadLayoutMode === '2_ROADS' && (
                  <div className="flex items-center gap-1 bg-amber-950/95 border border-amber-400 px-2 py-0.5 rounded-lg text-amber-300 font-black text-[9px] sm:text-[10px] animate-pulse shadow-md">
                    <span>⚡ 2 LANES (LEFT / RIGHT ONLY)</span>
                  </div>
                )}
                {roadLayoutMode === '1_ROAD' && (
                  <div className="flex items-center gap-1 bg-rose-950/95 border border-rose-400 px-2 py-0.5 rounded-lg text-rose-300 font-black text-[9px] sm:text-[10px] animate-pulse shadow-md">
                    <span>⚠️ 1 ROAD (JUMP / MOVE BELOW)</span>
                  </div>
                )}
                {level >= 20 && roadLayoutMode === '3_ROADS' && (
                  <div className="flex items-center gap-1 bg-emerald-950/90 border border-emerald-400 px-2 py-0.5 rounded-lg text-emerald-300 font-black text-[9px] sm:text-[10px] shadow-sm">
                    <span>🛣️ 3 LANES</span>
                  </div>
                )}
              </div>

              {/* Active Powerups */}
              <div className="flex items-center gap-1">
                {hasNitro && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-purple-950/90 border-2 border-amber-400 px-2 py-0.5 rounded-lg text-amber-300 text-[9px] sm:text-[10px] font-black animate-bounce shadow-lg shadow-amber-500/30">
                    <Rocket className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>NITRO {nitroTimeLeft}s (SMASH & VACUUM)</span>
                  </div>
                )}
                {hasShield && (
                  <div className="flex items-center gap-1 bg-sky-950/90 border border-sky-400/60 px-1.5 sm:px-2 py-0.5 rounded-lg text-sky-300 text-[9px] sm:text-[10px] font-bold animate-pulse">
                    <Shield className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>SHIELD</span>
                  </div>
                )}
                {hasMagnet && (
                  <div className="flex items-center gap-1 bg-pink-950/90 border border-pink-400/60 px-1.5 sm:px-2 py-0.5 rounded-lg text-pink-300 text-[9px] sm:text-[10px] font-bold animate-pulse">
                    <Zap className="w-3 h-3 text-pink-400 shrink-0" />
                    <span>MAGNET</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pointer-events-auto w-full px-1 sm:px-2">
            {/* Steering Left / Right & Mute */}
            <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-800 text-[11px] text-slate-300 shadow-xl">
              <button
                onClick={() => shiftLane('left')}
                disabled={roadLayoutMode === '1_ROAD'}
                className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-black text-xs flex items-center gap-1 active:scale-90 transition ${
                  roadLayoutMode === '1_ROAD'
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40'
                }`}
                title="Move Left (A / Left Arrow)"
              >
                <span>⬅️</span>
                <span className="hidden sm:inline">LEFT</span>
              </button>

              <button
                onClick={() => shiftLane('right')}
                disabled={roadLayoutMode === '1_ROAD'}
                className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-black text-xs flex items-center gap-1 active:scale-90 transition ${
                  roadLayoutMode === '1_ROAD'
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40'
                }`}
                title="Move Right (D / Right Arrow)"
              >
                <span className="hidden sm:inline">RIGHT</span>
                <span>➡️</span>
              </button>

              <button onClick={toggleMute} className="ml-1 p-2 bg-slate-800 rounded-xl text-slate-200 active:scale-90" title="Mute/Unmute Audio">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>

            {/* Drag Down / Move Below & Jump Over Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={triggerSlide}
                disabled={isSliding}
                className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl active:scale-95 transition ${
                  isSliding
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.8)] border border-cyan-200 ring-2 ring-cyan-300 scale-95'
                    : 'bg-slate-900/95 hover:bg-slate-800 text-cyan-300 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                }`}
                title="Drag Down / Move Below Obstacles (S / Down Arrow / Swipe Down / Mouse Drag Down)"
              >
                <span>⬇️</span>
                <span>{isSliding ? 'SLIDING BELOW!' : 'MOVE BELOW'}</span>
              </button>
              <button
                onClick={triggerJump}
                disabled={isJumping}
                className={`px-6 py-3 sm:px-7 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-2xl active:scale-95 transition ${
                  isJumping
                    ? 'bg-slate-800 text-slate-500 border border-slate-700'
                    : 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] border border-amber-300'
                }`}
                title="Jump Over Obstacles (Space / W / Up Arrow / Swipe Up)"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                <span>{isJumping ? 'IN AIR' : 'JUMP OVER ⬆️'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
            <h2 className="text-xl font-black text-white mb-1">GAME PAUSED</h2>
            <p className="text-xs text-cyan-400 mb-5">{selectedSong.artist} · {selectedSong.title}</p>
            <div className="flex flex-col gap-2.5">
              <button onClick={handleResumeGame} className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>
              <button onClick={() => { if (audioElementRef.current) audioElementRef.current.pause(); setGameState('MENU'); }} className="w-full py-2.5 bg-slate-800 text-slate-200 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs">
                <Music className="w-4 h-4" /> Change Song / Singer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL (Home Page & Summary) */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-pink-500/50 rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            {isWatchingAd && (
              <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                <Disc3 className="w-12 h-12 text-cyan-400 animate-spin mb-3" />
                <h3 className="text-lg font-black text-white mb-1">Playing Rewarded Ad...</h3>
                <p className="text-xs text-slate-400">Continuing your run with 6s Shield!</p>
              </div>
            )}

            {isNewHighScore && (
              <div className="mb-2.5 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-amber-400/50 rounded-xl py-1.5 px-3 flex items-center justify-center gap-1.5 text-amber-300 font-black text-xs animate-bounce shadow-md">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>NEW HIGH SCORE SURPASSED!</span>
              </div>
            )}

            <div className="w-12 h-12 bg-pink-950/80 border border-pink-500/40 text-pink-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Flame className="w-6 h-6 text-pink-500" />
            </div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 mb-0.5">
              GAME OVER
            </h2>
            <p className="text-xs text-slate-400 mb-3">Reached Level {level} with {selectedSong.artist}</p>

            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 mb-3">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-semibold uppercase">RUN POINTS</span>
                <span className="text-base font-black text-pink-400 font-mono">{score}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800 pl-2">
                <span className="text-[9px] text-slate-500 font-semibold uppercase">BEST SCORE</span>
                <span className="text-base font-black text-cyan-400 font-mono flex items-center justify-center gap-1">
                  <Award className="w-3 h-3" /> {highScore}
                </span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 mb-4 flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-amber-400 font-bold uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Session Coins: +{coinsCount}
                </span>
                <span className="text-[10px] text-slate-400">Added to lifetime bank</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-slate-400 font-semibold uppercase">TOTAL BANK</span>
                <span className="text-sm font-black text-amber-300 font-mono">{totalCoins} 🪙</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleWatchAdToContinue}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-xs active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" /> Watch Ad to Continue (6s Shield 🛡️)
              </button>
              <button
                onClick={handleStartGame}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Play Again (Level 1)
              </button>
              <button
                onClick={() => setGameState('MENU')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-[11px]"
              >
                <Music className="w-3 h-3 text-cyan-400" /> 🏠 Home / Choose Song
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOME PAGE / MENU */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-5 overflow-y-auto overflow-x-hidden w-full max-w-full box-border">
          <div className="max-w-md w-full mx-auto my-auto flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 w-full">
              <div className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full font-bold w-fit">
                <Radio className="w-3 h-3 animate-pulse text-rose-500 shrink-0" /> REAL AUDIO
              </div>
              <div className="flex flex-wrap items-center gap-1.5 justify-end w-full sm:w-auto">
                {(isAdminUnlocked || gameAccount?.type === 'admin') && (
                  <>
                    <button
                      onClick={() => setShowAdminDashboardModal(true)}
                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"
                      title="Open Admin Owner Command Center"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Admin Command 👑
                    </button>
                    <button
                      onClick={() => setShowRevenueModal(true)}
                      className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Revenue HQ 💵
                    </button>
                    <button
                      onClick={() => setShowObstaclesModal(true)}
                      className="px-2.5 py-1 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-200 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" /> Obstacles (20)
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDailyRewardsModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95 animate-bounce"
                  title="Daily Rewards & Lucky Spin Wheel"
                >
                  <Gift className="w-3.5 h-3.5" /> Rewards 🎁
                </button>
                <button
                  onClick={() => setShowLeaderboardModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95"
                  title="Global Live Leaderboard"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" /> Leaderboard 🏆
                </button>
                <button
                  onClick={() => setShowPWAModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95"
                  title="Install to Home Screen"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Install App 📲
                </button>
                <button
                  onClick={() => setShowShopModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Skins Shop
                </button>
                <button
                  onClick={() => setShowChallengesModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95 animate-pulse"
                >
                  <Trophy className="w-3.5 h-3.5" /> Challenges 🏆
                </button>
                <button
                  onClick={() => setShowTournamentsModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95 animate-pulse"
                >
                  <Award className="w-3.5 h-3.5" /> Tournaments ⚔️
                </button>
                <button
                  onClick={() => setShowMultiplayer(true)}
                  className="px-2.5 py-1 bg-purple-950 border border-purple-500/50 text-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" /> Squad
                </button>
                {(isAdminUnlocked || gameAccount?.type === 'admin') && (
                  <button
                    onClick={() => setShowAdminDashboardModal(true)}
                    className="p-1.5 border rounded-xl active:scale-95 transition bg-emerald-950 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    title="Admin Owner Command Center"
                    aria-label="Admin Owner Dashboard"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-xl active:scale-95"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* GLOBAL LIVE ANNOUNCEMENT BROADCAST BANNER */}
            {gameSettings.announcement.active && (
              <div
                className={`mb-3 p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between text-xs shadow-xl animate-in slide-in-from-top-2 duration-300 relative overflow-hidden ${
                  gameSettings.announcement.type === 'event'
                    ? 'bg-purple-950/90 border-purple-500/60 text-purple-200'
                    : gameSettings.announcement.type === 'bonus'
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                    : gameSettings.announcement.type === 'alert'
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                    : 'bg-cyan-950/90 border-cyan-500/60 text-cyan-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-black/50 text-white shrink-0 shadow">
                    <Megaphone className="w-4 h-4 animate-pulse text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1.5 mb-0.5">
                      <span>{gameSettings.announcement.tag || 'GLOBAL BROADCAST'}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    </div>
                    <p className="font-bold text-xs sm:text-sm leading-snug">
                      {gameSettings.announcement.message}
                    </p>
                  </div>
                </div>
                {(isAdminUnlocked || gameAccount?.type === 'admin') && (
                  <button
                    onClick={() => setShowAdminDashboardModal(true)}
                    className="ml-2 px-2.5 py-1 bg-black/60 hover:bg-black/90 border border-white/20 rounded-lg text-[10px] font-bold text-emerald-300 shrink-0 active:scale-95 transition"
                  >
                    Edit ✏️
                  </button>
                )}
              </div>
            )}

            {gameAccount && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl mb-2.5 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold">
                    {gameAccount.type === 'admin' ? '👑' : gameAccount.type === 'player' ? '🎮' : '⚡'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Logged in as {gameAccount.type}</span>
                    <span className="text-xs font-bold text-cyan-300 font-mono">@{gameAccount.username}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogoutAccount}
                  className="px-2.5 py-1 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            )}

            <div className="text-center mb-3">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 tracking-tight">
                NEON RUNNER 3D
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Subway Surfers speed with real studio tracks, limited 6s shields & multiplayer!
              </p>
            </div>

            {/* Quick Feature Action Bar */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setShowSpinModal(true)}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <span>🎰 Lucky Spin Wheel</span>
              </button>
              <button
                onClick={() => setShowGachaModal(true)}
                className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <span>🎁 Mystery Gacha (50k 🪙)</span>
              </button>
            </div>

            {/* Account, Wallet & Highest Level Stats */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 mb-3 shadow-lg">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Award className="w-3 h-3" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-slate-400 font-semibold uppercase truncate">High Score</span>
                  <span className="text-[10px] sm:text-xs font-black text-cyan-300 font-mono truncate">{highScore}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-1 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-slate-400 font-semibold uppercase truncate">Wallet</span>
                  <span className="text-[10px] sm:text-xs font-black text-amber-300 font-mono truncate">{totalCoins} 🪙</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-1 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                  <Trophy className="w-3 h-3" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-slate-400 font-semibold uppercase truncate">Best Level</span>
                  <span className="text-[10px] sm:text-xs font-black text-purple-300 font-mono truncate">⭐ Lvl {highestLevel}</span>
                </div>
              </div>
            </div>

            {!welcomeBonusClaimed && (
              <div className="bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-amber-400/50 rounded-2xl p-2.5 mb-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
                    <Sparkles className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-amber-300 truncate">Welcome Bonus: +1,000 Coins!</span>
                    <span className="text-[9px] text-slate-300 truncate">Claim free coins to buy pro skins & heroes!</span>
                  </div>
                </div>
                <button
                  onClick={handleClaimWelcomeBonus}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 font-black text-xs rounded-xl shadow-md active:scale-95 shrink-0 transition"
                >
                  Claim 🪙
                </button>
              </div>
            )}

            {/* Search Any Singer */}
            <div className="mb-2.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchArtist(searchInput)}
                    placeholder="Search singer (Omah Lay, Davido, Asake...)"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => handleSearchArtist(searchInput)}
                  disabled={isSearching}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shrink-0 transition"
                >
                  {isSearching ? 'Finding...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Featured Artist Chips */}
            <div className="mb-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {FEATURED_ARTISTS.map((art) => {
                  const isActive = currentArtistName.toLowerCase() === art.name.toLowerCase();
                  return (
                    <button
                      key={art.name}
                      onClick={() => {
                        setSearchInput(art.name);
                        handleSearchArtist(art.name);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1 transition ${
                        isActive ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{art.flag}</span>
                      <span>{art.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Song Selection List */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-pink-400" />
                  {currentArtistName}'s Studio Tracks:
                </span>
                <span className="text-[10px] text-slate-400">Tap cover to preview</span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {searchedSongs.map((song) => {
                  const isSelected = selectedSong?.id === song.id;
                  const isPlayingThis = isPlayingPreview && selectedSong?.id === song.id;

                  return (
                    <div
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className={`cursor-pointer p-2 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                        isSelected ? 'bg-gradient-to-r from-pink-950/90 to-purple-950/90 border-pink-500 shadow-md ring-1 ring-pink-500' : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <button
                        onClick={(e) => handleTogglePreview(song, e)}
                        className="relative shrink-0 group focus:outline-none"
                      >
                        {song.artworkUrl ? (
                          <img src={song.artworkUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-slate-700" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center">
                            <Disc3 className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className={`absolute inset-0 rounded-xl flex items-center justify-center transition ${isPlayingThis ? 'bg-pink-600/80' : 'bg-black/40 group-hover:bg-black/60'}`}>
                          {isPlayingThis ? <Square className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white" />}
                        </div>
                      </button>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={`text-xs font-black truncate ${isSelected ? 'text-pink-300' : 'text-slate-100'}`}>{song.title}</span>
                        <span className="text-[10px] text-slate-400 truncate">{song.artist} · {song.album}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Runner & Hero Skin Bar */}
            <div className="mb-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Equipped:
                  </span>
                  <span className="text-xs font-black text-cyan-300 truncate flex items-center gap-1">
                    <span>{selectedSkin.iconTag}</span>
                    <span>{selectedSkin.name}</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowShopModal(true)}
                  className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black rounded-lg flex items-center gap-1 shrink-0 active:scale-95 transition"
                >
                  <ShoppingBag className="w-3 h-3 text-amber-400" />
                  <span>Shop ({RUNNER_SKINS.length})</span>
                </button>
              </div>

              {/* Horizontal Skin Carousel with Quick Equip & Buy */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {RUNNER_SKINS.map((skin) => {
                  const isSelected = selectedSkin.id === skin.id;
                  const isOwned = purchasedSkins.includes(skin.id);

                  return (
                    <button
                      key={skin.id}
                      onClick={() => handleEquipOrBuySkin(skin)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 shrink-0 w-24 text-left transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/70 ring-1 ring-cyan-400 shadow-md'
                          : isOwned
                          ? 'border-slate-700 bg-slate-900/70 hover:border-slate-600'
                          : 'border-slate-800/80 bg-slate-950/70 hover:border-amber-500/40 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        {skin.avatarUrl ? (
                          <img src={skin.avatarUrl} alt="" className="w-5 h-5 rounded-md object-cover border border-purple-400 shrink-0" />
                        ) : (
                          <span className="text-base">{skin.iconTag}</span>
                        )}
                        <span
                          className={`text-[8px] font-bold px-1 rounded uppercase ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950'
                              : isOwned
                              ? 'bg-slate-800 text-cyan-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {isSelected ? '✓ In Use' : isOwned ? 'Owned' : `${skin.price}🪙`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-white truncate w-full">
                        {skin.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 text-slate-950 font-black text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95"
            >
              <span>PLAY FULL SONG & RUN (LVL 1)</span>
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-cyan-400" /> Game Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-xs font-bold">Close</button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Performance and Graphics */}
              <div className="flex flex-col gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-cyan-400 font-bold">Performance & Graphics</span>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {(['High', 'Medium', 'Low'] as const).map((qual) => (
                    <button
                      key={qual}
                      onClick={() => setGraphicsQuality(qual)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        graphicsQuality === qual ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {qual} {qual === 'High' ? '(60FPS)' : qual === 'Medium' ? '(30FPS)' : '(Fast)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Sensitivity */}
              <div className="flex flex-col gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-pink-400 font-bold">Control Sensitivity</span>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {(['Low', 'Normal', 'High'] as const).map((sens) => (
                    <button
                      key={sens}
                      onClick={() => setControlSensitivity(sens)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        controlSensitivity === sens ? 'bg-pink-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {sens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music (BGM) */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium">Background Music (BGM)</span>
                  <span className="text-[10px] text-slate-400">Studio track playback</span>
                </div>
                <button
                  onClick={() => setBgmEnabled(!bgmEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    bgmEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {bgmEnabled ? 'BGM ON 🎵' : 'BGM OFF 🔇'}
                </button>
              </div>

              {/* Game Sound Effects */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium">Game Sound Effects</span>
                  <span className="text-[10px] text-slate-400">Jumps, coins & crashes</span>
                </div>
                <button onClick={toggleMute} className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold">
                  {isMuted ? 'Muted 🔇' : 'Enabled 🔊'}
                </button>
              </div>

              {/* User Account & Cloud Sync */}
              <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-amber-400 font-bold">User Cloud Sync & Account</span>
                {currentUser ? (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-300 truncate">{currentUser.email || currentUser.uid}</span>
                    <button onClick={() => signOut(auth)} className="px-3 py-1 bg-rose-950 text-rose-300 rounded-lg text-xs font-bold">Sign Out</button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => signInWithPopup(auth, googleProvider).catch(() => {}) } className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold">
                      Google Login
                    </button>
                    <button onClick={() => signInAnonymously(auth).catch(() => {}) } className="py-2 px-3 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold">
                      Anonymous
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLAYER ROOMS MODAL */}
      {showMultiplayer && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-6 max-w-sm w-full text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" /> Multiplayer Arena
              </h2>
              <button onClick={() => setShowMultiplayer(false)} className="text-slate-400 hover:text-white text-xs font-bold">Close</button>
            </div>

            {multiplayerTab === 'LOBBY' && (
              <>
                <p className="text-xs text-slate-400 mb-4">
                  Play together with friends in live rooms or squad battle royale with coin rewards!
                </p>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      if (!currentUser) signInAnonymously(auth).catch(() => {});
                      setMultiplayerTab('SQUAD_RUSH');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy className="w-4 h-4" /> Squad Rush (3-4 Player Battle) 🏆
                  </button>
                  <button
                    onClick={() => setMultiplayerTab('ROOM_LIST')}
                    className="w-full py-2.5 bg-purple-950/80 border border-purple-500/40 hover:bg-purple-900 text-purple-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" /> Join Public Rooms & Chat
                  </button>
                </div>
              </>
            )}

            {multiplayerTab === 'SQUAD_RUSH' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Squad Rush (3-4 Players)
                  </span>
                  <button onClick={() => setMultiplayerTab('LOBBY')} className="text-[10px] text-slate-400 underline">Back</button>
                </div>
                <p className="text-[11px] text-slate-300 mb-3">
                  Form a squad of 4 players online. Once all ready, start the squad battle! Placement rewards: 1st (+1000 🪙), 2nd (+500 🪙), 3rd (+250 🪙), 4th (+100 🪙).
                </p>

                <div className="flex flex-col gap-2 mb-3">
                  {squadMembers.map((mem, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-amber-900/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-300 font-black text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{mem.name}</span>
                          <span className="text-[9px] text-slate-400">⭐ Lvl {mem.level}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                        {mem.status}
                      </span>
                    </div>
                  ))}
                </div>

                {squadResult ? (
                  <div className="bg-gradient-to-r from-amber-950/80 to-purple-950/80 border border-amber-500/50 rounded-xl p-3 text-center mb-3">
                    <span className="text-xs font-black text-amber-300 block mb-1">🎉 {squadResult.message}</span>
                    <span className="text-sm font-black text-emerald-300 font-mono">+{squadResult.reward} Coins Added to Wallet! 🪙</span>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (squadMatchRunning) return;
                      setSquadMatchRunning(true);
                      setSquadResult(null);
                      setTimeout(() => {
                        setSquadMatchRunning(false);
                        const ranks = [
                          {rank: 1, reward: 1000, message: '🏆 1st Place! Squad Champion!'},
                          {rank: 2, reward: 500, message: '🥈 2nd Place Runner-Up!'},
                          {rank: 3, reward: 250, message: '🥉 3rd Place Finish!'},
                          {rank: 4, reward: 100, message: '🎖️ 4th Place Survival!'}
                        ];
                        const outcome = ranks[Math.floor(Math.random() * ranks.length)];
                        setSquadResult(outcome);
                        setTotalCoins(prev => {
                          const nextTotal = prev + outcome.reward;
                          try {
                            localStorage.setItem('neon_runner_total_coins', nextTotal.toString());
                          } catch {}
                          return nextTotal;
                        });
                      }, 3000);
                    }}
                    disabled={squadMatchRunning}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {squadMatchRunning ? '⚡ Squad Battle in Progress (4 Players)...' : '🚀 Start Squad Battle Royale'}
                  </button>
                </div>
              </>
            )}

            {multiplayerTab === 'ROOM_LIST' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-purple-300">Active Public Rooms</span>
                  <button onClick={() => setMultiplayerTab('LOBBY')} className="text-[10px] text-slate-400 underline">Back</button>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {[
                    {name: 'Cyber Speedway #1', players: 4, mode: 'Level 1-10'},
                    {name: 'Neon Tokyo Lobby #2', players: 7, mode: 'Endless Rush'},
                    {name: 'Afrobeat High Score Arena #3', players: 5, mode: 'Omah Lay / Soso'}
                  ].map((r) => (
                    <div key={r.name} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-purple-900/40">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{r.name}</span>
                        <span className="text-[10px] text-slate-400">{r.mode} · {r.players} players active</span>
                      </div>
                      <button
                        onClick={() => {
                          if (!currentUser) signInAnonymously(auth).catch(() => {});
                          setActiveRoomName(r.name);
                          setMultiplayerTab('ROOM');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {multiplayerTab === 'ROOM' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-300">🌐 {activeRoomName}</span>
                  <button onClick={() => setMultiplayerTab('ROOM_LIST')} className="text-[10px] text-slate-400 underline">Rooms List</button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 h-36 overflow-y-auto mb-3 flex flex-col gap-1.5">
                  {roomChatMessages.map((msg, idx) => (
                    <div key={idx} className="flex flex-col text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-400">{msg.user}</span>
                        <span className="text-[9px] text-slate-500">{msg.time}</span>
                      </div>
                      <span className="text-slate-200">{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInputText.trim()) {
                        setRoomChatMessages(prev => [...prev, { user: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'GuestRunner', text: chatInputText.trim(), time: 'Just now' }]);
                        setChatInputText('');
                      }
                    }}
                    placeholder="Type in room chat..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      if (chatInputText.trim()) {
                        setRoomChatMessages(prev => [...prev, { user: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'GuestRunner', text: chatInputText.trim(), time: 'Just now' }]);
                        setChatInputText('');
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* INITIAL ACCOUNT AUTHENTICATION SCREEN */}
      {!gameAccount && (
        <div className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 tracking-tight">
                NEON RUNNER PORTAL
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Please login or create an account to start playing.
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => { setAuthRole('player'); setAuthUsername(''); setAuthPassword(''); setAuthError(null); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authRole === 'player'
                    ? 'bg-cyan-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Player
              </button>
              <button
                type="button"
                onClick={() => { setAuthRole('admin'); setAuthUsername(''); setAuthPassword(''); setAuthError(null); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authRole === 'admin'
                    ? 'bg-purple-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Admin
              </button>
              <button
                type="button"
                onClick={() => { setAuthRole('guest'); setAuthUsername(''); setAuthPassword(''); setAuthError(null); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authRole === 'guest'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Guest
              </button>
            </div>

            {authRole === 'player' && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${authTab === 'login' ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${authTab === 'register' ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}
                >
                  Create Account
                </button>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">


              {authRole !== 'guest' ? (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      {authRole === 'admin' ? 'Admin Username' : 'Player Username'}
                    </label>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder={authRole === 'admin' ? 'Enter admin username...' : 'Enter username...'}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      {authRole === 'admin' ? 'Admin Password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder={authRole === 'admin' ? 'Enter admin password...' : 'Enter password...'}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Guest Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="e.g. Guest_Runner99"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {authError && (
                <div className="bg-rose-950/80 border border-rose-500/50 p-2.5 rounded-xl text-xs text-rose-300 font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg active:scale-95 ${
                  authRole === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : authRole === 'player'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950'
                }`}
              >
                {authRole === 'admin'
                  ? 'Login to Admin Portal 🔓'
                  : authRole === 'player' && authTab === 'register'
                  ? 'Create Account & Start Playing 🚀'
                  : authRole === 'player'
                  ? 'Login to Player Account 🎮'
                  : 'Play as Guest ⚡'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN OWNER PORTAL LOGIN MODAL */}
      {showAdminLoginModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-left shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Owner / Admin Portal</h2>
                  <p className="text-[10px] text-purple-400">Enter PIN to access Revenue HQ & Dev Tools</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminLoginModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg active:scale-95"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Admin Access PIN</label>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter PIN (Default: 1234)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div className="text-[10px] text-slate-400">
                Tip: Default PIN is <span className="font-mono text-amber-400 font-bold">1234</span>. You can unlock your private Revenue HQ here.
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95 transition"
                >
                  Unlock Owner Portal 🔓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVENUE HQ & MONETIZATION COMMAND CENTER (0% IAP / HIGH EARNINGS) */}
      <RevenueHQModal
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        developerEarningsUSD={developerEarningsUSD}
        adImpressionsCount={adImpressionsCount}
        onRecordImpression={(views: number, rev: number) => {
          setDeveloperEarningsUSD((prev) => {
            const next = prev + rev;
            try {
              localStorage.setItem('neon_runner_dev_earnings', next.toFixed(2));
            } catch {}
            return next;
          });
          setAdImpressionsCount((prev) => {
            const next = prev + views;
            try {
              localStorage.setItem('neon_runner_ad_impressions', next.toString());
            } catch {}
            return next;
          });
        }}
        billboardSponsors={billboardSponsors}
        onUpdateSponsors={(sponsors) => {
          setBillboardSponsors(sponsors);
          try {
            localStorage.setItem('neon_runner_billboard_sponsors', JSON.stringify(sponsors));
          } catch {}
        }}
        adConfig={adConfig}
        onUpdateAdConfig={(config) => {
          setAdConfig(config);
          try {
            localStorage.setItem('neon_runner_ad_config', JSON.stringify(config));
          } catch {}
        }}
        onSimulateAdBreak={() => {
          setShowRewardedAdModal(true);
        }}
      />

      {/* DAILY REWARDS & LUCKY SPIN MODAL */}
      <DailyRewardsModal
        isOpen={showDailyRewardsModal}
        onClose={() => setShowDailyRewardsModal(false)}
        onAddCoins={(amount) => {
          setTotalCoins((prev) => {
            const next = prev + amount;
            try { localStorage.setItem('neon_runner_total_coins', next.toString()); } catch {}
            return next;
          });
          setCoinsCount((prev) => prev + amount);
        }}
        onGrantShield={handleCollectShield}
        onGrantNitro={handleCollectNitro}
        onSimulateAdBreak={() => setShowRewardedAdModal(true)}
        onRecordImpression={(views, rev) => {
          setDeveloperEarningsUSD((prev) => prev + rev);
          setAdImpressionsCount((prev) => prev + views);
        }}
      />

      {/* GLOBAL LIVE LEADERBOARD MODAL */}
      <GlobalLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        currentPlayerName={gameAccount?.username || 'You (Runner)'}
        currentPlayerScore={Math.max(score, highScore)}
        currentPlayerLevel={Math.max(level, highestLevel)}
      />

      {/* PROGRESSIVE WEB APP (PWA) INSTALL MODAL */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        isIOS={isIOS}
        onInstall={triggerPWAInstall}
        isInstalled={isInstalled}
      />

      {/* 20 OBSTACLES REFERENCE BOARD MODAL */}
      {showObstaclesModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 max-w-lg w-full text-left shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Neon Obstacle Course (20 Obstacles)</h2>
                  <p className="text-[10px] text-cyan-400">Reference board obstacles: master jump, crouch, slide & dodge!</p>
                </div>
              </div>
              <button
                onClick={() => setShowObstaclesModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg active:scale-95"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {[
                {num: 1, name: 'Barrier', action: 'Jump Over', tag: 'JUMP', color: 'text-amber-400 bg-amber-950/60 border-amber-600/50', desc: 'Highway concrete hazard barrier with yellow/black diagonal chevron stripes.'},
                {num: 2, name: 'Spikes', action: 'Jump Over', tag: 'JUMP', color: 'text-rose-400 bg-rose-950/60 border-rose-600/50', desc: 'Row of sharp silver conical spikes with glowing red LED underglow base.'},
                {num: 3, name: 'Laser Beam', action: 'Crouch Under', tag: 'MOVE BELOW', color: 'text-pink-400 bg-pink-950/60 border-pink-600/50', desc: 'High horizontal neon laser beam suspended between cyber pylons.'},
                {num: 4, name: 'Hanging Block', action: 'Slide Under', tag: 'MOVE BELOW', color: 'text-amber-400 bg-amber-950/60 border-amber-600/50', desc: 'Overhead industrial hazard block suspended from ceiling brackets with open clearance.'},
                {num: 5, name: 'Truck', action: 'Jump Over / Dodge', tag: 'DODGE / JUMP', color: 'text-purple-400 bg-purple-950/60 border-purple-600/50', desc: 'Heavy purple cargo semi-truck trailer with glowing red tail lights.'},
                {num: 6, name: 'Car', action: 'Jump Over', tag: 'JUMP', color: 'text-blue-400 bg-blue-950/60 border-blue-600/50', desc: 'Sleek cyberpunk sports car with glowing blue neon body and rear spoiler.'},
                {num: 7, name: 'Side Wall', action: 'Move Left/Right', tag: 'DODGE', color: 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-600/50', desc: 'Heavy barricade wall with glowing magenta chevron arrows << and red LEDs.'},
                {num: 8, name: 'Gap', action: 'Jump Over', tag: 'JUMP', color: 'text-yellow-400 bg-yellow-950/60 border-yellow-600/50', desc: 'Deep road fissure void with yellow and black hazard warning lips.'},
                {num: 9, name: 'Rolling Rock', action: 'Jump Over', tag: 'JUMP', color: 'text-sky-400 bg-sky-950/60 border-sky-600/50', desc: 'Massive cracked stone boulder rolling toward you with speed streaks.'},
                {num: 10, name: 'Low Tunnel', action: 'Crouch Under', tag: 'MOVE BELOW', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-600/50', desc: 'Futuristic low archway tunnel with glowing electric cyan portal rim.'},
                {num: 11, name: 'Jump Pad', action: 'High Jump (Launch)', tag: 'MEGA BOOST', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-600/50', desc: 'Octagonal cyber launch pad with pulsing holographic upward chevrons (^ ^ ^).'},
                {num: 12, name: 'Moving Platform', action: 'Jump On', tag: 'JUMP', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-600/50', desc: 'Hovering hazard platform with downward blue ion thruster plasma plumes.'},
                {num: 13, name: 'Electric Fence', action: 'Jump Over', tag: 'JUMP', color: 'text-blue-400 bg-blue-950/60 border-blue-600/50', desc: 'Two golden insulator posts with 3 buzzing electric blue lightning arcs.'},
                {num: 14, name: 'Flying Drone', action: 'Dodge / Duck', tag: 'DODGE / DUCK', color: 'text-rose-400 bg-rose-950/60 border-rose-600/50', desc: 'Hovering combat drone with red cyclops sensor eye and spinning rotor rings.'},
                {num: 15, name: 'Stack of Boxes', action: 'Jump Over', tag: 'JUMP', color: 'text-amber-400 bg-amber-950/60 border-amber-600/50', desc: 'Stack of three wooden industrial cargo crates with metal corner brackets.'},
                {num: 16, name: 'Swinging Ball', action: 'Jump or Move', tag: 'JUMP / DODGE', color: 'text-orange-400 bg-orange-950/60 border-orange-600/50', desc: 'Giant metallic demolition wrecking ball swinging in an arc on an overhead chain.'},
                {num: 17, name: 'Narrow Path', action: 'Stay Center', tag: 'STAY CENTER', color: 'text-pink-400 bg-pink-950/60 border-pink-600/50', desc: 'Twin glowing pink jersey barriers tightly flanking the runway lane.'},
                {num: 18, name: 'Water Pool', action: 'Jump Over', tag: 'JUMP', color: 'text-sky-400 bg-sky-950/60 border-sky-600/50', desc: 'Sunken illuminated neon water pool basin with rippling cyan water.'},
                {num: 19, name: 'Collapsing Bridge', action: 'Quick Move / Jump', tag: 'JUMP', color: 'text-amber-400 bg-amber-950/60 border-amber-600/50', desc: 'Broken suspension walkway section with cracked planks and middle gap.'},
                {num: 20, name: 'High Wall', action: 'Climb / High Jump', tag: 'HIGH JUMP', color: 'text-purple-400 bg-purple-950/60 border-purple-600/50', desc: 'Monolithic purple cyber wall with glowing magenta climbing ladder and arrows.'}
              ].map((item) => (
                <div key={item.num} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:border-slate-700 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {item.num}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-100 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${item.color}`}>
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRO SKINS & CHARACTERS SHOP MODAL */}
      {showShopModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-5 max-w-md w-full text-left shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Skins & Hero Shop</h2>
                  <p className="text-[10px] text-slate-400">Spheres, Lights, Skateboards, Pets & Characters</p>
                </div>
              </div>
              <button
                onClick={() => setShowShopModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg active:scale-95"
              >
                Close
              </button>
            </div>

            {/* Wallet Bank Banner */}
            <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/40 rounded-xl p-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Wallet Bank</span>
                  <span className="text-sm font-black text-amber-300 font-mono">{totalCoins} Coins 🪙</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Earn in runs & Squad Rush</span>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-3 no-scrollbar shrink-0">
              {[
                { id: 'all', label: 'All', icon: '⭐' },
                { id: 'balls', label: 'Balls & Lights', icon: '🌐' },
                { id: 'skateboards', label: 'Skateboards', icon: '🛹' },
                { id: 'characters', label: 'Heroes & Baby', icon: '🏃' },
                { id: 'pets', label: 'Pets & Dogs', icon: '🐾' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setShopCategory(tab.id as any)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    shopCategory === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Skins Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RUNNER_SKINS.filter((skin) => shopCategory === 'all' || skin.category === shopCategory).map((skin) => {
                const isSelected = selectedSkin.id === skin.id;
                const isOwned = purchasedSkins.includes(skin.id);
                const canAfford = totalCoins >= skin.price;

                const rarityColors: Record<string, string> = {
                  Common: 'border-slate-700 text-slate-300 bg-slate-800/40',
                  Rare: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30',
                  Epic: 'border-purple-500/40 text-purple-300 bg-purple-950/30',
                  Legendary: 'border-amber-500/40 text-amber-300 bg-amber-950/30',
                  Mythic: 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                };

                return (
                  <div
                    key={skin.id}
                    className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-lg'
                        : isOwned
                        ? 'border-slate-700 bg-slate-950/90'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          {skin.avatarUrl ? (
                            <img
                              src={skin.avatarUrl}
                              alt={skin.name}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-purple-400 shadow-md shadow-purple-500/30 shrink-0"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0"
                              style={{
                                backgroundColor: skin.color,
                                boxShadow: `0 0 12px ${skin.emissive}`
                              }}
                            >
                              <span>{skin.iconTag}</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-white truncate">{skin.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border w-fit ${rarityColors[skin.rarity] || 'border-slate-700 text-slate-300'}`}>
                              {skin.rarity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                        {skin.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-xs font-black font-mono text-amber-300">
                        {skin.price === 0 ? 'FREE' : `${skin.price} 🪙`}
                      </span>

                      {isSelected ? (
                        <button
                          disabled
                          className="px-3 py-1.5 bg-emerald-600 text-white font-black text-[10px] rounded-xl flex items-center gap-1 shadow-sm opacity-90"
                        >
                          <Check className="w-3 h-3 stroke-[3]" /> EQUIPPED
                        </button>
                      ) : isOwned ? (
                        <button
                          onClick={() => handleEquipOrBuySkin(skin)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] rounded-xl transition active:scale-95 shadow-sm"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipOrBuySkin(skin)}
                          className={`px-3 py-1.5 font-black text-[10px] rounded-xl transition flex items-center gap-1 active:scale-95 shadow-md ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>{canAfford ? 'BUY' : `Need ${skin.price - totalCoins}🪙`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CHALLENGES BOARD MODAL */}
      {showChallengesModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-5 max-w-lg w-full text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/50 text-purple-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400">
                    CHALLENGES & MISSIONS BOARD
                  </h2>
                  <p className="text-[10px] text-slate-400">Complete challenges to earn massive coin gifts (50k - 150k)!</p>
                </div>
              </div>
              <button
                onClick={() => setShowChallengesModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {GAME_CHALLENGES.map((ch) => {
                let currentVal = 0;
                if (ch.type === 'distance') currentVal = totalDistance;
                else if (ch.type === 'coins') currentVal = totalCoins;
                else if (ch.type === 'level') currentVal = highestLevel;
                else if (ch.type === 'skins_unlocked') currentVal = purchasedSkins.length;

                const isCompleted = currentVal >= ch.target;
                const isClaimed = claimedChallenges.includes(ch.id);
                const progressPct = Math.min(100, Math.round((currentVal / ch.target) * 100));

                return (
                  <div key={ch.id} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 text-xl flex items-center justify-center shrink-0">
                          <span>{ch.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white">{ch.title}</span>
                          <span className="text-[10px] text-slate-400">{ch.description}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-black text-amber-300 font-mono">+{ch.rewardCoins.toLocaleString()} 🪙</span>
                        <span className="text-[9px] text-slate-500 font-bold">Reward Gift</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Progress: <strong className="text-cyan-400">{currentVal.toLocaleString()} / {ch.target.toLocaleString()}</strong></span>
                        <span className="font-bold text-purple-400">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      {isClaimed ? (
                        <button disabled className="px-4 py-1.5 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> CLAIMED
                        </button>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimChallenge(ch.id, ch.rewardCoins)}
                          className="px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95 transition animate-bounce"
                        >
                          CLAIM GIFT +{ch.rewardCoins.toLocaleString()} 🪙
                        </button>
                      ) : (
                        <button disabled className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs rounded-xl">
                          In Progress
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* THEMED TOURNAMENTS MODAL */}
      {showTournamentsModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 max-w-lg w-full text-slate-100 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
                    THEMED TOURNAMENT CUPS 🏆
                  </h2>
                  <p className="text-[10px] text-slate-400">Compete in sponsored global cups for massive coin grand prizes!</p>
                </div>
              </div>
              <button
                onClick={() => setShowTournamentsModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {THEMED_TOURNAMENTS.map((t) => (
                <div key={t.id} className="p-4 bg-slate-950/90 border border-cyan-500/30 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-2xl flex items-center justify-center shrink-0 shadow-lg">
                        <span>{t.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{t.title}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${t.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'}`}>
                            {t.status}
                          </span>
                        </div>
                        <span className="text-xs text-cyan-400 font-semibold">Sponsored by {t.sponsor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Grand Prize Pool</span>
                      <span className="font-black text-amber-300 font-mono">{t.prizePool}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Timeline</span>
                      <span className="font-bold text-slate-200">{t.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Theme: {t.theme}</span>
                    <button
                      onClick={() => {
                        setShowTournamentsModal(false);
                        setGameState('PLAYING');
                        setMilestoneToast(`🏆 Entered ${t.title}! Race for the Grand Prize!`);
                        setTimeout(() => setMilestoneToast(null), 3000);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95 transition flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Race in Cup 🚀
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LUCKY SPIN WHEEL MODAL */}
      {showSpinModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full text-slate-100 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500/50 text-amber-400 flex items-center justify-center mb-3">
              🎰
            </div>
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-1">
              LUCKY SPIN WHEEL
            </h2>
            <p className="text-xs text-slate-400 mb-3">Spin once every day to win massive coin prizes instantly!</p>

            {spinResult && (
              <div className="w-full bg-amber-950/80 border border-amber-500/50 p-2.5 rounded-xl mb-3 text-xs font-black text-amber-300">
                {spinResult}
              </div>
            )}

            {/* Free Re-Spin Announcement Banner */}
            {isFreeRespin && (
              <div className="bg-amber-500/20 border border-amber-400 text-amber-300 px-3 py-1 rounded-full text-[10px] font-black tracking-wider animate-bounce uppercase mb-2">
                🎯 FREE RE-SPIN AWARDED! (Landed on the line)
              </div>
            )}

            {/* Spinning Wheel Graphic */}
            <div className="relative w-48 h-48 my-2 flex items-center justify-center">
              {/* Pointer triangle at top */}
              <div className="absolute -top-3.5 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-amber-400 drop-shadow-[0_4px_8px_rgba(251,191,36,0.5)]"></div>
              
              <div 
                className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden"
                style={{
                  transition: isSpinning ? 'transform 3s cubic-bezier(0.15, 0.85, 0.15, 1)' : 'none',
                  transform: `rotate(${wheelRotation}deg)`
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {SPIN_PRIZES.map((prize, idx) => {
                    const angle = 360 / SPIN_PRIZES.length;
                    const rotate = idx * angle;
                    return (
                      <g key={idx} transform={`rotate(${rotate} 50 50)`}>
                        <path
                          d="M50 50 L50 0 A50 50 0 0 1 85.35 14.65 Z"
                          fill={prize.color}
                          stroke="#fbbf24"
                          strokeWidth="0.8"
                        />
                        <text
                          x="50"
                          y="20"
                          fill="#ffffff"
                          fontSize="5"
                          fontWeight="bold"
                          textAnchor="middle"
                          transform={`rotate(${angle / 2} 50 50)`}
                        >
                          {prize.points >= 1000 ? `${prize.points / 1000}k` : prize.points}
                        </text>
                        {/* Gold divider pin at sector border */}
                        <circle cx="50" cy="2" r="1.5" fill="#fde047" stroke="#b45309" strokeWidth="0.5" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Spin Hub */}
              <div className="absolute z-10 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-slate-900 shadow-lg flex items-center justify-center text-[9px] font-black text-slate-950">
                SPIN
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={handleSpinWheel}
                disabled={!spinAvailable || isSpinning}
                className={`w-full py-3 rounded-xl text-xs font-black shadow-lg transition active:scale-95 ${
                  !spinAvailable
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : isSpinning
                    ? 'bg-amber-600 text-white animate-pulse cursor-wait'
                    : isFreeRespin
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 ring-2 ring-emerald-400 animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950'
                }`}
              >
                {isSpinning
                  ? '🎡 SPINNING...'
                  : isFreeRespin
                  ? '🎯 TAKE FREE RE-SPIN NOW! 🎰'
                  : spinAvailable
                  ? 'SPIN THE WHEEL NOW 🎰'
                  : '✨ ALREADY SPUN TODAY'}
              </button>
              <button
                onClick={() => { setShowSpinModal(false); setSpinResult(null); }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MYSTERY GACHA CRATE MODAL */}
      {showGachaModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-pink-500/50 rounded-2xl p-5 max-w-sm w-full text-slate-100 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-950 border border-pink-500/50 text-pink-400 flex items-center justify-center mb-3">
              🎁
            </div>
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-1">
              MYSTERY SKIN CRATE
            </h2>
            <p className="text-xs text-slate-400 mb-4">Open a crate for 50,000 Coins to unlock a random unowned skin!</p>

            {gachaResult && (
              <div className="w-full bg-pink-950/80 border border-pink-500/50 p-3 rounded-xl mb-4 flex flex-col items-center gap-1">
                <span className="text-2xl">{gachaResult.iconTag}</span>
                <span className="text-xs font-black text-white">{gachaResult.name}</span>
                <span className="text-[10px] text-pink-300 font-bold">Unlocked {gachaResult.rarity} Skin!</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleOpenGachaBox}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black rounded-xl text-xs shadow-lg active:scale-95 transition"
              >
                OPEN CRATE (50,000 🪙)
              </button>
              <button
                onClick={() => { setShowGachaModal(false); setGachaResult(null); }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OWNER COMMAND CENTER DASHBOARD */}
      <AdminDashboardModal
        isOpen={showAdminDashboardModal}
        onClose={() => setShowAdminDashboardModal(false)}
        currentSettings={gameSettings}
        onUpdateSettings={(newSettings) => setGameSettings(newSettings)}
        currentUser={gameAccount}
        currentCoins={totalCoins}
        currentHighScore={highScore}
        currentHighestLevel={highestLevel}
      />
    </div>
  );
}

