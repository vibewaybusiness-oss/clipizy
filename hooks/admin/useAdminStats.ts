import { useState, useEffect } from 'react';
import { BlogPost } from '@/types';

interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalViews: number;
  totalLikes: number;
  recentPosts: BlogPost[];
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/blog?status=all&limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch blog data');
      }
      
      const data = await response.json();
      
      const publishedPosts = data.posts.filter((post: BlogPost) => post.status === 'published');
      const draftPosts = data.posts.filter((post: BlogPost) => post.status === 'draft');
      const scheduledPosts = data.posts.filter((post: BlogPost) => 
        post.status === 'scheduled' || (post.status === 'draft' && post.scheduledFor && new Date(post.scheduledFor) > new Date())
      );

      setStats({
        totalPosts: data.posts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        scheduledPosts: scheduledPosts.length,
        totalViews: data.stats?.totalViews || 0,
        totalLikes: data.stats?.totalLikes || 0,
        recentPosts: data.posts.slice(0, 5)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
