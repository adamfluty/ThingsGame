import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  headerClassName?: string;
  titleClassName?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  headerClassName,
  titleClassName
}: ModalProps) {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-base-content/40" 
        onClick={onClose} 
      />
      <div className="relative z-10 h-full w-full flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className={`w-full ${sizeClasses[size]} overflow-x-hidden rounded-2xl bg-base-200/95 backdrop-blur border border-base-300 shadow-2xl`}>
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between p-3 border-b border-base-300 rounded-t-2xl ${headerClassName ?? ''}`}>
            <div className={`text-sm uppercase tracking-[0.2em] opacity-70 ${titleClassName ?? ''}`}>
              {title}
            </div>
            {showCloseButton && (
              <Button 
                variant="ghost" 
                size="xs" 
                shape="circle"
                className="min-h-0 h-7"
                onClick={onClose}
              >
                ✖️
              </Button>
            )}
          </div>
        )}
          <div className="p-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
