import React from 'react';

export default function QueuePayLogo({ width = 120, height = 40, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg
        width={width * 0.35}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Saffron & Champagne Warm Gradient */}
          <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FF9D5C" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5D3C0" />
            <stop offset="100%" stopColor="#F7EBE1" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular loop forming the 'Q' and representing a waiting circle */}
        <path
          d="M 50,50 m -35,0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
          stroke="url(#saffronGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="180 50" // representing a queue circle
          fill="none"
        />

        {/* Ticket slit intersecting the circle to complete the 'Q' tail and show the ticket concept */}
        <rect
          x="55"
          y="55"
          width="35"
          height="14"
          rx="3"
          transform="rotate(45 55 55)"
          fill="url(#saffronGrad)"
          filter="url(#glow)"
        />

        {/* Mini ticket dots/cutouts */}
        <circle cx="68" cy="74" r="2.5" fill="#FFFDFB" />

        {/* Card/Slot symbol inside to represent the 'Pay' payment aspect */}
        <rect
          x="32"
          y="40"
          width="36"
          height="22"
          rx="4"
          fill="#292524"
        />
        {/* Glow Chip on Card */}
        <rect
          x="38"
          y="46"
          width="8"
          height="6"
          rx="1"
          fill="url(#saffronGrad)"
        />
        {/* Small line representing card strip */}
        <line
          x1="32"
          y1="56"
          x2="68"
          y2="56"
          stroke="#E5D3C0"
          strokeWidth="2"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontWeight: '800',
            fontSize: `${height * 0.55}px`,
            letterSpacing: '-0.5px',
            color: '#292524',
          }}
        >
          Queue
          <span style={{ color: '#F97316' }}>Pay</span>
        </span>
      )}
    </div>
  );
}
