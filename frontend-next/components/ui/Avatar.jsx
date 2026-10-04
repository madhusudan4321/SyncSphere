'use client';

import { getInitials } from '@/lib/utils';

export default function Avatar({ user, size = 34, fontSize = 12, className = '' }) {
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const initials = getInitials(user?.name || user?.username || '?');
  const hasAvatar = user?.avatar;

  return (
    <div
      className={`rounded-full bg-instagram-gradient p-[2px] flex-shrink-0 ${className}`}
      style={sizeStyle}
    >
      <div
        className="w-full h-full rounded-full bg-surface2 flex items-center justify-center font-semibold border-2 border-white overflow-hidden"
        style={{ fontSize }}
      >
        {hasAvatar ? (
          <img
            src={hasAvatar}
            alt={user?.username || ''}
            className="w-full h-full object-cover rounded-full"
            draggable={false}
          />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}
