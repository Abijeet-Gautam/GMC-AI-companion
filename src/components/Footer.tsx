import LeafGlyph from './LeafGlyph';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <LeafGlyph shape="oval" color="#9a7d30" size={16} />
          <span><strong style={{ color: 'var(--text)' }}>L Tree</strong> — every leaf is a wish.</span>
        </span>
        <span>Grown with care · wishes are screened with kindness</span>
      </div>
    </footer>
  );
}
