import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ShortVideo } from './ShortVideo';
import { LongVideo } from './LongVideo';
import { Thumb } from './Thumb';
import { Avatar, Banner } from './ChannelArt';
import { LiveCut } from './LiveCut';
import type { ShortProps } from './types';

const defaults: ShortProps = {
  fps: 30,
  durationInFrames: 150,
  voiceSrc: null,
  bedSrc: null,
  channel: 'SEIS ESTRELAS',
  renderDateISO: new Date().toISOString(),
  beats: [
    { from: 0, durationInFrames: 150, layout: { kind: 'bigNumber', value: 212, suffix: 'GB', meter: { max: 250, danger: 180 } }, seal: 'CONFIRMADO', captions: [], sourceLabel: 'DADOS DE TESTE' },
  ],
};

const meta = ({ props }: { props: Record<string, unknown> }) => ({
  durationInFrames: (props as unknown as ShortProps).durationInFrames,
  fps: (props as unknown as ShortProps).fps,
});

const Root: React.FC = () =>
  React.createElement(React.Fragment, null,
  React.createElement(Composition, { id: 'Avatar', component: Avatar as unknown as React.FC<Record<string, unknown>>, width: 800, height: 800, fps: 30, durationInFrames: 1, defaultProps: { name: '', handle: '', tagline: '', bg: '', mark: 'HL' } }),
  React.createElement(Composition, { id: 'Banner', component: Banner as unknown as React.FC<Record<string, unknown>>, width: 2560, height: 1440, fps: 30, durationInFrames: 1, defaultProps: { name: '', handle: '', tagline: '', bg: '', mark: '' } }),
  React.createElement(Composition, {
    id: 'LiveCut',
    component: LiveCut as unknown as React.FC<Record<string, unknown>>,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 150,
    defaultProps: { src: '', srcW: 1920, srcH: 1080, cam: null, game: { x: 0, y: 0, w: 1920, h: 1080 }, fps: 30, durationInFrames: 150, hook: '', streamer: '', credit: '', channel: '', captions: [], punches: [], reactions: [] },
    calculateMetadata: ({ props }: { props: Record<string, unknown> }) => ({ durationInFrames: props.durationInFrames as number, fps: props.fps as number }),
  }),
  React.createElement(Composition, {
    id: 'Thumb',
    component: Thumb as unknown as React.FC<Record<string, unknown>>,
    width: 1280,
    height: 720,
    fps: 30,
    durationInFrames: 1,
    defaultProps: { bg: '', title: 'TESTE' },
  }),
  React.createElement(Composition, {
    id: 'Long',
    component: LongVideo as unknown as React.FC<Record<string, unknown>>,
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 150,
    defaultProps: defaults,
    calculateMetadata: meta,
  }),
  React.createElement(Composition, {
    id: 'Short',
    component: ShortVideo as unknown as React.FC<Record<string, unknown>>,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 150,
    defaultProps: defaults,
    calculateMetadata: ({ props }: { props: Record<string, unknown> }) => ({
      durationInFrames: (props as unknown as ShortProps).durationInFrames,
      fps: (props as unknown as ShortProps).fps,
    }),
  }));

registerRoot(Root);
