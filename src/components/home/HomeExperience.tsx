'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  ArrowRight,
  Sprout,
  Sparkles,
  Compass,
} from 'lucide-react';
import TreeStage from '@/components/TreeStage';
import { themes } from '@/lib/themes';

/**
 * Home experience — the wishing-tree adaptation of GMC's home-experience.tsx.
 * Split hero (copy + live tree), three numbered feature cards, and a canopy
 * theme grid. Entrance choreography via motion; content is ours.
 */
export default function HomeExperience({ leafCount }: { leafCount: number }) {
  const features = [
    {
      number: '01',
      title: 'Write your wish',
      body: 'One honest sentence. What do you hope for — for yourself, for someone, for the world?',
      Icon: Sparkles,
    },
    {
      number: '02',
      title: 'Watch it take root',
      body: 'Your approved wish becomes a glowing leaf on our shared tree, visible to everyone.',
      Icon: Sprout,
    },
    {
      number: '03',
      title: 'Read the reflection',
      body: 'Each leaf carries a short, sourced line from the world’s wisdom literature.',
      Icon: Compass,
    },
  ];

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <div className="home-hero-card">
          <div className="hero-copy">
            <motion.p
              className="hero-kicker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="hero-kicker-badge">
                <Sprout size={13} />
              </span>
              A living tree of hopes.
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
            >
              A tree grows.
              <br />
              So do our <span className="hero-highlight">wishes.</span>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
            >
              Write your aspiration, hang it among the others, and watch it glow
              in real time — a quiet monument to what people hope for.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
            >
              <Link href="/phone" className="btn btn-primary btn-lg">
                Hang your wish
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <span className="hero-note">
                No account. Just your imagination.
              </span>
            </motion.div>

            <motion.div
              className="hero-community"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32 }}
            >
              <div className="hero-avatars" aria-hidden="true">
                {themes.map((theme) => (
                  <span
                    key={theme.id}
                    className="hero-avatar"
                    style={{ background: theme.color }}
                    title={theme.label}
                  >
                    <Sprout size={14} />
                  </span>
                ))}
              </div>
              <p>
                <strong>{leafCount} {leafCount === 1 ? 'wish' : 'wishes'}</strong>{' '}
                taking root.
                <br />
                Every voice makes it grow.
              </p>
            </motion.div>
          </div>

          <motion.div
            className="home-tree"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <TreeStage leafCount={leafCount} />
            <div className="tree-caption">
              <span className="pulse-dot" />
              Live — new wishes appear in real time
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="home-section" aria-label="How it works">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">A moment for tomorrow</p>
            <h2>Your hope has a place here.</h2>
          </div>
          <Link href="/phone" className="home-text-link">
            Make it part of the story <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="home-features">
          {features.map(({ number, title, body, Icon }, i) => (
            <motion.div
              key={number}
              className="home-feature"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
            >
              <div className="home-feature-top">
                <span
                  className={`home-feature-icon${number === '01' ? ' home-feature-icon--primary' : ''}`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="home-feature-num">/{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- Canopy themes ---------- */}
      <section className="home-section home-section--tight" aria-label="Canopy themes">
        <div className="home-themes">
          <div className="home-themes-head">
            <div>
              <p className="eyebrow">Many branches. One shared future.</p>
              <h2>What matters to you?</h2>
            </div>
            <p className="home-themes-sub">
              A thriving tree starts with the things we care about.
            </p>
          </div>

          <div className="home-theme-grid">
            {themes.map((theme) => (
              <Link
                href={`/phone?theme=${theme.id}`}
                key={theme.id}
                className="home-theme-card"
              >
                <div className="home-theme-top">
                  <span
                    className="home-theme-dot"
                    style={{ background: theme.color }}
                  />
                  <ArrowUpRight size={14} aria-hidden="true" />
                </div>
                <span className="home-theme-label">{theme.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}