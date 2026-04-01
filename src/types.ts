export type Subbab = 'Kesehatan Lingkungan' | 'Pemanasan Global' | 'Krisis Energi' | 'Ketahanan Pangan';

export interface UserProfile {
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

export interface Post {
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

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorClass: string;
  content: string;
  timestamp: number;
}

export interface UserStats {
  id: string;
  name: string;
  className: string;
  schoolName: string;
  xp: number;
  interactions: number;
  role: 'student' | 'teacher';
}
