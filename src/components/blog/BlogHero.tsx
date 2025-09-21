"use client";

import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function BlogHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="relative">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Music Video Creation
              </div>

              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                Create Stunning Music Videos
                <br />
                <span className="text-blue-600 dark:text-blue-400">in Minutes, Not Months</span>
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Learn how to create professional music videos using AI. No editing skills needed.
                Perfect for indie artists, content creators, and musicians.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/dashboard/create">
                    <Play className="w-5 h-5" />
                    Start Creating Free
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="#tutorials">
                    <ArrowRight className="w-5 h-5" />
                    View Tutorials
                  </Link>
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center gap-8 pt-12 text-sm text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">10,000+</div>
                  <div>Videos Created</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">5 Minutes</div>
                  <div>Average Creation Time</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">No Skills</div>
                  <div>Required</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
