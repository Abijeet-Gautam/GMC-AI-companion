/**
 * Curated quote library — the FALLBACK source channel.
 *
 * Every entry is a real, public work by a real author. URLs are deliberately
 * omitted (attribution only) so we never ship a link we can't stand behind;
 * the UI renders these as plain citations. The AI channel is always preferred;
 * this library is used only when generation fails or sources can't be verified
 * (see README § AI behavior).
 */

export type Theme =
  | 'courage' | 'growth' | 'creativity' | 'resilience' | 'kindness' | 'purpose'
  | 'learning' | 'hope' | 'health' | 'relationships' | 'gratitude' | 'craft' | 'wonder';

export interface CuratedQuote {
  id: string;
  text: string;
  author: string;
  work: string;
  themes: Theme[];
}

export const CURATED_QUOTES: CuratedQuote[] = [
  { id: 'lao-tzu-step', text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu', work: 'Tao Te Ching', themes: ['hope', 'growth', 'courage'] },
  { id: 'lao-tzu-tree', text: 'A tree that is unbending is easily broken. The hard and strong will fall. The soft and supple will prevail.', author: 'Lao Tzu', work: 'Tao Te Ching', themes: ['resilience', 'growth', 'craft'] },
  { id: 'lao-tzu-nature', text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu', work: 'Tao Te Ching', themes: ['health', 'hope', 'craft'] },
  { id: 'aurelius-way', text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius', work: 'Meditations', themes: ['resilience', 'courage', 'purpose'] },
  { id: 'aurelius-remember', text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius', work: 'Meditations', themes: ['resilience', 'health', 'growth'] },
  { id: 'seneca-imagination', text: 'We suffer more often in imagination than in reality.', author: 'Seneca', work: 'Letters from a Stoic', themes: ['courage', 'hope', 'health'] },
  { id: 'seneca-labor', text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca', work: 'Letters from a Stoic', themes: ['resilience', 'craft', 'growth'] },
  { id: 'confucius-slow', text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius', work: 'Analects (attributed)', themes: ['growth', 'learning', 'resilience'] },
  { id: 'confucius-friction', text: 'The gem cannot be polished without friction, nor man perfected without trials.', author: 'Confucius', work: 'attributed', themes: ['craft', 'learning', 'resilience'] },
  { id: 'rumi-seeking', text: 'What you seek is seeking you.', author: 'Rumi', work: 'Mathnawi (trans. Coleman Barks)', themes: ['hope', 'purpose', 'wonder'] },
  { id: 'hafiz-light', text: 'I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.', author: 'Hafiz', work: 'trans. Daniel Ladinsky', themes: ['hope', 'kindness', 'purpose'] },
  { id: 'angelou-rise', text: 'And still, like air, I’ll rise.', author: 'Maya Angelou', work: 'Still I Rise', themes: ['resilience', 'courage', 'hope'] },
  { id: 'angelou-work', text: 'Nothing will work unless you do.', author: 'Maya Angelou', work: 'attributed', themes: ['craft', 'growth'] },
  { id: 'frankl-change', text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', author: 'Viktor Frankl', work: "Man's Search for Meaning", themes: ['resilience', 'purpose', 'growth'] },
  { id: 'mandela-impossible', text: 'It always seems impossible until it’s done.', author: 'Nelson Mandela', work: 'attributed', themes: ['courage', 'purpose', 'hope'] },
  { id: 'roosevelt-do', text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt', work: 'attributed', themes: ['purpose', 'craft', 'growth'] },
  { id: 'churchill-continue', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill', work: 'attributed', themes: ['courage', 'resilience'] },
  { id: 'emerson-within', text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson', work: 'The American Scholar (attributed)', themes: ['purpose', 'wonder', 'growth'] },
  { id: 'whitman-multitudes', text: 'I am large, I contain multitudes.', author: 'Walt Whitman', work: 'Song of Myself', themes: ['wonder', 'relationships', 'purpose'] },
  { id: 'oliver-wild', text: 'Tell me, what is it you plan to do with your one wild and precious life?', author: 'Mary Oliver', work: 'The Summer Day', themes: ['purpose', 'wonder', 'gratitude'] },
  { id: 'exupery-heart', text: 'It is only with the heart that one can see rightly; what is essential is invisible to the eye.', author: 'Antoine de Saint-Exupéry', work: 'The Little Prince', themes: ['relationships', 'kindness', 'wonder'] },
  { id: 'sagan-known', text: 'Somewhere, something incredible is waiting to be known.', author: 'Carl Sagan', work: 'attributed', themes: ['wonder', 'learning'] },
  { id: 'nhat-hanh-smile', text: 'Smile, breathe, and go slowly.', author: 'Thich Nhat Hanh', work: 'attributed', themes: ['health', 'gratitude', 'kindness'] },
  { id: 'heraclitus-river', text: 'No one can step into the same river twice, for it is not the same river and they are not the same person.', author: 'Heraclitus', work: 'Fragments', themes: ['growth', 'wonder', 'purpose'] },
  { id: 'rilke-dragons', text: 'Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage.', author: 'Rainer Maria Rilke', work: 'Letters to a Young Poet', themes: ['courage', 'wonder'] },
  { id: 'baldwin-faced', text: 'Not everything that is faced can be changed, but nothing can be changed until it is faced.', author: 'James Baldwin', work: 'attributed', themes: ['courage', 'growth'] },
  { id: 'lorde-tools', text: 'The master’s tools will never dismantle the master’s house.', author: 'Audre Lorde', work: 'The Master’s Tools Will Never Dismantle the Master’s House', themes: ['purpose', 'kindness', 'courage'] },
  { id: 'morrison-write', text: 'If there’s a book that you want to read, but it hasn’t been written yet, then you must write it.', author: 'Toni Morrison', work: 'attributed', themes: ['creativity', 'purpose'] },
  { id: 'epictetus-react', text: 'It’s not what happens to you, but how you react to it that matters.', author: 'Epictetus', work: 'Enchiridion', themes: ['resilience', 'growth'] },
  { id: 'musashi-use', text: 'Do nothing which is of no use.', author: 'Miyamoto Musashi', work: 'The Book of Five Rings', themes: ['craft', 'purpose'] },
  { id: 'bruce-lee-water', text: 'Be like water making its way through cracks. Do not be assertive, but adjust to the object, and you shall find a way around or through it.', author: 'Bruce Lee', work: 'attributed', themes: ['resilience', 'craft', 'growth'] },
  { id: 'coelho-alchemist', text: 'When you want something, all the universe conspires in helping you to achieve it.', author: 'Paulo Coelho', work: 'The Alchemist', themes: ['hope', 'wonder', 'purpose'] },
  { id: 'mead-small', text: 'Never doubt that a small group of thoughtful, committed citizens can change the world; indeed, it’s the only thing that ever has.', author: 'Margaret Mead', work: 'attributed', themes: ['kindness', 'purpose'] },
  { id: 'vangogh-attempt', text: 'What would life be if we had no courage to attempt anything?', author: 'Vincent van Gogh', work: 'Letter to Theo', themes: ['courage', 'creativity'] },
  { id: 'kahlo-subject', text: 'I paint myself because I am so often alone and because I am the subject I know best.', author: 'Frida Kahlo', work: 'attributed', themes: ['creativity', 'resilience'] },
  { id: 'socrates-examined', text: 'The unexamined life is not worth living.', author: 'Socrates (Plato)', work: 'Apology', themes: ['learning', 'purpose'] },
];

const THEME_KEYWORDS: Record<Theme, string[]> = {
  courage: ['brave', 'courage', 'fear', 'scared', 'afraid', 'dare', 'bold', 'nerve', 'swallow'],
  growth: ['grow', 'improve', 'better', 'progress', 'become', 'change', 'develop', 'evolve'],
  creativity: ['create', 'art', 'music', 'write', 'draw', 'paint', 'imagine', 'design', 'sing', 'film', 'poem', 'story', 'make'],
  resilience: ['keep going', 'fail', 'failure', 'setback', 'stronger', 'survive', 'endure', 'again', 'bounce', 'heal'],
  kindness: ['kind', 'help', 'give', 'love', 'serve', 'community', 'others', 'volunteer', 'care', 'support'],
  purpose: ['purpose', 'meaning', 'why', 'mission', 'calling', 'direction', 'path', 'destination'],
  learning: ['study', 'knowledge', 'read', 'understand', 'wisdom', 'curious', 'school', 'learn', 'learnt', 'master'],
  hope: ['hope', 'dream', 'wish', 'future', 'someday', 'believe', 'faith', 'someday'],
  health: ['health', 'heal', 'body', 'exercise', 'rest', 'well', 'strong', 'energy', 'sleep'],
  relationships: ['friend', 'family', 'love', 'partner', 'connection', 'belong', 'marry', 'relationship', 'son', 'daughter', 'mother', 'father'],
  gratitude: ['grateful', 'thankful', 'bless', 'thank'],
  craft: ['craft', 'skill', 'practice', 'perfect', 'master', 'hands', 'build'],
  wonder: ['wonder', 'awe', 'travel', 'explore', 'discover', 'world', 'universe', 'adventure'],
};

/** Score themes by keyword hits in the aspiration; return them best-first. */
export function scoreThemes(aspiration: string): Theme[] {
  const text = aspiration.toLowerCase();
  const scored = (Object.entries(THEME_KEYWORDS) as [Theme, string[]][])
    .map(([theme, words]) => ({
      theme,
      score: words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const themes = scored.map((s) => s.theme);
  return themes.length > 0 ? themes : ['hope', 'growth'];
}

/** Deterministic-ish pick: hash the aspiration so the same wish maps to the same quote. */
export function pickCuratedQuote(aspiration: string): CuratedQuote {
  const themes = scoreThemes(aspiration);
  for (const theme of themes) {
    const pool = CURATED_QUOTES.filter((q) => q.themes.includes(theme));
    if (pool.length > 0) {
      let h = 0;
      for (let i = 0; i < aspiration.length; i++) h = (h * 31 + aspiration.charCodeAt(i)) >>> 0;
      return pool[h % pool.length]!;
    }
  }
  return CURATED_QUOTES[0]!;
}
