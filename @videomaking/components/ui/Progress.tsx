"use client";

import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Progress({
  value,
  max = 100,
  className,
  showPercentage = false,
  size = 'md',
  variant = 'default'
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-muted', sizeClasses[size], className)}>
      <div
        className={cn(
          'h-full transition-all duration-300 ease-in-out',
          variantClasses[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}
