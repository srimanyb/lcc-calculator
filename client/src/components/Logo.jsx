import React from 'react';

export default function Logo({ size = 'large', light = true }) {
  const isLarge = size === 'large';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'baseline', 
      justifyContent: 'center', 
      gap: isLarge ? '8px' : '4px',
      userSelect: 'none'
    }}>
      <span style={{ 
        fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive", 
        color: '#00ff00', /* Vibrant Green to match screenshot */
        fontSize: isLarge ? '2.8rem' : '1.8rem', 
        fontWeight: '500',
        letterSpacing: '1px'
      }}>
        Laxmi Chandra
      </span>
      <span style={{ 
        fontFamily: "'Inter', sans-serif", 
        color: light ? '#ffffff' : '#0d1410', 
        fontSize: isLarge ? '1rem' : '0.75rem', 
        fontWeight: '400',
        letterSpacing: isLarge ? '4px' : '2px',
        textTransform: 'uppercase'
      }}>
        Caterers<sup style={{ fontSize: isLarge ? '0.6rem' : '0.5rem', marginLeft: '2px' }}>®</sup>
      </span>
    </div>
  );
}
