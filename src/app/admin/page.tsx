"use client";

import { StatsCard, QuickActions, RecentPosts } from '@/components/admin';
import { useAdminStats } from '@/hooks/admin';
import { FileText, Eye, Calendar } from 'lucide-react';

export default function AdminOverviewPage() {
  const { stats, loading, error } = useAdminStats();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">No Data Available</h1>
        <p className="text-muted-foreground">Unable to load admin statistics.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Manage your content and track performance</p>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-3 gap-6">
        <StatsCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="Published"
          value={stats.publishedPosts}
          icon={Eye}
          color="green"
        />
        <StatsCard
          title="Drafts"
          value={stats.draftPosts}
          icon={Calendar}
          color="yellow"
        />
      </div>

      {/* QUICK ACTIONS & RECENT POSTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActions />
        <RecentPosts posts={stats.recentPosts} />
      </div>
    </div>
  );
}
