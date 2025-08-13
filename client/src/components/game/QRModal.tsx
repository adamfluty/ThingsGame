import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface QRModalProps {
  roomCode: string;
  onClose: () => void;
  size?: 'sm' | 'lg';
}

export function QRModal({ roomCode, onClose, size }: QRModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  
  const url = useMemo(() => 
    `${window.location.origin}/play?room=${encodeURIComponent(roomCode)}`, 
    [roomCode]
  );
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        const { toDataURL } = await import('qrcode');
        const data = await toDataURL(url);
        setDataUrl(data);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };
    
    generateQR();
  }, [url]);
  
  const canShare = typeof navigator !== 'undefined' && !!(navigator as any).share;
  const imageDimensions = size === 'lg' ? 'w-96 h-96' : 'w-48 h-48';
  
  const handleShare = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ 
          title: 'Join FlutyThings', 
          text: 'Join my room', 
          url 
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert('Link copied');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };
  
  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="SCAN or SHARE"
      size={size === 'lg' ? 'lg' : 'md'}
    >
      <div className="relative inline-block">
        {dataUrl ? (
          <img 
            src={dataUrl} 
            alt="QR Code" 
            className={`${imageDimensions} rounded-xl`}
          />
        ) : (
          <div className={`${imageDimensions} flex items-center justify-center`}>
            Loading…
          </div>
        )}
        
        {/* Share icon overlay */}
        <Button
          variant="primary"
          size="xs"
          shape="circle"
          className="absolute top-2 right-2"
          title={canShare ? 'Share' : 'Copy link'}
          onClick={handleShare}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="w-4 h-4"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5L12 3m0 0l4.5 4.5M12 3v12" 
            />
          </svg>
        </Button>
      </div>
    </Modal>
  );
}
