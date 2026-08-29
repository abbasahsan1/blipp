export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

/**
 * Accumulated listening time as a label, e.g. "12.4k min listened". Minutes are
 * the unit people can compare at a glance; seconds only show up before the first
 * full minute has been listened.
 */
export function formatListenTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe === 0) return 'No listens yet';

  const minutes = safe / 60;
  if (minutes < 1) return `${safe}s listened`;
  if (minutes < 10) return `${minutes.toFixed(1)} min listened`;
  if (minutes < 1_000) return `${Math.round(minutes)} min listened`;
  if (minutes < 1_000_000) {
    const thousands = minutes / 1_000;
    return `${thousands.toFixed(thousands < 10 ? 1 : 0)}k min listened`;
  }
  return `${(minutes / 1_000_000).toFixed(1)}M min listened`;
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMinutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  return `${Math.round(diffDays / 30)}mo ago`;
}
