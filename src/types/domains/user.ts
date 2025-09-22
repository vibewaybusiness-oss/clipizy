// USER DOMAIN TYPES
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'private';
    show_email: boolean;
  };
}

export interface UserStats {
  total_projects: number;
  total_videos: number;
  total_views: number;
  credits_balance: number;
  join_date: string;
  last_active: string;
}
