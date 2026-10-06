import React from 'react';
import { AvatarConfig } from '../types';

interface Props {
  avatar?: AvatarConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBadge?: boolean;
  className?: string;
  animate?: boolean;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-lg',
  '2xl': 'w-32 h-32 text-xl',
};

export const AvatarDisplay: React.FC<Props> = ({
  avatar = {
    skinTone: '#FCD34D',
    hairStyle: 'cresta',
    hairColor: '#3B82F6',
    expression: 'sonrisa',
    accessory: 'ninguno',
    bgColor: '#4F46E5',
    title: 'Novato',
  },
  size = 'md',
  showBadge = false,
  className = '',
  animate = false,
}) => {
  const {
    skinTone = '#FCD34D',
    hairStyle = 'cresta',
    hairColor = '#3B82F6',
    expression = 'sonrisa',
    accessory = 'ninguno',
    bgColor = '#4F46E5',
    title = '',
  } = avatar;

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      <div
        className={`${SIZE_MAP[size]} rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner transition-transform duration-200 ${
          animate ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{ backgroundColor: bgColor }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background glow circle */}
          <circle cx="50" cy="50" r="48" fill="white" opacity="0.08" />

          {/* Neck & Shoulders */}
          <path d="M32 90 C32 78, 68 78, 68 90 Z" fill={skinTone} opacity="0.9" />
          <path d="M22 100 C22 84, 78 84, 78 100 Z" fill="#374151" />

          {/* Head Base */}
          <circle cx="50" cy="52" r="28" fill={skinTone} />

          {/* Ears */}
          <circle cx="21" cy="52" r="6" fill={skinTone} />
          <circle cx="79" cy="52" r="6" fill={skinTone} />

          {/* Hair Styles */}
          {hairStyle === 'cresta' && (
            <path
              d="M42 22 Q50 6 58 22 Q52 14 42 22 Z"
              fill={hairColor}
              stroke={hairColor}
              strokeWidth="4"
              strokeLinejoin="round"
            />
          )}

          {hairStyle === 'corto' && (
            <path
              d="M22 48 C22 24, 78 24, 78 48 C72 36, 28 36, 22 48 Z"
              fill={hairColor}
            />
          )}

          {hairStyle === 'largo' && (
            <g fill={hairColor}>
              <path d="M22 48 C22 22, 78 22, 78 48 C72 34, 28 34, 22 48 Z" />
              <path d="M20 48 Q16 75 22 82 Q28 65 26 48 Z" />
              <path d="M80 48 Q84 75 78 82 Q72 65 74 48 Z" />
            </g>
          )}

          {hairStyle === 'rizado' && (
            <g fill={hairColor}>
              <circle cx="28" cy="30" r="10" />
              <circle cx="42" cy="24" r="11" />
              <circle cx="58" cy="24" r="11" />
              <circle cx="72" cy="30" r="10" />
              <circle cx="22" cy="42" r="9" />
              <circle cx="78" cy="42" r="9" />
            </g>
          )}

          {hairStyle === 'coleta' && (
            <g fill={hairColor}>
              <path d="M22 48 C22 24, 78 24, 78 48 C72 36, 28 36, 22 48 Z" />
              <path d="M72 32 Q92 28 88 56 Q78 44 72 36 Z" />
              <circle cx="72" cy="35" r="4" fill="#F43F5E" />
            </g>
          )}

          {hairStyle === 'gorra' && (
            <g>
              <path d="M22 45 C22 26, 78 26, 78 45 Z" fill="#DC2626" />
              <ellipse cx="64" cy="44" rx="22" ry="5" fill="#B91C1C" />
            </g>
          )}

          {/* Facial Expressions (Eyes & Mouth) */}
          {expression === 'sonrisa' && (
            <g>
              {/* Eyes */}
              <circle cx="39" cy="50" r="3.5" fill="#1F2937" />
              <circle cx="61" cy="50" r="3.5" fill="#1F2937" />
              {/* Light reflection */}
              <circle cx="38" cy="49" r="1" fill="white" />
              <circle cx="60" cy="49" r="1" fill="white" />
              {/* Mouth */}
              <path
                d="M40 62 Q50 72 60 62"
                fill="none"
                stroke="#1F2937"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          )}

          {expression === 'guiño' && (
            <g>
              {/* Left wink */}
              <path
                d="M34 50 Q40 44 44 50"
                fill="none"
                stroke="#1F2937"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Right eye */}
              <circle cx="61" cy="50" r="3.5" fill="#1F2937" />
              <circle cx="60" cy="49" r="1" fill="white" />
              {/* Smirk */}
              <path
                d="M42 63 Q52 70 62 60"
                fill="none"
                stroke="#1F2937"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          )}

          {expression === 'inteligente' && (
            <g>
              <circle cx="39" cy="50" r="3" fill="#1F2937" />
              <circle cx="61" cy="50" r="3" fill="#1F2937" />
              <path d="M34 43 L44 45" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
              <path d="M56 45 L66 43" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
              {/* Knowing smile */}
              <path
                d="M43 64 Q50 68 57 64"
                fill="none"
                stroke="#1F2937"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {expression === 'emocionado' && (
            <g>
              {/* Star / Big happy eyes */}
              <circle cx="39" cy="48" r="4.5" fill="#1F2937" />
              <circle cx="61" cy="48" r="4.5" fill="#1F2937" />
              <circle cx="38" cy="46" r="1.5" fill="white" />
              <circle cx="60" cy="46" r="1.5" fill="white" />
              {/* Open happy mouth */}
              <path
                d="M38 60 Q50 75 62 60 Z"
                fill="#EF4444"
                stroke="#1F2937"
                strokeWidth="2"
              />
            </g>
          )}

          {expression === 'gafas_sol' && (
            <g>
              {/* Cool Sunglasses */}
              <path
                d="M25 46 Q38 46 47 50 Q43 60 30 60 Q24 55 25 46 Z"
                fill="#111827"
              />
              <path
                d="M53 50 Q62 46 75 46 Q76 55 70 60 Q57 60 53 50 Z"
                fill="#111827"
              />
              <line x1="47" y1="50" x2="53" y2="50" stroke="#111827" strokeWidth="3" />
              <path
                d="M42 66 Q50 71 58 66"
                fill="none"
                stroke="#1F2937"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {expression === 'concentrado' && (
            <g>
              <circle cx="39" cy="51" r="3" fill="#1F2937" />
              <circle cx="61" cy="51" r="3" fill="#1F2937" />
              <path d="M33 46 L44 48" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
              <path d="M56 48 L67 46" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
              <line x1="42" y1="64" x2="58" y2="64" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {/* Accessories */}
          {accessory === 'gafas' && expression !== 'gafas_sol' && (
            <g stroke="#2563EB" strokeWidth="3" fill="none">
              <circle cx="39" cy="50" r="10" />
              <circle cx="61" cy="50" r="10" />
              <line x1="49" y1="50" x2="51" y2="50" />
            </g>
          )}

          {accessory === 'corona' && (
            <path
              d="M32 26 L38 34 L50 20 L62 34 L68 26 L66 38 L34 38 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="2"
            />
          )}

          {(accessory === 'auriculares' || hairStyle === 'auriculares') && (
            <g>
              <path
                d="M20 54 A30 30 0 0 1 80 54"
                fill="none"
                stroke="#10B981"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect x="15" y="44" width="8" height="18" rx="4" fill="#047857" />
              <rect x="77" y="44" width="8" height="18" rx="4" fill="#047857" />
            </g>
          )}

          {accessory === 'medalla' && (
            <g>
              <circle cx="50" cy="88" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
              <path d="M46 80 L50 85 L54 80" stroke="#EF4444" strokeWidth="2" fill="none" />
            </g>
          )}

          {accessory === 'varita' && (
            <g>
              <line x1="70" y1="80" x2="88" y2="60" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
              <polygon points="88,58 90,62 94,60 92,64 96,66 92,68 94,72 90,70 88,74 86,70 82,72 84,68 80,66 84,64 82,60 86,62" fill="#FBBF24" />
            </g>
          )}
        </svg>
      </div>

      {showBadge && title && (
        <span className="mt-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-500/25 rounded-full border border-indigo-500/30 whitespace-nowrap">
          {title}
        </span>
      )}
    </div>
  );
};
