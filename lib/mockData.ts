import type { AudioPost, Creator, PostCategory } from '@/lib/types';

/** Deterministic pseudo-random generator so waveforms stay stable across renders. */
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function makeWaveform(seed: number, bars = 48): number[] {
  const random = seededRandom(seed * 977 + 13);
  return Array.from({ length: bars }, (_, index) => {
    const envelope = 0.55 + 0.45 * Math.sin((index / bars) * Math.PI * 2.2);
    const value = 0.25 + random() * 0.75 * envelope;
    return Math.min(1, Math.max(0.12, value));
  });
}

/**
 * Placeholder audio files. Real, streamable MP3s so playback, scrubbing and
 * background listening work before a backend exists. Reported durations below
 * come from the mock seeds and are corrected once a file actually loads.
 */
export const SAMPLE_AUDIO_URLS: string[] = Array.from(
  { length: 17 },
  (_, index) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${index + 1}.mp3`,
);

export function sampleAudioUrl(index: number): string {
  const safe =
    ((index % SAMPLE_AUDIO_URLS.length) + SAMPLE_AUDIO_URLS.length) % SAMPLE_AUDIO_URLS.length;
  return SAMPLE_AUDIO_URLS[safe];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.now();

export const MY_CREATOR_ID = 'me';

export const CREATORS: Creator[] = [
  {
    id: MY_CREATOR_ID,
    name: 'Ava Mercer',
    handle: '@avaonair',
    initials: 'AM',
    gradient: ['#8B5CF6', '#22D3EE'],
    bio: 'Recording tiny thoughts between school runs and gym sets.',
    followers: 1284,
    isVerified: false,
  },
  {
    id: 'c-nova',
    name: 'Nova Reyes',
    handle: '@novareyes',
    initials: 'NR',
    gradient: ['#F472B6', '#8B5CF6'],
    bio: 'Two-minute stories for long commutes.',
    followers: 48_200,
    isVerified: true,
  },
  {
    id: 'c-deep',
    name: 'Deep Focus Daily',
    handle: '@deepfocus',
    initials: 'DF',
    gradient: ['#22D3EE', '#3B82F6'],
    bio: 'Ambient loops and focus cues, no visuals needed.',
    followers: 122_800,
    isVerified: true,
  },
  {
    id: 'c-hara',
    name: 'Hara Kim',
    handle: '@harakim',
    initials: 'HK',
    gradient: ['#FBBF24', '#F97316'],
    bio: 'Kitchen-table takes on food, cities and cheap flights.',
    followers: 9_640,
    isVerified: false,
  },
  {
    id: 'c-rune',
    name: 'Rune Alvarez',
    handle: '@runealv',
    initials: 'RA',
    gradient: ['#34D399', '#059669'],
    bio: 'Strength coach. Short cues you can follow mid-set.',
    followers: 31_500,
    isVerified: true,
  },
  {
    id: 'c-lowfi',
    name: 'Lowfi Transit',
    handle: '@lowfitransit',
    initials: 'LT',
    gradient: ['#818CF8', '#C084FC'],
    bio: 'Field recordings from night buses and empty platforms.',
    followers: 7_310,
    isVerified: false,
  },
  {
    id: 'c-byte',
    name: 'Byte Diary',
    handle: '@bytediary',
    initials: 'BD',
    gradient: ['#38BDF8', '#0EA5E9'],
    bio: 'Gadget reviews you can follow without looking at a screen.',
    followers: 64_900,
    isVerified: true,
  },
  {
    id: 'c-twochairs',
    name: 'Two Chairs',
    handle: '@twochairs',
    initials: 'TC',
    gradient: ['#FB7185', '#F59E0B'],
    bio: 'Sketch comedy for headphones. One mic, two voices.',
    followers: 18_450,
    isVerified: false,
  },
];

export const CREATORS_BY_ID: Record<string, Creator> = Object.fromEntries(
  CREATORS.map((creator) => [creator.id, creator]),
);

interface PostSeed {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  category: PostCategory;
  durationSec: number;
  plays: number;
  likes: number;
  comments: number;
  tags: string[];
  ageMs: number;
}

const POST_SEEDS: PostSeed[] = [
  {
    id: 'p-01',
    title: 'The 90-second pep talk for the drive to work',
    description:
      'A short reset for the first ten minutes of your commute. No screens, no notes, just three things to say out loud before you park.',
    creatorId: 'c-nova',
    category: 'Podcast',
    durationSec: 94,
    plays: 184_300,
    likes: 21_400,
    comments: 812,
    tags: ['motivation', 'commute'],
    ageMs: 3 * HOUR,
  },
  {
    id: 'p-15',
    title: 'Three weeks with the cheapest noise-cancelling buds',
    description:
      'Spoken measurements instead of charts: how they handle a bus engine, a dishwasher and a gym fan, plus the one deal-breaker.',
    creatorId: 'c-byte',
    category: 'Tech Review',
    durationSec: 268,
    plays: 143_600,
    likes: 17_900,
    comments: 1_240,
    tags: ['tech', 'review'],
    ageMs: 7 * HOUR,
  },
  {
    id: 'p-02',
    title: 'Rain on a parked car, unedited',
    description:
      'Twelve minutes of rain hitting a hatchback roof in a supermarket parking lot. Recorded on a phone, kept exactly as it happened.',
    creatorId: 'c-lowfi',
    category: 'Ambient',
    durationSec: 726,
    plays: 62_100,
    likes: 8_940,
    comments: 143,
    tags: ['ambient', 'sleep'],
    ageMs: 9 * HOUR,
  },
  {
    id: 'p-16',
    title: 'A night-shift nurse on what 4am sounds like',
    description:
      'Forty minutes trimmed to seven. She describes a ward by ear: which machines you learn to ignore and which ones you never do.',
    creatorId: 'c-nova',
    category: 'Interview',
    durationSec: 412,
    plays: 98_400,
    likes: 15_300,
    comments: 703,
    tags: ['interview', 'stories'],
    ageMs: 14 * HOUR,
  },
  {
    id: 'p-03',
    title: 'Three cues to fix your squat depth mid-set',
    description:
      'Listen between sets. Ribs down, knees out, drive the floor apart. Sixty seconds, no video needed.',
    creatorId: 'c-rune',
    category: 'Coaching',
    durationSec: 68,
    plays: 96_800,
    likes: 14_220,
    comments: 402,
    tags: ['fitness', 'coaching'],
    ageMs: 26 * HOUR,
  },
  {
    id: 'p-17',
    title: 'Skit: the man who narrates his own commute',
    description:
      'Two minutes of a very confident driver describing every roundabout as if it were a nature documentary.',
    creatorId: 'c-twochairs',
    category: 'Skit',
    durationSec: 132,
    plays: 211_700,
    likes: 39_800,
    comments: 2_460,
    tags: ['comedy', 'commute'],
    ageMs: 20 * HOUR,
  },
  {
    id: 'p-04',
    title: 'Why every airport smells the same',
    description:
      'A tiny investigation that started in a terminal at 5am and ended with a call to a cleaning-supply chemist.',
    creatorId: 'c-hara',
    category: 'Story',
    durationSec: 212,
    plays: 41_700,
    likes: 6_180,
    comments: 297,
    tags: ['stories', 'travel'],
    ageMs: 2 * DAY,
  },
  {
    id: 'p-05',
    title: 'Focus loop 04 — dishes and deadlines',
    description:
      'A steady 20-minute bed of warm noise with soft markers every five minutes so you can track time without looking.',
    creatorId: 'c-deep',
    category: 'Ambient',
    durationSec: 1_215,
    plays: 310_400,
    likes: 38_900,
    comments: 522,
    tags: ['focus', 'chores'],
    ageMs: 5 * HOUR,
  },
  {
    id: 'p-18',
    title: 'Is a two-hour commute ever worth it? Two takes',
    description:
      'A cheap-flights obsessive and a strength coach argue about time, rent and what you actually do with a train seat.',
    creatorId: 'c-hara',
    category: 'Discussion',
    durationSec: 356,
    plays: 57_800,
    likes: 7_920,
    comments: 884,
    tags: ['discussion', 'work'],
    ageMs: 33 * HOUR,
  },
  {
    id: 'p-06',
    title: 'I recorded my grandmother explaining her stew',
    description:
      'She refuses to write it down, so I asked her to talk me through it while she cooked. Best four minutes on my phone.',
    creatorId: 'c-hara',
    category: 'Interview',
    durationSec: 248,
    plays: 128_900,
    likes: 27_600,
    comments: 1_910,
    tags: ['food', 'family'],
    ageMs: 4 * DAY,
  },
  {
    id: 'p-07',
    title: 'Night bus, seat 14, 11:40pm',
    description:
      'Engine hum, a door chime, someone laughing two rows back. Field recording from the last bus out of the city.',
    creatorId: 'c-lowfi',
    category: 'Ambient',
    durationSec: 448,
    plays: 22_100,
    likes: 3_040,
    comments: 88,
    tags: ['ambient', 'field'],
    ageMs: 46 * MINUTE,
  },
  {
    id: 'p-19',
    title: 'Podcast clip: why voice notes beat email',
    description:
      'Six minutes from a longer episode on remote teams, and the rule that keeps voice notes from becoming a second inbox.',
    creatorId: 'c-byte',
    category: 'Podcast',
    durationSec: 205,
    plays: 39_200,
    likes: 5_140,
    comments: 214,
    tags: ['work', 'tips'],
    ageMs: 2 * DAY,
  },
  {
    id: 'p-08',
    title: 'The two-minute grocery list method',
    description:
      'How to plan a week of dinners while walking to the shop, using nothing but your voice and one rule.',
    creatorId: 'c-nova',
    category: 'Podcast',
    durationSec: 137,
    plays: 74_500,
    likes: 9_870,
    comments: 331,
    tags: ['tips', 'chores'],
    ageMs: 31 * HOUR,
  },
  {
    id: 'p-09',
    title: 'Warm-up you can do in a hotel room',
    description:
      'Eight movements, called out in order, with a count you can follow while half asleep.',
    creatorId: 'c-rune',
    category: 'Coaching',
    durationSec: 305,
    plays: 55_300,
    likes: 7_410,
    comments: 176,
    tags: ['fitness', 'travel'],
    ageMs: 3 * DAY,
  },
  {
    id: 'p-10',
    title: 'A very short history of the elevator pitch',
    description:
      'It was not invented in an elevator. It was invented in a queue, and it was much longer.',
    creatorId: 'c-nova',
    category: 'Story',
    durationSec: 168,
    plays: 33_600,
    likes: 4_120,
    comments: 121,
    tags: ['stories', 'work'],
    ageMs: 6 * DAY,
  },
  {
    id: 'p-11',
    title: 'Laundry folding tempo — 12 minutes',
    description:
      'A rhythm track built at exactly the speed of folding a basket of shirts. Tested extensively.',
    creatorId: 'c-deep',
    category: 'Ambient',
    durationSec: 733,
    plays: 88_200,
    likes: 11_050,
    comments: 208,
    tags: ['chores', 'focus'],
    ageMs: 18 * HOUR,
  },
  {
    id: 'p-12',
    title: 'Talking myself out of quitting on a Tuesday',
    description:
      'Recorded in a stairwell, unedited. Posting it because the version where I sound composed helps nobody.',
    creatorId: MY_CREATOR_ID,
    category: 'Journal',
    durationSec: 194,
    plays: 12_480,
    likes: 2_310,
    comments: 148,
    tags: ['journal', 'motivation'],
    ageMs: 22 * HOUR,
  },
  {
    id: 'p-13',
    title: 'What I listen to while driving at night',
    description:
      'A short list, and the one rule I keep: nothing that makes me want to look at the screen.',
    creatorId: MY_CREATOR_ID,
    category: 'Journal',
    durationSec: 156,
    plays: 8_940,
    likes: 1_460,
    comments: 96,
    tags: ['commute', 'journal'],
    ageMs: 5 * DAY,
  },
  {
    id: 'p-14',
    title: 'Reading my old gym log out loud',
    description: 'Three years of numbers in four minutes. It sounds slow until the very end.',
    creatorId: MY_CREATOR_ID,
    category: 'Journal',
    durationSec: 231,
    plays: 5_120,
    likes: 730,
    comments: 41,
    tags: ['fitness', 'journal'],
    ageMs: 12 * DAY,
  },
];

export const MOCK_POSTS: AudioPost[] = POST_SEEDS.map((seed, index) => ({
  id: seed.id,
  title: seed.title,
  description: seed.description,
  creatorId: seed.creatorId,
  category: seed.category,
  audioUrl: sampleAudioUrl(index),
  durationSec: seed.durationSec,
  plays: seed.plays,
  likes: seed.likes,
  comments: seed.comments,
  tags: seed.tags,
  createdAt: NOW - seed.ageMs,
  waveform: makeWaveform(index + 1),
  isLiked: index % 5 === 1,
}));

export const TAG_SUGGESTIONS = [
  'journal',
  'commute',
  'chores',
  'fitness',
  'focus',
  'stories',
  'motivation',
  'ambient',
  'food',
  'work',
  'tech',
  'comedy',
];
