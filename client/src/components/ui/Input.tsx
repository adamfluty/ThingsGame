import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'bordered' | 'ghost' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  inputSize?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  variant = 'bordered', 
  inputSize = 'md', 
  label,
  error,
  className = '', 
  containerClassName = '',
  ...props 
}, ref) => {
  const baseClasses = 'input';
  const variantClasses = `input-${variant}`;
  const sizeClasses = inputSize !== 'md' ? `input-${inputSize}` : '';
  const errorClasses = error ? 'input-error' : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    errorClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={["form-control w-full", containerClassName].filter(Boolean).join(' ')}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <input ref={ref} className={classes} {...props} />
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
});
