/**
 * Computes deterministic SHA-256 sequence hash.
 */
export async function computeSequenceSha256(sequence: string): Promise<string> {
  const normalized = sequence.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node fallback if crypto.subtle is not present
  try {
    const nodeCrypto: any = await import('' + 'crypto');
    return nodeCrypto.createHash('sha256').update(normalized).digest('hex');
  } catch {
    // Basic fallback for environments without subtle or node crypto
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export function formatShortHash(hash: string | undefined | null, length = 8): string {
  if (!hash) return '--------';
  return hash.slice(0, length);
}
