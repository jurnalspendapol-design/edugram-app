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
  timestamp: string;
  isScientific: boolean;
  locationLat?: number;
  locationLng?: number;
  commentCount: number;
  userInteractions: string[];
}

export interface UserStats {
  id: string;
  username: string;
  fullName: string;
  xp: number;
  profilePictureUrl: string;
}
