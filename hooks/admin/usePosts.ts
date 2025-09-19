import { useState, useEffect } from 'react';
import { BlogPost } from '@/types';

interface PostsResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PostsFilters {
  search: string;
  status: string;
  category?: string;
}

export function usePosts(initialFilters: PostsFilters = { search: '', status: 'all' }) {
  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostsFilters>(initialFilters);

  const fetchPosts = async (page = 1, searchParams: Partial<PostsFilters> = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...searchParams
      });

      const response = await fetch(`/api/blog?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<PostsFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchPosts(1, updatedFilters);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return false;
    }

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      await fetchPosts(data?.pagination.page || 1, filters);
      return true;
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post');
      return false;
    }
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update post status');
      }

      await fetchPosts(data?.pagination.page || 1, filters);
      return true;
    } catch (err) {
      console.error('Error updating post status:', err);
      alert('Failed to update post status');
      return false;
    }
  };

  useEffect(() => {
    fetchPosts(1, filters);
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    handleFilterChange,
    handleDelete,
    handleStatusChange,
    fetchPosts
  };
}
