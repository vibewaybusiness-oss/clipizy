"use client";

import { useState } from 'react';
import type { ContentCalendar, BlogPost, CalendarWeek, CalendarMonth } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Plus,
  Edit,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Settings,
  Bot,
  Eye
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, addWeeks } from 'date-fns';

interface ContentCalendarProps {
  calendar: ContentCalendar;
  onPostClick?: (post: BlogPost) => void;
  onGeneratePost?: (post: BlogPost) => void;
  onEditPost?: (post: BlogPost) => void;
}

export function ContentCalendar({
  calendar,
  onPostClick,
  onGeneratePost,
  onEditPost
}: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('month');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Generate calendar weeks
  const generateCalendarWeeks = (): CalendarWeek[] => {
    const startDate = new Date(calendar.startDate);
    const endDate = new Date(calendar.endDate);
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate });

    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart);
      const weekPosts = calendar.posts.filter(post => {
        const postDate = new Date(post.scheduledFor || post.publishedAt);
        return postDate >= weekStart && postDate <= weekEnd;
      });

      return {
        weekNumber: index + 1,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        posts: weekPosts,
        status: weekPosts.length === 0 ? 'upcoming' :
                weekPosts.every(p => p.status === 'published') ? 'completed' : 'in-progress'
      };
    });
  };

  const calendarWeeks = generateCalendarWeeks();

  // Filter posts based on search and cluster
  const filteredPosts = calendar.posts.filter(post => {
    const matchesSearch = searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCluster = selectedCluster === 'all' || post.cluster === selectedCluster;

    return matchesSearch && matchesCluster;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'planned':
        return <Calendar className="w-4 h-4 text-gray-600" />;
      case 'draft':
        return <Edit className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      published: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      planned: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getClusterColor = (clusterId: string) => {
    const cluster = calendar.clusters.find(c => c.id === clusterId);
    return cluster?.color || '#6B7280';
  };

  const renderWeekView = () => (
    <div className="space-y-6">
      {calendarWeeks.map((week) => (
        <Card key={week.weekNumber}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Week {week.weekNumber} - {format(new Date(week.startDate), 'MMM dd')} to {format(new Date(week.endDate), 'MMM dd, yyyy')}
              </CardTitle>
              <Badge variant={week.status === 'completed' ? 'default' : 'secondary'}>
                {week.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {week.posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onPostClick?.(post)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{post.title}</h3>
                    {getStatusIcon(post.status)}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(post.status)}
                    <Badge
                      style={{ backgroundColor: getClusterColor(post.cluster) + '20', color: getClusterColor(post.cluster) }}
                    >
                      {calendar.clusters.find(c => c.id === post.cluster)?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(post.scheduledFor || post.publishedAt), 'MMM dd, HH:mm')}</span>
                    <span>•</span>
                    <span>{post.priority} priority</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onGeneratePost?.(post); }}>
                      <Bot className="w-3 h-3 mr-1" />
                      Generate
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEditPost?.(post); }}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
              {week.posts.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No posts scheduled for this week
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMonthView = () => {
    const months = [1, 2, 3]; // 3 months
    return (
      <div className="space-y-8">
        {months.map((month) => {
          const monthPosts = calendar.posts.filter(post => post.month === month);
          const monthName = new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' });

          return (
            <Card key={month}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {monthName} 2024
                  <Badge variant="outline">{monthPosts.length} posts</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onPostClick?.(post)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{post.title}</h3>
                        {getStatusIcon(post.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(post.status)}
                        <Badge
                          style={{ backgroundColor: getClusterColor(post.cluster) + '20', color: getClusterColor(post.cluster) }}
                        >
                          {calendar.clusters.find(c => c.id === post.cluster)?.name}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Week {post.week} • {format(new Date(post.scheduledFor || post.publishedAt), 'MMM dd')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onGeneratePost?.(post); }}>
                          <Bot className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEditPost?.(post); }}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-4">
      {filteredPosts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold truncate">{post.title}</h3>
                  {getStatusIcon(post.status)}
                  {getStatusBadge(post.status)}
                  <Badge
                    style={{ backgroundColor: getClusterColor(post.cluster) + '20', color: getClusterColor(post.cluster) }}
                  >
                    {calendar.clusters.find(c => c.id === post.cluster)?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Week {post.week}, Month {post.month}</span>
                  <span>•</span>
                  <span>{format(new Date(post.scheduledFor || post.publishedAt), 'MMM dd, yyyy HH:mm')}</span>
                  <span>•</span>
                  <span>{post.priority} priority</span>
                  <span>•</span>
                  <span>{post.keywords.join(', ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onGeneratePost?.(post)}>
                  <Bot className="w-3 h-3 mr-1" />
                  Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEditPost?.(post)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPostClick?.(post)}>
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{calendar.name}</h1>
          <p className="text-muted-foreground">{calendar.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Post
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Clusters</option>
              {calendar.clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CALENDAR CONTENT */}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'list' && renderListView()}
    </div>
  );
}
