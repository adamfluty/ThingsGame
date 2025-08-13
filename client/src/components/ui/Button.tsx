import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'error' | 'warning' | 'info' | 'success' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  loading?: boolean;
  outline?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  shape,
  loading = false,
  outline = false,
  className = '', 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'btn';
  const variantClasses = outline ? `btn-outline btn-${variant}` : `btn-${variant}`;
  const sizeClasses = size !== 'md' ? `btn-${size}` : '';
  const shapeClasses = shape ? `btn-${shape}` : '';
  const loadingClasses = loading ? 'loading' : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    shapeClasses,
    loadingClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button 
      className={classes} 
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}
