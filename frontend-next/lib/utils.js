// ── Utility Functions ────────────────────────────────────────────────────────

export const BASE_URL = 'https://syncsphere-api.onrender.com/api';
export const SOCKET_URL = 'https://syncsphere-api.onrender.com';

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function getImageUrl(image) {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `https://syncsphere-api.onrender.com${image}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function getFileCategory(mimeType, name) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';
  if (/pdf|word|powerpoint|excel|spreadsheet|presentation/.test(mimeType)) return 'document';
  if (/zip|rar|7z|tar|gzip/.test(mimeType)) return 'archive';
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'ogg', 'wav', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['txt', 'csv', 'md'].includes(ext)) return 'text';
  return 'other';
}

export const EMOJIS = ['🌅', '🌊', '🏔️', '🌸', '🎨', '🍣', '🏙️', '🌿', '🎭', '🔥', '🌈', '🎵'];
export const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export const FILE_ICONS = {
  image: '🖼️', video: '🎬', audio: '🎵',
  document: '📄', archive: '🗜️', text: '📝', other: '📎'
};

export const FILE_COLORS = {
  image: '#0095f6', video: '#9b59b6', audio: '#e74c3c',
  document: '#e67e22', archive: '#2ecc71', text: '#3498db', other: '#95a5a6'
};
