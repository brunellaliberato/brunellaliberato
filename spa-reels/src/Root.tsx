import React from "react";
import { Composition } from "remotion";
import { FPS, Portugal, TOTAL_SECONDS } from "./Portugal";

export const Root: React.FC = () => (
  <Composition id="Portugal" component={Portugal} durationInFrames={Math.ceil(TOTAL_SECONDS * FPS)} fps={FPS} width={1080} height={1920} />
);
