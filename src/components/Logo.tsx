import React from 'react';

interface LogoProps {
  size?: number;
  variant?: 'default' | 'footer';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, variant = 'default', className = '' }) => {
  if (variant === 'footer') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="12" fill="#5E1721" stroke="#E3CBA8" strokeWidth="2" />
        <g fill="#F6EDE0" transform="translate(32 32)">
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(45)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(90)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(135)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(180)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(225)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(270)" />
          <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(315)" />
        </g>
        <circle cx="32" cy="32" r="8" fill="#5E1721" />
        <circle cx="32" cy="32" r="3.5" fill="#E3CBA8" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="12" fill="#7A1F2B" />
      <g fill="#F6EDE0" transform="translate(32 32)">
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(45)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(90)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(135)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(180)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(225)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(270)" />
        <ellipse cx="0" cy="-15" rx="5.5" ry="10" transform="rotate(315)" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#7A1F2B" />
      <circle cx="32" cy="32" r="3.5" fill="#E3CBA8" />
    </svg>
  );
};
