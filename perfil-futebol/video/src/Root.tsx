import React from "react";
import { Composition } from "remotion";
import { Parte1, totalFrames } from "./Parte1";
import { Parte2, totalFrames2 } from "./Parte2";
import { Avatar } from "./Avatar";
import { Quente01, totalFramesQ1 } from "./Quente01";

export const Root: React.FC = () => (
  <>
  <Composition id="Parte1" component={Parte1} durationInFrames={totalFrames} fps={30} width={1080} height={1920} />
  <Composition id="Parte2" component={Parte2} durationInFrames={totalFrames2} fps={30} width={1080} height={1920} />
  <Composition id="Quente01" component={Quente01} durationInFrames={totalFramesQ1} fps={30} width={1080} height={1920} />
  <Composition id="AvatarA" component={Avatar} defaultProps={{ v: "A" as const }} durationInFrames={1} fps={30} width={1080} height={1080} />
  <Composition id="AvatarB" component={Avatar} defaultProps={{ v: "B" as const }} durationInFrames={1} fps={30} width={1080} height={1080} />
  <Composition id="AvatarC" component={Avatar} defaultProps={{ v: "C" as const }} durationInFrames={1} fps={30} width={1080} height={1080} />
  </>
);
