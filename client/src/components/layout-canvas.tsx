import { useRef, useEffect, useState, useCallback, type FC } from "react";
import type { LayoutResult, PlankRect, Doorway, Closet, RoomShape, TrimType, Obstacle } from "@/lib/layout-engine";
import { TRIM_INFO, OBSTACLE_INFO } from "@/lib/layout-engine";
import { fmtDim, type DisplayUnit } from "@/lib/units";

interface LayoutCanvasProps {
  result: LayoutResult;
  roomWidth: number;
  roomLength: number;
  pattern: string;
  staggerInches?: number;
  roomShape?: RoomShape;
  doorways?: Doorway[];
  closets?: Closet[];
  obstacles?: Obstacle[];
  unit?: DisplayUnit;
  onDoorwayMove?: (id: string, offset: number) => void;
  onClosetMove?: (id: string, x: number, y: number) => void;
  onClosetResize?: (id: string, w: number, h: number) => void;
  onObstacleMove?: (id: string, x: number, y: number) => void;
  onObstacleResize?: (id: string, w: number, h: number) => void;
  onResizeRoom?: (width: number, length: number) => void;
}

type DragTarget =
  | { type: "doorway"; id: string; wall: string }
  | { type: "closet"; id: string }
  | { type: "closet-resize"; id: string }
  | { type: "obstacle"; id: string }
  | { type: "obstacle-resize"; id: string }
  | { type: "wall"; wall: "east" | "south" }
  | null;

const LayoutCanvas: FC<LayoutCanvasProps> = ({
  result,
  roomWidth,
  roomLength,
  pattern,
  staggerInches = 0,
  roomShape = "rectangular",
  doorways = [],
  closets = [],
  obstacles = [],
  unit = "ft",
  onDoorwayMove,
  onClosetMove,
  onClosetResize,
  onObstacleMove,
  onObstacleResize,
  onResizeRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [hoverTarget, setHoverTarget] = useState<DragTarget>(null);
  const scaleRef = useRef(1);
  const padRef = useRef(30);

  const getRoomCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const pad = padRef.current;
      const scale = scaleRef.current;
      const x = (clientX - rect.left - pad) / scale;
      const y = (clientY - rect.top - pad) / scale;
      return { x, y };
    },
    []
  );

  // Check if a point is on a doorway
  const hitTestDoorway = useCallback(
    (px: number, py: number): DragTarget | null => {
      const threshold = 1.5; // feet
      for (const d of doorways) {
        const doorW = d.width;
        const doorOff = d.offset;
        switch (d.wall) {
          case "north":
            if (py < threshold && px >= doorOff - 0.5 && px <= doorOff + doorW + 0.5)
              return { type: "doorway", id: d.id, wall: d.wall };
            break;
          case "south":
            if (py > roomLength - threshold && px >= doorOff - 0.5 && px <= doorOff + doorW + 0.5)
              return { type: "doorway", id: d.id, wall: d.wall };
            break;
          case "west":
            if (px < threshold && py >= doorOff - 0.5 && py <= doorOff + doorW + 0.5)
              return { type: "doorway", id: d.id, wall: d.wall };
            break;
          case "east":
            if (px > roomWidth - threshold && py >= doorOff - 0.5 && py <= doorOff + doorW + 0.5)
              return { type: "doorway", id: d.id, wall: d.wall };
            break;
        }
      }
      return null;
    },
    [doorways, roomWidth, roomLength]
  );

  // Check if a point is on a closet or its resize handle
  const hitTestCloset = useCallback(
    (px: number, py: number): DragTarget | null => {
      const handleSize = 1.0; // feet
      for (const c of closets) {
        if (
          px >= c.x + c.w - handleSize &&
          px <= c.x + c.w + handleSize &&
          py >= c.y + c.h - handleSize &&
          py <= c.y + c.h + handleSize
        ) {
          return { type: "closet-resize", id: c.id };
        }
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
          return { type: "closet", id: c.id };
        }
      }
      return null;
    },
    [closets]
  );

  // Check if a point is on an obstacle or its resize handle
  const hitTestObstacle = useCallback(
    (px: number, py: number): DragTarget | null => {
      const handleSize = 1.0;
      for (const o of obstacles) {
        if (
          px >= o.x + o.w - handleSize &&
          px <= o.x + o.w + handleSize &&
          py >= o.y + o.h - handleSize &&
          py <= o.y + o.h + handleSize
        ) {
          return { type: "obstacle-resize", id: o.id };
        }
        if (px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) {
          return { type: "obstacle", id: o.id };
        }
      }
      return null;
    },
    [obstacles]
  );

  // Check if a point is on a wall drag handle
  const hitTestWall = useCallback(
    (px: number, py: number): DragTarget | null => {
      const threshold = 1.0; // feet
      // East wall (right side) — resize width
      if (Math.abs(px - roomWidth) < threshold && py > 1 && py < roomLength - 1) {
        return { type: "wall", wall: "east" };
      }
      // South wall (bottom) — resize length
      if (Math.abs(py - roomLength) < threshold && px > 1 && px < roomWidth - 1) {
        return { type: "wall", wall: "south" };
      }
      return null;
    },
    [roomWidth, roomLength]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = getRoomCoords(e.clientX, e.clientY);
      // Check obstacles first
      const obstacleHit = hitTestObstacle(x, y);
      if (obstacleHit) {
        setDragTarget(obstacleHit);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      // Check closets
      const closetHit = hitTestCloset(x, y);
      if (closetHit) {
        setDragTarget(closetHit);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      // Check doorways
      const doorwayHit = hitTestDoorway(x, y);
      if (doorwayHit) {
        setDragTarget(doorwayHit);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      // Check walls (lowest priority)
      const wallHit = hitTestWall(x, y);
      if (wallHit) {
        setDragTarget(wallHit);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [getRoomCoords, hitTestCloset, hitTestDoorway]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = getRoomCoords(e.clientX, e.clientY);

      // Update hover state
      if (!dragTarget) {
        const hit = hitTestObstacle(x, y) || hitTestCloset(x, y) || hitTestDoorway(x, y) || hitTestWall(x, y);
        const hitId = hit?.id || null;
        setHoverTarget((prev) => {
          if (prev?.id === hitId && prev?.type === hit?.type) return prev;
          return hit;
        });
        return;
      }

      if (dragTarget.type === "doorway") {
        const doorway = doorways.find((d) => d.id === dragTarget.id);
        if (!doorway) return;
        let newOffset: number;
        if (doorway.wall === "north" || doorway.wall === "south") {
          newOffset = Math.max(0, Math.min(roomWidth - doorway.width, x - doorway.width / 2));
        } else {
          newOffset = Math.max(0, Math.min(roomLength - doorway.width, y - doorway.width / 2));
        }
        onDoorwayMove?.(dragTarget.id, newOffset);
      } else if (dragTarget.type === "closet") {
        const closet = closets.find((c) => c.id === dragTarget.id);
        if (!closet) return;
        const newX = Math.max(0, Math.min(roomWidth - closet.w, x - closet.w / 2));
        const newY = Math.max(0, Math.min(roomLength - closet.h, y - closet.h / 2));
        onClosetMove?.(dragTarget.id, newX, newY);
      } else if (dragTarget.type === "closet-resize") {
        const closet = closets.find((c) => c.id === dragTarget.id);
        if (!closet) return;
        const newW = Math.max(2, Math.min(roomWidth - closet.x, x - closet.x));
        const newH = Math.max(2, Math.min(roomLength - closet.y, y - closet.y));
        onClosetResize?.(dragTarget.id, newW, newH);
      } else if (dragTarget.type === "obstacle") {
        const obstacle = obstacles.find((o) => o.id === dragTarget.id);
        if (!obstacle) return;
        const newX = Math.max(0, Math.min(roomWidth - obstacle.w, x - obstacle.w / 2));
        const newY = Math.max(0, Math.min(roomLength - obstacle.h, y - obstacle.h / 2));
        onObstacleMove?.(dragTarget.id, newX, newY);
      } else if (dragTarget.type === "obstacle-resize") {
        const obstacle = obstacles.find((o) => o.id === dragTarget.id);
        if (!obstacle) return;
        const newW = Math.max(1, Math.min(roomWidth - obstacle.x, x - obstacle.x));
        const newH = Math.max(1, Math.min(roomLength - obstacle.y, y - obstacle.y));
        onObstacleResize?.(dragTarget.id, newW, newH);
      } else if (dragTarget.type === "wall") {
        if (dragTarget.wall === "east") {
          onResizeRoom?.(Math.max(2, Math.round(x * 10) / 10), roomLength);
        } else if (dragTarget.wall === "south") {
          onResizeRoom?.(roomWidth, Math.max(2, Math.round(y * 10) / 10));
        }
      }
    },
    [getRoomCoords, dragTarget, doorways, closets, obstacles, roomWidth, roomLength, onDoorwayMove, onClosetMove, onClosetResize, onObstacleMove, onObstacleResize, onResizeRoom, hitTestObstacle, hitTestCloset, hitTestDoorway, hitTestWall]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setDragTarget(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const maxWidth = (container?.clientWidth || 600) - 40;
    const maxHeight = 500;

    const scaleX = maxWidth / roomWidth;
    const scaleY = maxHeight / roomLength;
    const scale = Math.min(scaleX, scaleY);
    scaleRef.current = scale;

    const canvasW = roomWidth * scale;
    const canvasH = roomLength * scale;
    const padX = 30;
    const padY = 20;
    padRef.current = padX;

    canvas.width = (canvasW + padX * 2) * dpr;
    canvas.height = (canvasH + padY * 2) * dpr;
    canvas.style.width = `${canvasW + padX * 2}px`;
    canvas.style.height = `${canvasH + padY * 2}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(padX, padY);

    ctx.clearRect(-padX, -padY, canvasW + padX * 2, canvasH + padY * 2);

    // Background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Room shape outline
    ctx.save();
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2.5;

    if (roomShape === "circular") {
      ctx.beginPath();
      ctx.ellipse(canvasW / 2, canvasH / 2, canvasW / 2, canvasH / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
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

    // Plank colors
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

      ctx.fillStyle = color;
      ctx.fillRect(px, py, pw, ph);

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

      if (plank.isDoorwayCut) {
        ctx.strokeStyle = "#D97706";
        ctx.lineWidth = 1.5;
      } else if (plank.isClosetPlank) {
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

    result.planks.forEach((plank, i) => {
      let color = plank.isCut ? "#7A6347" : colors[i % colors.length];
      if (plank.isClosetPlank) color = "#6B7E8C";
      if (plank.isDoorwayCut) color = "#C68642";
      if (plank.isObstacleCut) color = "#A0522D";
      drawPlank(plank, color);
    });

    // Draw closets
    closets.forEach((c) => {
      const cx = c.x * scale;
      const cy = c.y * scale;
      const cw = c.w * scale;
      const ch = c.h * scale;
      const isHovered = hoverTarget?.id === c.id && (hoverTarget.type === "closet" || hoverTarget.type === "closet-resize");
      const isDragging = dragTarget?.id === c.id;

      ctx.save();
      ctx.strokeStyle = isDragging || isHovered ? "#1D4ED8" : "#2563EB";
      ctx.lineWidth = isDragging ? 2.5 : isHovered ? 2 : 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(cx, cy, cw, ch);

      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
      ctx.fillRect(cx, cy, cw, ch);

      ctx.fillStyle = "#2563EB";
      ctx.font = "600 10px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label || "Closet", cx + cw / 2, cy + ch / 2 - 6);

      // Dimension labels (width on bottom, height on right)
      ctx.font = "500 8px Satoshi, sans-serif";

      // Width label
      const cwLabel = fmtDim(c.w, unit);
      const cwMetrics = ctx.measureText(cwLabel);
      const cwLabelW = cwMetrics.width + 6;
      const cwLabelH = 10;
      const cwLabelX = cx + cw / 2;
      const cwLabelY = cy + ch + 7;
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(cwLabelX - cwLabelW / 2, cwLabelY - cwLabelH / 2, cwLabelW, cwLabelH);
      ctx.fillStyle = "#2563EB";
      ctx.fillText(cwLabel, cwLabelX, cwLabelY);

      // Height label (rotated)
      const chLabel = fmtDim(c.h, unit);
      ctx.save();
      ctx.translate(cx + cw + 7, cy + ch / 2);
      ctx.rotate(Math.PI / 2);
      const chMetrics = ctx.measureText(chLabel);
      const chLabelW = chMetrics.width + 6;
      const chLabelH = 10;
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(-chLabelW / 2, -chLabelH / 2, chLabelW, chLabelH);
      ctx.fillStyle = "#2563EB";
      ctx.fillText(chLabel, 0, 0);
      ctx.restore();

      // Dimension lines
      ctx.strokeStyle = "#2563EB66";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cx, cy + ch + 2);
      ctx.lineTo(cx + cw, cy + ch + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + cw + 2, cy);
      ctx.lineTo(cx + cw + 2, cy + ch);
      ctx.stroke();
      ctx.setLineDash([]);

      // Resize handle (bottom-right corner)
      const handleR = 6;
      ctx.fillStyle = isHovered && hoverTarget?.type === "closet-resize" ? "#1D4ED8" : "#2563EB";
      ctx.beginPath();
      ctx.arc(cx + cw, cy + ch, handleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Door opening
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

        // Closet door trim
        if (c.trimType && c.trimType !== "none") {
          const trimInfo = TRIM_INFO[c.trimType as TrimType];
          ctx.strokeStyle = "#6B4F2A";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          const inset = 3;
          switch (c.doorWall) {
            case "north":
              ctx.moveTo(cx + c.doorOffset * scale, cy + inset);
              ctx.lineTo(cx + (c.doorOffset + c.doorWidth) * scale, cy + inset);
              break;
            case "south":
              ctx.moveTo(cx + c.doorOffset * scale, cy + ch - inset);
              ctx.lineTo(cx + (c.doorOffset + c.doorWidth) * scale, cy + ch - inset);
              break;
            case "west":
              ctx.moveTo(cx + inset, cy + c.doorOffset * scale);
              ctx.lineTo(cx + inset, cy + (c.doorOffset + c.doorWidth) * scale);
              break;
            case "east":
              ctx.moveTo(cx + cw - inset, cy + c.doorOffset * scale);
              ctx.lineTo(cx + cw - inset, cy + (c.doorOffset + c.doorWidth) * scale);
              break;
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // Draw obstacles (counters, cabinets, islands, built-ins)
    obstacles.forEach((o) => {
      const ox = o.x * scale;
      const oy = o.y * scale;
      const ow = o.w * scale;
      const oh = o.h * scale;
      const info = OBSTACLE_INFO[o.type];
      const isHovered = hoverTarget?.id === o.id && (hoverTarget.type === "obstacle" || hoverTarget.type === "obstacle-resize");
      const isDragging = dragTarget?.id === o.id;

      ctx.save();
      // Fill with obstacle-type color
      ctx.fillStyle = info.color + "33"; // semi-transparent
      ctx.fillRect(ox, oy, ow, oh);

      // Border
      ctx.strokeStyle = isDragging ? "#000" : isHovered ? info.color : info.color + "aa";
      ctx.lineWidth = isDragging ? 2.5 : isHovered ? 2 : 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(ox, oy, ow, oh);

      // Cross-hatch pattern to indicate obstacle
      ctx.strokeStyle = info.color + "22";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < ow + oh; i += 6) {
        ctx.beginPath();
        ctx.moveTo(ox + i, oy);
        ctx.lineTo(ox + i - oh, oy + oh);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = info.color;
      ctx.font = "600 9px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.label || info.label, ox + ow / 2, oy + oh / 2 - 6);

      // Dimension labels (width on bottom edge, height on right edge)
      ctx.font = "500 8px Satoshi, sans-serif";
      ctx.fillStyle = info.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Width label (bottom edge, centered)
      const wLabel = fmtDim(o.w, unit);
      const wMetrics = ctx.measureText(wLabel);
      const wLabelW = wMetrics.width + 6;
      const wLabelH = 10;
      const wLabelX = ox + ow / 2;
      const wLabelY = oy + oh + 7;
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(wLabelX - wLabelW / 2, wLabelY - wLabelH / 2, wLabelW, wLabelH);
      ctx.fillStyle = info.color;
      ctx.fillText(wLabel, wLabelX, wLabelY);

      // Height label (right edge, centered, rotated)
      const hLabel = fmtDim(o.h, unit);
      ctx.save();
      ctx.translate(ox + ow + 7, oy + oh / 2);
      ctx.rotate(Math.PI / 2);
      const hMetrics = ctx.measureText(hLabel);
      const hLabelW = hMetrics.width + 6;
      const hLabelH = 10;
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(-hLabelW / 2, -hLabelH / 2, hLabelW, hLabelH);
      ctx.fillStyle = info.color;
      ctx.fillText(hLabel, 0, 0);
      ctx.restore();

      // Dimension lines (thin arrows showing extent)
      ctx.strokeStyle = info.color + "66";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      // Width line (below obstacle)
      ctx.beginPath();
      ctx.moveTo(ox, oy + oh + 2);
      ctx.lineTo(ox + ow, oy + oh + 2);
      ctx.stroke();
      // Height line (right of obstacle)
      ctx.beginPath();
      ctx.moveTo(ox + ow + 2, oy);
      ctx.lineTo(ox + ow + 2, oy + oh);
      ctx.stroke();
      ctx.setLineDash([]);

      // Resize handle (bottom-right corner)
      const handleR = 6;
      ctx.fillStyle = isHovered && hoverTarget?.type === "obstacle-resize" ? info.color : info.color + "cc";
      ctx.beginPath();
      ctx.arc(ox + ow, oy + oh, handleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // Draw wall drag handles (right and bottom edges)
    if (onResizeRoom && roomShape !== "circular" && roomShape !== "octagonal") {
      const handleSize = 8;
      ctx.save();
      // East wall handle
      const eastHovered = hoverTarget?.type === "wall" && hoverTarget.wall === "east";
      const eastDragging = dragTarget?.type === "wall" && dragTarget.wall === "east";
      ctx.fillStyle = eastDragging ? "#6B4F2A" : eastHovered ? "#8B6F47" : "rgba(107, 79, 42, 0.4)";
      ctx.fillRect(canvasW - handleSize / 2, canvasH / 3, handleSize, canvasH / 3);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasW - handleSize / 2, canvasH / 3, handleSize, canvasH / 3);

      // South wall handle
      const southHovered = hoverTarget?.type === "wall" && hoverTarget.wall === "south";
      const southDragging = dragTarget?.type === "wall" && dragTarget.wall === "south";
      ctx.fillStyle = southDragging ? "#6B4F2A" : southHovered ? "#8B6F47" : "rgba(107, 79, 42, 0.4)";
      ctx.fillRect(canvasW / 3, canvasH - handleSize / 2, canvasW / 3, handleSize);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasW / 3, canvasH - handleSize / 2, canvasW / 3, handleSize);
      ctx.restore();
    }

    // Draw doorways
    doorways.forEach((d) => {
      const doorW = d.width * scale;
      const doorOff = d.offset * scale;
      const isHovered = hoverTarget?.id === d.id;
      const isDragging = dragTarget?.id === d.id;

      ctx.save();
      ctx.strokeStyle = isDragging ? "#B45309" : isHovered ? "#D97706" : "#D97706";
      ctx.lineWidth = isDragging ? 6 : isHovered ? 5 : 4;

      ctx.beginPath();
      switch (d.wall) {
        case "north":
          ctx.moveTo(doorOff, 0);
          ctx.lineTo(doorOff + doorW, 0);
          break;
        case "south":
          ctx.moveTo(doorOff, canvasH);
          ctx.lineTo(doorOff + doorW, canvasH);
          break;
        case "west":
          ctx.moveTo(0, doorOff);
          ctx.lineTo(0, doorOff + doorW);
          break;
        case "east":
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

      // Drag handle indicator (circle at center of door)
      const handleR = isHovered || isDragging ? 6 : 4;
      let hx = 0, hy = 0;
      switch (d.wall) {
        case "north": hx = doorOff + doorW / 2; hy = 0; break;
        case "south": hx = doorOff + doorW / 2; hy = canvasH; break;
        case "west": hx = 0; hy = doorOff + doorW / 2; break;
        case "east": hx = canvasW; hy = doorOff + doorW / 2; break;
      }
      ctx.fillStyle = isDragging ? "#B45309" : isHovered ? "#D97706" : "rgba(217, 119, 6, 0.7)";
      ctx.beginPath();
      ctx.arc(hx, hy, handleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#D97706";
      ctx.font = "600 9px Satoshi, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelX = d.wall === "west" ? -12 : d.wall === "east" ? canvasW + 12 : doorOff + doorW / 2;
      const labelY = d.wall === "north" ? -8 : d.wall === "south" ? canvasH + 8 : doorOff + doorW / 2;
      ctx.fillText(`${d.label || "Door"} (${fmtDim(d.width, unit)})`, labelX, labelY);

      // Draw transition trim if set
      if (d.trimType && d.trimType !== "none") {
        const trimInfo = TRIM_INFO[d.trimType as TrimType];
        const trimColor = "#6B4F2A"; // dark brown for trim
        const trimThick = 3;

        ctx.strokeStyle = trimColor;
        ctx.lineWidth = trimThick;
        ctx.setLineDash([]);
        ctx.beginPath();
        // Draw trim just inside the wall, parallel to the doorway
        const inset = 3; // pixels inside the room
        switch (d.wall) {
          case "north":
            ctx.moveTo(doorOff, inset);
            ctx.lineTo(doorOff + doorW, inset);
            break;
          case "south":
            ctx.moveTo(doorOff, canvasH - inset);
            ctx.lineTo(doorOff + doorW, canvasH - inset);
            break;
          case "west":
            ctx.moveTo(inset, doorOff);
            ctx.lineTo(inset, doorOff + doorW);
            break;
          case "east":
            ctx.moveTo(canvasW - inset, doorOff);
            ctx.lineTo(canvasW - inset, doorOff + doorW);
            break;
        }
        ctx.stroke();

        // Trim label
        ctx.fillStyle = trimColor;
        ctx.font = "500 8px Satoshi, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let tLx = 0, tLy = 0;
        switch (d.wall) {
          case "north": tLx = doorOff + doorW / 2; tLy = inset + 8; break;
          case "south": tLx = doorOff + doorW / 2; tLy = canvasH - inset - 8; break;
          case "west": tLx = inset + 8; tLy = doorOff + doorW / 2; break;
          case "east": tLx = canvasW - inset - 8; tLy = doorOff + doorW / 2; break;
        }
        // Small background for readability
        const tText = `${trimInfo.label} (${fmtDim(d.width, unit)})`;
        ctx.font = "500 8px Satoshi, sans-serif";
        const tMetrics = ctx.measureText(tText);
        const tW = tMetrics.width + 6;
        const tH = 10;
        ctx.fillStyle = "hsl(var(--background))";
        ctx.fillRect(tLx - tW / 2, tLy - tH / 2, tW, tH);
        ctx.fillStyle = trimColor;
        ctx.fillText(tText, tLx, tLy);
      }

      ctx.restore();
    });

    // Dimension labels
    ctx.fillStyle = "hsl(var(--foreground))";
    ctx.font = "600 12px Satoshi, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtDim(roomWidth, unit), canvasW / 2, canvasH + 16);
    ctx.save();
    ctx.translate(-16, canvasH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(fmtDim(roomLength, unit), 0, 0);
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

          const labelText = unit === "in" ? `${staggerInches}" stagger` : `${(staggerInches / 12).toFixed(1)}' stagger`;
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
  }, [result, roomWidth, roomLength, pattern, staggerInches, roomShape, doorways, closets, obstacles, unit, hoverTarget, dragTarget, onResizeRoom]);

  const cursor = dragTarget
    ? dragTarget.type === "closet-resize" || dragTarget.type === "obstacle-resize"
      ? "nwse-resize"
      : dragTarget.type === "wall"
        ? dragTarget.wall === "east" ? "ew-resize" : "ns-resize"
        : "grabbing"
    : hoverTarget
      ? hoverTarget.type === "closet-resize" || hoverTarget.type === "obstacle-resize"
        ? "nwse-resize"
        : hoverTarget.type === "wall"
          ? hoverTarget.wall === "east" ? "ew-resize" : "ns-resize"
          : "grab"
      : "default";

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        className="rounded-lg shadow-md touch-none select-none"
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
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
        <span className="flex items-center gap-1">
          <span className="w-3 h-1 rounded" style={{ background: "#6B4F2A" }}></span>
          Transition trim
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#A0522D" }}></span>
          Obstacle cut
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "#8B6F47" }}></span>
          Counter/cabinet
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Drag walls to resize · Drag doorways/closets/obstacles to move · Drag corners to resize
      </p>
    </div>
  );
};

export default LayoutCanvas;
