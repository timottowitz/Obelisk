import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ContactAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarStyle(name: string): React.CSSProperties {
  const h = hashString(name) % 360;
  const s = 65;
  const l = 45;
  const backgroundColor = `hsl(${h} ${s}% ${l}%)`;
  const color = '#ffffff';
  return { backgroundColor, color };
}

function initialsFromName(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last =
    parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
  return (first + last).toUpperCase();
}

const sizeClasses = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-2xl'
};

export default function ContactAvatar({
  name,
  size = 'sm',
  className = ''
}: ContactAvatarProps) {
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback
        className={size === 'lg' ? 'text-2xl' : ''}
        style={getAvatarStyle(name)}
      >
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export { initialsFromName, getAvatarStyle };