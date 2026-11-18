import type { Seal } from './brand';

export type Layout =
  | { kind: 'bigNumber'; value: number; prefix?: string; suffix?: string; label?: string; meter?: { max: number; danger: number } }
  | { kind: 'quote'; quote: string; highlight?: string; translation?: string }
  | { kind: 'tags'; title: string; tags: string[]; counter?: string }
  | { kind: 'date'; date: string; label: string; countdownFrom?: string }
  | { kind: 'poll'; left: string; right: string; question?: string }
  | { kind: 'title'; text: string; sub?: string }
  | { kind: 'story'; text: string }
  | { kind: 'chapter'; num: string; name: string; sub?: string }
  | { kind: 'map'; focus?: string };

export interface CaptionChunk {
  text: string;
  from: number; // frame
  to: number; // frame
  emphasis?: boolean;
}

export interface BeatBackground {
  /** caminho em studio/public */
  src: string;
  /** object-position CSS (ex.: '40% 50%') para enquadrar no 9:16 */
  position?: string;
  /** crédito obrigatório na tela */
  credit: string;
}

export interface TimelineBeat {
  bg?: BeatBackground;
  from: number;
  durationInFrames: number;
  layout: Layout;
  seal?: Seal;
  sourceLabel?: string;
  captions: CaptionChunk[];
}

export interface ShortProps {
  fps: number;
  durationInFrames: number;
  voiceSrc: string | null;
  bedSrc: string | null;
  beats: TimelineBeat[];
  channel: string;
  renderDateISO: string;
  [key: string]: unknown;
}
