"use client";

import React from "react";

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
  /** Duração total de um ciclo da animação em segundos. Default: 3.5 */
  durationSec?: number;
  className?: string;
}

/**
 * Marca-texto animado em CSS puro.
 *
 * Loop:
 *  0%   - tarja invisível (clip-path 100%), texto cor base
 *  20%  - texto começa a virar branco
 *  40%  - tarja totalmente revelada e texto branco
 *  85%  - mantém estado final
 *  100% - volta ao início (clip 100%, texto base) — mas a transição
 *         é via "from-to" então o reset é instantâneo (não há reverse).
 */
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
  durationSec = 3.5,
  className,
}: MarkerHighlightProps) {
  // CSS variables locais para reutilizar nas animations sem clash global
  const styleVars = {
    ["--mh-marker"]: markerColor,
    ["--mh-base"]: baseColor,
    ["--mh-text-on-marker"]: highlightedTextColor,
    ["--mh-bg"]: backgroundColor,
    ["--mh-duration"]: `${durationSec}s`,
  } as React.CSSProperties;

  return (
    <div className="mh-stage" style={styleVars}>
      <span
        className={`mh-text ${className || ""}`}
        style={{
          fontSize,
          fontWeight,
        }}
      >
        {before}
        <span className="mh-wrap">
          <span className="mh-marker" aria-hidden />
          <span className="mh-highlight">{highlight}</span>
        </span>
        {after}
      </span>

      {/* CSS local — escopo via classes únicas (mh-*) */}
      <style jsx>{`
        .mh-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--mh-bg);
        }
        .mh-text {
          color: var(--mh-base);
          letter-spacing: -0.03em;
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, sans-serif;
          line-height: 1.1;
        }
        .mh-wrap {
          position: relative;
          display: inline-block;
        }
        .mh-marker {
          position: absolute;
          top: -0.05em;
          bottom: -0.05em;
          left: -0.1em;
          right: -0.1em;
          background: var(--mh-marker);
          z-index: 0;
          /* Inicia totalmente recortado (escondido) e revela da esquerda
             para a direita. clip-path inset(top right bottom left). */
          clip-path: inset(0 100% 0 0);
          -webkit-clip-path: inset(0 100% 0 0);
          animation: mh-reveal var(--mh-duration) cubic-bezier(0.22, 1, 0.36, 1)
            infinite;
          will-change: clip-path;
        }
        .mh-highlight {
          position: relative;
          z-index: 1;
          color: var(--mh-base);
          animation: mh-text-color var(--mh-duration) ease infinite;
        }
        @keyframes mh-reveal {
          0% {
            clip-path: inset(0 100% 0 0);
            -webkit-clip-path: inset(0 100% 0 0);
          }
          40%,
          92% {
            clip-path: inset(0 0 0 0);
            -webkit-clip-path: inset(0 0 0 0);
          }
          100% {
            clip-path: inset(0 100% 0 0);
            -webkit-clip-path: inset(0 100% 0 0);
          }
        }
        @keyframes mh-text-color {
          0%,
          22% {
            color: var(--mh-base);
          }
          40%,
          92% {
            color: var(--mh-text-on-marker);
          }
          100% {
            color: var(--mh-base);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mh-marker {
            animation: none;
            clip-path: inset(0 0 0 0);
            -webkit-clip-path: inset(0 0 0 0);
          }
          .mh-highlight {
            animation: none;
            color: var(--mh-text-on-marker);
          }
        }
      `}</style>
    </div>
  );
}
