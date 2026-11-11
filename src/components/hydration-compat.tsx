import Script from "next/script";

// A form-filling browser tool in the reception browser marks controls with
// fdprocessedid before React loads. Normalize only that external attribute
// during startup; retain React's hydration checks for all app-owned content.
const bootstrap = `(() => {
  const clean = (node) => {
    if (node.nodeType !== 1) return;
    if (node.hasAttribute('fdprocessedid')) node.removeAttribute('fdprocessedid');
    node.querySelectorAll('[fdprocessedid]').forEach(el => el.removeAttribute('fdprocessedid'));
  };
  clean(document.documentElement);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') clean(record.target);
      else record.addedNodes.forEach(clean);
    }
  });
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['fdprocessedid']});
  const stop = () => observer.disconnect();
  const loaded = () => setTimeout(stop, 2500);
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded, {once: true});
  setTimeout(stop, 15000);
})();`;

export function HydrationCompatibility() {
  return (
    <Script
      id="form-attribute-compatibility"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}
