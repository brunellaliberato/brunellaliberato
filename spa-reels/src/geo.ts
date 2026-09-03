// Projeção Web Mercator e câmera do mapa.
export const W = 1080;
export const H = 1920;
// ponto da tela onde fica o centro da câmera (um pouco acima do meio, a legenda ocupa a parte de baixo)
export const CX = W / 2;
export const CY = H * 0.44;

export type LonLat = [number, number];
export type Cam = { lon: number; lat: number; zoom: number };

export const mx = (lon: number) => (lon + 180) / 360;
export const my = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

export const scale = (zoom: number) => 256 * 2 ** zoom;

/** coordenada normalizada (0..1) -> pixel da tela */
export const toScreenN = (cam: Cam, x: number, y: number): [number, number] => {
  const k = scale(cam.zoom);
  return [CX + (x - mx(cam.lon)) * k, CY + (y - my(cam.lat)) * k];
};

export const toScreen = (cam: Cam, [lon, lat]: LonLat) => toScreenN(cam, mx(lon), my(lat));

export type Keyframe = Cam & { t: number };

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

/**
 * Câmera no tempo t (segundos). Entre dois keyframes o zoom é interpolado em escala log
 * e o centro anda de forma que o alvo não "fuja" da tela durante zoom-in/zoom-out.
 */
export const cameraAt = (kfs: Keyframe[], t: number): Cam => {
  if (t <= kfs[0].t) return kfs[0];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t > b.t) continue;
    const p = easeInOut((t - a.t) / Math.max(1e-6, b.t - a.t));
    const zoom = a.zoom + (b.zoom - a.zoom) * p;
    const ka = scale(a.zoom);
    const kb = scale(b.zoom);
    const k = scale(zoom);
    let w: number;
    if (Math.abs(kb - ka) < 1e-6) w = p;
    else if (kb > ka) w = 1 - ((1 - p) * ka) / k; // aproximando: alvo vem até o centro
    else w = (p * kb) / k; // afastando: origem sai do centro aos poucos
    const x = mx(a.lon) + (mx(b.lon) - mx(a.lon)) * w;
    const y = my(a.lat) + (my(b.lat) - my(a.lat)) * w;
    return { lon: x * 360 - 180, lat: latFromY(y), zoom };
  }
  return kfs[kfs.length - 1];
};

export const latFromY = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/** curva entre dois pontos (em coordenadas normalizadas), com "barriga" lateral */
export const arcPoints = (a: LonLat, b: LonLat, bend: number, n = 120): [number, number][] => {
  const ax = mx(a[0]);
  const ay = my(a[1]);
  const bx = mx(b[0]);
  const by = my(b[1]);
  const dx = bx - ax;
  const dy = by - ay;
  const cx = (ax + bx) / 2 - dy * bend;
  const cy = (ay + by) / 2 + dx * bend;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx,
      (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by,
    ]);
  }
  return pts;
};
