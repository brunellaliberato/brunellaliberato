import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ShortVideo } from './ShortVideo';
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

const Root: React.FC = () =>
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
  });

registerRoot(Root);
