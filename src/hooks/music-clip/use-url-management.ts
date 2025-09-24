"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

interface UseUrlManagementOptions {
  projectId?: string | null;
  currentStep: number;
  maxReachedStep: number;
  onStepChange: (step: number) => void;
  onProjectIdChange?: (projectId: string | null) => void;
}

interface UseUrlManagementReturn {
  urlProjectId: string | null;
  isNewProject: boolean;
  updateStepInUrl: (step: number) => void;
  updateProjectIdInUrl: (projectId: string) => void;
  preventRedirects: () => void;
}

export function useUrlManagement({
  projectId,
  currentStep,
  maxReachedStep,
  onStepChange,
  onProjectIdChange
}: UseUrlManagementOptions): UseUrlManagementReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlProjectId = searchParams.get('projectId');
  const isNewProject = searchParams.get('new') !== null;
  
  const prevStepRef = useRef(currentStep);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize step from URL parameter (only on mount)
  useEffect(() => {
    if (!hasInitialized.current) {
      const stepParam = searchParams.get('step');
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (step >= 1 && step <= 4) {
          console.log('Initializing step from URL:', step);
          onStepChange(step);
        }
      }
      hasInitialized.current = true;
    }
  }, []); // Only run on mount

  // Update URL when step changes (with throttling to prevent browser hanging)
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      console.log('Step changed from', prevStepRef.current, 'to', currentStep);

      // Clear any pending URL update
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }

      // Throttle URL updates to prevent browser hanging
      urlUpdateTimeoutRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('step', currentStep.toString());
        // Include projectId in URL if available
        if (projectId) {
          url.searchParams.set('projectId', projectId);
        }
        window.history.replaceState({}, '', url.toString());
        prevStepRef.current = currentStep;
      }, 100); // 100ms delay
    }

    // Cleanup timeout on unmount
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [currentStep, projectId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/music-clip')) {
        return;
      }

      const stepParam = searchParams.get('step');
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (step >= 1 && step <= 4) {
          onStepChange(step);
        }
      } else {
        onStepChange(1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchParams, onStepChange]);

  // Prevent redirects away from music-clip page
  useEffect(() => {
    if (urlProjectId) {
      const handleUrlChange = () => {
        const currentPath = window.location.pathname;
        console.log('URL changed to:', currentPath);
        if (!currentPath.includes('/music-clip') && currentPath.includes('/create')) {
          console.error('REDIRECT DETECTED: Music clip page redirected to create page');
          console.trace('Redirect stack trace');
          
          // Prevent the redirect by restoring the music-clip URL
          if (urlProjectId) {
            console.log('Preventing redirect - restoring music-clip URL with projectId:', urlProjectId);
            const correctUrl = `/dashboard/create/music-clip?projectId=${urlProjectId}`;
            window.history.replaceState({}, '', correctUrl);
          }
        }
      };

      // Listen for URL changes
      window.addEventListener('popstate', handleUrlChange);
      
      // Also check periodically for URL changes and prevent redirects
      const interval = setInterval(() => {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/music-clip') && currentPath.includes('/create')) {
          console.error('REDIRECT DETECTED: Music clip page redirected to create page');
          console.trace('Redirect stack trace');
          
          // Prevent the redirect by restoring the music-clip URL
          if (urlProjectId) {
            console.log('Preventing redirect - restoring music-clip URL with projectId:', urlProjectId);
            const correctUrl = `/dashboard/create/music-clip?projectId=${urlProjectId}`;
            window.history.replaceState({}, '', correctUrl);
          }
        }
      }, 1000);

      return () => {
        window.removeEventListener('popstate', handleUrlChange);
        clearInterval(interval);
      };
    }
  }, [urlProjectId]);

  // Ensure URL is preserved on page reload and prevent redirects
  useEffect(() => {
    if (typeof window !== 'undefined' && urlProjectId) {
      const currentUrl = new URL(window.location.href);
      const currentProjectId = currentUrl.searchParams.get('projectId');
      
      // If we have a projectId in the URL but it's not in the current URL, restore it
      if (urlProjectId && currentProjectId !== urlProjectId) {
        console.log('Restoring projectId in URL:', urlProjectId);
        currentUrl.searchParams.set('projectId', urlProjectId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
      
      // Prevent navigation away from music-clip page when we have a projectId
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/music-clip') && currentPath.includes('/create')) {
        console.log('Preventing navigation away from music-clip page');
        const correctUrl = `/dashboard/create/music-clip?projectId=${urlProjectId}`;
        window.history.replaceState({}, '', correctUrl);
      }
    }
  }, [urlProjectId]);

  // Additional safeguard: prevent any router navigation away from music-clip page
  useEffect(() => {
    if (urlProjectId) {
      const originalPush = router.push;
      const originalReplace = router.replace;
      
      // Override router methods to prevent navigation away from music-clip page
      router.push = (href: string) => {
        if (href === '/dashboard/create' || href === '/dashboard/create/') {
          console.log('Preventing router.push to /dashboard/create, redirecting to music-clip page');
          return originalPush(`/dashboard/create/music-clip?projectId=${urlProjectId}`);
        }
        return originalPush(href);
      };
      
      router.replace = (href: string) => {
        if (href === '/dashboard/create' || href === '/dashboard/create/') {
          console.log('Preventing router.replace to /dashboard/create, redirecting to music-clip page');
          return originalReplace(`/dashboard/create/music-clip?projectId=${urlProjectId}`);
        }
        return originalReplace(href);
      };
      
      // Cleanup: restore original methods
      return () => {
        router.push = originalPush;
        router.replace = originalReplace;
      };
    }
  }, [urlProjectId, router]);

  const updateStepInUrl = useCallback((step: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', step.toString());
    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }
    window.history.replaceState({}, '', url.toString());
  }, [projectId]);

  const updateProjectIdInUrl = useCallback((newProjectId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', newProjectId);
    window.history.replaceState({}, '', url.toString());
    onProjectIdChange?.(newProjectId);
  }, [onProjectIdChange]);

  const preventRedirects = useCallback(() => {
    // This function can be called to manually prevent redirects
    if (urlProjectId) {
      const correctUrl = `/dashboard/create/music-clip?projectId=${urlProjectId}`;
      window.history.replaceState({}, '', correctUrl);
    }
  }, [urlProjectId]);

  return {
    urlProjectId,
    isNewProject,
    updateStepInUrl,
    updateProjectIdInUrl,
    preventRedirects
  };
}
