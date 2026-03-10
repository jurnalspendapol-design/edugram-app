import express from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization for Supabase
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    let supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("⚠️ SUPABASE_URL atau SUPABASE_ANON_KEY belum diatur di Secrets!");
    }

    // Ensure URL has http/https protocol
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    try {
      new URL(supabaseUrl); // Validate URL format
    } catch (e) {
      throw new Error(`⚠️ SUPABASE_URL tidak valid: ${supabaseUrl}. Pastikan formatnya benar (contoh: https://xyz.supabase.co)`);
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

async function getUserStreakInfo(userId: string, supabase: SupabaseClient) {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error || !posts || posts.length === 0) return { streak: 0, lastPostDate: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastPostDateObj = new Date(posts[0].created_at);
    const lastPostDateISO = lastPostDateObj.toISOString().split('T')[0];
    const lastPostDateMidnight = new Date(lastPostDateObj);
    lastPostDateMidnight.setHours(0, 0, 0, 0);
    
    if (lastPostDateMidnight < yesterday) return { streak: 0, lastPostDate: lastPostDateISO };

    const uniqueDates = Array.from(new Set(posts.map(p => {
      const d = new Date(p.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))).sort((a, b) => b - a);

    let streak = 0;
    let expectedDate = lastPostDateMidnight.getTime();
    for (const date of uniqueDates) {
      if (date === expectedDate) {
        streak++;
        expectedDate -= 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }

    return { streak, lastPostDate: lastPostDateISO };
  } catch (e) {
    return { streak: 0, lastPostDate: null };
  }
}

const app = express();
app.use(express.json());

// --- API Routes ---

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { username, password, fullName, className, studentNumber, schoolName, profilePictureUrl, registrationCode } = req.body;
    
    const isTeacher = registrationCode === 'whyedugram';
    
    if (!username || !password || !fullName || !schoolName) {
      return res.status(400).json({ error: "Username, password, nama, dan sekolah wajib diisi" });
    }

    if (!isTeacher && (!className || !studentNumber)) {
      return res.status(400).json({ error: "Siswa wajib mengisi kelas dan nomor absen" });
    }

    const role = isTeacher ? 'teacher' : 'student';
    const finalClassName = className ? className.toUpperCase() : "GURU";
    const finalStudentNumber = studentNumber ? parseInt(studentNumber) : 0;
    
    const id = `${role.toUpperCase()}-${finalClassName}-${finalStudentNumber}-${Date.now()}`;

    const insertPayload: any = { 
      id, 
      username, 
      password, 
      full_name: fullName, 
      class_name: finalClassName, 
      student_number: finalStudentNumber,
      school_name: schoolName,
      role,
      created_at: new Date().toISOString()
    };

    let { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select('id, username, full_name, class_name, student_number')
      .single();

    // Fallback if role column is missing in DB
    if (error && (error.message.includes('role') || error.code === '42703')) {
      console.warn("Role column missing, retrying without role data...");
      delete insertPayload.role;
      
      const retry = await supabase
        .from('users')
        .insert([insertPayload])
        .select('id, username, full_name, class_name, student_number')
        .single();
      
      error = retry.error;
      data = retry.data;
    }

    if (error) {
      if (error.code === '23505') { // Unique violation in Postgres
        return res.status(400).json({ error: "Username sudah digunakan" });
      }
      return res.status(500).json({ error: "Gagal mendaftar: " + error.message });
    }

    res.json({ success: true, user: { id, username, fullName, className: className.toUpperCase(), studentNumber, schoolName, role, xp: 0, streak: 0, interactions: 0 } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password harus diisi" });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, full_name, class_name, student_number')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    // Calculate interactions
    const { data: posts } = await supabase
      .from('posts')
      .select('insightful, ask, support')
      .eq('author_id', user.id);
      
    let totalInteractions = 0;
    if (posts) {
      totalInteractions = posts.reduce((acc, post) => acc + post.insightful + post.ask + post.support, 0);
    }

    const { streak, lastPostDate } = await getUserStreakInfo(user.id, supabase);
      
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        fullName: user.full_name, 
        className: user.class_name, 
        studentNumber: user.student_number, 
        role: (user as any).role || (user.id.includes('TEACHER') ? 'teacher' : 'student'),
        xp: (user as any).xp || 0,
        interactions: totalInteractions,
        streak,
        lastPostDate
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Get User Followers
app.get("/api/users/:id/followers", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: followers, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        users!follows_follower_id_fkey (
          id,
          full_name,
          username,
          class_name,
          role
        )
      `)
      .eq('following_id', req.params.id);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Gagal mengambil pengikut" });
    }

    const formattedFollowers = followers.map((f: any) => ({
      id: f.users?.id,
      fullName: f.users?.full_name,
      username: f.users?.username,
      className: f.users?.class_name,
      role: f.users?.role
    })).filter((f: any) => f.id);

    res.json(formattedFollowers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Profile
app.get("/api/users/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const viewerId = req.query.viewerId as string;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, class_name, student_number, xp')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const { data: userPosts } = await supabase
      .from('posts')
      .select('insightful, ask, support, is_scientific')
      .eq('author_id', user.id);
      
    const { data: userComments } = await supabase
      .from('comments')
      .select('id')
      .eq('author_id', user.id);

    let totalInteractions = 0;
    let calculatedXp = 0;
    if (userPosts) {
      totalInteractions = userPosts.reduce((acc, post) => acc + post.insightful + post.ask + post.support, 0);
      calculatedXp = (userPosts.length * 10) + 
                     (userPosts.filter(p => p.is_scientific).length * 5) + 
                     (totalInteractions * 2);
    }
    if (userComments) {
      calculatedXp += (userComments.length * 2);
    }

    const finalXp = Math.max((user as any).xp || 0, calculatedXp);

    // Sync XP to database if it's higher
    if (finalXp > ((user as any).xp || 0)) {
      supabase.from('users').update({ xp: finalXp }).eq('id', user.id).then();
    }

    const { streak, lastPostDate } = await getUserStreakInfo(user.id, supabase);

    // Fetch followers and following counts
    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;

    try {
      const { count: followers, error: fError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      
      if (fError) throw fError;
      followersCount = followers || 0;

      const { count: following, error: flError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);
      
      if (flError) throw flError;
      followingCount = following || 0;

      if (viewerId) {
        const { data: followData, error: fdError } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('following_id', user.id)
          .maybeSingle();
        
        if (fdError) throw fdError;
        isFollowing = !!followData;
      }
    } catch (e) {
      console.log("Follows table likely missing, using fallback");
      // Use fallback
      followersCount = Object.values(fallbackFollows).filter(list => list.includes(user.id)).length;
      followingCount = fallbackFollows[user.id] ? fallbackFollows[user.id].length : 0;
      if (viewerId) {
        isFollowing = fallbackFollows[viewerId] ? fallbackFollows[viewerId].includes(user.id) : false;
      }
    }

    res.json({ 
      ...user, 
      fullName: user.full_name,
      className: user.class_name,
      studentNumber: user.student_number,
      schoolName: (user as any).school_name || "",
      profilePictureUrl: (user as any).profile_picture_url || "",
      bio: (user as any).bio || "",
      interactions: totalInteractions,
      streak,
      lastPostDate,
      xp: finalXp,
      role: (user as any).role || (user.id.includes('TEACHER') ? 'teacher' : 'student'),
      followersCount,
      followingCount,
      isFollowing
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Update User Profile
app.post("/api/users/:id/profile", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { bio, profilePictureUrl } = req.body;
    const userId = req.params.id;

    const { error } = await supabase
      .from('users')
      .update({ 
        bio: bio || "",
        profile_picture_url: profilePictureUrl || ""
      })
      .eq('id', userId);

    if (error) return res.status(500).json({ error: "Gagal memperbarui profil" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// In-memory fallback for follows if Supabase table is missing
const fallbackFollows: Record<string, string[]> = {}; // followerId -> array of followingIds

// Toggle Follow
app.post("/api/users/:id/follow", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { followerId } = req.body;
    const followingId = req.params.id;

    if (!followerId || followerId === followingId) {
      return res.status(400).json({ error: "Data tidak valid" });
    }

    const { data: existingFollow, error: selectError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (selectError) {
      // Fallback to in-memory
      if (!fallbackFollows[followerId]) fallbackFollows[followerId] = [];
      const index = fallbackFollows[followerId].indexOf(followingId);
      if (index > -1) {
        fallbackFollows[followerId].splice(index, 1);
        return res.json({ success: true, action: 'unfollowed', fallback: true });
      } else {
        fallbackFollows[followerId].push(followingId);
        return res.json({ success: true, action: 'followed', fallback: true });
      }
    }

    if (existingFollow) {
      const { error: deleteError } = await supabase.from('follows').delete().eq('id', existingFollow.id);
      if (deleteError) throw deleteError;
      res.json({ success: true, action: 'unfollowed' });
    } else {
      const { error: insertError } = await supabase.from('follows').insert([{
        id: Date.now().toString(),
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      }]);
      if (insertError) throw insertError;
      res.json({ success: true, action: 'followed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Groups Logic (In-Memory Fallback) ---
const fallbackGroups: Record<string, any> = {};
const fallbackGroupMembers: Record<string, any[]> = {}; // groupId -> array of { userId, role: 'admin'|'member', status: 'approved'|'pending', user: { fullName, username } }
const fallbackGroupMessages: Record<string, any[]> = {}; // groupId -> array of messages

app.get("/api/groups/:id/messages", async (req, res) => {
  try {
    const groupId = req.params.id;
    const messages = fallbackGroupMessages[groupId] || [];
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/groups/:id/messages", async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId, fullName, username, content } = req.body;
    
    if (!fallbackGroupMessages[groupId]) fallbackGroupMessages[groupId] = [];
    
    const newMessage = {
      id: 'msg_' + Date.now().toString(),
      group_id: groupId,
      user_id: userId,
      user: { fullName, username },
      content,
      created_at: new Date().toISOString()
    };
    
    fallbackGroupMessages[groupId].push(newMessage);
    res.json({ success: true, message: newMessage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/groups", async (req, res) => {
  try {
    const { name, description, type, privacy, adminId, adminName, adminUsername } = req.body;
    if (!name || !adminId) return res.status(400).json({ error: "Nama grup dan admin wajib diisi" });

    const groupId = 'group_' + Date.now().toString();
    const newGroup = {
      id: groupId,
      name,
      description: description || '',
      type: type || 'topic', // 'school' | 'topic'
      privacy: privacy || 'public', // 'public' | 'private'
      admin_id: adminId,
      created_at: new Date().toISOString()
    };

    fallbackGroups[groupId] = newGroup;
    fallbackGroupMembers[groupId] = [{
      userId: adminId,
      role: 'admin',
      status: 'approved',
      user: { fullName: adminName, username: adminUsername }
    }];

    res.json({ success: true, group: newGroup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const allGroups = Object.values(fallbackGroups).map(group => {
      const members = fallbackGroupMembers[group.id] || [];
      const userMember = members.find(m => m.userId === userId);
      return {
        ...group,
        memberCount: members.filter(m => m.status === 'approved').length,
        userStatus: userMember ? userMember.status : null,
        userRole: userMember ? userMember.role : null
      };
    });
    res.json(allGroups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/groups/:id", async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = fallbackGroups[groupId];
    if (!group) return res.status(404).json({ error: "Grup tidak ditemukan" });

    const members = fallbackGroupMembers[groupId] || [];
    res.json({
      ...group,
      members
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/groups/:id/join", async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId, fullName, username } = req.body;
    const group = fallbackGroups[groupId];
    
    if (!group) return res.status(404).json({ error: "Grup tidak ditemukan" });
    if (!userId) return res.status(400).json({ error: "User ID wajib diisi" });

    if (!fallbackGroupMembers[groupId]) fallbackGroupMembers[groupId] = [];
    
    const existingMember = fallbackGroupMembers[groupId].find(m => m.userId === userId);
    if (existingMember) {
      return res.status(400).json({ error: "Sudah bergabung atau menunggu persetujuan" });
    }

    const status = group.privacy === 'private' ? 'pending' : 'approved';
    
    fallbackGroupMembers[groupId].push({
      userId,
      role: 'member',
      status,
      user: { fullName, username }
    });

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/groups/:id/members/:userId", async (req, res) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const { action, adminId } = req.body; // action: 'approve' | 'reject' | 'remove'

    const group = fallbackGroups[groupId];
    if (!group) return res.status(404).json({ error: "Grup tidak ditemukan" });

    const members = fallbackGroupMembers[groupId] || [];
    const adminMember = members.find(m => m.userId === adminId && m.role === 'admin');
    
    if (!adminMember) return res.status(403).json({ error: "Hanya admin yang dapat melakukan aksi ini" });

    const targetIndex = members.findIndex(m => m.userId === targetUserId);
    if (targetIndex === -1) return res.status(404).json({ error: "Anggota tidak ditemukan" });

    if (action === 'approve') {
      members[targetIndex].status = 'approved';
    } else if (action === 'reject' || action === 'remove') {
      members.splice(targetIndex, 1);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Posts
app.get("/api/posts", async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.query.userId as string;
    const authorId = req.query.authorId as string;
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        users (
          full_name,
          class_name,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (authorId) {
      query = query.eq('author_id', authorId);
    }
      
    const { data: posts, error } = await query;
      
    if (error) {
      return res.status(500).json({ error: "Gagal mengambil postingan" });
    }

    // Fetch comment counts
    let commentCounts: any[] = [];
    try {
      const { data } = await supabase.from('comments').select('post_id');
      if (data) commentCounts = data;
    } catch (e) {}

    // Fetch user interactions if userId provided
    let userInteractions: any[] = [];
    if (userId) {
      try {
        const { data } = await supabase
          .from('interactions')
          .select('post_id, type')
          .eq('user_id', userId);
        if (data) userInteractions = data;
      } catch (e) {}
    }

    const formattedPosts = posts.map(p => {
      const count = commentCounts.filter(c => c.post_id === p.id).length;
      const interactions = userInteractions
        .filter(i => i.post_id === p.id)
        .map(i => i.type);

      return {
        id: p.id,
        authorId: p.author_id,
        authorName: p.users?.full_name,
        authorClass: p.users?.class_name,
        authorUsername: p.users?.username,
        subbab: p.subbab,
        caption: p.caption,
        imageUrl: p.image_url,
        insightful: p.insightful,
        ask: p.ask,
        support: p.support,
        timestamp: p.created_at,
        isScientific: Boolean(p.is_scientific),
        locationLat: (p as any).location_lat,
        locationLng: (p as any).location_lng,
        commentCount: count,
        userInteractions: interactions
      };
    });

    res.json(formattedPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Get Comments for a Post
app.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (
          full_name,
          class_name
        )
      `)
      .eq('post_id', req.params.postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.log("Comments error:", error.message);
      return res.json([]); // Return empty if table missing or error
    }

    const formattedComments = comments.map(c => ({
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: c.users?.full_name,
      authorClass: c.users?.class_name,
      content: c.content,
      timestamp: c.created_at
    }));

    res.json(formattedComments);
  } catch (error: any) {
    res.json([]); // Return empty on catch
  }
});

// Create Comment
app.post("/api/posts/:postId/comments", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { authorId, content } = req.body;
    const postId = req.params.postId;

    if (!authorId || !content) return res.status(400).json({ error: "Data tidak lengkap" });

    const id = Date.now().toString();
    const { error } = await supabase
      .from('comments')
      .insert([{
        id,
        post_id: postId,
        author_id: authorId,
        content,
        created_at: new Date().toISOString()
      }]);

    if (error) return res.status(500).json({ error: "Gagal mengirim komentar: " + error.message });

    // Add XP to commenter
    const { data: user } = await supabase.from('users').select('xp').eq('id', authorId).single();
    if (user) {
      const currentXp = (user as any).xp || 0;
      await supabase.from('users').update({ xp: currentXp + 2 }).eq('id', authorId);
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Report Post
app.post("/api/posts/:postId/report", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { reporterId, reason, description } = req.body;
    const postId = req.params.postId;

    if (!reporterId || !reason) return res.status(400).json({ error: "Data tidak lengkap" });

    const id = Date.now().toString();
    const { error } = await supabase
      .from('reports')
      .insert([{
        id,
        post_id: postId,
        reporter_id: reporterId,
        reason,
        description,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error("Report error:", error.message);
      return res.status(500).json({ error: "Gagal mengirim laporan: " + error.message });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Create Post
app.post("/api/posts", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { authorId, subbab, caption, imageUrl, isScientific, locationLat, locationLng, isMission, gameLevel } = req.body;
    
    if (!authorId || !caption) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    const insertData: any = {
      id,
      author_id: authorId,
      subbab,
      caption,
      image_url: imageUrl || "",
      is_scientific: isScientific,
      is_mission: isMission,
      game_level: gameLevel,
      created_at: createdAt,
      insightful: 0,
      ask: 0,
      support: 0
    };

    if (locationLat !== null && locationLat !== undefined) {
      insertData.location_lat = locationLat;
      insertData.location_lng = locationLng;
    }

    let { error } = await supabase
      .from('posts')
      .insert([insertData]);

    // Fallback if location columns are missing in DB
    if (error && (error.message.includes('location_lat') || error.code === '42703')) {
      console.warn("Location columns missing, retrying without location data...");
      delete insertData.location_lat;
      delete insertData.location_lng;
      
      const retry = await supabase.from('posts').insert([insertData]);
      error = retry.error;
    }

    if (error) {
      console.error("Post creation error details:", error);
      
      // Fallback for mission columns
      if (error.message.includes('is_mission') || error.code === '42703') {
        console.warn("Mission columns missing, retrying without mission data...");
        delete insertData.is_mission;
        delete insertData.game_level;
        const retry = await supabase.from('posts').insert([insertData]);
        if (!retry.error) {
          return res.json({ success: true, id, user: null });
        }
      }

      return res.status(500).json({ 
        error: "Gagal membuat postingan: " + error.message,
        details: error.details,
        hint: "Jika error terkait 'is_mission', jalankan SQL ini di Supabase: ALTER TABLE posts ADD COLUMN is_mission BOOLEAN DEFAULT FALSE; ALTER TABLE posts ADD COLUMN game_level INTEGER DEFAULT 1;"
      });
    }

    // Add XP to user
    let xpGained = 10;
    if (isScientific) xpGained += 5;
    
    const { data: user } = await supabase.from('users').select('id, username, full_name, class_name, student_number, xp').eq('id', authorId).single();
    
    let updatedUser = null;
    if (user) {
      // Try to update XP, but don't fail if column missing
      try {
        const currentXp = (user as any).xp || 0;
        await supabase.from('users').update({ 
          xp: currentXp + xpGained
        }).eq('id', authorId);
      } catch (e) {
        console.log("XP update failed, likely column missing");
      }
      
      const { streak, lastPostDate } = await getUserStreakInfo(authorId, supabase);
      updatedUser = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        className: user.class_name,
        studentNumber: user.student_number,
        role: (user as any).role || (user.id.includes('TEACHER') ? 'teacher' : 'student'),
        xp: (user as any).xp || 0,
        streak,
        lastPostDate
      };
    }

    res.json({ success: true, id, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Update Post
app.put("/api/posts/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { userId, caption, subbab, isScientific } = req.body;
    const postId = req.params.id;

    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Postingan tidak ditemukan" });
    }

    if (post.author_id !== userId) {
      return res.status(403).json({ error: "Anda tidak diizinkan mengubah postingan ini" });
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ caption, subbab, is_scientific: isScientific })
      .eq('id', postId);

    if (updateError) {
      return res.status(500).json({ error: "Gagal memperbarui postingan" });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { userId } = req.body;
    const postId = req.params.id;

    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Postingan tidak ditemukan" });
    }

    if (post.author_id !== userId) {
      return res.status(403).json({ error: "Anda tidak diizinkan menghapus postingan ini" });
    }

    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      return res.status(500).json({ error: "Gagal menghapus postingan" });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Interact with Post (Toggle)
app.post("/api/posts/:id/interact", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { type, userId } = req.body; // 'insightful', 'ask', 'support'
    const postId = req.params.id;

    if (!['insightful', 'ask', 'support'].includes(type)) {
      return res.status(400).json({ error: "Tipe interaksi tidak valid" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID wajib disertakan" });
    }

    // Check if interaction already exists
    let existingInteraction = null;
    try {
      const { data } = await supabase
        .from('interactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('type', type)
        .maybeSingle();
      existingInteraction = data;
    } catch (e) {
      // If table missing, we'll just proceed with simple increment for now
      console.log("Interactions table likely missing, falling back to simple increment");
    }

    // Fetch current post to update counts
    const { data: postData, error: fetchError } = await supabase
      .from('posts')
      .select(`author_id, ${type}`)
      .eq('id', postId)
      .single();

    if (fetchError || !postData) {
      return res.status(404).json({ error: "Post tidak ditemukan" });
    }

    const post = postData as any;
    let newCount = post[type];
    let xpChange = 0;

    if (existingInteraction) {
      // Toggle OFF: Delete interaction and decrement
      try {
        await supabase.from('interactions').delete().eq('id', existingInteraction.id);
      } catch (e) {}
      newCount = Math.max(0, post[type] - 1);
      xpChange = -2;
    } else {
      // Toggle ON: Create interaction and increment
      try {
        await supabase.from('interactions').insert([{
          id: Date.now().toString(),
          post_id: postId,
          user_id: userId,
          type,
          created_at: new Date().toISOString()
        }]);
      } catch (e) {}
      newCount = post[type] + 1;
      xpChange = 2;
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ [type]: newCount })
      .eq('id', postId);

    if (!updateError) {
      // Update XP for post author
      const { data: author } = await supabase.from('users').select('xp').eq('id', post.author_id).single();
      if (author) {
        await supabase.from('users').update({ xp: Math.max(0, (author as any).xp + xpChange) }).eq('id', post.author_id);
      }
      res.json({ success: true, action: existingInteraction ? 'removed' : 'added', count: newCount });
    } else {
      res.status(500).json({ error: "Gagal melakukan interaksi" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Mission Complete
app.post("/api/missions/complete", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { userId, postId, xp } = req.body;

    if (!userId) return res.status(400).json({ error: "Data tidak lengkap" });

    // Add XP to student
    const { data: user } = await supabase.from('users').select('id, username, full_name, class_name, student_number, xp').eq('id', userId).single();
    
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const currentXp = (user as any).xp || 0;
    const xpToAdd = xp || 200;
    const newXp = currentXp + xpToAdd;

    await supabase.from('users').update({ xp: newXp }).eq('id', userId);

    const { streak, lastPostDate } = await getUserStreakInfo(userId, supabase);

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        className: user.class_name,
        studentNumber: user.student_number,
        role: (user as any).role || (user.id.includes('TEACHER') ? 'teacher' : 'student'),
        xp: newXp,
        streak,
        lastPostDate
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: users, error: usersError } = await supabase.from('users').select('id, username, full_name, class_name, xp') as { data: any[], error: any };
    const { data: posts, error: postsError } = await supabase.from('posts').select('author_id, insightful, ask, support, is_scientific') as { data: any[], error: any };
    const { data: comments, error: commentsError } = await supabase.from('comments').select('author_id') as { data: any[], error: any };

    if (usersError || postsError || commentsError) {
      return res.status(500).json({ error: "Gagal mengambil leaderboard" });
    }

    const userStats = users.map(u => {
      const userPosts = posts.filter(p => p.author_id === u.id);
      const userComments = comments.filter(c => c.author_id === u.id);
      
      const interactionsReceived = userPosts.reduce((acc, p) => acc + p.insightful + p.ask + p.support, 0);
      
      // Calculate XP based on activity to ensure accuracy for users like "deddy armanda"
      // Post: 10, Scientific: +5, Comment: 2, Interaction Received: 2
      const calculatedXp = (userPosts.length * 10) + 
                           (userPosts.filter(p => p.is_scientific).length * 5) + 
                           (userComments.length * 2) + 
                           (interactionsReceived * 2);
      
      // Use the higher value between stored XP and calculated XP
      const finalXp = Math.max((u as any).xp || 0, calculatedXp);

      // Sync XP to database if it's higher
      if (finalXp > ((u as any).xp || 0)) {
        supabase.from('users').update({ xp: finalXp }).eq('id', u.id).then();
      }

      return {
        id: u.id,
        username: u.username,
        name: u.full_name,
        className: u.class_name,
        schoolName: (u as any).school_name || "",
        xp: finalXp,
        interactions: interactionsReceived
      };
    });

    const leaderboard = userStats
      .sort((a, b) => b.xp - a.xp || b.interactions - a.interactions)
      .slice(0, 3);

    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Create Assignment
app.post("/api/assignments", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { postId, teacherId, type, question, options } = req.body;
    
    if (!postId || !teacherId || !question) {
      return res.status(400).json({ error: "Data tugas tidak lengkap" });
    }

    const id = Date.now().toString();
    const { error } = await supabase
      .from('assignments')
      .insert([{ 
        id, 
        post_id: postId, 
        teacher_id: teacherId, 
        type, 
        question, 
        options, 
        created_at: new Date().toISOString() 
      }]);

    if (error) return res.status(500).json({ error: "Gagal membuat tugas" });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Student
app.delete("/api/users/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { teacherId } = req.body;
    
    // Verify teacher and school
    const { data: teacher } = await supabase.from('users').select('role, school_name').eq('id', teacherId).single();
    const { data: student } = await supabase.from('users').select('school_name').eq('id', req.params.id).single();

    if (teacher?.role !== 'teacher' || teacher.school_name !== student?.school_name) {
      return res.status(403).json({ error: "Tidak diizinkan" });
    }

    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: "Gagal menghapus siswa" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json({ users: [], posts: [], groups: [] });

    const supabase = getSupabase();
    const query = q.toLowerCase();

    // Search users
    const { data: users } = await supabase
      .from('users')
      .select('id, username, full_name, profile_picture_url, role')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);

    // Search posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, content, user_id, user:users(id, full_name, username, profile_picture_url)')
      .ilike('content', `%${query}%`)
      .limit(10);

    // Search groups (in-memory)
    const groups = Object.values(fallbackGroups).filter(g => 
      g.name.toLowerCase().includes(query) || 
      g.description.toLowerCase().includes(query)
    ).slice(0, 10);

    res.json({
      users: users || [],
      posts: posts || [],
      groups: groups || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
