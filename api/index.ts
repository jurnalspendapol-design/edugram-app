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

const app = express();
app.use(express.json());

// --- API Routes ---

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { username, password, fullName, className, studentNumber, schoolName, profilePictureUrl, registrationCode } = req.body;
    
    if (!username || !password || !fullName || !className || !studentNumber || !schoolName) {
      return res.status(400).json({ error: "Semua field wajib harus diisi" });
    }

    const role = registrationCode === 'whyedugram' ? 'teacher' : 'student';
    const id = `${className.toUpperCase()}-${studentNumber}-${Date.now()}`;

    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          id, 
          username, 
          password, 
          full_name: fullName, 
          class_name: className.toUpperCase(), 
          student_number: parseInt(studentNumber),
          school_name: schoolName,
          profile_picture_url: profilePictureUrl || "",
          role,
          xp: 0,
          created_at: Date.now()
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation in Postgres
        return res.status(400).json({ error: "Username sudah digunakan" });
      }
      return res.status(500).json({ error: "Gagal mendaftar: " + error.message });
    }

    res.json({ success: true, user: { id, username, fullName, className: className.toUpperCase(), studentNumber, schoolName, profilePictureUrl, role, xp: 0 } });
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
      .select('*')
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
      
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        fullName: user.full_name, 
        className: user.class_name, 
        studentNumber: user.student_number, 
        role: user.role,
        xp: user.xp,
        interactions: totalInteractions
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Get User Profile
app.get("/api/users/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, class_name, student_number, xp, school_name, profile_picture_url')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const { data: posts } = await supabase
      .from('posts')
      .select('insightful, ask, support')
      .eq('author_id', user.id);
      
    let totalInteractions = 0;
    if (posts) {
      totalInteractions = posts.reduce((acc, post) => acc + post.insightful + post.ask + post.support, 0);
    }

    res.json({ 
      ...user, 
      fullName: user.full_name,
      className: user.class_name,
      studentNumber: user.student_number,
      schoolName: user.school_name,
      profilePictureUrl: user.profile_picture_url,
      interactions: totalInteractions 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Get Posts
app.get("/api/posts", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: posts, error } = await supabase
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
      
    if (error) {
      return res.status(500).json({ error: "Gagal mengambil postingan" });
    }

    const formattedPosts = posts.map(p => ({
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
      isScientific: Boolean(p.is_scientific)
    }));

    res.json(formattedPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Create Post
app.post("/api/posts", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { authorId, subbab, caption, imageUrl, isScientific } = req.body;
    
    if (!authorId || !caption) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const id = Date.now().toString();
    const createdAt = Date.now();

    const { error } = await supabase
      .from('posts')
      .insert([
        {
          id,
          author_id: authorId,
          subbab,
          caption,
          image_url: imageUrl || "",
          is_scientific: isScientific,
          created_at: createdAt,
          insightful: 0,
          ask: 0,
          support: 0
        }
      ]);

    if (error) {
      return res.status(500).json({ error: "Gagal membuat postingan" });
    }

    // Add XP to user
    let xpGained = 10;
    if (isScientific) xpGained += 5;
    
    const { data: user } = await supabase.from('users').select('xp').eq('id', authorId).single();
    if (user) {
      await supabase.from('users').update({ xp: user.xp + xpGained }).eq('id', authorId);
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Interact with Post
app.post("/api/posts/:id/interact", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { type } = req.body; // 'insightful', 'ask', 'support'
    const postId = req.params.id;

    if (!['insightful', 'ask', 'support'].includes(type)) {
      return res.status(400).json({ error: "Tipe interaksi tidak valid" });
    }

    // Fetch current post to increment
    const { data: postData, error } = await supabase
      .from('posts')
      .select(`author_id, ${type}`)
      .eq('id', postId)
      .single();

    const post = postData as any;

    if (error || !post) {
      return res.status(404).json({ error: "Post tidak ditemukan" });
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({ [type]: post[type] + 1 })
      .eq('id', postId);

    if (!updateError) {
      // Add XP to post author
      const { data: author } = await supabase.from('users').select('xp').eq('id', post.author_id).single();
      if (author) {
        await supabase.from('users').update({ xp: author.xp + 2 }).eq('id', post.author_id);
      }
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Gagal melakukan interaksi" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan pada server" });
  }
});

// Get Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: users, error: usersError } = await supabase.from('users').select('id, username, full_name, class_name, xp, school_name') as { data: any[], error: any };
    const { data: posts, error: postsError } = await supabase.from('posts').select('author_id, insightful, ask, support') as { data: any[], error: any };

    if (usersError || postsError) {
      return res.status(500).json({ error: "Gagal mengambil leaderboard" });
    }

    const userStats = users.map(u => {
      const userPosts = posts.filter(p => p.author_id === u.id);
      const interactions = userPosts.reduce((acc, p) => acc + p.insightful + p.ask + p.support, 0);
      return {
        id: u.id,
        username: u.username,
        name: u.full_name,
        className: u.class_name,
        schoolName: u.school_name,
        xp: u.xp,
        interactions
      };
    });

    const leaderboard = userStats
      .sort((a, b) => b.interactions - a.interactions || b.xp - a.xp)
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
      .insert([{ id, post_id: postId, teacher_id: teacherId, type, question, options, created_at: Date.now() }]);

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

// Get Students by School
app.get("/api/students/:schoolName", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: students, error } = await supabase
      .from('users')
      .select('id, username, full_name, class_name, student_number')
      .eq('school_name', req.params.schoolName)
      .eq('role', 'student');

    if (error) return res.status(500).json({ error: "Gagal mengambil data siswa" });
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
