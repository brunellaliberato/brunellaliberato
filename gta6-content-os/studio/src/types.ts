import type { Seal } from './brand';

export type Layout =
  | { kind: 'bigNumber'; value: number; prefix?: string; suffix?: string; label?: string; meter?: { max: number; danger: number } }
  | { kind: 'quote'; quote: string; highlight?: string; translation?: string }
  | { kind: 'tags'; title: string; tags: string[]; counter?: string }
  | { kind: 'date'; date: string; label: string; countdownFrom?: string }
  | { kind: 'poll'; left: string; right: string; question?: string }
  | { kind: 'title'; text: string; sub?: string };

export interface CaptionChunk {
  text: string;
  from: number; // frame
  to: number; // frame
  emphasis?: boolean;
}

export interface TimelineBeat {
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
