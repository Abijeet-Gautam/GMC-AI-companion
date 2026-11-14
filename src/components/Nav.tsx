import Link from 'next/link';
import LeafGlyph from './LeafGlyph';

export default function Nav({ current }: { current?: 'home' | 'tree' | 'phone' }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="nav-brand" aria-label="L Tree home">
          <LeafGlyph shape="oval" color="#d9b45a" size={26} />
          <span className="font-display" style={{ fontSize: '1.15rem' }}>L&nbsp;Tree</span>
          <span className="chip" style={{ marginLeft: '0.25rem' }}>Living wishing tree</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/tree" className="nav-link" aria-current={current === 'tree' ? 'page' : undefined}>
            The Tree
          </Link>
          <Link href="/phone" className="nav-link" aria-current={current === 'phone' ? 'page' : undefined}>
            Make a Wish
          </Link>
        </nav>
      </div>
    </header>
  );
}
