"use client";

import {
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface MarkerHighlightProps {
  before?: string;
  highlight: string;
  after?: string;
  markerColor?: string;
  baseColor?: string;
  highlightedTextColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: number;
  speed?: number;
  className?: string;
}

export function MarkerHighlight({
  before = "",
  highlight,
  after = "",
  markerColor = "#4a90c8",
  baseColor = "#0f172a",
  highlightedTextColor = "#ffffff",
  backgroundColor = "#ffffff",
  fontSize = 72,
  fontWeight = 600,
  speed = 1,
  className,
}: MarkerHighlightProps) {
  const frame = useCurrentFrame() * speed;
  const { fps } = useVideoConfig();

  // markerProgress vai de 0 (escondido) -> 1 (totalmente visível) com spring.
  // Usamos clamp para garantir que fique no intervalo [0,1] mesmo se o spring
  // ultrapassar levemente.
  const rawScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14 },
  });
  const markerProgress = Math.max(0, Math.min(1, rawScale));

  // Em vez de scaleX (que pode quebrar bounding box em alguns navegadores),
  // usamos clip-path inset() para revelar a tarja da esquerda para a direita.
  // O elemento mantém width 100% sempre — o clip apenas esconde a parte direita.
  const clipRight = (1 - markerProgress) * 100;

  const textColor = interpolateColors(
    interpolate(markerProgress, [0.5, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    [0, 1],
    [baseColor, highlightedTextColor],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: backgroundColor,
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color: baseColor,
          letterSpacing: "-0.03em",
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {before}
        <span style={{ position: "relative", display: "inline-block" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: "-0.05em",
              bottom: "-0.05em",
              left: "-0.1em",
              right: "-0.1em",
              background: markerColor,
              clipPath: `inset(0 ${clipRight}% 0 0)`,
              WebkitClipPath: `inset(0 ${clipRight}% 0 0)`,
              zIndex: 0,
              willChange: "clip-path",
            }}
          />
          <span style={{ position: "relative", zIndex: 1, color: textColor }}>
            {highlight}
          </span>
        </span>
        {after}
      </span>
    </div>
  );
}
