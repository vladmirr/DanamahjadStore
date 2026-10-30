// Currency and formatting utilities for Kurdish Sorani and Iraqi Dinar (IQD)

/**
 * Format number into Iraqi Dinar string (e.g. 25,000 د.ع)
 */
export function formatIQD(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-US').format(Math.round(val)) + ' د.ع';
}

/**
 * Format raw number with comma separators (e.g. 1,500)
 */
export function formatNumber(num: number | null | undefined): string {
  const val = Number(num) || 0;
  return new Intl.NumberFormat('en-US').format(val);
}

/**
 * Format date into Kurdish friendly readable string
 */
export function formatDateKurdish(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Format short date (YYYY/MM/DD)
 */
export function formatShortDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
}

/**
 * Generate clean readable IDs
 */
export function generateInvoiceNumber(existingCount: number): string {
  const num = (existingCount + 1).toString().padStart(4, '0');
  const year = new Date().getFullYear();
  return `INV-${year}-${num}`;
}

export function generateVoucherNumber(existingCount: number): string {
  const num = (existingCount + 1).toString().padStart(4, '0');
  const year = new Date().getFullYear();
  return `REC-${year}-${num}`;
}

/**
 * Audio feedback synthesizer using native Web Audio API
 */
export function playSound(type: 'success' | 'click' | 'error' | 'delete') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Pleasant dual tone chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'delete') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}
