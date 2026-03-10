/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb, MessageCircleQuestion, Heart, CheckCircle2, Leaf, Sparkles, Send, Image as ImageIcon, LogOut, UserCircle2, ArrowLeft, Trophy, Flame, MessageSquare, X, Plus, Trash2, AlertTriangle, Flag, MoreVertical, Pencil, MapPin, Map as MapIcon, Gamepad2, Zap, Globe, Shield, Tv, Wind, Refrigerator, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

export const updateEcoHealth = (userId: string, amount: number) => {
  const storedHealth = localStorage.getItem(`eco_health_${userId}`);
  let currentHealth = storedHealth ? parseInt(storedHealth) : 100;
  currentHealth = Math.min(100, currentHealth + amount);
  localStorage.setItem(`eco_health_${userId}`, currentHealth.toString());
  localStorage.setItem(`eco_health_update_${userId}`, Date.now().toString());
  window.dispatchEvent(new Event('eco_health_updated'));
};

// Fix Leaflet default icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type Subbab = 'Kesehatan Lingkungan' | 'Pemanasan Global' | 'Krisis Energi' | 'Ketahanan Pangan';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  className: string;
  studentNumber: string;
  schoolName: string;
  profilePictureUrl: string;
  bio: string;
  role: 'student' | 'teacher';
  xp: number;
  interactions: number;
  streak: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  lastPostDate?: string; // ISO string YYYY-MM-DD
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorClass: string;
  authorUsername?: string;
  authorIsFollowing?: boolean;
  subbab: Subbab;
  caption: string;
  imageUrl: string;
  insightful: number;
  ask: number;
  support: number;
  timestamp: number;
  isScientific: boolean;
  commentCount: number;
  userInteractions: string[];
  locationLat?: number;
  locationLng?: number;
  assignments?: any[];
  isMission?: boolean;
  gameLevel?: number;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorClass: string;
  content: string;
  timestamp: number;
}

interface UserStats {
  id: string;
  name: string;
  className: string;
  schoolName: string;
  xp: number;
  interactions: number;
  role: 'student' | 'teacher';
}

const SCIENTIFIC_KEYWORDS = ['emisi', 'gas rumah kaca', 'limbah', 'biogas'];

const DAILY_QUESTS = [
  "Tunjukkan caramu menghemat air hari ini! 💧", // Minggu
  "Posting foto botol minum tumblr kamu! (#SayNoToPlastic) 🥤", // Senin
  "Cari 1 alat elektronik yang masih dicolok padahal nggak dipakai! 🔌", // Selasa
  "Gunakan transportasi umum atau jalan kaki hari ini! 🚶‍♂️", // Rabu
  "Kurangi penggunaan tisu, gunakan sapu tangan! 🧣", // Kamis
  "Matikan lampu saat tidak digunakan! 💡", // Jumat
  "Pilah sampah organik dan anorganik di rumah! ♻️" // Sabtu
];

const ECO_FACTS = [
  "Indonesia adalah penyumbang sampah plastik ke laut terbesar kedua di dunia. Ayo kurangi plastik! 🌊",
  "Satu pohon dewasa dapat menyerap sekitar 22kg karbon dioksida per tahun. Tanam pohon yuk! 🌳",
  "Pemanasan global dapat menyebabkan kenaikan permukaan air laut yang mengancam pulau-pulau kecil di Indonesia. 🏝️",
  "Mematikan lampu selama satu jam dapat menghemat energi yang cukup untuk menyalakan TV selama 3 jam. 📺",
  "Sampah makanan di Indonesia mencapai 23-48 juta ton per tahun, cukup untuk memberi makan 61-125 juta orang. 🍱",
  "Penggunaan tumbler dapat mengurangi hingga 150 botol plastik per orang setiap tahunnya. 🥤",
  "Suhu rata-rata bumi telah meningkat sekitar 1.1°C sejak akhir abad ke-19. Kita harus bertindak! 🌡️",
  "Ketahanan pangan Indonesia terancam oleh perubahan iklim yang mengganggu pola tanam petani. 🌾"
];

const SUBBAB_COLORS: Record<Subbab, string> = {
  'Kesehatan Lingkungan': 'bg-teal-100 text-teal-800 border-teal-200',
  'Pemanasan Global': 'bg-red-100 text-red-800 border-red-200',
  'Krisis Energi': 'bg-amber-100 text-amber-800 border-amber-200',
  'Ketahanan Pangan': 'bg-green-100 text-green-800 border-green-200',
};

// --- Daily Quest Banner Component ---
const DailyQuestBanner = () => {
  const today = new Date().getDay();
  const quest = DAILY_QUESTS[today];

  return (
    <div className="bg-gradient-to-r from-[#8A9A5B] to-[#7A8A4B] rounded-2xl p-4 mb-6 shadow-md border border-[#8A9A5B]/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform"></div>
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-0.5">Misi Hari Ini</h3>
          <p className="text-white font-bold text-sm sm:text-base leading-tight">{quest}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest border border-white/30">
            +15 XP
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Bang Eko Component ---
const BangEko = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFact, setCurrentFact] = useState('');

  const showFact = () => {
    const randomFact = ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)];
    setCurrentFact(randomFact);
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-[#E5E0D8] p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#8A9A5B] rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-sm">Bang Eko</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[#F4F1EA] rounded-full transition-colors">
              <X className="w-4 h-4 text-[#A8A096]" />
            </button>
          </div>
          <div className="bg-[#F4F1EA] p-3 rounded-xl text-sm leading-relaxed text-[#4A4036] border border-[#E5E0D8]">
            {currentFact}
          </div>
          <div className="mt-3 text-[10px] text-[#A8A096] font-medium text-center italic">
            "Semangat terus ya, Eco-Influencer! 🌱"
          </div>
        </div>
      )}
      <button
        onClick={showFact}
        className="w-14 h-14 bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group relative"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
        <MessageSquare className="w-7 h-7 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== -6.2 || center[1] !== 106.8) {
      map.flyTo(center, 13, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center[0], center[1], map]);
  return null;
};

const ISSUE_KEYWORDS = ['limbah', 'polusi', 'sampah', 'kotor', 'asap', 'emisi', 'rusak', 'cemar', 'banjir', 'kekeringan', 'penebangan', 'kebakaran', 'plastik', 'oli', 'racun'];
const SOLUTION_KEYWORDS = ['solusi', 'tanam', 'pohon', 'daur ulang', 'hemat', 'bersih', 'hijau', 'surya', 'kompos', 'organik', 'sepeda', 'jalan', 'tumbler', 'bibit', 'pupuk', 'biogas', 'manggrove'];

const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // @ts-ignore - leaflet.heat adds heatLayer to L
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.4: 'blue',
        0.6: 'lime',
        0.7: 'yellow',
        0.8: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

const EcoMap = ({ posts }: { posts: Post[] }) => {
  const mapPosts = posts.filter(p => p.locationLat != null && p.locationLng != null);
  
  // Prepare heatmap points (only for issues)
  const heatmapPoints: [number, number, number][] = mapPosts
    .filter(post => {
      const captionLower = post.caption.toLowerCase();
      return ISSUE_KEYWORDS.some(k => captionLower.includes(k));
    })
    .map(post => [post.locationLat!, post.locationLng!, 1.0]); // Lat, Lng, Intensity

  // Default center if no posts with location
  const defaultCenter: [number, number] = [-6.2, 106.8];
  const center: [number, number] = mapPosts.length > 0 
    ? [mapPosts[0].locationLat!, mapPosts[0].locationLng!] 
    : defaultCenter;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden mb-6">
      <div className="p-3 border-b border-[#E5E0D8] flex items-center justify-between bg-[#FDFCFB]">
        <h2 className="font-bold text-sm flex items-center gap-2 text-[#4A4036]">
          <MapIcon className="w-4 h-4 text-[#8A9A5B]" />
          Eco-Map Explorer
        </h2>
        <div className="flex gap-3 text-[9px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span>Masalah</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Solusi</span>
          </div>
          <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-200">
            <Flame className="w-2.5 h-2.5" />
            <span>Heatmap Aktif</span>
          </div>
        </div>
      </div>
      <div id="map" className="h-[200px] w-full z-0">
        <MapContainer 
          center={center} 
          zoom={11} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <ChangeView center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Heatmap Layer */}
          {heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}

          {mapPosts.map(post => {
            const captionLower = post.caption.toLowerCase();
            const isIssue = ISSUE_KEYWORDS.some(k => captionLower.includes(k));
            const isSolution = SOLUTION_KEYWORDS.some(k => captionLower.includes(k));
            
            let icon = new L.Icon.Default();
            if (isIssue) icon = redIcon;
            else if (isSolution) icon = greenIcon;

            return (
              <Marker 
                key={post.id} 
                position={[post.locationLat!, post.locationLng!]} 
                icon={icon}
              >
                <Popup>
                  <div className="p-1 max-w-[200px]">
                    <div className="font-bold text-[#8A9A5B] text-xs">@{post.authorUsername || 'User'}</div>
                    <div className="text-[10px] text-[#4A4036] mt-1 leading-tight">
                      {post.caption.substring(0, 80)}{post.caption.length > 80 ? '...' : ''}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

const LevelUpOverlay = ({ level, isOpen, onClose }: { level: number, isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] p-12 text-center shadow-2xl border-4 border-[#8A9A5B] animate-in zoom-in duration-500">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-[#8A9A5B] blur-2xl opacity-20 animate-pulse"></div>
          <Trophy className="w-24 h-24 text-[#8A9A5B] relative z-10" />
        </div>
        <h2 className="text-4xl font-black text-[#4A4036] mb-2 italic uppercase tracking-tighter">Level Up!</h2>
        <p className="text-xl text-[#A8A096] mb-8">Kamu sekarang Level <span className="text-[#8A9A5B] font-black">{level}</span></p>
        <button 
          onClick={onClose}
          className="bg-[#8A9A5B] text-white px-12 py-4 rounded-full font-black text-lg shadow-xl hover:bg-[#7A8A4B] transition-all active:scale-95"
        >
          Lanjut Beraksi!
        </button>
      </div>
    </div>
  );
};

const EcoArcadeModal = ({ isOpen, onClose, level, onComplete, gameType: initialGameType }: { isOpen: boolean, onClose: () => void, level: number, onComplete: (xp: number) => void, gameType?: 'sort' | 'shield' | 'clicker' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameType, setGameType] = useState<'sort' | 'shield' | 'clicker'>(initialGameType || 'sort');
  const requestRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const gameState = useRef({
    player: { x: 150, y: 350, w: 50, h: 30 },
    items: [] as any[],
    lastSpawn: 0,
    score: 0,
    misses: 0,
    level: level,
    clickerItems: [] as any[]
  });

  useEffect(() => {
    if (initialGameType) setGameType(initialGameType);
  }, [initialGameType]);

  useEffect(() => {
    if (!isOpen) {
      setGameStarted(false);
      setScore(0);
      setMisses(0);
      setTimeLeft(30);
      setGameOver(false);
      gameState.current.score = 0;
      gameState.current.misses = 0;
      gameState.current.items = [];
      if (timerRef.current) clearInterval(timerRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
  }, [isOpen]);

  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setMisses(0);
    setTimeLeft(30);
    setGameOver(false);
    gameState.current.score = 0;
    gameState.current.misses = 0;
    gameState.current.items = [];
    gameState.current.level = level;

    if (gameType === 'clicker') {
      gameState.current.clickerItems = [
        { id: 'lampu', label: 'Lampu', active: false, icon: <Zap /> },
        { id: 'tv', label: 'TV', active: false, icon: <Tv /> },
        { id: 'ac', label: 'AC', active: false, icon: <Wind /> },
        { id: 'kulkas', label: 'Kulkas', active: false, icon: <Refrigerator /> }
      ];
      startClickerTimer();
    } else {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const startClickerTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });

      // Randomly activate an item
      if (Math.random() > 0.4) {
        const idx = Math.floor(Math.random() * 4);
        gameState.current.clickerItems[idx].active = true;
        setScore(prev => prev); // Trigger re-render
      }
    }, 1000);
  };

  const handleItemClick = (id: string) => {
    const item = gameState.current.clickerItems.find(i => i.id === id);
    if (item && item.active) {
      item.active = false;
      gameState.current.score += 1;
      setScore(gameState.current.score);
      if (gameState.current.score >= 15) {
        setGameOver(true);
        clearInterval(timerRef.current!);
        onComplete(150);
      }
    }
  };

  const gameLoop = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameType === 'sort') {
      // Spawn
      if (time - gameState.current.lastSpawn > (level === 1 ? 1000 : level === 2 ? 600 : 400)) {
        const x = Math.random() * (canvas.width - 20);
        const type = Math.random() > 0.3 ? 'good' : 'bad';
        gameState.current.items.push({ x, y: -20, type, speed: 2 + (level * 0.5) });
        gameState.current.lastSpawn = time;
      }

      // Update & Draw
      gameState.current.items = gameState.current.items.filter(item => {
        item.y += item.speed;
        ctx.fillStyle = item.type === 'good' ? '#8A9A5B' : '#EF4444';
        ctx.fillRect(item.x, item.y, 20, 20);

        const p = gameState.current.player;
        if (item.y + 20 > p.y && item.x < p.x + p.w && item.x + 20 > p.x) {
          if (item.type === 'good') {
            gameState.current.score += 10;
            setScore(gameState.current.score);
          } else {
            gameState.current.score = Math.max(0, gameState.current.score - 5);
            setScore(gameState.current.score);
          }
          return false;
        }
        return item.y < canvas.height;
      });

      if (gameState.current.score >= 100) {
        setGameOver(true);
        onComplete(200);
        return;
      }
    } else if (gameType === 'shield') {
      // Atmosphere Shield Logic
      if (time - gameState.current.lastSpawn > 800) {
        const x = Math.random() * (canvas.width - 20);
        gameState.current.items.push({ x, y: -20, speed: 3 });
        gameState.current.lastSpawn = time;
      }

      gameState.current.items = gameState.current.items.filter(item => {
        item.y += item.speed;
        ctx.fillStyle = '#4B5563'; // Gray CO2
        ctx.beginPath();
        ctx.arc(item.x + 10, item.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        const p = gameState.current.player;
        // Shield is wider and thinner
        p.w = 80; p.h = 10;
        if (item.y + 20 > p.y && item.x < p.x + p.w && item.x + 20 > p.x) {
          gameState.current.score += 1;
          setScore(gameState.current.score);
          return false;
        }

        if (item.y > canvas.height) {
          gameState.current.misses += 1;
          setMisses(gameState.current.misses);
          return false;
        }
        return true;
      });

      if (gameState.current.score >= 20) {
        setGameOver(true);
        onComplete(150);
        return;
      }
      if (gameState.current.misses >= 5) {
        setGameOver(true);
        return;
      }
    }

    // Draw Player (Shield/Basket)
    if (gameType !== 'clicker') {
      ctx.fillStyle = '#4A4036';
      ctx.fillRect(gameState.current.player.x, gameState.current.player.y, gameState.current.player.w, gameState.current.player.h);
    }

    if (!gameOver) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    gameState.current.player.x = Math.max(0, Math.min(canvas.width - gameState.current.player.w, x - gameState.current.player.w / 2));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="p-6 border-b border-[#E5E0D8] flex items-center justify-between bg-[#8A9A5B] text-white">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-lg leading-none">Eco-Arcade</h2>
              <p className="text-[10px] opacity-80 uppercase tracking-widest mt-1">
                {gameType === 'sort' ? 'Sortir Sampah' : gameType === 'shield' ? 'Atmosphere Shield' : 'Energy Saver'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!gameStarted && !initialGameType && (
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button onClick={() => setGameType('sort')} className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${gameType === 'sort' ? 'border-[#8A9A5B] bg-[#8A9A5B]/5' : 'border-[#E5E0D8] hover:border-[#8A9A5B]'}`}>
                <div className="w-12 h-12 bg-[#8A9A5B] rounded-xl flex items-center justify-center text-white"><Trash2 /></div>
                <div>
                  <div className="font-bold text-[#4A4036]">Sortir Sampah</div>
                  <div className="text-[10px] text-[#A8A096]">Tangkap sampah organik untuk poin!</div>
                </div>
              </button>
              <button onClick={() => setGameType('shield')} className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${gameType === 'shield' ? 'border-[#8A9A5B] bg-[#8A9A5B]/5' : 'border-[#E5E0D8] hover:border-[#8A9A5B]'}`}>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white"><Shield /></div>
                <div>
                  <div className="font-bold text-[#4A4036]">Atmosphere Shield</div>
                  <div className="text-[10px] text-[#A8A096]">Tangkis CO2 agar suhu bumi stabil!</div>
                </div>
              </button>
              <button onClick={() => setGameType('clicker')} className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${gameType === 'clicker' ? 'border-[#8A9A5B] bg-[#8A9A5B]/5' : 'border-[#E5E0D8] hover:border-[#8A9A5B]'}`}>
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white"><Zap /></div>
                <div>
                  <div className="font-bold text-[#4A4036]">Energy Saver</div>
                  <div className="text-[10px] text-[#A8A096]">Matikan alat listrik yang boros!</div>
                </div>
              </button>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div className="bg-[#F4F1EA] px-4 py-2 rounded-2xl border border-[#E5E0D8]">
              <span className="text-xs font-bold text-[#A8A096] uppercase block">Skor</span>
              <span className="text-2xl font-black text-[#8A9A5B]">{score} / {gameType === 'sort' ? '100' : gameType === 'shield' ? '20' : '15'}</span>
            </div>
            {gameType === 'shield' && (
              <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
                <span className="text-xs font-bold text-red-400 uppercase block">Meleset</span>
                <span className="text-2xl font-black text-red-500">{misses} / 5</span>
              </div>
            )}
            {gameType === 'clicker' && (
              <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                <span className="text-xs font-bold text-blue-400 uppercase block">Waktu</span>
                <span className="text-2xl font-black text-blue-500">{timeLeft}s</span>
              </div>
            )}
          </div>

          <div className="relative bg-[#F4F1EA] rounded-2xl border-2 border-[#E5E0D8] overflow-hidden">
            {gameType === 'clicker' ? (
              <div className="w-full h-[400px] grid grid-cols-2 gap-4 p-8">
                {gameState.current.clickerItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`rounded-3xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm border-2 ${item.active ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-green-500 text-white border-green-600 opacity-50'}`}
                  >
                    {item.icon}
                    <span className="font-bold text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={300}
                height={400}
                onMouseMove={handleMouseMove}
                className="w-full h-auto block cursor-none"
              />
            )}
            
            {!gameStarted && (
              <div className="absolute inset-0 bg-[#F4F1EA]/80 flex flex-col items-center justify-center p-8 text-center">
                <h3 className="font-bold text-xl mb-2">Siap Memulai?</h3>
                <p className="text-sm text-[#4A4036] mb-6">Dapatkan XP dengan menyelesaikan misi!</p>
                <button
                  onClick={startGame}
                  className="bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white px-8 py-3 rounded-full font-bold shadow-md transition-all hover:scale-105"
                >
                  Mulai Game
                </button>
              </div>
            )}

            {gameOver && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white ${((gameType === 'sort' && score >= 100) || (gameType === 'shield' && score >= 20) || (gameType === 'clicker' && score >= 15)) ? 'bg-[#8A9A5B]/90' : 'bg-red-500/90'}`}>
                {((gameType === 'sort' && score >= 100) || (gameType === 'shield' && score >= 20) || (gameType === 'clicker' && score >= 15)) ? (
                  <>
                    <Trophy className="w-16 h-16 mb-4 animate-bounce" />
                    <h3 className="font-black text-3xl mb-2">MISI BERHASIL!</h3>
                    <p className="text-lg mb-6 opacity-90">Kamu mendapatkan XP</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-16 h-16 mb-4" />
                    <h3 className="font-black text-3xl mb-2">MISI GAGAL</h3>
                    <p className="text-lg mb-6 opacity-90">Coba lagi!</p>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="bg-white text-[#4A4036] px-10 py-3 rounded-full font-bold shadow-lg transition-all hover:scale-105"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};




// --- Profile Page Component ---
const ProfilePage = ({ user, currentUser, onBack }: { user: UserProfile, currentUser: UserProfile, onBack: () => void }) => {
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState<File | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [health, setHealth] = useState(100);
  const [followers, setFollowers] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers'>('posts');
  const [isUploading, setIsUploading] = useState(false);

  const fetchProfile = () => {
    Promise.all([
      fetch(`/api/users/${user.id}?viewerId=${currentUser.id}`).then(res => res.json()),
      fetch(`/api/users/${user.id}/followers`).then(res => res.json()).catch(() => []),
      fetch(`/api/posts?authorId=${user.id}`).then(res => res.json()).catch(() => [])
    ])
      .then(([profileRes, followersRes, postsRes]) => {
        setProfileData(profileRes);
        setEditBio(profileRes.bio || '');
        setIsFollowing(profileRes.isFollowing);
        setFollowers(Array.isArray(followersRes) ? followersRes : []);
        setPosts(Array.isArray(postsRes) ? postsRes : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id, currentUser.id]);

  useEffect(() => {
    const calculateHealth = () => {
      const storedHealth = localStorage.getItem(`eco_health_${user.id}`);
      const lastUpdate = localStorage.getItem(`eco_health_update_${user.id}`);
      
      let currentHealth = storedHealth ? parseInt(storedHealth) : 100;
      
      if (lastUpdate) {
        const hoursPassed = (Date.now() - parseInt(lastUpdate)) / (1000 * 60 * 60);
        currentHealth = Math.max(0, currentHealth - Math.floor(hoursPassed * 2));
      }
      
      setHealth(currentHealth);
      localStorage.setItem(`eco_health_${user.id}`, currentHealth.toString());
      localStorage.setItem(`eco_health_update_${user.id}`, Date.now().toString());
    };

    calculateHealth();
    
    const handleHealthUpdate = () => calculateHealth();
    window.addEventListener('eco_health_updated', handleHealthUpdate);
    return () => window.removeEventListener('eco_health_updated', handleHealthUpdate);
  }, [user.id]);

  const handleUpdateProfile = async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      let profilePictureUrl = profileData?.profilePictureUrl || '';

      if (editProfilePicture) {
        const reader = new FileReader();
        reader.readAsDataURL(editProfilePicture);
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            profilePictureUrl = reader.result as string;
            resolve();
          };
        });
      }

      const res = await fetch(`/api/users/${user.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: editBio, profilePictureUrl })
      });
      if (res.ok) {
        setIsEditing(false);
        setEditProfilePicture(null);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFollow = async () => {
    const previousState = isFollowing;
    setIsFollowing(!isFollowing); // Optimistic update
    
    try {
      const res = await fetch(`/api/users/${user.id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser.id })
      });
      if (res.ok) {
        fetchProfile();
      } else {
        setIsFollowing(previousState); // Revert on error
        const data = await res.json();
        alert(data.error || "Gagal mengikuti pengguna. Pastikan tabel 'follows' sudah dibuat di Supabase.");
      }
    } catch (err) {
      setIsFollowing(previousState); // Revert on error
      console.error(err);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A9A5B]"></div></div>;
  }

  const isOwnProfile = user.id === currentUser.id;

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans pb-20">
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <button onClick={onBack} className="flex items-center gap-2 hover:bg-[#7A8A4B] px-3 py-1.5 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali</span>
          </button>
          <div className="flex-1 text-center font-bold text-lg pr-10">{isOwnProfile ? 'Profil Saya' : 'Profil Eco-Influencer'}</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-[#E5E0D8] overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-[#8A9A5B] to-[#D2B48C] relative">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md relative z-10">
                {profileData?.profilePictureUrl ? (
                  <img 
                    src={profileData.profilePictureUrl} 
                    alt="Profile" 
                    className={`w-full h-full rounded-full object-cover transition-all duration-500 ${health < 30 ? 'grayscale' : ''}`} 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className={`w-full h-full rounded-full bg-[#D2B48C] flex items-center justify-center text-white text-3xl font-bold transition-all duration-500 ${health < 30 ? 'grayscale' : ''}`}>
                    {profileData?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              
              {/* Eco-Guardian Avatar */}
              <div className="relative group cursor-pointer mb-2">
                <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg border-2 border-[#8A9A5B] relative z-20 hover:scale-110 transition-transform">
                  <img 
                    src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${user.id}`} 
                    alt="Eco-Guardian Avatar" 
                    className={`w-full h-full rounded-full object-cover ${health < 30 ? 'grayscale opacity-80' : ''}`}
                  />
                  {health > 80 && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                      Happy!
                    </div>
                  )}
                  {health < 30 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      Help!
                    </div>
                  )}
                </div>
                
                {/* Health Bar Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white p-3 rounded-xl shadow-xl border border-[#E5E0D8] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  <div className="text-xs font-bold text-center mb-1 text-[#4A4036]">Eco-Guardian Health</div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                    <div 
                      className={`h-full transition-all duration-500 ${health > 80 ? 'bg-green-500' : health > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${health}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-center text-[#A8A096]">
                    {health > 80 ? 'Happy & Healthy 🌿' : health > 30 ? 'Needs Attention 🌱' : 'Endangered! 🥀'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-16 pb-8 px-6 text-center relative z-10">
            <div className="flex justify-center items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">{profileData?.fullName}</h2>
              {isOwnProfile ? (
                <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-gray-100 rounded-full relative z-20">
                  <Sparkles className="w-4 h-4 text-[#8A9A5B]" />
                </button>
              ) : (
                <button 
                  onClick={handleFollow}
                  className={`px-4 py-1 rounded-full text-xs font-bold transition-all relative z-20 ${isFollowing ? 'bg-[#E5E0D8] text-[#A8A096]' : 'bg-[#8A9A5B] text-white shadow-sm'}`}
                >
                  {isFollowing ? 'Mengikuti' : 'Ikuti'}
                </button>
              )}
            </div>
            <p className="text-[#A8A096] font-medium mb-1">@{profileData?.username}</p>
            <p className="text-sm text-[#8A9A5B] font-bold mb-4">
              {profileData?.role === 'teacher' ? 'Guru' : profileData?.schoolName}
            </p>

            {isEditing ? (
              <div className="mb-6 px-4">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-[#4A4036] mb-2">Foto Profil</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditProfilePicture(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-[#A8A096] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#8A9A5B] file:text-white hover:file:bg-[#7A8A4B]"
                  />
                  {editProfilePicture && (
                    <p className="text-xs text-[#8A9A5B] mt-1">Gambar dipilih: {editProfilePicture.name}</p>
                  )}
                </div>
                <textarea 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#8A9A5B] outline-none"
                  placeholder="Tulis biografimu..."
                  rows={3}
                />
                <div className="flex justify-center gap-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-xs font-bold text-gray-500">Batal</button>
                  <button onClick={handleUpdateProfile} disabled={isUploading} className="px-4 py-1.5 text-xs font-bold bg-[#8A9A5B] text-white rounded-lg disabled:opacity-50">
                    {isUploading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#4A4036] mb-6 max-w-sm mx-auto italic">
                {profileData?.bio || "Belum ada biografi. Ayo bagikan aksi nyatamu!"}
              </p>
            )}
            
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-xl font-bold text-[#4A4036]">{profileData?.followersCount || 0}</div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Pengikut</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#4A4036]">{profileData?.followingCount || 0}</div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Mengikuti</div>
              </div>
            </div>

            {profileData?.role !== 'teacher' && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#E5E0D8]">
                  <div className="text-[#A8A096] text-xs font-bold uppercase tracking-wider mb-1">Kelas</div>
                  <div className="text-xl font-bold text-[#8A9A5B]">{profileData?.className}</div>
                </div>
                <div className="bg-[#F4F1EA] p-4 rounded-2xl border border-[#E5E0D8]">
                  <div className="text-[#A8A096] text-xs font-bold uppercase tracking-wider mb-1">No. Absen</div>
                  <div className="text-xl font-bold text-[#8A9A5B]">{profileData?.studentNumber}</div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-[#8A9A5B]/10 to-[#D2B48C]/10 p-6 rounded-2xl border border-[#8A9A5B]/20 flex items-center justify-around">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-[#D2B48C]" />
                  <span className="text-2xl font-bold text-[#4A4036]">{profileData?.xp || 0}</span>
                </div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Total XP</div>
              </div>
              
              <div className="w-px h-12 bg-[#E5E0D8]"></div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className={`w-5 h-5 ${profileData?.streak && profileData.streak >= 3 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-[#A8A096]'}`} />
                  <span className="text-2xl font-bold text-[#4A4036]">{profileData?.streak || 0}</span>
                </div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Streak Hari</div>
              </div>
              
              <div className="w-px h-12 bg-[#E5E0D8]"></div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-2xl font-bold text-[#4A4036]">{profileData?.interactions || 0}</span>
                </div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Interaksi</div>
              </div>
            </div>
            
            {profileData?.streak && profileData.streak >= 3 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full border border-orange-100 font-bold text-sm shadow-sm">
                <Flame className="w-5 h-5 fill-orange-500" />
                ON FIRE! 🔥
              </div>
            )}
          </div>
        </div>

        {/* Tabs for Posts and Followers */}
        <div className="mt-8">
          <div className="flex gap-4 mb-6 border-b border-[#E5E0D8]">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`pb-3 font-bold px-2 ${activeTab === 'posts' ? 'text-[#8A9A5B] border-b-2 border-[#8A9A5B]' : 'text-[#A8A096] hover:text-[#4A4036]'}`}
            >
              Postingan
            </button>
            <button 
              onClick={() => setActiveTab('followers')}
              className={`pb-3 font-bold px-2 ${activeTab === 'followers' ? 'text-[#8A9A5B] border-b-2 border-[#8A9A5B]' : 'text-[#A8A096] hover:text-[#4A4036]'}`}
            >
              Pengikut
            </button>
          </div>

          {activeTab === 'posts' && (
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] p-8 text-center">
                  <p className="text-[#A8A096]">Belum ada postingan.</p>
                </div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden">
                    <div className="p-4 border-b border-[#E5E0D8] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold">
                          {post.authorName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-[#4A4036]">{post.authorName}</div>
                          <div className="text-xs text-[#A8A096]">
                            {new Date(post.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#8A9A5B] bg-[#F4F1EA] px-3 py-1 rounded-full border border-[#E5E0D8]">
                        {post.subbab}
                      </span>
                    </div>
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="Post" className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="p-4">
                      <p className="text-[#4A4036] whitespace-pre-wrap">{post.caption}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden">
              {followers.length === 0 ? (
                <div className="p-8 text-center text-[#A8A096]">
                  Belum ada pengikut.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E0D8]">
                  {followers.map(follower => (
                    <div key={follower.id} className="p-4 flex items-center gap-4 hover:bg-[#F4F1EA] transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {follower.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-[#4A4036]">{follower.fullName}</div>
                        <div className="text-sm text-[#A8A096]">@{follower.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Assignment Modal Component ---
const AssignmentModal = ({ 
  isOpen, 
  onClose, 
  post, 
  teacherId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  post: Post | null, 
  teacherId: string 
}) => {
  const [type, setType] = useState<'choice' | 'essay' | 'poll'>('choice');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  if (!isOpen || !post) return null;

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOpts = options.filter((_, i) => i !== index);
      setOptions(newOpts);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      alert('Pertanyaan harus diisi');
      return;
    }
    if (type !== 'essay' && options.some(opt => !opt.trim())) {
      alert('Semua opsi harus diisi');
      return;
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, teacherId, type, question, options: type !== 'essay' ? options : null })
      });
      if (res.ok) {
        onClose();
        alert('Tugas berhasil dibuat!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Buat Tugas</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Tipe Tugas</label>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-3 mb-4 border border-[#E5E0D8] rounded-xl focus:ring-2 focus:ring-[#8A9A5B] outline-none">
          <option value="choice">Pilihan Ganda</option>
          <option value="essay">Essai</option>
          <option value="poll">Polling</option>
        </select>

        <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Pertanyaan</label>
        <textarea 
          placeholder="Tulis pertanyaan di sini..." 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          className="w-full p-3 mb-4 border border-[#E5E0D8] rounded-xl h-24 focus:ring-2 focus:ring-[#8A9A5B] outline-none" 
        />

        {type !== 'essay' && (
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-[#4A4036]">Opsi Jawaban</label>
              {options.length < 5 && (
                <button 
                  onClick={addOption}
                  className="text-xs font-bold text-[#8A9A5B] flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Tambah Opsi
                </button>
              )}
            </div>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input 
                  placeholder={`Opsi ${i + 1}`} 
                  value={opt} 
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }} 
                  className="flex-1 p-3 border border-[#E5E0D8] rounded-xl text-sm focus:ring-2 focus:ring-[#8A9A5B] outline-none" 
                />
                {options.length > 2 && (
                  <button 
                    onClick={() => removeOption(i)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Batal</button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-[#8A9A5B] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#7A8A4B] transition-colors">Buat Tugas</button>
        </div>
      </div>
    </div>
  );
};

// --- Report Modal Component ---
const ReportModal = ({ 
  isOpen, 
  onClose, 
  post, 
  reporterId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  post: Post | null, 
  reporterId: string 
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async () => {
    if (!reason) {
      alert('Silakan pilih alasan pelaporan');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterId, reason, description })
      });
      if (res.ok) {
        alert('Terima kasih. Laporan Anda telah kami terima dan akan segera ditinjau.');
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal mengirim laporan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportReasons = [
    'Konten Tidak Senonoh / Pornografi',
    'Kekerasan / Konten Sadis',
    'Pelecehan / Perundungan (Bullying)',
    'Ujaran Kebencian',
    'Spam / Penipuan',
    'Informasi Palsu (Hoax)',
    'Lainnya'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[#E5E0D8]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#4A4036]">Laporkan Postingan</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-[#A8A096]" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#4A4036] mb-3">Pilih Alasan:</label>
            <div className="grid grid-cols-1 gap-2">
              {reportReasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    reason === r 
                      ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' 
                      : 'bg-[#F4F1EA] border-[#E5E0D8] text-[#4A4036] hover:border-[#8A9A5B]/30'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4A4036] mb-2">Keterangan Tambahan (Opsional):</label>
            <textarea
              placeholder="Berikan detail lebih lanjut jika diperlukan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 bg-[#F4F1EA] border border-[#E5E0D8] rounded-2xl h-28 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 py-3.5 text-sm font-bold text-[#A8A096] hover:bg-gray-50 rounded-2xl transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !reason}
              className="flex-1 py-3.5 bg-red-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
              {!isSubmitting && <Flag className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Students View Component ---
// --- Comment Section Component ---
const CommentSection = ({ postId, currentUser, onCommentAdded }: { postId: string, currentUser: UserProfile, onCommentAdded: () => void }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: currentUser.id, content: newComment })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments();
        onCommentAdded();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal mengirim komentar');
      }
    } catch (err) {
      console.error("Failed to post comment", err);
      alert('Terjadi kesalahan koneksi saat mengirim komentar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#E5E0D8] space-y-4">
      <div className="space-y-3">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D2B48C] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(comment.authorName || 'U').charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 bg-[#F4F1EA] rounded-2xl px-4 py-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold">{comment.authorName || 'User'}</span>
                <span className="text-[10px] font-bold text-[#A8A096] uppercase tracking-wider">
                  {comment.authorClass || 'Siswa'}
                </span>
              </div>
              <p className="text-sm text-[#4A4036]">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 items-center">
        <div className="w-8 h-8 rounded-full bg-[#8A9A5B] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {currentUser.fullName?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Tulis komentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A9A5B] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Carbon Receipt Modal Component ---
const CarbonReceiptModal = ({ isOpen, onClose, xpGained, postTitle }: { isOpen: boolean, onClose: () => void, xpGained: number, postTitle: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#F4F1EA] rounded-md w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500 font-mono relative">
        {/* Receipt jagged top */}
        <div className="h-4 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBvbHlnb24gcG9pbnRzPSIwLDEwIDUsMCAxMCwxMCIgZmlsbD0iI0Y0RjFFQSIvPjwvc3ZnPg==')] absolute top-0 left-0 transform -translate-y-full"></div>
        
        <div className="p-6 border-2 border-dashed border-[#A8A096] m-4 relative">
          <div className="text-center mb-6">
            <Leaf className="w-8 h-8 text-[#8A9A5B] mx-auto mb-2" />
            <h2 className="text-xl font-bold text-[#4A4036] uppercase tracking-widest">Carbon Receipt</h2>
            <p className="text-xs text-[#A8A096]">EduGram Eco-Action</p>
            <p className="text-xs text-[#A8A096]">{new Date().toLocaleString()}</p>
          </div>
          
          <div className="border-t border-b border-dashed border-[#A8A096] py-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#4A4036]">Item:</span>
              <span className="font-bold text-[#4A4036] text-right truncate max-w-[150px]">{postTitle || 'Solusi Lingkungan'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4A4036]">Carbon Saved:</span>
              <span className="font-bold text-green-600">~2.5 kg CO2</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4A4036]">XP Earned:</span>
              <span className="font-bold text-[#8A9A5B]">+{xpGained} XP</span>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-xs text-[#A8A096] italic">"Setiap aksi kecilmu menyelamatkan bumi."</p>
            
            {/* Barcode placeholder */}
            <div className="h-12 w-full flex justify-center items-center gap-1 opacity-50">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`bg-[#4A4036] h-full ${Math.random() > 0.5 ? 'w-1' : 'w-2'}`}></div>
              ))}
            </div>
            <p className="text-[10px] tracking-[0.3em] text-[#4A4036]">ECO-WARRIOR-001</p>
            
            <button 
              onClick={onClose}
              className="w-full mt-4 bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white font-bold py-2 px-4 rounded transition-colors uppercase tracking-wider text-sm"
            >
              Simpan Struk
            </button>
          </div>
        </div>
        
        {/* Receipt jagged bottom */}
        <div className="h-4 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBvbHlnb24gcG9pbnRzPSIwLDAgNSwxMCAxMCwwIiBmaWxsPSIjRjRGMUVBIi8+PC9zdmc+')] absolute bottom-0 left-0 transform translate-y-full"></div>
      </div>
    </div>
  );
};

// --- Tutorial Modal Component ---
const TutorialModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Selamat Datang di EduGram! 🌿",
      content: "EduGram adalah media sosial khusus untuk kamu para Eco-Influencer sekolah. Di sini kita berbagi aksi nyata menjaga bumi dengan cara yang seru!",
      icon: <Leaf className="w-12 h-12 text-[#8A9A5B]" />
    },
    {
      title: "Langkah 1: Buat Postingan 📸",
      content: "Klik tombol '+' di bagian bawah layar untuk membagikan foto kegiatan ramah lingkunganmu. Jangan lupa pilih kategori yang sesuai!",
      icon: <ImageIcon className="w-12 h-12 text-[#D2B48C]" />
    },
    {
      title: "Langkah 2: Dapatkan Poin (XP) 🌟",
      content: "Tulis caption menggunakan kata ilmiah (seperti 'Emisi', 'Limbah', atau 'Biogas') untuk mendapat bonus +5 XP. Kumpulkan XP sebanyak-banyaknya!",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Langkah 3: Berinteraksi 💬",
      content: "Berikan reaksi (💡 Insightful, ❓ Ask, ❤️ Support) dan komentar pada postingan temanmu. Setiap interaksi juga akan memberimu tambahan XP!",
      icon: <MessageSquare className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Langkah 4: Jadilah Juara! 🏆",
      content: "Selesaikan 'Misi Hari Ini' dan kumpulkan XP untuk naik level. Jadilah Top Eco-Influencer di sekolahmu pada menu Leaderboard!",
      icon: <Trophy className="w-12 h-12 text-orange-500" />
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="bg-[#8A9A5B] p-8 flex justify-center">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            {steps[step].icon}
          </div>
        </div>
        
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-[#4A4036] mb-4">{steps[step].title}</h2>
          <p className="text-[#A8A096] leading-relaxed mb-8">
            {steps[step].content}
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#8A9A5B]' : 'w-2 bg-[#E5E0D8]'}`}
              />
            ))}
          </div>
          
          <div className="flex gap-3">
            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-[#A8A096] hover:bg-[#F4F1EA] transition-colors"
              >
                Kembali
              </button>
            )}
            <button 
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  onClose();
                }
              }}
              className="flex-1 py-3 px-6 bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white rounded-xl font-bold shadow-lg shadow-[#8A9A5B]/20 transition-all active:scale-95"
            >
              {step === steps.length - 1 ? "Mulai Sekarang!" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Groups View Component ---
const GroupsView = ({ user, initialGroupId, onClearInitialGroup, onBack, leaderboard }: { user: UserProfile, initialGroupId?: string | null, onClearInitialGroup?: () => void, onBack: () => void, leaderboard: UserStats[] }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', type: 'school', privacy: 'public' });
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupDetails, setGroupDetails] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/groups?userId=${user.id}`);
      const data = await res.json();
      setGroups(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (initialGroupId && groups.length > 0) {
      const group = groups.find((g: any) => g.id === initialGroupId);
      if (group) {
        setSelectedGroup(group);
        if (onClearInitialGroup) onClearInitialGroup();
      }
    }
  }, [initialGroupId, groups, onClearInitialGroup]);

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      setGroupDetails(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDetails(selectedGroup.id);
      fetchMessages(selectedGroup.id);
      const interval = setInterval(() => fetchMessages(selectedGroup.id), 5000); // Poll for new messages
      return () => clearInterval(interval);
    } else {
      setGroupDetails(null);
      setMessages([]);
    }
  }, [selectedGroup]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedGroup) return;
    
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: user.fullName,
          username: user.username,
          content: newMessageText
        })
      });
      if (res.ok) {
        setNewMessageText('');
        fetchMessages(selectedGroup.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGroup,
          adminId: user.id,
          adminName: user.fullName,
          adminUsername: user.username
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewGroup({ name: '', description: '', type: 'school', privacy: 'public' });
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: user.fullName,
          username: user.username
        })
      });
      if (res.ok) {
        fetchGroups();
        if (selectedGroup && selectedGroup.id === groupId) {
          fetchGroupDetails(groupId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMemberAction = async (groupId: string, targetUserId: string, action: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: user.id })
      });
      if (res.ok) {
        fetchGroupDetails(groupId);
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (selectedGroup && groupDetails) {
    const isAdmin = groupDetails.admin_id === user.id;
    const isMember = groupDetails.members.some((m: any) => m.userId === user.id && m.status === 'approved');
    const isPending = groupDetails.members.some((m: any) => m.userId === user.id && m.status === 'pending');

    return (
      <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans pb-20">
        <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
            <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-2 hover:bg-[#7A8A4B] px-3 py-1.5 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Kembali</span>
            </button>
            <div className="flex-1 text-center font-bold text-lg pr-10">{groupDetails.name}</div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-sm mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{groupDetails.name}</h2>
                <div className="flex gap-2 text-xs font-bold uppercase tracking-wider mb-3">
                  <span className="bg-[#F4F1EA] text-[#8A9A5B] px-2 py-1 rounded">{groupDetails.type === 'school' ? 'Sekolah' : 'Topik'}</span>
                  <span className="bg-[#F4F1EA] text-[#8A9A5B] px-2 py-1 rounded">{groupDetails.privacy === 'public' ? 'Publik' : 'Privat'}</span>
                </div>
                <p className="text-[#A8A096]">{groupDetails.description}</p>
              </div>
              {!isAdmin && !isMember && !isPending && (
                <button 
                  onClick={() => handleJoinGroup(groupDetails.id)}
                  className="bg-[#8A9A5B] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#7A8A4B] transition-colors"
                >
                  {groupDetails.privacy === 'private' ? 'Minta Bergabung' : 'Bergabung'}
                </button>
              )}
              {isPending && (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">Menunggu Persetujuan</span>
              )}
            </div>
            <div className="text-sm text-[#A8A096] font-medium">
              {groupDetails.members.filter((m: any) => m.status === 'approved').length} Anggota
            </div>
          </div>

          {/* Class Forest Goal (Moved from Feed) */}
          {groupDetails.type === 'school' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] p-5 relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8A9A5B] opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <h2 className="font-bold text-lg text-[#4A4036] flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-[#8A9A5B]" />
                  Class Forest Goal
                </h2>
                <span className="text-sm font-bold text-[#8A9A5B] bg-[#F4F1EA] px-3 py-1 rounded-full border border-[#E5E0D8]">
                  {leaderboard.reduce((sum, u) => sum + u.xp, 0)} / 5000 XP
                </span>
              </div>
              <p className="text-sm text-[#A8A096] mb-4 relative z-10">
                Misi Kelas: Kumpulkan 5000 XP untuk menanam hutan virtual!
              </p>
              <div className="w-full h-4 bg-[#F4F1EA] rounded-full overflow-hidden border border-[#E5E0D8] relative z-10">
                <div 
                  className="h-full bg-gradient-to-r from-[#8A9A5B] to-[#7A8A4B] transition-all duration-1000 relative"
                  style={{ width: `${Math.min(100, (leaderboard.reduce((sum, u) => sum + u.xp, 0) / 5000) * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                </div>
              </div>
            </div>
          )}

          {(isMember || isAdmin) && (
            <div className="flex gap-4 mb-6 border-b border-[#E5E0D8]">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`pb-3 font-bold px-2 ${activeTab === 'chat' ? 'text-[#8A9A5B] border-b-2 border-[#8A9A5B]' : 'text-[#A8A096] hover:text-[#4A4036]'}`}
              >
                Diskusi
              </button>
              <button 
                onClick={() => setActiveTab('members')}
                className={`pb-3 font-bold px-2 ${activeTab === 'members' ? 'text-[#8A9A5B] border-b-2 border-[#8A9A5B]' : 'text-[#A8A096] hover:text-[#4A4036]'}`}
              >
                Anggota
              </button>
            </div>
          )}

          {(!isMember && !isAdmin) ? (
            <div className="bg-white rounded-2xl p-8 border border-[#E5E0D8] shadow-sm text-center">
              <Shield className="w-12 h-12 text-[#E5E0D8] mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Grup Terkunci</h3>
              <p className="text-[#A8A096]">Anda harus bergabung dengan grup ini untuk melihat diskusi dan anggota.</p>
            </div>
          ) : activeTab === 'chat' ? (
            <div className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col h-[500px]">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-[#A8A096]">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>Belum ada pesan. Mulai diskusi!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-sm">{msg.user.fullName}</span>
                        <span className="text-[10px] text-[#A8A096]">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.user_id === user.id ? 'bg-[#8A9A5B] text-white rounded-tr-none' : 'bg-[#F4F1EA] text-[#4A4036] rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E5E0D8] flex gap-2">
                <input 
                  type="text" 
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  placeholder="Ketik pesan..." 
                  className="flex-1 px-4 py-2 bg-[#F4F1EA] rounded-full outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
                <button type="submit" disabled={!newMessageText.trim()} className="p-2 bg-[#8A9A5B] text-white rounded-full hover:bg-[#7A8A4B] disabled:opacity-50 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-sm">
              <h3 className="font-bold text-lg mb-4">Anggota Grup</h3>
              
              {isAdmin && groupDetails.members.some((m: any) => m.status === 'pending') && (
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-[#8A9A5B] mb-2">Permintaan Bergabung</h4>
                  <div className="space-y-2">
                    {groupDetails.members.filter((m: any) => m.status === 'pending').map((m: any) => (
                      <div key={m.userId} className="flex justify-between items-center p-3 bg-[#F4F1EA] rounded-xl">
                        <div>
                          <div className="font-bold">{m.user.fullName}</div>
                          <div className="text-xs text-[#A8A096]">@{m.user.username}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleMemberAction(groupDetails.id, m.userId, 'approve')} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => handleMemberAction(groupDetails.id, m.userId, 'reject')} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {groupDetails.members.filter((m: any) => m.status === 'approved').map((m: any) => (
                  <div key={m.userId} className="flex justify-between items-center p-3 border border-[#E5E0D8] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold">
                        {m.user.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {m.user.fullName}
                          {m.role === 'admin' && <span className="bg-[#8A9A5B] text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                        </div>
                        <div className="text-xs text-[#A8A096]">@{m.user.username}</div>
                      </div>
                    </div>
                    {isAdmin && m.userId !== user.id && (
                      <button onClick={() => handleMemberAction(groupDetails.id, m.userId, 'remove')} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-bold">
                        Keluarkan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans pb-20">
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <button onClick={onBack} className="flex items-center gap-2 hover:bg-[#7A8A4B] px-3 py-1.5 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali</span>
          </button>
          <div className="flex-1 text-center font-bold text-lg pr-10">Grup Komunitas</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Grup</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-[#8A9A5B] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#7A8A4B] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Buat Grup
          </button>
        </div>

        {isCreating && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8] shadow-sm mb-6 animate-in slide-in-from-top-4">
            <h3 className="font-bold text-lg mb-4">Buat Grup Baru</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nama Grup</label>
                <input required type="text" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="w-full p-3 border border-[#E5E0D8] rounded-xl focus:ring-2 focus:ring-[#8A9A5B] outline-none" placeholder="Contoh: Eco-Warriors SMAN 1" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Deskripsi</label>
                <textarea value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} className="w-full p-3 border border-[#E5E0D8] rounded-xl focus:ring-2 focus:ring-[#8A9A5B] outline-none" placeholder="Deskripsi grup..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Tipe</label>
                  <select value={newGroup.type} onChange={e => setNewGroup({...newGroup, type: e.target.value})} className="w-full p-3 border border-[#E5E0D8] rounded-xl focus:ring-2 focus:ring-[#8A9A5B] outline-none">
                    <option value="school">Sekolah</option>
                    <option value="topic">Topik Pembicaraan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Privasi</label>
                  <select value={newGroup.privacy} onChange={e => setNewGroup({...newGroup, privacy: e.target.value})} className="w-full p-3 border border-[#E5E0D8] rounded-xl focus:ring-2 focus:ring-[#8A9A5B] outline-none">
                    <option value="public">Publik (Terbuka)</option>
                    <option value="private">Privat (Tertutup)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-[#A8A096] font-bold hover:bg-[#F4F1EA] rounded-xl transition-colors">Batal</button>
                <button type="submit" className="bg-[#8A9A5B] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#7A8A4B] transition-colors">Buat</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E0D8]">
              <UserCircle2 className="w-12 h-12 text-[#E5E0D8] mx-auto mb-3" />
              <p className="text-[#A8A096] font-medium">Belum ada grup yang tersedia.</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.id} className="bg-white rounded-2xl p-5 border border-[#E5E0D8] shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedGroup(group)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{group.name}</h3>
                  <div className="flex gap-2">
                    {group.userStatus === 'approved' && <span className="bg-[#8A9A5B] text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase">Anggota</span>}
                    {group.userStatus === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Menunggu</span>}
                  </div>
                </div>
                <p className="text-[#A8A096] text-sm mb-4 line-clamp-2">{group.description}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-[#A8A096]">
                  <span className="flex items-center gap-1"><UserCircle2 className="w-4 h-4" /> {group.memberCount} Anggota</span>
                  <span className="uppercase tracking-wider">{group.type === 'school' ? 'Sekolah' : 'Topik'}</span>
                  <span className="uppercase tracking-wider">{group.privacy === 'public' ? 'Publik' : 'Privat'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

// --- Global Search Component ---
const GlobalSearch = ({ 
  onUserSelect, 
  onPostSelect, 
  onGroupSelect 
}: { 
  onUserSelect: (user: any) => void, 
  onPostSelect: (postId: string) => void, 
  onGroupSelect: (groupId: string) => void 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{users: any[], posts: any[], groups: any[]}>({users: [], posts: [], groups: []});
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      const fetchResults = async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        } catch (e) {
          console.error(e);
        }
      };
      const timeoutId = setTimeout(fetchResults, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults({users: [], posts: [], groups: []});
      setIsOpen(false);
    }
  }, [query]);

  return (
    <div className="relative flex-1 max-w-sm mx-4" ref={searchRef}>
      <div className="relative">
        <input 
          type="text" 
          placeholder="Cari orang, postingan, grup..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="w-full bg-white/20 text-white placeholder-white/70 px-4 py-1.5 pl-10 rounded-full outline-none focus:bg-white/30 transition-colors text-sm"
        />
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-[#E5E0D8] overflow-hidden z-[100] max-h-96 overflow-y-auto">
          {results.users.length === 0 && results.posts.length === 0 && results.groups.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#A8A096]">Tidak ada hasil ditemukan</div>
          ) : (
            <div className="py-2">
              {results.users.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-xs font-bold text-[#8A9A5B] uppercase tracking-wider">Orang</div>
                  {results.users.map(u => (
                    <div 
                      key={u.id} 
                      onClick={() => { onUserSelect(u); setIsOpen(false); setQuery(''); }}
                      className="px-4 py-2 hover:bg-[#F4F1EA] cursor-pointer flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold text-xs">
                        {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#4A4036]">{u.full_name}</div>
                        <div className="text-xs text-[#A8A096]">@{u.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.groups.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-xs font-bold text-[#8A9A5B] uppercase tracking-wider">Grup</div>
                  {results.groups.map(g => (
                    <div 
                      key={g.id} 
                      onClick={() => { onGroupSelect(g.id); setIsOpen(false); setQuery(''); }}
                      className="px-4 py-2 hover:bg-[#F4F1EA] cursor-pointer"
                    >
                      <div className="text-sm font-bold text-[#4A4036]">{g.name}</div>
                      <div className="text-xs text-[#A8A096] truncate">{g.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-xs font-bold text-[#8A9A5B] uppercase tracking-wider">Postingan</div>
                  {results.posts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { onPostSelect(p.id); setIsOpen(false); setQuery(''); }}
                      className="px-4 py-2 hover:bg-[#F4F1EA] cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#A8A096] mb-0.5">{p.user?.full_name}</div>
                      <div className="text-sm text-[#4A4036] line-clamp-2">{p.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
const GUEST_USER: UserProfile = {
  id: 'guest',
  username: 'guest',
  fullName: 'Tamu',
  className: 'Guest',
  studentNumber: '0',
  schoolName: 'Guest School',
  profilePictureUrl: '',
  bio: 'Selamat datang!',
  role: 'student',
  xp: 0,
  interactions: 0,
  streak: 0,
  followersCount: 0,
  followingCount: 0
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [view, setView] = useState<'feed' | 'profile' | 'groups'>('feed');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editSubbab, setEditSubbab] = useState<Subbab>('Kesehatan Lingkungan');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserProfile | null>(null);
  const [initialGroupId, setInitialGroupId] = useState<string | null>(null);
  
  // Assignment Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedPostForAssignment, setSelectedPostForAssignment] = useState<Post | null>(null);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<Post | null>(null);
  
  // Carbon Receipt State
  const [receiptData, setReceiptData] = useState<{isOpen: boolean, xp: number, title: string}>({isOpen: false, xp: 0, title: ''});

  // Eco-Arcade State
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [activeGameLevel, setActiveGameLevel] = useState(1);
  const [activeGameType, setActiveGameType] = useState<'sort' | 'shield' | 'clicker' | undefined>(undefined);
  const [activeMissionPostId, setActiveMissionPostId] = useState<string | null>(null);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [lastLevel, setLastLevel] = useState(1);

  // Form state
  const [subbab, setSubbab] = useState<Subbab>('Kesehatan Lingkungan');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isMission, setIsMission] = useState(false);
  const [gameLevel, setGameLevel] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('edugram_user_profile');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch data
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [postsRes, lbRes] = await Promise.all([
        fetch(`/api/posts?userId=${currentUser.id}`),
        fetch('/api/leaderboard')
      ]);
      
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }
      
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    if (currentUser && view === 'feed') {
      fetchData();
    }
  }, [currentUser, view]);

  const handleMissionComplete = async (xp: number = 200) => {
    if (!currentUser) return;
    
    try {
      const res = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, postId: activeMissionPostId, xp })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const newXp = data.user.xp;
          const currentLevel = Math.floor(newXp / 500) + 1;
          const oldLevel = Math.floor(currentUser.xp / 500) + 1;
          
          if (currentLevel > oldLevel) {
            setLastLevel(currentLevel);
            setIsLevelUpOpen(true);
          }

          setCurrentUser(data.user);
          localStorage.setItem('edugram_user_profile', JSON.stringify(data.user));
          
          // Update Eco-Guardian Health
          updateEcoHealth(currentUser.id, 20);
        }
        fetchData();
      }
    } catch (err) {
      console.error("Failed to complete mission", err);
    }
  };

  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    localStorage.setItem('edugram_user_profile', JSON.stringify(profile));
    
    // Check if tutorial has been seen
    const hasSeenTutorial = localStorage.getItem(`edugram_tutorial_seen_${profile.id}`);
    if (!hasSeenTutorial) {
      setIsTutorialOpen(true);
    }
  };

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    if (currentUser) {
      localStorage.setItem(`edugram_tutorial_seen_${currentUser.id}`, 'true');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('edugram_user_profile');
    setView('feed');
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser || !window.confirm('Apakah Anda yakin ingin menghapus postingan ini?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus postingan');
      }
    } catch (err) {
      console.error("Failed to delete post", err);
    }
    setActiveDropdown(null);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editingPost || !editCaption.trim()) return;

    const isScientific = SCIENTIFIC_KEYWORDS.some(keyword => 
      editCaption.toLowerCase().includes(keyword)
    );

    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          caption: editCaption,
          subbab: editSubbab,
          isScientific
        })
      });

      if (res.ok) {
        setEditingPost(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal memperbarui postingan');
      }
    } catch (err) {
      console.error("Failed to update post", err);
    }
  };

  const handleLocationToggle = () => {
    if (!isLocationEnabled) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setIsLocationEnabled(true);
          },
          (error) => {
            console.error("Error getting location:", error);
            alert("Gagal mendapatkan lokasi. Pastikan izin lokasi aktif.");
          }
        );
      } else {
        alert("Browser Anda tidak mendukung fitur lokasi.");
      }
    } else {
      setIsLocationEnabled(false);
      setUserCoords(null);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !caption.trim() || isUploading) return;

    setIsUploading(true);

    const isScientific = SCIENTIFIC_KEYWORDS.some(keyword => 
      caption.toLowerCase().includes(keyword)
    );

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            finalImageUrl = reader.result as string;
            resolve();
          };
        });
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          subbab,
          caption,
          imageUrl: finalImageUrl,
          isScientific,
          isMission,
          gameLevel,
          locationLat: isLocationEnabled && userCoords ? userCoords.lat : null,
          locationLng: isLocationEnabled && userCoords ? userCoords.lng : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        let xpGained = 10;
        if (isScientific) xpGained += 5;
        if (isMission) xpGained += (gameLevel * 5);
        
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('edugram_user_profile', JSON.stringify(data.user));
        }
        
        // Show Carbon Receipt
        setReceiptData({ isOpen: true, xp: xpGained, title: subbab });
        
        // Update Eco-Guardian Health
        updateEcoHealth(currentUser.id, 10);
        
        setCaption('');
        setImageUrl('');
        setImageFile(null);
        setIsLocationEnabled(false);
        setUserCoords(null);
        setIsMission(false);
        setGameLevel(1);
        fetchData(); // Refresh feed
      } else {
        const data = await res.json();
        let errorMessage = data.error || 'Gagal mengirim postingan';
        if (data.hint) {
          errorMessage += `\n\nTips: ${data.hint}`;
        }
        alert(errorMessage);
      }
    } catch (err) {
      console.error("Failed to post", err);
      alert('Terjadi kesalahan koneksi saat mengirim postingan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInteract = async (postId: string, type: 'insightful' | 'ask' | 'support') => {
    if (!currentUser) return;
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const hasInteracted = post.userInteractions.includes(type);

      // Optimistic update
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const newInteractions = hasInteracted 
            ? p.userInteractions.filter(i => i !== type)
            : [...p.userInteractions, type];
          
          return { 
            ...p, 
            [type]: hasInteracted ? Math.max(0, p[type] - 1) : p[type] + 1,
            userInteractions: newInteractions
          };
        }
        return p;
      }));

      await fetch(`/api/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userId: currentUser.id })
      });
      
      // Refresh leaderboard in background
      fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => setLeaderboard(data));
        
    } catch (err) {
      console.error("Failed to interact", err);
      fetchData(); // Revert on failure
    }
  };



  if (view === 'profile') {
    return <ProfilePage user={selectedUserForProfile || currentUser} currentUser={currentUser} onBack={() => { setView('feed'); setSelectedUserForProfile(null); }} />;
  }

  if (view === 'groups') {
    return <GroupsView user={currentUser} initialGroupId={initialGroupId} onClearInitialGroup={() => setInitialGroupId(null)} onBack={() => { setView('feed'); setInitialGroupId(null); }} leaderboard={leaderboard} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans selection:bg-[#8A9A5B] selection:text-white pb-20">
      <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} />
      <CarbonReceiptModal 
        isOpen={receiptData.isOpen} 
        onClose={() => setReceiptData({ ...receiptData, isOpen: false })} 
        xpGained={receiptData.xp} 
        postTitle={receiptData.title} 
      />
      {/* Floating Tutorial Button */}
      <button
        onClick={() => setIsTutorialOpen(true)}
        className="fixed bottom-6 left-6 z-[90] flex items-center gap-2 bg-white text-[#8A9A5B] px-4 py-3 rounded-full shadow-xl border-2 border-[#8A9A5B] hover:bg-[#8A9A5B] hover:text-white transition-all group hover:scale-105"
      >
        <MessageCircleQuestion className="w-6 h-6" />
        <span className="font-bold text-sm hidden sm:block group-hover:block">Cara Pakai EduGram</span>
      </button>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">EduGram</h1>
            <span className="text-xs font-medium bg-[#7A8A4B] px-2 py-1 rounded-full sm:ml-2 hidden md:block">Eco-Influencer</span>
          </div>
          
          <GlobalSearch 
            onUserSelect={(u) => { 
              setView('profile'); 
              setSelectedUserForProfile({ 
                id: u.id, 
                fullName: u.full_name, 
                username: u.username, 
                role: u.role 
              } as any); 
            }}
            onPostSelect={(postId) => { 
              setView('feed'); 
              setTimeout(() => {
                document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 500);
            }}
            onGroupSelect={(groupId) => { setInitialGroupId(groupId); setView('groups'); }}
          />

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTutorialOpen(true)}
              className="p-2 hover:bg-[#7A8A4B] rounded-full transition-colors text-white/80 hover:text-white"
              title="Panduan Penggunaan"
            >
              <MessageCircleQuestion className="w-5 h-5" />
            </button>
            <button onClick={() => setView('feed')} className={`text-sm font-bold ${(view as string) === 'feed' ? 'text-white' : 'text-white/70'}`}>Feed</button>
            <button onClick={() => setView('groups')} className={`text-sm font-bold ${(view as string) === 'groups' ? 'text-white' : 'text-white/70'}`}>Grup</button>
            <button onClick={() => setView('profile')} className={`text-sm font-bold ${(view as string) === 'profile' ? 'text-white' : 'text-white/70'}`}>Profil</button>
            <div className="w-px h-6 bg-[#8A9A5B] mx-2"></div>
            <button 
              onClick={() => setView('profile')}
              className="flex items-center gap-3 bg-[#7A8A4B] hover:bg-[#6A7A3B] px-4 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium hidden sm:block">{currentUser.fullName}</span>
              <span className="text-xs font-bold bg-[#8A9A5B] px-1.5 py-0.5 rounded text-white">
                {currentUser.role === 'teacher' ? 'Guru' : currentUser.className}
              </span>
              <div className="w-1 h-1 bg-[#F4F1EA] rounded-full opacity-50 hidden sm:block"></div>
              <UserCircle2 className="w-5 h-5 text-[#D2B48C]" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-[#7A8A4B] rounded-full transition-colors text-white/80 hover:text-white"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Feed & Input */}
        <div className="lg:col-span-2 space-y-6">
          <DailyQuestBanner />
          {/* Create Post Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] p-5">
                <form onSubmit={handlePost} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold shrink-0">
                      {currentUser.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{currentUser.fullName}</span>
                        <span className="text-xs font-bold bg-[#F4F1EA] text-[#8A9A5B] px-2 py-1 rounded-md border border-[#E5E0D8]">
                          {currentUser.role === 'teacher' ? 'Guru' : `Kelas ${currentUser.className}`}
                        </span>
                      </div>
                      <select
                        value={subbab}
                        onChange={(e) => setSubbab(e.target.value as Subbab)}
                        className="w-full sm:w-auto text-sm bg-[#F4F1EA] border border-[#E5E0D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] text-[#4A4036] font-medium"
                      >
                        <option value="Kesehatan Lingkungan">Kesehatan Lingkungan</option>
                    <option value="Pemanasan Global">Pemanasan Global</option>
                    <option value="Krisis Energi">Krisis Energi</option>
                    <option value="Ketahanan Pangan">Ketahanan Pangan</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:pl-14">
                <textarea
                  placeholder="Tulis caption edukatifmu di sini... (Bisa pakai Markdown lho!)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full min-h-[100px] bg-transparent resize-none focus:outline-none placeholder:text-[#A8A096] text-base"
                  required
                />
                
                {/* Image URL Input */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2 bg-[#F4F1EA] rounded-lg px-3 py-2 border border-[#E5E0D8]">
                    <ImageIcon className="w-4 h-4 text-[#A8A096]" />
                    <input
                      type="url"
                      placeholder="Link gambar (opsional)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none"
                      disabled={!!imageFile}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#A8A096] font-bold uppercase">ATAU</span>
                    <div className="h-px bg-[#E5E0D8] flex-1"></div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E0D8] text-sm font-bold transition-colors ${imageFile ? 'bg-[#8A9A5B] text-white border-[#8A9A5B]' : 'bg-[#F4F1EA] text-[#4A4036] hover:bg-[#E5E0D8]'}`}>
                      <ImageIcon className="w-4 h-4" />
                      {imageFile ? 'Gambar Dipilih' : 'Unggah Gambar'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                            setImageUrl(''); // Clear URL if file is selected
                          }
                        }}
                        disabled={!!imageUrl}
                      />
                    </label>
                    {imageFile && (
                      <button 
                        type="button" 
                        onClick={() => setImageFile(null)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {/* Game Master Panel (Teacher Only) */}
                {currentUser.role === 'teacher' && (
                  <div className="mt-3 p-4 bg-[#8A9A5B]/10 rounded-2xl border border-[#8A9A5B]/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-[#8A9A5B]" />
                        <span className="text-sm font-bold text-[#8A9A5B]">Game Master Panel</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete all users?')) {
                            await fetch('/api/delete-all-users');
                            alert('All users deleted');
                            window.location.reload();
                          }
                        }}
                        className="bg-red-500 text-white p-2 rounded-lg text-xs font-bold hover:bg-red-600"
                      >
                        Delete All Users
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={isMission}
                          onChange={(e) => setIsMission(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8A9A5B]"></div>
                        <span className="ml-2 text-xs font-bold text-[#4A4036]">Aktifkan Misi</span>
                      </label>
                    </div>
                    
                    {isMission && (
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setGameLevel(lvl)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${gameLevel === lvl ? 'bg-[#8A9A5B] text-white border-[#8A9A5B]' : 'bg-white text-[#4A4036] border-[#E5E0D8] hover:border-[#8A9A5B]'}`}
                          >
                            {lvl === 1 ? <Trash2 className="w-4 h-4" /> : lvl === 2 ? <Zap className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            <span className="text-[10px] font-bold uppercase">Lvl {lvl}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 pt-4 border-t border-[#E5E0D8]">
                  <div className="text-xs text-[#A8A096] flex-1">
                    <span className="font-bold text-[#8A9A5B]">Tips:</span> Gunakan kata "Emisi", "Gas Rumah Kaca", "Limbah", atau "Biogas" untuk badge spesial!
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleLocationToggle}
                      className={`p-2 rounded-full transition-all ${isLocationEnabled ? 'bg-[#8A9A5B] text-white shadow-md' : 'bg-[#F4F1EA] text-[#A8A096] border border-[#E5E0D8]'}`}
                      title={isLocationEnabled ? "Lokasi Aktif" : "Aktifkan Lokasi"}
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!caption.trim()}
                      className="flex-1 sm:flex-none bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <span>Posting</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Feed */}
          <div className="space-y-6 mb-6">
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8] border-dashed">
                <Leaf className="w-12 h-12 mx-auto mb-4 text-[#E5E0D8]" />
                <h3 className="text-lg font-bold text-[#A8A096] mb-1">Belum ada postingan</h3>
                <p className="text-sm text-[#A8A096]">Jadilah Eco-Influencer pertama yang berbagi!</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden relative group">
                  
                  {/* Scientific Particle Effect (CSS Animation) */}
                  {post.isScientific && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute top-0 left-1/4 w-2 h-2 bg-[#8A9A5B] rounded-full animate-[float_3s_ease-in-out_infinite]"></div>
                      <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-[#8A9A5B] rounded-full animate-[float_4s_ease-in-out_infinite_0.5s] opacity-60"></div>
                      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-[#8A9A5B] rounded-full animate-[float_2.5s_ease-in-out_infinite_1s] opacity-80"></div>
                    </div>
                  )}

                  <div className="p-5 relative z-10">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold hover:opacity-80 transition-opacity cursor-pointer" onClick={() => {
                          setSelectedUserForProfile({ id: post.authorId, fullName: post.authorName, className: post.authorClass } as any);
                          setView('profile');
                        }}>
                          {post.authorName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                setSelectedUserForProfile({ id: post.authorId, fullName: post.authorName, className: post.authorClass } as any);
                                setView('profile');
                              }}
                              className="font-bold hover:underline"
                            >
                              {post.authorName}
                            </button>
                            {/* Simple check for verified - in real app would come from DB */}
                            {(post.insightful + post.ask + post.support) > 10 && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-[10px] font-bold bg-[#F4F1EA] text-[#A8A096] px-1.5 py-0.5 rounded border border-[#E5E0D8]">
                              {post.authorClass}
                            </span>
                          </div>
                          <div className="text-xs text-[#A8A096] mt-0.5">
                            {new Date(post.timestamp).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {currentUser?.id === post.authorId && (
                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdown(activeDropdown === post.id ? null : post.id)}
                                className="p-1 hover:bg-[#F4F1EA] rounded-full transition-colors text-[#A8A096]"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {activeDropdown === post.id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-[#E5E0D8] py-1 z-50">
                                  <button 
                                    onClick={() => {
                                      setEditingPost(post);
                                      setEditCaption(post.caption);
                                      setEditSubbab(post.subbab);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-[#F4F1EA] flex items-center gap-2 text-[#4A4A4A]"
                                  >
                                    <Pencil className="w-4 h-4" /> Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" /> Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${SUBBAB_COLORS[post.subbab]}`}>
                            {post.subbab}
                          </span>
                        </div>
                        {post.isScientific && (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-[#8A9A5B] text-white px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3" /> Scientific
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="sm:pl-13">
                      <div className="prose prose-sm prose-stone max-w-none mb-4 prose-p:leading-relaxed prose-a:text-[#8A9A5B]">
                        <ReactMarkdown>{post.caption}</ReactMarkdown>
                      </div>

                      {post.isMission && (
                        <div className="mb-4 p-4 bg-[#8A9A5B]/5 rounded-2xl border border-[#8A9A5B]/20 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8A9A5B] rounded-xl flex items-center justify-center shadow-sm">
                              <Gamepad2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-[#4A4036]">Misi Edu-Arcade</h4>
                              <p className="text-[10px] text-[#A8A096] uppercase tracking-wider">Level {post.gameLevel || 1}: {post.gameLevel === 1 ? 'Sorting Sampah' : post.gameLevel === 2 ? 'Krisis Energi' : 'Pemanasan Global'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveGameLevel(post.gameLevel || 1);
                              setActiveMissionPostId(post.id);
                              setIsArcadeOpen(true);
                            }}
                            className="bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
                          >
                            <span>Mainkan Misi</span>
                            <ArrowLeft className="w-3 h-3 rotate-180" />
                          </button>
                        </div>
                      )}
                      
                      {post.imageUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-[#E5E0D8] bg-[#F4F1EA]">
                          <img 
                            src={post.imageUrl} 
                            alt="Post attachment" 
                            className="w-full h-auto max-h-[400px] object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Interactions */}
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#E5E0D8]">
                        <button 
                          onClick={() => handleInteract(post.id, 'insightful')}
                          className={`flex items-center gap-1.5 transition-colors group ${post.userInteractions.includes('insightful') ? 'text-yellow-600' : 'text-[#A8A096] hover:text-yellow-500'}`}
                        >
                          <div className={`p-1.5 rounded-full transition-colors ${post.userInteractions.includes('insightful') ? 'bg-yellow-50' : 'group-hover:bg-yellow-50'}`}>
                            <Lightbulb className={`w-5 h-5 ${post.userInteractions.includes('insightful') ? 'text-yellow-500 fill-yellow-500/20' : ''}`} />
                          </div>
                          <span className="text-sm font-medium">{post.insightful}</span>
                        </button>
                        
                        <button 
                          onClick={() => handleInteract(post.id, 'ask')}
                          className={`flex items-center gap-1.5 transition-colors group ${post.userInteractions.includes('ask') ? 'text-blue-600' : 'text-[#A8A096] hover:text-blue-500'}`}
                        >
                          <div className={`p-1.5 rounded-full transition-colors ${post.userInteractions.includes('ask') ? 'bg-blue-50' : 'group-hover:bg-blue-50'}`}>
                            <MessageCircleQuestion className={`w-5 h-5 ${post.userInteractions.includes('ask') ? 'text-blue-500 fill-blue-500/20' : ''}`} />
                          </div>
                          <span className="text-sm font-medium">{post.ask}</span>
                        </button>
                        
                        <button 
                          onClick={() => handleInteract(post.id, 'support')}
                          className={`flex items-center gap-1.5 transition-colors group ${post.userInteractions.includes('support') ? 'text-red-600' : 'text-[#A8A096] hover:text-red-500'}`}
                        >
                          <div className={`p-1.5 rounded-full transition-colors ${post.userInteractions.includes('support') ? 'bg-red-50' : 'group-hover:bg-red-50'}`}>
                            <Heart className={`w-5 h-5 ${post.userInteractions.includes('support') ? 'text-red-500 fill-red-500/20' : ''}`} />
                          </div>
                          <span className="text-sm font-medium">{post.support}</span>
                        </button>

                        <button 
                          onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className="flex items-center gap-1.5 text-[#A8A096] hover:text-[#8A9A5B] transition-colors group"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-[#8A9A5B]/10 transition-colors">
                            <MessageSquare className={`w-5 h-5 ${openComments[post.id] ? 'text-[#8A9A5B] fill-[#8A9A5B]/20' : ''}`} />
                          </div>
                          <span className={`text-sm font-medium ${openComments[post.id] ? 'text-[#8A9A5B]' : ''}`}>{post.commentCount || 0}</span>
                        </button>

                        {currentUser.role === 'teacher' && (
                          <button 
                            onClick={() => {
                              setSelectedPostForAssignment(post);
                              setIsAssignmentModalOpen(true);
                            }}
                            className="ml-auto text-sm font-bold text-[#8A9A5B] hover:underline"
                          >
                            + Buat Tugas
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            setSelectedPostForReport(post);
                            setIsReportModalOpen(true);
                          }}
                          className={`flex items-center gap-1.5 text-[#A8A096] hover:text-red-500 transition-colors group ${currentUser.role !== 'teacher' ? 'ml-auto' : 'ml-4'}`}
                          title="Laporkan Postingan"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors">
                            <Flag className="w-4 h-4" />
                          </div>
                        </button>
                      </div>

                      {openComments[post.id] && (
                        <CommentSection 
                          postId={post.id} 
                          currentUser={currentUser} 
                          onCommentAdded={() => fetchData()} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interactive Eco-Map - Compact Bar */}
          <EcoMap posts={posts} />
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-1">
          <AssignmentModal 
            isOpen={isAssignmentModalOpen} 
            onClose={() => setIsAssignmentModalOpen(false)} 
            post={selectedPostForAssignment} 
            teacherId={currentUser.id} 
          />
          <ReportModal 
            isOpen={isReportModalOpen} 
            onClose={() => setIsReportModalOpen(false)} 
            post={selectedPostForReport} 
            reporterId={currentUser.id} 
          />
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] p-5 sticky top-24 space-y-6">
            {/* Eco-Arcade Mini Games */}
            <div>
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-[#8A9A5B]" />
                Eco-Arcade
              </h2>
              <div className="space-y-2">
                <button 
                  onClick={() => { setActiveGameType('sort'); setActiveGameLevel(1); setIsArcadeOpen(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#F4F1EA] hover:bg-[#E5E0D8] transition-all border border-transparent hover:border-[#8A9A5B] group"
                >
                  <div className="w-8 h-8 bg-[#8A9A5B] rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#4A4036]">Sortir Sampah</div>
                    <div className="text-[9px] text-[#A8A096]">Misi Level 1</div>
                  </div>
                </button>
                <button 
                  onClick={() => { setActiveGameType('shield'); setActiveGameLevel(1); setIsArcadeOpen(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#F4F1EA] hover:bg-[#E5E0D8] transition-all border border-transparent hover:border-blue-500 group"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#4A4036]">Atmosphere Shield</div>
                    <div className="text-[9px] text-[#A8A096]">Misi Level 2</div>
                  </div>
                </button>
                <button 
                  onClick={() => { setActiveGameType('clicker'); setActiveGameLevel(1); setIsArcadeOpen(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#F4F1EA] hover:bg-[#E5E0D8] transition-all border border-transparent hover:border-yellow-500 group"
                >
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#4A4036]">Energy Saver</div>
                    <div className="text-[9px] text-[#A8A096]">Misi Level 3</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D2B48C]" />
                Top Eco-Influencers
              </h2>
            
            {leaderboard.length === 0 ? (
              <p className="text-sm text-[#A8A096] text-center py-8 border border-dashed border-[#E5E0D8] rounded-xl">Belum ada data interaksi.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((user, index) => (
                  <div 
                    key={user.id} 
                    onClick={() => {
                      setSelectedUserForProfile({ id: user.id, fullName: user.name, className: user.className } as any);
                      setView('profile');
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4F1EA] transition-colors border border-transparent hover:border-[#E5E0D8] cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                      ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                        index === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' : 
                        'bg-orange-100 text-orange-800 border border-orange-200'}`}
                    >
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate flex items-center gap-1">
                        {user.name}
                        <span className="text-[9px] bg-[#E5E0D8] text-[#4A4036] px-1 rounded">
                          {user.role === 'teacher' ? 'Guru' : user.className}
                        </span>
                        <span className="text-[9px] bg-[#8A9A5B] text-white px-1 rounded">{user.schoolName}</span>
                      </div>
                      <div className="text-xs text-[#A8A096]">{user.interactions} Interaksi</div>
                    </div>
                    <div className="text-xs font-bold text-[#8A9A5B] bg-[#F4F1EA] px-2 py-1 rounded-md border border-[#E5E0D8]">
                      {user.xp} XP
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 pt-5 border-t border-[#E5E0D8]">
              <h3 className="text-xs font-bold text-[#A8A096] uppercase tracking-wider mb-3">Cara Dapat XP:</h3>
              <ul className="text-sm text-[#4A4036] space-y-2">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]"></span> Buat postingan</span>
                  <span className="font-bold text-[#8A9A5B]">+10</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]"></span> Pakai kata ilmiah</span>
                  <span className="font-bold text-[#8A9A5B]">+5</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B]"></span> Dapat interaksi</span>
                  <span className="font-bold text-[#8A9A5B]">+2</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

        {/* Edit Post Modal */}
        {editingPost && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="p-6 border-b border-[#E5E0D8] flex items-center justify-between bg-[#F4F1EA]">
                <h2 className="text-xl font-bold text-[#4A4A4A] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#8A9A5B]" /> Edit Postingan
                </h2>
                <button 
                  onClick={() => setEditingPost(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-[#A8A096]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdatePost} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-[#4A4A4A] mb-2 uppercase tracking-wider">Topik Lingkungan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Kesehatan Lingkungan', 'Pemanasan Global', 'Krisis Energi', 'Ketahanan Pangan'] as Subbab[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSubbab(s)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editSubbab === s 
                            ? 'bg-[#8A9A5B] text-white border-[#8A9A5B] shadow-md' 
                            : 'bg-white text-[#A8A096] border-[#E5E0D8] hover:border-[#8A9A5B]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-[#4A4A4A] mb-2 uppercase tracking-wider">Caption</label>
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full h-40 p-4 bg-[#F4F1EA] border border-[#E5E0D8] rounded-2xl focus:ring-2 focus:ring-[#8A9A5B] focus:border-transparent outline-none resize-none text-[#4A4A4A]"
                    placeholder="Apa yang ingin kamu bagikan hari ini?"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-[#A8A096] bg-[#F4F1EA] hover:bg-[#E5E0D8] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-white bg-[#8A9A5B] hover:bg-[#7A8A4B] shadow-lg shadow-[#8A9A5B]/20 transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      
      </main>

      {/* Add custom animation for particles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-20px) scale(0); opacity: 0; }
        }
      `}} />
      
      <EcoArcadeModal 
        isOpen={isArcadeOpen} 
        onClose={() => { setIsArcadeOpen(false); setActiveGameType(undefined); }} 
        level={activeGameLevel}
        gameType={activeGameType}
        onComplete={handleMissionComplete}
      />
      <LevelUpOverlay 
        isOpen={isLevelUpOpen} 
        level={lastLevel} 
        onClose={() => setIsLevelUpOpen(false)} 
      />
      <BangEko />
    </div>
  );
};
