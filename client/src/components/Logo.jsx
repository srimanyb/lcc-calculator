import React from 'react';

export default function Logo({ size = 'large', light = true }) {
  const isLarge = size === 'large';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      userSelect: 'none'
    }}>
      <img 
        src="/logo-bg.png" 
        alt="Laxmi Chandra Caterers" 
        style={{ 
          height: isLarge ? '80px' : '45px',
          width: 'auto',
          objectFit: 'contain'
        }} 
      />
    </div>
  );
}
