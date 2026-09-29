import { useRef, useEffect, type FC } from "react";
import type { LayoutResult, PlankRect } from "@/lib/layout-engine";

interface LayoutCanvasProps {
  result: LayoutResult;
  roomWidth: number;
  roomLength: number;
  pattern: string;
  staggerInches?: number;
}

const LayoutCanvas: FC<LayoutCanvasProps> = ({ result, roomWidth, roomLength, pattern, staggerInches = 0 }) => {
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

    // Stagger indicator — show drop-back distance between first two rows
    if (staggerInches > 0 && result.planks.length > 1) {
      // Find the first two distinct rows (different y values)
      const rows = [...new Set(result.planks.map((p) => Math.round(p.y * 100) / 100))];
      if (rows.length >= 2) {
        const row1Y = rows[0] * scale;
        const row2Y = rows[1] * scale;

        // Find the leftmost plank in row 2 to get the stagger offset
        const row2Planks = result.planks.filter((p) => Math.abs(p.y - rows[1]) < 0.01);
        const row1Planks = result.planks.filter((p) => Math.abs(p.y - rows[0]) < 0.01);
        const row1Left = row1Planks.length > 0 ? row1Planks[0].x : 0;
        const row2Left = row2Planks.length > 0 ? row2Planks[0].x : 0;
        const staggerFt = staggerInches / 12;
        const staggerPx = staggerFt * scale;

        // Draw stagger indicator on the left side of the canvas
        const indicatorX = -8; // just outside the room outline on the left
        const arrowStartY = row1Y;
        const arrowEndY = row2Y;

        ctx.save();
        ctx.strokeStyle = "#8B6F47";
        ctx.fillStyle = "#8B6F47";
        ctx.lineWidth = 1.5;

        // Vertical bracket showing row height (plank width)
        ctx.beginPath();
        ctx.moveTo(indicatorX, arrowStartY);
        ctx.lineTo(indicatorX, arrowEndY);
        ctx.stroke();

        // Arrowheads
        ctx.beginPath();
        ctx.moveTo(indicatorX - 3, arrowStartY + 4);
        ctx.lineTo(indicatorX, arrowStartY);
        ctx.lineTo(indicatorX + 3, arrowStartY + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(indicatorX - 3, arrowEndY - 4);
        ctx.lineTo(indicatorX, arrowEndY);
        ctx.lineTo(indicatorX + 3, arrowEndY - 4);
        ctx.stroke();

        // Horizontal stagger arrow showing the drop-back distance
        if (staggerPx > 2) {
          const arrowY = row2Y + 2;
          const hx1 = row1Left * scale;
          const hx2 = (row1Left + staggerFt) * scale;

          ctx.strokeStyle = "#8B6F47";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hx1, arrowY);
          ctx.lineTo(hx2, arrowY);
          ctx.stroke();

          // Arrowhead pointing right
          ctx.beginPath();
          ctx.moveTo(hx2 - 4, arrowY - 3);
          ctx.lineTo(hx2, arrowY);
          ctx.lineTo(hx2 - 4, arrowY + 3);
          ctx.stroke();

          // Stagger distance label
          ctx.font = "600 10px Satoshi, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const labelY = arrowY - 4;
          const labelX = (hx1 + hx2) / 2;

          // Label background
          const labelText = `${staggerInches}" stagger`;
          ctx.font = "600 10px Satoshi, sans-serif";
          const metrics = ctx.measureText(labelText);
          const labelW = metrics.width + 8;
          const labelH = 14;
          ctx.fillStyle = "hsl(var(--background))";
          ctx.fillRect(labelX - labelW / 2, labelY - labelH, labelW, labelH);
          ctx.strokeStyle = "#8B6F47";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(labelX - labelW / 2, labelY - labelH, labelW, labelH);

          ctx.fillStyle = "#8B6F47";
          ctx.fillText(labelText, labelX, labelY - 2);
        }

        ctx.restore();
      }
    }
  }, [result, roomWidth, roomLength, pattern, staggerInches]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} className="rounded-lg shadow-md" />
    </div>
  );
};

export default LayoutCanvas;
