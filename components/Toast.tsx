import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const bgColor = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};


const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded text-white shadow-lg ${bgColor[type]} animate-fade-in`}
      role="alert">
      {message}
    </div>
  );
};

export default Toast;
