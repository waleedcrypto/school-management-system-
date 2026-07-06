import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function Logo({ className = "", variant = 'light' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-[#0F172A]' : 'text-white';
  const iconColor = variant === 'light' ? '#1D4ED8' : '#60A5FA'; // CampusDesk Blue

  return (
    <div className={cn("flex items-center select-none", className)}>
      <svg viewBox="0 0 120 120" className="h-10 w-10 mr-2 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 'C' shape */}
        <path d="M 90 25 A 45 45 0 1 0 90 105" stroke={iconColor} strokeWidth="14" strokeLinecap="round" />
        {/* Book */}
        <path d="M 55 12 L 72 4 L 89 12 L 89 32 L 72 24 L 55 32 Z" stroke={iconColor} strokeWidth="5" strokeLinejoin="round"/>
        <path d="M 72 4 L 72 24" stroke={iconColor} strokeWidth="5" strokeLinecap="round" />
        {/* Desk */}
        <path d="M 25 55 L 75 55" stroke={iconColor} strokeWidth="7" strokeLinecap="round" />
        <path d="M 32 55 L 32 90 M 68 55 L 68 90 M 25 75 L 40 75" stroke={iconColor} strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span className={cn("text-3xl font-bold tracking-tight", textColor)}>
        Campus<span className={variant === 'light' ? "text-[#1D4ED8]" : "text-[#60A5FA]"}>Desk</span>
      </span>
    </div>
  );
}
