import { useState, useEffect } from 'react';
import { ContentCalendar } from '@/types/calendar';
import { contentCalendar } from '@/data/content-calendar';

export function useContentCalendar() {
  const [calendar, setCalendar] = useState<ContentCalendar>(contentCalendar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCalendarStats = () => {
    const totalPosts = calendar.posts.length;
    const publishedPosts = calendar.posts.filter(p => p.status === 'published').length;
    const draftPosts = calendar.posts.filter(p => p.status === 'draft').length;
    const plannedPosts = calendar.posts.filter(p => p.status === 'planned').length;
    const scheduledPosts = calendar.posts.filter(p => p.status === 'scheduled').length;

    return {
      total: totalPosts,
      published: publishedPosts,
      draft: draftPosts,
      planned: plannedPosts,
      scheduled: scheduledPosts,
      completionRate: Math.round((publishedPosts / totalPosts) * 100)
    };
  };

  const updatePost = (postId: string, updates: Partial<typeof calendar.posts[0]>) => {
    setCalendar(prev => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, ...updates } : p)
    }));
  };

  const addPost = (post: typeof calendar.posts[0]) => {
    setCalendar(prev => ({
      ...prev,
      posts: [...prev.posts, post]
    }));
  };

  const deletePost = (postId: string) => {
    setCalendar(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.id !== postId)
    }));
  };

  const getPostsByCluster = (clusterId: string) => {
    return calendar.posts.filter(p => p.cluster === clusterId);
  };

  const getPostsByStatus = (status: string) => {
    return calendar.posts.filter(p => p.status === status);
  };

  const getPostsByWeek = (week: number) => {
    return calendar.posts.filter(p => p.week === week);
  };

  const getPostsByMonth = (month: number) => {
    return calendar.posts.filter(p => p.month === month);
  };

  return {
    calendar,
    loading,
    error,
    stats: getCalendarStats(),
    updatePost,
    addPost,
    deletePost,
    getPostsByCluster,
    getPostsByStatus,
    getPostsByWeek,
    getPostsByMonth,
    setCalendar
  };
}
