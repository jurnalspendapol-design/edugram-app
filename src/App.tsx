/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb, MessageCircleQuestion, Heart, CheckCircle2, Leaf, Sparkles, Send, Image as ImageIcon, LogOut, UserCircle2, ArrowLeft, Trophy } from 'lucide-react';

type Subbab = 'Kesehatan Lingkungan' | 'Pemanasan Global' | 'Krisis Energi' | 'Ketahanan Pangan';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  className: string;
  studentNumber: string;
  schoolName: string;
  profilePictureUrl: string;
  role: 'student' | 'teacher';
  xp: number;
  interactions: number;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorClass: string;
  authorUsername?: string;
  subbab: Subbab;
  caption: string;
  imageUrl: string;
  insightful: number;
  ask: number;
  support: number;
  timestamp: number;
  isScientific: boolean;
  assignments?: any[];
}

interface UserStats {
  id: string;
  name: string;
  className: string;
  xp: number;
  interactions: number;
}

const SCIENTIFIC_KEYWORDS = ['emisi', 'gas rumah kaca', 'limbah', 'biogas'];

const SUBBAB_COLORS: Record<Subbab, string> = {
  'Kesehatan Lingkungan': 'bg-teal-100 text-teal-800 border-teal-200',
  'Pemanasan Global': 'bg-red-100 text-red-800 border-red-200',
  'Krisis Energi': 'bg-amber-100 text-amber-800 border-amber-200',
  'Ketahanan Pangan': 'bg-green-100 text-green-800 border-green-200',
};

// --- Auth Screen Component ---
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
        if (!username || !password || !fullName || !className || !studentNumber || !schoolName) {
          setError('Semua field wajib diisi');
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
                    <label className="block text-sm font-bold text-[#4A4036] mb-1.5">Kelas</label>
                    <input
                      type="text"
                      placeholder="Contoh: 7A"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4A4036] mb-1.5">No. Absen</label>
                    <input
                      type="number"
                      placeholder="Contoh: 12"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      className="w-full bg-[#F4F1EA] border border-[#E5E0D8] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] transition-shadow"
                      min="1"
                      required
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
const ProfilePage = ({ user, onBack }: { user: UserProfile, onBack: () => void }) => {
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user.id]);

  if (loading) {
    return <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A9A5B]"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans pb-20">
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <button onClick={onBack} className="flex items-center gap-2 hover:bg-[#7A8A4B] px-3 py-1.5 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali</span>
          </button>
          <div className="flex-1 text-center font-bold text-lg pr-10">Profil Saya</div>
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
            <h2 className="text-2xl font-bold mb-1">{profileData?.fullName}</h2>
            <p className="text-[#A8A096] font-medium mb-1">@{profileData?.username}</p>
            <p className="text-sm text-[#8A9A5B] font-bold mb-6">{profileData?.schoolName}</p>
            
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
                  <Heart className="w-5 h-5 text-red-400" />
                  <span className="text-2xl font-bold text-[#4A4036]">{profileData?.interactions || 0}</span>
                </div>
                <div className="text-xs font-bold text-[#A8A096] uppercase tracking-wider">Interaksi Diterima</div>
              </div>
            </div>
            
            {(profileData?.interactions || 0) > 10 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full border border-blue-100 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Verified Eco-Influencer
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

  const handleSubmit = async () => {
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">Buat Tugas untuk Postingan</h2>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 mb-4 border rounded-lg">
          <option value="choice">Pilihan Ganda</option>
          <option value="essay">Essai</option>
          <option value="poll">Polling</option>
        </select>
        <textarea placeholder="Pertanyaan..." value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full p-2 mb-4 border rounded-lg h-24" />
        {type !== 'essay' && options.map((opt, i) => (
          <input key={i} placeholder={`Opsi ${i + 1}`} value={opt} onChange={(e) => {
            const newOpts = [...options];
            newOpts[i] = e.target.value;
            setOptions(newOpts);
          }} className="w-full p-2 mb-2 border rounded-lg" />
        ))}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-500">Batal</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-[#8A9A5B] text-white rounded-lg">Buat Tugas</button>
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

// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [view, setView] = useState<'feed' | 'profile' | 'students'>('feed');
  
  // Assignment Modal State
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedPostForAssignment, setSelectedPostForAssignment] = useState<Post | null>(null);
  
  // Form state
  const [subbab, setSubbab] = useState<Subbab>('Kesehatan Lingkungan');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('edugram_user_profile');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      const [postsRes, lbRes] = await Promise.all([
        fetch('/api/posts'),
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
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('edugram_user_profile');
    setView('feed');
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
          isScientific
        })
      });

      if (res.ok) {
        setCaption('');
        setImageUrl('');
        fetchData(); // Refresh feed
      }
    } catch (err) {
      console.error("Failed to post", err);
    }
  };

  const handleInteract = async (postId: string, type: 'insightful' | 'ask' | 'support') => {
    try {
      // Optimistic update
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return { ...post, [type]: post[type] + 1 };
        }
        return post;
      }));

      await fetch(`/api/posts/${postId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
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
    return <ProfilePage user={currentUser} onBack={() => setView('feed')} />;
  }

  if (view === 'students') {
    return <StudentsView schoolName={currentUser.schoolName} teacherId={currentUser.id} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#4A4036] font-sans selection:bg-[#8A9A5B] selection:text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#8A9A5B] text-[#F4F1EA] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">EduGram</h1>
            <span className="text-xs font-medium bg-[#7A8A4B] px-2 py-1 rounded-full sm:ml-2">Eco-Influencer</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setView('feed')} className={`text-sm font-bold ${view === 'feed' ? 'text-white' : 'text-white/70'}`}>Feed</button>
            <button onClick={() => setView('profile')} className={`text-sm font-bold ${view === 'profile' ? 'text-white' : 'text-white/70'}`}>Profil</button>
            {currentUser.role === 'teacher' && (
              <button onClick={() => setView('students')} className={`text-sm font-bold ${view === 'students' ? 'text-white' : 'text-white/70'}`}>Siswa</button>
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
          {view === 'feed' ? (
            <>
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
                  <button
                    type="submit"
                    disabled={!caption.trim()}
                    className="w-full sm:w-auto bg-[#8A9A5B] hover:bg-[#7A8A4B] text-white px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <span>Posting</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

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
                        <div className="w-10 h-10 rounded-full bg-[#D2B48C] flex items-center justify-center text-white font-bold">
                          {post.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{post.authorName}</span>
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
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${SUBBAB_COLORS[post.subbab]}`}>
                          {post.subbab}
                        </span>
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
                          className="flex items-center gap-1.5 text-[#A8A096] hover:text-yellow-500 transition-colors group"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-yellow-50 transition-colors">
                            <Lightbulb className={`w-5 h-5 ${post.insightful > 0 ? 'text-yellow-500 fill-yellow-500/20' : ''}`} />
                          </div>
                          <span className={`text-sm font-medium ${post.insightful > 0 ? 'text-yellow-600' : ''}`}>{post.insightful}</span>
                        </button>
                        
                        <button 
                          onClick={() => handleInteract(post.id, 'ask')}
                          className="flex items-center gap-1.5 text-[#A8A096] hover:text-blue-500 transition-colors group"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
                            <MessageCircleQuestion className={`w-5 h-5 ${post.ask > 0 ? 'text-blue-500 fill-blue-500/20' : ''}`} />
                          </div>
                          <span className={`text-sm font-medium ${post.ask > 0 ? 'text-blue-600' : ''}`}>{post.ask}</span>
                        </button>
                        
                        <button 
                          onClick={() => handleInteract(post.id, 'support')}
                          className="flex items-center gap-1.5 text-[#A8A096] hover:text-red-500 transition-colors group"
                        >
                          <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors">
                            <Heart className={`w-5 h-5 ${post.support > 0 ? 'text-red-500 fill-red-500/20' : ''}`} />
                          </div>
                          <span className={`text-sm font-medium ${post.support > 0 ? 'text-red-600' : ''}`}>{post.support}</span>
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
                      </div>
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
                  <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4F1EA] transition-colors border border-transparent hover:border-[#E5E0D8]">
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

      </main>

      {/* Add custom animation for particles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-20px) scale(0); opacity: 0; }
        }
      `}} />
    </div>
  );
}
