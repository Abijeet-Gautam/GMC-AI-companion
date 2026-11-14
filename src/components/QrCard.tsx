import QRCode from 'qrcode';
import { headers } from 'next/headers';

/**
 * Server-rendered QR code pointing at the phone submission page.
 * Absolute URL is resolved from the request host so it works in dev, LAN, and prod.
 */
export default async function QrCard({ path = '/phone?tree=global', caption }: { path?: string; caption?: string }) {
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.includes('192.168.') ? 'http' : 'https');
  const target = `${proto}://${host}${path}`;

  const dataUrl = await QRCode.toDataURL(target, {
    width: 296,
    margin: 1,
    color: { dark: '#17100e', light: '#fdfbf6' },
    errorCorrectionLevel: 'M',
  });

  return (
    <figure className="qr-frame" aria-label={`QR code linking to ${target}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} width={148} height={148} alt={`QR code to ${target}`} />
      {caption ? <figcaption className="field-hint" style={{ color: '#5b5049', textAlign: 'center', marginTop: '0.5rem' }}>{caption}</figcaption> : null}
    </figure>
  );
}
