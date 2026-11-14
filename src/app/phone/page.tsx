/** 
 * Phone Submission PWA
 * Two tabs: first-timer (write aspiration) and returnee (sign in to view/update/delete)
 * After submitting: congratulations animation, leaf position with glowing effect,
 * a sourced message, and ranking. Save/share an image of the tree with your glowing leaf.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserId, ensureUser } from '@/lib/auth';
import { submitAspiration as submitApi } from '@/lib/submit';
import { generateMessageForLeaf } from '@/lib/ai/pipeline';
import { publishRealtime } from '@/lib/realtime';
import { motion } from 'motion/react';

export const metadata = {
  title: 'Submit Your Wish — L Tree',
  description: 'Share your aspiration on the Living Tree',
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PhonePage() {
  const [mode, setMode] = useState<'first-timer' | 'returnee'>('first-timer');
  const [name, setName] = useState('');
  const [aspiration, setAspiration] = useState('');
  const [showCongrats, setShowCongrats] = useState(false);
  const [leafId, setLeafId] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const router = useRouter();
  const userId = getUserId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aspiration.trim()) return;

    try {
      const outcome = await submitApi({
        treeSlug: 'global',
        body: aspiration,
        userId: userId ?? '',
        ip: '',
        userAgent: navigator.userAgent,
        deviceCookie: '',
        inviteToken: null,
      });

      if (outcome.ok && outcome.published) {
        setLeafId(outcome.leafId);
        setRank(outcome.leafPosition);
        await generateMessageForLeaf(outcome.leafId);
        setShowCongrats(true);
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleRetrain = () => {
    setMode('returnee');
  };

  // Congratulations animation variants
  const congratVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (custom?: { delay?: number }) => ({
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 20,
        delay: custom?.delay,
      },
    }),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from #2c1810 via #4a2c20 to #6b3f30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-gold mb-2">
            Submit Your Wish
          </h1>
          <p className="text-text secondary mb-6">
            Make your aspiration part of the living tree
          </p>
        </header>

        {/* Mode Switcher with enhanced styling */}
        <div className="mb-8 rounded-2xl p-6 border border-text/10 max-w-md mx-auto">
          <button
            onClick={() => setMode('first-timer')}
            className={`w-full px-6 py-3 text-lg ${cn(
              mode === 'first-timer' && 'bg-gold text-dark font-semibold',
              mode !== 'first-timer' && 'hover:bg-gold/80 text-dark'
            )}`}
            aria-pressed={mode === 'first-timer'}
          >
            First Timer
          </button>
          <button
            onClick={() => setMode('returnee')}
            className={`w-full px-6 py-3 text-lg ${cn(
              mode === 'returnee' && 'bg-gold text-dark font-semibold',
              mode !== 'returnee' && 'hover:bg-gold/80 text-dark'
            )}`}
            aria-pressed={mode === 'returnee'}
          >
            Returning Visitor
          </button>
        </div>

        {/* First Timer Form with motion enhancements */}
        {mode === 'first-timer' && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
            <div>
              <label className="block text-text mb-2">
                Your Name (optional)
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded border text-text focus-ring focus-ring/20"
                />
              </label>
            </div>

            <div>
              <label className="block text-text mb-2">
                Your Aspiration
                <textarea
                  value={aspiration}
                  onChange={(e) => setAspiration(e.target.value)}
                  rows={4}
                  placeholder="Share your wish for the world..."
                  className="w-full px-4 py-3 rounded border text-text resize-none focus-ring focus-ring/20 max-w-md"
                  maxLength={2000}
                />
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-gold text-dark font-semibold py-3 rounded hover:bg-gold/90 focus-ring focus-ring/20 transition-all"
            >
              Submit Your Wish
            </button>
          </form>
        )}

        {/* Returnee Section */}
        {mode === 'returnee' && userId ? (
          <div className="p-6 rounded-2xl border border-text/10 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gold mb-4">
              Your Wish History
            </h3>
            <p className="text-text/60 mb-4">
              Viewing your submitted leaves...
            </p>
            <p className="text-text/50">
              Sign in with Clerk to view your aspiration history
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-text/10 max-w-md mx-auto">
            <p className="text-text/60">
              Sign in with Google or email to view your previous wishes
            </p>
          </div>
        )}

        {/* Congratulations Animation with Motion */}
        {showCongrats && leafId && (
          <div className="mt-10 text-center">
            <motion.div
              className="w-20 h-20 mx-auto rounded-full bg-gold flex items-center justify-center mb-6"
              variants={congratVariants}
              initial="hidden"
              animate="visible"
            >
              <svg
                width={40}
                height={40}
                viewBox="0 0 24 24"
                className="text-dark"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.02L12 2z" />
              </svg>
            </motion.div>
            <h3 className="text-2xl font-bold text-gold mb-2">
              Your wish has been added!
            </h3>
            <p className="text-text mb-4">
              Your leaf is now glowing on the tree!
            </p>
            <p className="text-text/60 text-sm">
              Rank: #{rank || '?'} — Keep growing the tree!
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/tree?tree=global')}
                className="bg-gold text-dark px-6 py-3 rounded hover:bg-gold/90 focus-ring focus-ring/20 transition-all"
              >
                View the Tree
              </button>
              <button
                onClick={() => router.push('/phone?tree=global')}
                className="mt-4 bg-dark text-gold px-6 py-3 rounded hover:bg-gold/80 focus-ring focus-ring/20 transition-all"
              >
                Submit Another Wish
              </button>
            </div>
          </div>
        )}

        {/* Fallback for returnee without sign-in */}
        {mode === 'returnee' && !userId && (
          <p className="mt-8 text-center text-text/60">
            Please sign in to view your wish history
          </p>
        )}
      </div>
    </main>
  );
}