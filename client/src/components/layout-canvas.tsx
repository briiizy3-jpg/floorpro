import { useRef, useEffect, type FC } from "react";
import type { LayoutResult, PlankRect } from "@/lib/layout-engine";

interface LayoutCanvasProps {
  result: LayoutResult;
  roomWidth: number;
  roomLength: number;
  pattern: string;
}

const LayoutCanvas: FC<LayoutCanvasProps> = ({ result, roomWidth, roomLength, pattern }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const maxWidth = container?.clientWidth || 600;
    const maxHeight = 500;

    // Scale to fit
    const scaleX = maxWidth / roomWidth;
    const scaleY = maxHeight / roomLength;
    const scale = Math.min(scaleX, scaleY);

    const canvasW = roomWidth * scale;
    const canvasH = roomLength * scale;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Room outline
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasW, canvasH);

    // Plank colors — earthy wood/stone tones
    const colors = [
      "#A08560", "#8B7355", "#B0946A", "#9C7E58",
      "#7A6347", "#AB8B65", "#947A55", "#A89070",
    ];

    const drawPlank = (plank: PlankRect, color: string) => {
      const px = plank.x * scale;
      const py = plank.y * scale;
      const pw = plank.w * scale;
      const ph = plank.h * scale;

      if (plank.rotation !== 0) {
        ctx.save();
        ctx.translate(px + pw / 2, py + ph / 2);
        ctx.rotate((plank.rotation * Math.PI) / 180);
        ctx.translate(-(px + pw / 2), -(py + ph / 2));
      }

      // Fill
      ctx.fillStyle = color;
      ctx.fillRect(px, py, pw, ph);

      // Wood grain lines
      if (pw > ph) {
        // Horizontal plank
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
          const gy = py + (ph / 4) * i;
          ctx.beginPath();
          ctx.moveTo(px + 2, gy);
          ctx.lineTo(px + pw - 2, gy);
          ctx.stroke();
        }
      }

      // Border
      ctx.strokeStyle = plank.isCut ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px, py, pw, ph);

      if (plank.rotation !== 0) {
        ctx.restore();
      }
    };

    // Draw planks
    result.planks.forEach((plank, i) => {
      const color = plank.isCut ? "#7A6347" : colors[i % colors.length];
      drawPlank(plank, color);
    });

    // Dimension labels
    ctx.fillStyle = "hsl(var(--foreground))";
    ctx.font = "600 12px Satoshi, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${roomWidth}'`, canvasW / 2, canvasH + 16);
    ctx.save();
    ctx.translate(-16, canvasH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${roomLength}'`, 0, 0);
    ctx.restore();
  }, [result, roomWidth, roomLength, pattern]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} className="rounded-lg shadow-md" />
    </div>
  );
};

export default LayoutCanvas;
