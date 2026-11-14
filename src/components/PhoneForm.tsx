'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Share2,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { z } from 'zod';
import ConfettiBurst from '@/components/ConfettiBurst';
import LeafGlyph from '@/components/LeafGlyph';
import { themes, themeFor } from '@/lib/themes';
import { timeAgo } from '@/lib/time';
import { cn } from '@/components/ui/cn';

const MAX_BODY = 480;
const STEP_LABELS = ['Theme', 'Your words', 'Your consent'] as const;

// Matches GMC's contribution schema, adapted to this app's 480-character limit.
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/;
const aspirationSchema = z
  .string()
  .normalize('NFKC')
  .trim()
  .min(1, 'Write a wish before hanging it.')
  .max(MAX_BODY, 'Keep your wish within 480 characters.')
  .refine((value) => !CONTROL_CHARS.test(value), 'Please remove hidden or control characters.');

type Mode = 'first-timer' | 'returnee';
type SubmitState = 'idle' | 'submitting' | 'done' | 'error';

interface MessageReady {
  status: string;
  message: string | null;
  sources: Array<{ title: string; source: string; url?: string | null }>;
  commentary: boolean;
  position: number;
}

interface MyLeaf {
  id: string;
  body: string;
  created_at: string;
  position: number;
  status: string;
}

export default function PhoneForm() {
  const [mode, setMode] = useState<Mode>('first-timer');
  const [step, setStep] = useState(0);
  const [themeId, setThemeId] = useState('ember');
  const [aspiration, setAspiration] = useState('');
  const [original, setOriginal] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [leafId, setLeafId] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [leafMessage, setLeafMessage] = useState<MessageReady | null>(null);
  const [myLeaves, setMyLeaves] = useState<MyLeaf[]>([]);
  const [myLeavesLoaded, setMyLeavesLoaded] = useState(false);
  const pollCount = useRef(0);

  const theme = themeFor(themeId);
  const remaining = MAX_BODY - aspiration.length;
  const aspirationError = (() => {
    const parsed = aspirationSchema.safeParse(aspiration);
    return parsed.success ? '' : parsed.error.issues[0]?.message ?? '';
  })();

  // Poll the AI reflection endpoint after a successful submission.
  useEffect(() => {
    if (!leafId) return;
    pollCount.current = 0;
    const id = setInterval(async () => {
      pollCount.current += 1;
      try {
        const res = await fetch(`/api/leaves/${leafId}/message`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as MessageReady;
          if (data.status === 'ready' && data.message) {
            setLeafMessage(data);
            clearInterval(id);
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (pollCount.current >= 10) clearInterval(id);
    }, 1600);
    return () => clearInterval(id);
  }, [leafId]);

  // Load the returnee's leaves when that tab opens.
  useEffect(() => {
    if (mode !== 'returnee' || myLeavesLoaded) return;
    let alive = true;
    fetch('/api/phone?me=1&tree=global', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { leaves: [] }))
      .then((data) => {
        if (!alive) return;
        const leaves = Array.isArray(data.leaves) ? (data.leaves as MyLeaf[]) : [];
        setMyLeaves(leaves);
        setMyLeavesLoaded(true);
      })
      .catch(() => alive && setMyLeavesLoaded(true));
    return () => {
      alive = false;
    };
  }, [mode, myLeavesLoaded]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (busy) return;

      const parsed = aspirationSchema.safeParse(aspiration);
      if (!parsed.success) {
        setErrorMsg(parsed.error.issues[0]?.message ?? 'Something looks off — please retry.');
        setStep(1);
        return;
      }
      if (!consent) {
        setErrorMsg('Please agree to share your leaf publicly before hanging it.');
        return;
      }

      setBusy(true);
      setErrorMsg(null);
      setNotice('');
      try {
        const res = await fetch('/api/phone', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tree: 'global', aspiration: parsed.data }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; leafId: string; leafPosition: number | null; published: boolean }
          | { ok: false; error?: string }
          | null;

        if (!res.ok || !data || data.ok !== true) {
          setErrorMsg((data && 'error' in data && data.error) || 'Something went wrong — please try again.');
          setBusy(false);
          return;
        }
        setLeafId(data.leafId);
        setRank(data.leafPosition ?? null);
        setOriginal(parsed.data);
        setAspiration('');
        setSubmitState('done');
      } catch {
        setErrorMsg('The tree is unreachable right now — check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [aspiration, busy, consent, submitState],
  );

  const shareTree = useCallback(async () => {
    const url = `${window.location.origin}/tree`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Wishing Tree',
          text: original ? `“${original}” — my wish, hanging on the global tree.` : 'Come see the wishing tree.',
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('The tree link is copied — share it anywhere.');
    } catch {
      setNotice(url);
    }
  }, [original]);

  const reset = useCallback(() => {
    setAspiration('');
    setOriginal('');
    setConsent(false);
    setLeafId(null);
    setRank(null);
    setLeafMessage(null);
    setSubmitState('idle');
    setErrorMsg(null);
    setNotice('');
    setStep(0);
  }, []);

  /* ---------- Success state ---------- */
  if (submitState === 'done') {
    return (
      <MotionConfig reducedMotion="user">
        <div className="congrats" role="status">
          <ConfettiBurst fire durationMs={2000} />
          <motion.div
            className="congrats-orb"
            aria-hidden="true"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.02L12 2z" fill="#241a08" />
            </svg>
          </motion.div>
          <h2 className="font-display" style={{ fontSize: '1.7rem', color: 'var(--gold-light)' }}>
            Your wish is hanging on the tree
          </h2>
          {rank ? (
            <p className="text-muted">You are leaf <strong style={{ color: 'var(--gold-light)' }}>#{rank}</strong> on the global canopy.</p>
          ) : (
            <p className="text-muted">Your leaf is held for a gentle review before it joins the canopy.</p>
          )}

          {/* Your public leaf, as strangers will see it */}
          <section className="phone-leaf-card" aria-label="Your public leaf">
            <LeafGlyph shape="oval" color="#241a08" size={26} />
            <div>
              <span className="phone-leaf-tag">On the shared tree · {theme.label}</span>
              <blockquote>“{original}”</blockquote>
            </div>
          </section>

          {/* AI reflection, when it arrives */}
          {leafMessage?.message ? (
            <blockquote
              style={{
                margin: '0.75rem 0',
                padding: '0.9rem 1.25rem',
                borderLeft: '3px solid var(--gold)',
                background: 'rgba(217, 180, 90, 0.07)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                maxWidth: '52ch',
                fontStyle: 'italic',
                color: 'var(--text)',
              }}
            >
              “{leafMessage.message}”
              {leafMessage.sources?.length > 0 && (
                <cite style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'normal' }}>
                  — {leafMessage.sources.map((s) => `${s.title}, ${s.source}`).join(' · ')}
                  {leafMessage.commentary ? ' (commentary)' : ''}
                </cite>
              )}
            </blockquote>
          ) : (
            <p className="field-hint" style={{ margin: '0.5rem 0' }}>
              <span className="spinner spinner-light" style={{ verticalAlign: '-2px', marginRight: 6 }} />
              The tree is composing its reflection…
            </p>
          )}

          <div className="hero-ctas" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
            <Link href="/tree" className="btn btn-primary">See it glow on the tree</Link>
            <button type="button" className="btn btn-secondary" onClick={shareTree}>
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
            <button type="button" className="btn btn-secondary" onClick={reset}>Hang another</button>
          </div>
          {leafId && (
            <Link href={`/leaf/${leafId}`} className="phone-keepsake-link">
              Keep this leaf — open your keepsake
            </Link>
          )}
          {notice && <p role="status" className="phone-notice">{notice}</p>}
        </div>
      </MotionConfig>
    );
  }
  /* ---------- Stepper + form ---------- */
  return (
    <MotionConfig reducedMotion="user">
      <div className="phone-wrap">
        {/* Mode switch */}
        <div className="segmented" role="group" aria-label="Who are you?" style={{ marginBottom: '1.5rem' }}>
          <button type="button" className="segment" aria-pressed={mode === 'first-timer'} onClick={() => setMode('first-timer')}>
            First visit
          </button>
          <button type="button" className="segment" aria-pressed={mode === 'returnee'} onClick={() => setMode('returnee')}>
            Returning
          </button>
        </div>

        {mode === 'first-timer' ? (
          <div className="phone-shell">
            <ol className="phone-steps" aria-label="Your progress">
              {STEP_LABELS.map((label, i) => (
                <li key={label} className={cn('phone-step', i === step && 'current', i < step && 'done')}>
                  <span className="phone-step-dot" aria-hidden="true">
                    {i < step ? <Check size={12} /> : i + 1}
                  </span>
                  <span className="phone-step-label">{label}</span>
                </li>
              ))}
            </ol>

            {errorMsg && (
              <p role="alert" className="phone-error">
                {errorMsg}
              </p>
            )}

            {step === 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <p className="phone-eyebrow">Step 1 of 3</p>
                <h2 className="phone-title">What kind of wish do you carry?</h2>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                  Choose a branch — your words come next.
                </p>
                <fieldset className="theme-grid">
                  <legend className="sr-only">Choose a canopy theme</legend>
                  {themes.map((t) => (
                    <label key={t.id} className={cn('theme-card', themeId === t.id && 'selected')}>
                      <input
                        type="radio"
                        name="theme"
                        checked={themeId === t.id}
                        onChange={() => setThemeId(t.id)}
                      />
                      <span className="theme-tile" style={{ backgroundColor: t.color }}>
                        <LeafGlyph shape="oval" color="#241a08" size={18} />
                      </span>
                      <span className="theme-meta">
                        <span className="theme-label">{t.label}</span>
                        <span className="theme-short">{t.short} canopy</span>
                      </span>
                      {themeId === t.id && <Check size={14} className="theme-check" aria-hidden="true" />}
                    </label>
                  ))}
                </fieldset>
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => setStep(1)}>
                  Continue <ArrowRight size={16} aria-hidden="true" />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aspirationError) setStep(2);
                  else setErrorMsg(aspirationError);
                }}
                noValidate
              >
                <div className="phone-theme-chip">
                  <span className="dot" style={{ background: theme.color }} aria-hidden="true" />
                  <span className="name">{theme.label}</span>
                  <button type="button" onClick={() => setStep(0)}>Change theme</button>
                </div>
                <p className="phone-eyebrow">Step 2 of 3</p>
                <h2 className="phone-title">Share a little hope.</h2>
                <label htmlFor="aspiration" className="field-label">Your wish for the tree</label>
                <textarea
                  id="aspiration"
                  className="textarea"
                  value={aspiration}
                  rows={4}
                  maxLength={MAX_BODY}
                  disabled={busy}
                  onChange={(e) => { setAspiration(e.target.value); setErrorMsg(null); }}
                  placeholder="A hope, a thought, or something you'd love to see…"
                  aria-describedby="aspiration-help"
                />
                <div className="phone-help-row" id="aspiration-help">
                  <span>Leave out names, contact details and links.</span>
                  <span className={cn('phone-counter', remaining <= 40 && 'warn')}>{aspiration.length} / {MAX_BODY}</span>
                </div>
                <button
                  type="button"
                  className="phone-example"
                  disabled={busy}
                  onClick={() => { setAspiration(theme.prompt); setErrorMsg(null); }}
                >
                  <Sparkles size={13} aria-hidden="true" /> Try an example
                </button>
                <div className="phone-nav-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
                  <button type="submit" className="btn btn-primary" disabled={busy || !aspiration.trim()}>
                    Continue <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="phone-theme-chip">
                  <span className="dot" style={{ background: theme.color }} aria-hidden="true" />
                  <span className="name">{theme.label}</span>
                  <button type="button" onClick={() => setStep(0)}>Change theme</button>
                </div>
                <p className="phone-eyebrow">Step 3 of 3</p>
                <h2 className="phone-title">Before it joins the canopy…</h2>
                <blockquote className="phone-recap">“{aspiration.trim()}”</blockquote>
                <label className="phone-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to share my anonymous leaf publicly and let it pass a gentle review before it
                    joins the canopy.
                  </span>
                </label>
                <details className="phone-privacy">
                  <summary>Privacy &amp; how this works</summary>
                  <p>
                    No account is needed. Only your approved wish is public; this page shows any AI
                    reflection privately to you, never on the tree. Anonymous wishes are rate-limited and
                    lightly screened for kindness. When signed in, wishes are also saved to your history —
                    switch to the Returning tab to see them.
                  </p>
                </details>
                {errorMsg && (
                  <p role="alert" className="phone-error">{errorMsg}</p>
                )}
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !consent || !!aspirationError}>
                  {busy ? (
                  <><span className="spinner" aria-hidden="true" /> Hanging your leaf…</>
                  ) : (
                    <>Hang my wish <Sprout size={16} aria-hidden="true" /></>
                  )}
                </button>
                {busy && (
                  <p role="status" className="phone-notice">
                    Reflecting on your note and making room on the tree.
                  </p>
                )}
              </motion.form>
            )}
          </div>
        ) : (
          /* ---------- Returnee tab ---------- */
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>Your leaves</h2>
            {!myLeavesLoaded ? (
              <p className="text-muted">
                <span className="spinner spinner-light" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Looking for your leaves…
              </p>
            ) : myLeaves.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                {myLeaves.map((leaf) => (
                  <li key={leaf.id} className="leaf-card" style={{ animation: 'none' }}>
                    <span className="leaf-rank">#{leaf.position}</span>
                    <div className="phone-my-leaf-body">
                      <span className="leaf-body">{leaf.body}</span>
                      <span className="phone-my-leaf-meta">
                        <span className={cn('phone-status', leaf.status === 'published' ? 'is-on' : 'is-hold')}>
                          {leaf.status === 'published' ? 'On the canopy' : 'In review'}
                        </span>
                        <span>{timeAgo(leaf.created_at)}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="text-muted" style={{ marginBottom: '0.9rem' }}>
                  No leaves are tied to this visit yet. Wish history follows you once you sign in —
                  and anonymous wishes are always welcome from the first tab.
                </p>
                <button type="button" className="btn btn-secondary btn-block" onClick={() => setMode('first-timer')}>
                  Write my first wish instead
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
