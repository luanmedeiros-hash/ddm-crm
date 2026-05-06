'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function SparkLine({ data, color = '#0f172a', height = 56 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width = canvas.clientWidth * dpr;
    const H = canvas.height = canvas.clientHeight * dpr;
    ctx.clearRect(0, 0, W, H);

    const safeData = data.length ? data : [0, 0];
    const max = Math.max(...safeData, 1), min = Math.min(...safeData, 0);
    const range = max - min || 1;
    const padding = 6 * dpr;
    const w = W - padding * 2;
    const h = H - padding * 2;
    const points = safeData.map((v, i) => ({
      x: padding + (i / Math.max(1, safeData.length - 1)) * w,
      y: padding + (1 - (v - min) / range) * h,
    }));

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, H - padding);
    points.forEach((p, i) => {
      if (i === 0) ctx.lineTo(p.x, p.y);
      else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, H - padding);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
      }
    });
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }, [data, color]);

  return (
    <div className="spark-wrap" style={{ height }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
