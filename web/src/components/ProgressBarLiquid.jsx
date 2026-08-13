import React from 'react';

export default function ProgressBarLiquid({ value = 0, label = '', subtitle = '' }) {
  // Clamp value between 0 and 100
  const percentage = Math.min(Math.max(value, 0), 100);
  const fillHeight = 100 - percentage; // SVG y coordinates start from top

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
      <div 
        style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '4px solid var(--champagne)',
          boxShadow: '0 8px 24px rgba(41, 37, 36, 0.08), inset 0 4px 8px rgba(41, 37, 36, 0.03)',
          overflow: 'hidden',
          background: 'rgba(255, 253, 251, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Animated wave fill */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            height: `${percentage}%`,
            background: 'var(--saffron)',
            transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden'
          }}
        >
          {/* Waves overlay SVG */}
          <svg
            className="wave-svg"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              top: '-15px',
              left: '0',
              width: '200%', // wider to translate
              height: '20px',
              fill: 'var(--saffron)'
            }}
          >
            {/* Primary Wave */}
            <path d="M0,10 C15,10 30,5 45,5 C60,5 75,15 90,15 C105,15 120,5 135,5 C150,5 165,10 180,10 C195,10 210,15 225,15 C240,15 255,10 270,10 L270,20 L0,20 Z" />
            {/* Secondary wave with different offset */}
            <path d="M0,8 C20,8 35,13 50,13 C65,13 80,8 95,8 C110,8 125,13 140,13 C155,13 170,8 185,8 C200,8 215,13 230,13 C245,13 260,8 275,8 L275,20 L0,20 Z" />
          </svg>
        </div>

        {/* Dynamic Centered Text */}
        <div style={{ zIndex: 10, textAlign: 'center', mixBlendMode: percentage > 55 ? 'difference' : 'normal' }}>
          <span 
            style={{ 
              fontSize: '28px', 
              fontWeight: '800', 
              fontFamily: 'Outfit, sans-serif', 
              color: percentage > 55 ? '#FFFDFB' : '#292524',
              lineHeight: '1'
            }}
          >
            {percentage}%
          </span>
          {label && (
            <p 
              style={{ 
                fontSize: '10px', 
                fontWeight: '700', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginTop: '4px',
                color: percentage > 55 ? '#E5D3C0' : '#78716C' 
              }}
            >
              {label}
            </p>
          )}
        </div>
      </div>
      {subtitle && (
        <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', fontWeight: '600' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
