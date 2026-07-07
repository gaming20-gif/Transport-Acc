import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import './PaletteShowcase.css';

interface Particle {
  id: number;
  left: string;
  speed: string;
  delay: string;
  size: string;
  drift: string;
  maxOpacity: number;
}

export const PaletteShowcase: React.FC = () => {
  const title = "LUXURY & ELEGANCE";

  // Generate 25 stable random particles to prevent re-generation on render
  const particles = useMemo<Particle[]>(() => {
    const list: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      const sizeVal = (Math.random() * 3 + 1.5).toFixed(1); // 1.5px to 4.5px
      list.push({
        id: i,
        left: `${(Math.random() * 100).toFixed(1)}%`,
        speed: `${(Math.random() * 3 + 4.5).toFixed(1)}s`, // 4.5s to 7.5s
        delay: `${(Math.random() * -8).toFixed(1)}s`, // Negative delay so particles are already in motion
        size: `${sizeVal}px`,
        drift: `${(Math.random() * 60 - 30).toFixed(0)}px`, // -30px to +30px horizontal drift
        maxOpacity: parseFloat((Math.random() * 0.4 + 0.4).toFixed(2)), // 0.4 to 0.8
      });
    }
    return list;
  }, []);

  const swatches = [
    { name: "Pure Black", hex: "#000000", color: "#000000", textDark: false },
    { name: "Rich Black", hex: "#1A1A1A", color: "#1A1A1A", textDark: false },
    { name: "Gold", hex: "#D4AF37", color: "#D4AF37", textDark: true },
    { name: "Champagne Gold", hex: "#F0E6D2", color: "#F0E6D2", textDark: true },
    { name: "White", hex: "#FFFFFF", color: "#FFFFFF", textDark: true }
  ];

  return (
    <div className="showcase-viewport">
      <div className="luxury-card">
        {/* White Marble Veining Background Layer */}
        <svg className="marble-texture-bg" viewBox="0 0 500 700" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle marble veins (varying grey strokes with organic bezier curves) */}
          <path d="M -20 120 C 130 180, 160 80, 280 220 C 350 300, 310 420, 440 500 C 480 530, 490 620, 520 720" 
                fill="none" stroke="#D3D3D3" strokeWidth="1.8" opacity="0.16" filter="blur(0.5px)" />
          
          <path d="M 180 -10 C 220 110, 170 200, 250 270 C 310 320, 420 220, 470 410 C 510 550, 420 630, 490 710" 
                fill="none" stroke="#C0C0C0" strokeWidth="1.2" opacity="0.13" filter="blur(0.3px)" />

          <path d="M 450 -20 C 380 90, 400 180, 310 260 C 240 320, 180 200, 110 380 C 60 480, 120 590, -20 680" 
                fill="none" stroke="#CCCCCC" strokeWidth="1.5" opacity="0.14" filter="blur(0.4px)" />
          
          <path d="M 120 142 C 90 120, 40 180, -10 160" 
                fill="none" stroke="#DCDCDC" strokeWidth="1.0" opacity="0.12" />
          
          <path d="M 280 220 C 290 280, 360 300, 380 370" 
                fill="none" stroke="#C8C8C8" strokeWidth="1.0" opacity="0.1" />

          <path d="M 310 260 C 330 240, 380 270, 410 250" 
                fill="none" stroke="#E0E0E0" strokeWidth="0.8" opacity="0.12" />
        </svg>

        {/* Shifting radial light shimmer overlay */}
        <div className="marble-shimmer-overlay"></div>

        {/* Floating gold particles layer */}
        <div className="particles-container">
          {particles.map((p) => (
            <div
              key={p.id}
              className="gold-particle"
              style={{
                '--speed': p.speed,
                '--delay': p.delay,
                '--left': p.left,
                '--size': p.size,
                '--drift': p.drift,
                '--max-opacity': p.maxOpacity,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Card Header Section */}
        <div className="card-top">
          <div className="luxury-title-container">
            <h1 className="luxury-title" aria-label={title}>
              {title.split('').map((char, index) => (
                <span
                  key={index}
                  className="char"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
            
            {/* Overlay gold shimmer sweep that runs once */}
            <div className="title-shimmer-overlay" aria-hidden="true">
              {title}
            </div>
            
            <p className="luxury-subtitle">Premium Color Palette</p>
          </div>
        </div>

        {/* 5 Color Swatches Deck */}
        <div className="swatches-deck">
          {/* Diagonal gold sheen beam sweeping across swatches */}
          <div className="swatches-sweep-container">
            <div className="swatches-sweep-beam"></div>
          </div>

          {swatches.map((swatch, idx) => (
            <div className="swatch-wrapper" key={idx}>
              <div className="swatch-name">{swatch.name.split(' ')[0]}</div>
              <div 
                className="swatch-card" 
                style={{ 
                  backgroundColor: swatch.color,
                  // Ensure White and Champagne Gold stand out, Pure Black gets premium outline
                  border: swatch.hex === '#FFFFFF' ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid rgba(212, 175, 55, 0.15)',
                  boxShadow: swatch.hex === '#FFFFFF' 
                    ? '0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 3px rgba(0, 0, 0, 0.02)'
                    : '0 12px 28px rgba(0, 0, 0, 0.15)'
                }}
              />
              <div 
                className="swatch-label" 
                style={{ color: swatch.textDark ? '#3A3225' : '#4E5561' }}
              >
                {swatch.hex}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="card-bottom">
          {/* Two gold ornamental medallions on the left */}
          <div className="bottom-left-crests">
            {/* Medallion Left - Rotate Clockwise */}
            <div className="medallion-wrapper medallion-left">
              <svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Premium metallic linear gold gradient */}
                  <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#AA771C" />
                    <stop offset="20%" stopColor="#FDF6C7" />
                    <stop offset="40%" stopColor="#D4AF37" />
                    <stop offset="60%" stopColor="#FDF6C7" />
                    <stop offset="80%" stopColor="#B38728" />
                    <stop offset="100%" stopColor="#553C00" />
                  </linearGradient>
                  {/* Spherical 3D shading radial gold gradient */}
                  <radialGradient id="goldRadialShade" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                    <stop offset="30%" stopColor="#FFF2B2" />
                    <stop offset="65%" stopColor="#D4AF37" />
                    <stop offset="90%" stopColor="#AA7C11" />
                    <stop offset="100%" stopColor="#3A2500" />
                  </radialGradient>
                </defs>
                {/* 3D outer rim */}
                <circle cx="50" cy="50" r="46" fill="url(#goldLinear)" stroke="#3A2500" strokeWidth="0.8" />
                {/* Inner shaded spherical base */}
                <circle cx="50" cy="50" r="41" fill="url(#goldRadialShade)" />
                {/* Beaded ring detailing */}
                <circle cx="50" cy="50" r="36" fill="none" stroke="url(#goldLinear)" strokeWidth="1.2" strokeDasharray="3, 3" />
                {/* Ornamental geometric star crest pattern */}
                <polygon points="50,22 58,40 76,34 64,48 76,62 58,58 50,76 42,58 24,62 36,48 24,34 42,40" 
                         fill="url(#goldLinear)" stroke="#553C00" strokeWidth="0.5" />
                {/* Inner core circle */}
                <circle cx="50" cy="50" r="10" fill="url(#goldRadialShade)" stroke="#AA771C" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="5" fill="#FFF2B2" />
              </svg>
            </div>

            {/* Pulsing Arrow */}
            <div className="crest-arrow">
              <ChevronRight size={18} strokeWidth={2.8} />
            </div>

            {/* Medallion Right - Rotate Counter-Clockwise */}
            <div className="medallion-wrapper medallion-right">
              <svg width="52" height="52" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* 3D outer rim */}
                <circle cx="50" cy="50" r="46" fill="url(#goldLinear)" stroke="#3A2500" strokeWidth="0.8" />
                {/* Inner shaded base */}
                <circle cx="50" cy="50" r="41" fill="url(#goldRadialShade)" />
                {/* Ornamental crown/crest inside */}
                <path d="M 32,58 L 36,40 L 44,48 L 50,32 L 56,48 L 64,40 L 68,58 Z" 
                      fill="url(#goldLinear)" stroke="#553C00" strokeWidth="0.6" />
                {/* Shield pattern details */}
                <circle cx="50" cy="50" r="28" fill="none" stroke="url(#goldLinear)" strokeWidth="1.5" />
                <path d="M 38,62 L 62,62 A 12,12 0 0,1 50,74 A 12,12 0 0,1 38,62 Z" 
                      fill="url(#goldLinear)" stroke="#3A2500" strokeWidth="0.5" />
                {/* Micro center dot */}
                <circle cx="50" cy="46" r="3" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

          {/* Right: Flowing white/silver satin ribbon */}
          <div className="bottom-right-ribbon">
            <svg className="ribbon-svg" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Silver/platinum gradient for luxury satin feel */}
                <linearGradient id="silverSatin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="25%" stopColor="#E6E6E6" />
                  <stop offset="45%" stopColor="#B3B3B3" />
                  <stop offset="65%" stopColor="#F5F5F5" />
                  <stop offset="85%" stopColor="#CCCCCC" />
                  <stop offset="100%" stopColor="#999999" />
                </linearGradient>
                {/* Shadow gradient for ribbon depth */}
                <linearGradient id="satinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#555555" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#222222" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Back shadows to add 3D depth */}
              <path className="ribbon-strand strand-3" d="M 10,48 C 30,35 60,60 90,48 C 120,36 140,55 155,50" 
                    fill="none" stroke="url(#satinShadow)" strokeWidth="11" opacity="0.8" filter="blur(2px)" />

              {/* Base Satin Strand 1 */}
              <path className="ribbon-strand strand-1" d="M 5,50 C 25,35 55,60 85,45 C 115,30 135,55 150,45" 
                    fill="none" stroke="url(#silverSatin)" strokeWidth="8" strokeLinecap="round" />

              {/* Overlapping Shading Strand 2 (Drape highlight) */}
              <path className="ribbon-strand strand-2" d="M 12,46 C 32,32 58,54 88,43 C 118,32 134,50 148,43" 
                    fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.7" strokeLinecap="round" filter="blur(0.5px)" />

              {/* Lower Drape Shadow Path */}
              <path className="ribbon-strand strand-3" d="M 5,50 C 25,35 55,60 85,45 C 115,30 135,55 150,45" 
                    fill="none" stroke="#000000" strokeWidth="0.8" opacity="0.15" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
