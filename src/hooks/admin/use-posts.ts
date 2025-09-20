import { useState, useEffect } from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'scheduled';
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  featuredImage?: string;
}

interface PostsFilters {
  search: string;
  status: string;
  author: string;
  tags: string[];
  dateFrom: string;
  dateTo: string;
}

interface PostsData {
  posts: Post[];
  pagination: {
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    total: number;
  };
}

export function usePosts() {
  const [data, setData] = useState<PostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostsFilters>({
    search: '',
    status: '',
    author: '',
    tags: [],
    dateFrom: '',
    dateTo: ''
  });

  const fetchPosts = async (page: number = 1, currentFilters: PostsFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockPosts: Post[] = [
        {
          id: '1',
          title: 'Getting Started with Music Production',
          content: 'This is a comprehensive guide to music production...',
          excerpt: 'Learn the basics of music production with our step-by-step guide.',
          status: 'published',
          publishDate: '2024-01-15',
          createdAt: '2024-01-10',
          updatedAt: '2024-01-15',
          author: 'John Doe',
          tags: ['music', 'production', 'tutorial'],
          featuredImage: '/images/music-production.jpg'
        },
        {
          id: '2',
          title: 'Advanced Audio Mixing Techniques',
          content: 'Take your mixing skills to the next level...',
          excerpt: 'Professional mixing techniques for better sound quality.',
          status: 'draft',
          publishDate: '2024-01-20',
          createdAt: '2024-01-12',
          updatedAt: '2024-01-12',
          author: 'Jane Smith',
          tags: ['audio', 'mixing', 'advanced'],
          featuredImage: '/images/audio-mixing.jpg'
        },
        {
          id: '3',
          title: 'The Future of AI in Music',
          content: 'Exploring how artificial intelligence is changing music...',
          excerpt: 'Discover the latest AI tools and their impact on music creation.',
          status: 'scheduled',
          publishDate: '2024-01-25',
          createdAt: '2024-01-14',
          updatedAt: '2024-01-14',
          author: 'Mike Johnson',
          tags: ['ai', 'music', 'technology'],
          featuredImage: '/images/ai-music.jpg'
        }
      ];

      // Apply filters
      let filteredPosts = mockPosts;

      if (currentFilters.search) {
        filteredPosts = filteredPosts.filter(post =>
          post.title.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
          post.content.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(currentFilters.search.toLowerCase())
        );
      }

      if (currentFilters.status) {
        filteredPosts = filteredPosts.filter(post => post.status === currentFilters.status);
      }

      if (currentFilters.author) {
        filteredPosts = filteredPosts.filter(post =>
          post.author.toLowerCase().includes(currentFilters.author.toLowerCase())
        );
      }

      if (currentFilters.tags.length > 0) {
        filteredPosts = filteredPosts.filter(post =>
          currentFilters.tags.some(tag => post.tags.includes(tag))
        );
      }

      // Pagination
      const postsPerPage = 10;
      const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

      setData({
        posts: paginatedPosts,
        pagination: {
          page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          total: filteredPosts.length
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
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
    try {
      // Mock delete - replace with actual API call
      console.log('Deleting post:', postId);
      
      if (data) {
        setData({
          ...data,
          posts: data.posts.filter(post => post.id !== postId),
          pagination: {
            ...data.pagination,
            total: data.pagination.total - 1
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handleStatusChange = async (postId: string, newStatus: Post['status']) => {
    try {
      // Mock status update - replace with actual API call
      console.log('Updating post status:', postId, newStatus);
      
      if (data) {
        setData({
          ...data,
          posts: data.posts.map(post =>
            post.id === postId ? { ...post, status: newStatus } : post
          )
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post status');
    }
  };

  useEffect(() => {
    fetchPosts();
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
