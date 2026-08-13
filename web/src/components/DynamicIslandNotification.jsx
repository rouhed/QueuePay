import React, { useEffect, useState } from 'react';

// A single event emitter setup for notifications so anyone can trigger them
let globalShowNotification = null;

export function triggerNotification(message, iconType = 'info') {
  if (globalShowNotification) {
    globalShowNotification(message, iconType);
  }
}

export default function DynamicIslandNotification() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    globalShowNotification = (message, iconType) => {
      setNotification({ message, iconType });
    };
    return () => {
      globalShowNotification = null;
    };
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); // Hide after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) return null;

  const renderIcon = () => {
    switch (notification.iconType) {
      case 'success':
        return <span style={{ color: '#10B981', fontSize: '18px', fontWeight: 'bold' }}>✓</span>;
      case 'error':
        return <span style={{ color: '#EF4444', fontSize: '18px', fontWeight: 'bold' }}>✗</span>;
      case 'warning':
        return <span style={{ color: '#F59E0B', fontSize: '18px', fontWeight: 'bold' }}>⚠</span>;
      default:
        return <span style={{ color: '#F97316', fontSize: '18px', fontWeight: 'bold' }}>ℹ</span>;
    }
  };

  return (
    <div className="dynamic-island-container">
      <div className="dynamic-island animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            {renderIcon()}
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }}>
            {notification.message}
          </span>
        </div>
      </div>
    </div>
  );
}
