"use client";

import { useState, useEffect } from 'react';
import { BlogPost, BlogCategory, BlogTag, BlogStats } from '@/types';
import { BlogList } from '@/components/blog/BlogList';
import { BlogSidebarNew } from '@/components/blog/BlogSidebarNew';
import { BlogHero } from '@/components/blog/BlogHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Calendar } from 'lucide-react';

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: BlogStats;
}

export default function BlogPage() {
  const [data, setData] = useState<BlogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    tag: ''
  });

  const fetchPosts = async (page = 1, searchParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '9',
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePageChange = (page: number) => {
    fetchPosts(page, filters);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    fetchPosts(1, newFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="h-10 bg-muted rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-destructive mb-4">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Error Loading Blog</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button 
                onClick={() => fetchPosts()}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <BlogHero />

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* BLOG POSTS */}
          <div className="lg:col-span-3">
            <div className="mb-12">
              <h2 id="tutorials" className="text-4xl font-bold mb-4 text-foreground">Latest Tutorials & Guides</h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Learn how to create amazing music videos with AI-powered tools
              </p>
            </div>
            <BlogList
              posts={data.posts}
              categories={data.stats.categories}
              tags={data.stats.tags}
              pagination={data.pagination}
              onPageChange={handlePageChange}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide">
              <BlogSidebarNew
                popularPosts={data.stats.popularPosts}
                recentPosts={data.stats.recentPosts}
                categories={data.stats.categories}
                tags={data.stats.tags}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
