import React from 'react';

interface BadgeProps {
  variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'ghost' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  outline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ 
  variant = 'neutral', 
  size = 'md', 
  outline = false,
  className = '',
  children 
}: BadgeProps) {
  const baseClasses = 'badge';
  const variantClasses = outline ? `badge-outline badge-${variant}` : `badge-${variant}`;
  const sizeClasses = size !== 'md' ? `badge-${size}` : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <span className={classes}>
      {children}
    </span>
  );
}
