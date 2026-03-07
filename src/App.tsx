/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb, MessageCircleQuestion, Heart, CheckCircle2, Leaf, Sparkles, Send, Image as ImageIcon, LogOut, UserCircle2, ArrowLeft, Trophy, Flame, MessageSquare, X, Plus, Trash2, AlertTriangle, Flag, MoreVertical, Pencil, MapPin, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const EcoMap = ({ posts }: { posts: Post[] }) => {
  const mapPosts = posts.filter(p => p.locationLat != null && p.locationLng != null);
  
  // Default center if no posts with location
  const defaultCenter: [number, number] = [-6.2, 106.8];
  const center: [number, number] = mapPosts.length > 0 
    ? [mapPosts[0].locationLat!, mapPosts[0].locationLng!] 
    : defaultCenter;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden mb-6">
      <div className="p-4 border-b border-[#E5E0D8] flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-[#8A9A5B]" />
          Interactive Eco-Map
        </h2>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Limbah/Polusi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Solusi/Tanam</span>
          </div>
        </div>
      </div>
      <div id="map" className="h-[350px] w-full z-0">
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
          {mapPosts.map(post => {
            const captionLower = post.caption.toLowerCase();
            const isIssue = captionLower.includes('limbah') || captionLower.includes('polusi');
            const isSolution = captionLower.includes('solusi') || captionLower.includes('tanam');
            
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
                    <div className="font-bold text-[#8A9A5B]">@{post.authorUsername || 'User'}</div>
                    <div className="text-xs text-[#4A4036] mt-1">
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

const AuthScreen = ({ onLogin }: { onLogin: (profile: UserProfile) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!username || !password) {
          setError('Username dan password harus diisi');
          setLoading(false);
          return;
        }
        
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (data.success) {
          onLogin(data.user);
        } else {
          setError(data.error || 'Gagal login');
        }
      } else {
        const isTeacher = registrationCode === 'whyedugram';
        
        if (!username || !password || !fullName || !schoolName) {
          setError('Field wajib harus diisi');
          setLoading(false);
          return;
        }

        if (!isTeacher && (!className || !studentNumber)) {
          setError('Siswa wajib mengisi kelas dan nomor absen');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, fullName, className, studentNumber, schoolName, registrationCode })
        });
        
        const data = await res.json();
        if (data.success) {
          onLogin(data.user);
        } else {
          setError(data.error || 'Gagal mendaftar');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center p-4 font-sans text-[#4A4036] selection:bg-[#8A9A5B] selection:text-white">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-[#E5E0D8] overflow-hidden">
        <div className="bg-[#8A9A5B] p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <Leaf className="w-32 h-32 absolute -top-10 -left-10 transform -rotate-45" />
            <Leaf className="w-24 h-24 absolute bottom-0 right-0 transform rotate-45" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">EduGram</h1>
            <p className="text-[#E5E0D8] text-sm font-medium">Eco-Influencer Platform</p>
          </div>
        </div>
        
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">{isLogin ? 'Selamat Datang Kembali! 👋' : 'Buat Akun Baru 🌱'}</h2>
            <p className="text-sm text-[#A8A096]">
              {isLogin ? 'Silakan masuk untuk melanjutkan.' : 'Isi data diri kamu untuk mulai berbagi inspirasi lingkungan.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Username</label>
              <input
                type="text"
                placeholder="Username (tanpa spasi)"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#4A4036] mb-1.5">
                      Kelas {registrationCode === 'whyedugram' && <span className="text-[#A8A096] font-normal">(Opsional)</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 7A"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow uppercase"
                      required={registrationCode !== 'whyedugram'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4A4036] mb-1.5">
                      No. Absen {registrationCode === 'whyedugram' && <span className="text-[#A8A096] font-normal">(Opsional)</span>}
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 12"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                      min="1"
                      required={registrationCode !== 'whyedugram'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Asal Sekolah</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMP Negeri 1 Jakarta"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Kode Registrasi (Opsional untuk Guru)</label>
                  <input
                    type="text"
                    placeholder="Masukkan kode jika guru"
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white font-bold py-3.5 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              <span>{loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar & Mulai')}</span>
              {!loading && <Sparkles className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-[#8A9A5B] font-bold hover:underline"
            >
              {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
            </button>
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
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchProfile = () => {
    fetch(`/api/users/${user.id}?viewerId=${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        setEditBio(data.bio || '');
        setIsFollowing(data.isFollowing);
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

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: editBio })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser.id })
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
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
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md">
                {profileData?.profilePictureUrl ? (
                  <img src={profileData.profilePictureUrl} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#D2B48C] flex items-center justify-center text-white text-3xl font-bold">
                    {profileData?.fullName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-16 pb-8 px-6 text-center">
            <div className="flex justify-center items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">{profileData?.fullName}</h2>
              {isOwnProfile ? (
                <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-gray-100 rounded-full">
                  <Sparkles className="w-4 h-4 text-[#8A9A5B]" />
                </button>
              ) : (
                <button 
                  onClick={handleFollow}
                  className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-[#E5E0D8] text-[#A8A096]' : 'bg-[#8A9A5B] text-white shadow-sm'}`}
                >
                  {isFollowing ? 'Mengikuti' : 'Ikuti'}
                </button>
              )}
            </div>
            <p className="text-[#A8A096] font-medium mb-1">@{profileData?.username}</p>
            <p className="text-sm text-[#8A9A5B] font-bold mb-4">{profileData?.schoolName}</p>

            {isEditing ? (
              <div className="mb-6 px-4">
                <textarea 
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#8A9A5B] outline-none"
                  placeholder="Tulis biografimu..."
                  rows={3}
                />
                <div className="flex justify-center gap-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-xs font-bold text-gray-500">Batal</button>
                  <button onClick={handleUpdateProfile} className="px-4 py-1.5 text-xs font-bold bg-[#8A9A5B] text-white rounded-lg">Simpan</button>
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
const StudentsView = ({ schoolName, teacherId }: { schoolName: string, teacherId: string }) => {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/students/${schoolName}`)
      .then(res => res.json())
      .then(setStudents);
  }, [schoolName]);

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;
    const res = await fetch(`/api/users/${studentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId })
    });
    if (res.ok) setStudents(students.filter(s => s.id !== studentId));
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8]">
      <h2 className="text-xl font-bold mb-4">Manajemen Siswa</h2>
      {students.map(s => (
        <div key={s.id} className="flex justify-between items-center p-4 border-b">
          <div>
            <div className="font-bold">{s.full_name}</div>
            <div className="text-sm text-gray-500">{s.class_name} - Absen {s.student_number}</div>
          </div>
          <button onClick={() => deleteStudent(s.id)} className="text-red-500 font-bold">Hapus</button>
        </div>
      ))}
    </div>
  );
};

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
              {(comment.authorName || 'U').charAt(0).toUpperCase()}
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
          {currentUser.fullName.charAt(0).toUpperCase()}
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

// --- Tutorial Modal Component ---
const TutorialModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Selamat Datang di EduGram! 🌿",
      content: "EduGram adalah platform sosial media khusus untuk kamu para Eco-Influencer sekolah. Di sini kita berbagi aksi nyata menjaga bumi.",
      icon: <Leaf className="w-12 h-12 text-[#8A9A5B]" />
    },
    {
      title: "Berbagi Aksi Nyata 📸",
      content: "Posting kegiatan ramah lingkunganmu. Gunakan kata ilmiah seperti 'Emisi', 'Limbah', atau 'Biogas' untuk mendapatkan bonus +5 XP!",
      icon: <ImageIcon className="w-12 h-12 text-[#D2B48C]" />
    },
    {
      title: "Interaksi Edukatif 💡",
      content: "Gunakan tombol Insightful (💡), Ask (❓), atau Support (❤️). Setiap interaksi yang kamu berikan atau terima akan menambah XP-mu!",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Berdiskusi & Belajar 💬",
      content: "Gunakan fitur komentar untuk berdiskusi lebih dalam dengan teman-temanmu. Setiap komentar memberimu +2 XP!",
      icon: <MessageSquare className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Misi Harian & Leaderboard 🏆",
      content: "Selesaikan 'Misi Hari Ini' dan kumpulkan XP untuk menjadi Top Eco-Influencer di sekolahmu!",
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

// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [view, setView] = useState<'feed' | 'profile' | 'students'>('feed');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editSubbab, setEditSubbab] = useState<Subbab>('Kesehatan Lingkungan');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserProfile | null>(null);
  
  // Assignment Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedPostForAssignment, setSelectedPostForAssignment] = useState<Post | null>(null);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<Post | null>(null);
  
  // Form state
  const [subbab, setSubbab] = useState<Subbab>('Kesehatan Lingkungan');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

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
    if (!currentUser || !caption.trim()) return;

    const isScientific = SCIENTIFIC_KEYWORDS.some(keyword => 
      caption.toLowerCase().includes(keyword)
    );

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          subbab,
          caption,
          imageUrl,
          isScientific,
          locationLat: isLocationEnabled && userCoords ? userCoords.lat : null,
          locationLng: isLocationEnabled && userCoords ? userCoords.lng : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('edugram_user_profile', JSON.stringify(data.user));
        }
        setCaption('');
        setImageUrl('');
        setIsLocationEnabled(false);
        setUserCoords(null);
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

  // If not logged in, show Auth Screen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (view === 'profile') {
    return <ProfilePage user={selectedUserForProfile || currentUser} currentUser={currentUser} onBack={() => { setView('feed'); setSelectedUserForProfile(null); }} />;
  }

  if (view === 'students') {
    return <StudentsView schoolName={currentUser.schoolName} teacherId={currentUser.id} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans selection:bg-[#8A9A5B] selection:text-white pb-20">
      <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">EduGram</h1>
            <span className="text-xs font-medium bg-[#7A8A4B] px-2 py-1 rounded-full sm:ml-2">Eco-Influencer</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTutorialOpen(true)}
              className="p-2 hover:bg-[#7A8A4B] rounded-full transition-colors text-white/80 hover:text-white"
              title="Panduan Penggunaan"
            >
              <MessageCircleQuestion className="w-5 h-5" />
            </button>
            <button onClick={() => setView('feed')} className="text-sm font-bold text-white">Feed</button>
            <button onClick={() => setView('profile')} className="text-sm font-bold text-white/70">Profil</button>
            {currentUser.role === 'teacher' && (
              <button onClick={() => setView('students')} className="text-sm font-bold text-white/70">Siswa</button>
            )}
            <div className="w-px h-6 bg-[#8A9A5B] mx-2"></div>
            <button 
              onClick={() => setView('profile')}
              className="flex items-center gap-3 bg-[#7A8A4B] hover:bg-[#6A7A3B] px-4 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium hidden sm:block">{currentUser.fullName}</span>
              <span className="text-xs font-bold bg-[#8A9A5B] px-1.5 py-0.5 rounded text-white">{currentUser.className}</span>
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
                      {currentUser.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{currentUser.fullName}</span>
                        <span className="text-xs font-bold bg-[#F4F1EA] text-[#8A9A5B] px-2 py-1 rounded-md border border-[#E5E0D8]">
                          Kelas {currentUser.className}
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
                <div className="flex items-center gap-2 mt-2 bg-[#F4F1EA] rounded-lg px-3 py-2 border border-[#E5E0D8]">
                  <ImageIcon className="w-4 h-4 text-[#A8A096]" />
                  <input
                    type="url"
                    placeholder="Link gambar (opsional)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-transparent text-sm focus:outline-none"
                  />
                </div>

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

          {/* Interactive Eco-Map */}
          <EcoMap posts={posts} />

          {/* Feed */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8] border-dashed">
                <Leaf className="w-12 h-12 mx-auto mb-4 text-[#E5E0D8]" />
                <h3 className="text-lg font-bold text-[#A8A096] mb-1">Belum ada postingan</h3>
                <p className="text-sm text-[#A8A096]">Jadilah Eco-Influencer pertama yang berbagi!</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] overflow-hidden relative group">
                  
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
                          {post.authorName.charAt(0).toUpperCase()}
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
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D8] p-5 sticky top-24">
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
                        <span className="text-[9px] bg-[#E5E0D8] text-[#4A4036] px-1 rounded">{user.className}</span>
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
      
      <BangEko />
    </div>
  );
}
