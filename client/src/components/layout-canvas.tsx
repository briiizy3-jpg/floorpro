import { useRef, useEffect, type FC } from "react";
import type { LayoutResult, PlankRect, Doorway, Closet, RoomShape } from "@/lib/layout-engine";

interface LayoutCanvasProps {
  result: LayoutResult;
  roomWidth: number;
  roomLength: number;
  pattern: string;
  staggerInches?: number;
  roomShape?: RoomShape;
  doorways?: Doorway[];
  closets?: Closet[];
}

const LayoutCanvas: FC<LayoutCanvasProps> = ({
  result,
  roomWidth,
  roomLength,
  pattern,
  staggerInches = 0,
  roomShape = "rectangular",
  doorways = [],
  closets = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const maxWidth = (container?.clientWidth || 600) - 40;
    const maxHeight = 500;

    // Scale to fit
    const scaleX = maxWidth / roomWidth;
    const scaleY = maxHeight / roomLength;
    const scale = Math.min(scaleX, scaleY);

    const canvasW = roomWidth * scale;
    const canvasH = roomLength * scale;

    // Extra padding for doorway labels
    const padX = 30;
    const padY = 20;

    canvas.width = (canvasW + padX * 2) * dpr;
    canvas.height = (canvasH + padY * 2) * dpr;
    canvas.style.width = `${canvasW + padX * 2}px`;
    canvas.style.height = `${canvasH + padY * 2}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(padX, padY);

    // Clear
    ctx.clearRect(-padX, -padY, canvasW + padX * 2, canvasH + padY * 2);

    // Background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw room shape outline
    ctx.save();
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2.5;

    if (roomShape === "circular") {
      ctx.beginPath();
      ctx.ellipse(canvasW / 2, canvasH / 2, canvasW / 2, canvasH / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Clip to circle
      ctx.clip();
    } else if (roomShape === "octagonal") {
      const cutX = canvasW * 0.3;
      const cutY = canvasH * 0.3;
      ctx.beginPath();
      ctx.moveTo(cutX, 0);
      ctx.lineTo(canvasW - cutX, 0);
      ctx.lineTo(canvasW, cutY);
      ctx.lineTo(canvasW, canvasH - cutY);
      ctx.lineTo(canvasW - cutX, canvasH);
      ctx.lineTo(cutX, canvasH);
      ctx.lineTo(0, canvasH - cutY);
      ctx.lineTo(0, cutY);
      ctx.closePath();
      ctx.stroke();
      ctx.clip();
    } else if (roomShape === "l-shaped") {
      const notchW = canvasW * 0.4;
      const notchH = canvasH * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvasW - notchW, 0);
      ctx.lineTo(canvasW - notchW, notchH);
      ctx.lineTo(canvasW, notchH);
      ctx.lineTo(canvasW, canvasH);
      ctx.lineTo(0, canvasH);
      ctx.closePath();
      ctx.stroke();
      ctx.clip();
    } else {
      ctx.strokeRect(0, 0, canvasW, canvasH);
    }
    ctx.restore();

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
      if (plank.isDoorwayCut) {
        // Highlight doorway cuts in orange
        ctx.strokeStyle = "#D97706";
        ctx.lineWidth = 1.5;
      } else if (plank.isClosetPlank) {
        // Highlight closet planks in blue
        ctx.strokeStyle = "#2563EB";
        ctx.lineWidth = 1.0;
      } else {
        ctx.strokeStyle = plank.isCut ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.8;
      }
      ctx.strokeRect(px, py, pw, ph);

      if (plank.rotation !== 0) {
        ctx.restore();
      }
    };

    // Draw planks
    result.planks.forEach((plank, i) => {
      let color = plank.isCut ? "#7A6347" : colors[i % colors.length];
      if (plank.isClosetPlank) color = "#6B7E8C"; // blue-gray for closet
      if (plank.isDoorwayCut) color = "#C68642"; // orange for doorway
      drawPlank(plank, color);
    });

    // Draw closet areas
    closets.forEach((c) => {
      const cx = c.x * scale;
      const cy = c.y * scale;
      const cw = c.w * scale;
      const ch = c.h * scale;

      // Closet outline (dashed)
      ctx.save();
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(cx, cy, cw, ch);

      // Label
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
      ctx.fillRect(cx, cy, cw, ch);

      ctx.fillStyle = "#2563EB";
      ctx.font = "600 10px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label || "Closet", cx + cw / 2, cy + ch / 2);

      // Draw closet door opening
      if (c.hasDoor && c.doorWall) {
        ctx.strokeStyle = "#2563EB";
        ctx.lineWidth = 3;
        ctx.beginPath();
        switch (c.doorWall) {
          case "north":
            ctx.moveTo(cx + c.doorOffset * scale, cy);
            ctx.lineTo(cx + (c.doorOffset + c.doorWidth) * scale, cy);
            break;
          case "south":
            ctx.moveTo(cx + c.doorOffset * scale, cy + ch);
            ctx.lineTo(cx + (c.doorOffset + c.doorWidth) * scale, cy + ch);
            break;
          case "west":
            ctx.moveTo(cx, cy + c.doorOffset * scale);
            ctx.lineTo(cx, cy + (c.doorOffset + c.doorWidth) * scale);
            break;
          case "east":
            ctx.moveTo(cx + cw, cy + c.doorOffset * scale);
            ctx.lineTo(cx + cw, cy + (c.doorOffset + c.doorWidth) * scale);
            break;
        }
        ctx.stroke();
      }
      ctx.restore();
    });

    // Draw doorways
    doorways.forEach((d) => {
      ctx.save();
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 4;

      const doorW = d.width * scale;
      const doorOff = d.offset * scale;

      // Draw door opening as a gap in the wall
      ctx.beginPath();
      switch (d.wall) {
        case "north": // top wall
          ctx.moveTo(doorOff, 0);
          ctx.lineTo(doorOff + doorW, 0);
          break;
        case "south": // bottom wall
          ctx.moveTo(doorOff, canvasH);
          ctx.lineTo(doorOff + doorW, canvasH);
          break;
        case "west": // left wall
          ctx.moveTo(0, doorOff);
          ctx.lineTo(0, doorOff + doorW);
          break;
        case "east": // right wall
          ctx.moveTo(canvasW, doorOff);
          ctx.lineTo(canvasW, doorOff + doorW);
          break;
      }
      ctx.stroke();

      // Door swing arc
      ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      const arcR = Math.min(doorW, 30);
      switch (d.wall) {
        case "north":
          ctx.arc(doorOff, 0, arcR, 0, Math.PI / 2);
          break;
        case "south":
          ctx.arc(doorOff + doorW, canvasH, arcR, Math.PI, Math.PI * 1.5);
          break;
        case "west":
          ctx.arc(0, doorOff + doorW, arcR, -Math.PI / 2, 0);
          break;
        case "east":
          ctx.arc(canvasW, doorOff, arcR, Math.PI / 2, Math.PI);
          break;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Door label
      ctx.fillStyle = "#D97706";
      ctx.font = "600 9px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelX = d.wall === "west" ? -12 : d.wall === "east" ? canvasW + 12 : doorOff + doorW / 2;
      const labelY = d.wall === "north" ? -8 : d.wall === "south" ? canvasH + 8 : doorOff + doorW / 2;
      ctx.fillText(d.label || "Door", labelX, labelY);
      ctx.restore();
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

    // Stagger indicator
    if (staggerInches > 0 && result.planks.length > 1) {
      const rows = [...new Set(result.planks.map((p) => Math.round(p.y * 100) / 100))];
      if (rows.length >= 2) {
        const row1Y = rows[0] * scale;
        const row2Y = rows[1] * scale;
        const row1Planks = result.planks.filter((p) => Math.abs(p.y - rows[0]) < 0.01);
        const row1Left = row1Planks.length > 0 ? row1Planks[0].x : 0;
        const staggerFt = staggerInches / 12;
        const staggerPx = staggerFt * scale;

        if (staggerPx > 2) {
          const arrowY = row2Y + 2;
          const hx1 = row1Left * scale;
          const hx2 = (row1Left + staggerFt) * scale;

          ctx.save();
          ctx.strokeStyle = "#8B6F47";
          ctx.fillStyle = "#8B6F47";
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(hx1, arrowY);
          ctx.lineTo(hx2, arrowY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(hx2 - 4, arrowY - 3);
          ctx.lineTo(hx2, arrowY);
          ctx.lineTo(hx2 - 4, arrowY + 3);
          ctx.stroke();

          const labelText = `${staggerInches}" stagger`;
          ctx.font = "600 10px Satoshi, sans-serif";
          const metrics = ctx.measureText(labelText);
          const labelW = metrics.width + 8;
          const labelH = 14;
          const labelX = (hx1 + hx2) / 2;
          const labelY = arrowY - 4;

          ctx.fillStyle = "hsl(var(--background))";
          ctx.fillRect(labelX - labelW / 2, labelY - labelH, labelW, labelH);
          ctx.strokeStyle = "#8B6F47";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(labelX - labelW / 2, labelY - labelH, labelW, labelH);

          ctx.fillStyle = "#8B6F47";
          ctx.fillText(labelText, labelX, labelY - 2);
          ctx.restore();
        }
      }
    }
  }, [result, roomWidth, roomLength, pattern, staggerInches, roomShape, doorways, closets]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} className="rounded-lg shadow-md" />
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-[#D97706]" style={{ background: "#C68642" }}></span>
          Doorway cut
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-[#2563EB]" style={{ background: "#6B7E8C" }}></span>
          Closet area
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#7A6347" }}></span>
          Cut plank
        </span>
      </div>
    </div>
  );
};

export default LayoutCanvas;
