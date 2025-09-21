import { useState, useEffect } from 'react';

interface CalendarPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'scheduled';
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
}

interface CalendarData {
  posts: CalendarPost[];
  stats: CalendarStats;
}

export function useContentCalendar() {
  const [calendar, setCalendar] = useState<CalendarData>({
    posts: [],
    stats: {
      total: 0,
      published: 0,
      draft: 0,
      scheduled: 0
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now - replace with actual API call
      const mockData: CalendarData = {
        posts: [
          {
            id: '1',
            title: 'Getting Started with Music Production',
            content: 'This is a comprehensive guide to music production...',
            excerpt: 'Learn the basics of music production with our step-by-step guide.',
            status: 'published',
            publishDate: '2024-01-15',
            createdAt: '2024-01-10',
            updatedAt: '2024-01-15'
          },
          {
            id: '2',
            title: 'Advanced Audio Mixing Techniques',
            content: 'Take your mixing skills to the next level...',
            excerpt: 'Professional mixing techniques for better sound quality.',
            status: 'draft',
            publishDate: '2024-01-20',
            createdAt: '2024-01-12',
            updatedAt: '2024-01-12'
          }
        ],
        stats: {
          total: 2,
          published: 1,
          draft: 1,
          scheduled: 0
        }
      };

      setCalendar(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  const updatePost = (postId: string, updatedPost: Partial<CalendarPost>) => {
    setCalendar(prev => ({
      ...prev,
      posts: prev.posts.map(post =>
        post.id === postId ? { ...post, ...updatedPost } : post
      ),
      stats: {
        ...prev.stats,
        // Update stats based on status changes
        ...(updatedPost.status && {
          [updatedPost.status]: prev.stats[updatedPost.status] + 1,
          [prev.posts.find(p => p.id === postId)?.status || 'draft']:
            prev.stats[prev.posts.find(p => p.id === postId)?.status || 'draft'] - 1
        })
      }
    }));
  };

  const addPost = (newPost: Omit<CalendarPost, 'id' | 'createdAt' | 'updatedAt'>) => {
    const post: CalendarPost = {
      ...newPost,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCalendar(prev => ({
      ...prev,
      posts: [...prev.posts, post],
      stats: {
        ...prev.stats,
        total: prev.stats.total + 1,
        [post.status]: prev.stats[post.status] + 1
      }
    }));
  };

  const deletePost = (postId: string) => {
    setCalendar(prev => {
      const postToDelete = prev.posts.find(p => p.id === postId);
      if (!postToDelete) return prev;

      return {
        ...prev,
        posts: prev.posts.filter(p => p.id !== postId),
        stats: {
          ...prev.stats,
          total: prev.stats.total - 1,
          [postToDelete.status]: prev.stats[postToDelete.status] - 1
        }
      };
    });
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  return {
    calendar: calendar.posts,
    stats: calendar.stats,
    loading,
    error,
    updatePost,
    addPost,
    deletePost,
    setCalendar,
    refetch: fetchCalendar
  };
}
