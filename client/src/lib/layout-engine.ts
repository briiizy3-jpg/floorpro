// Floor layout calculation engine
// Computes plank/tile placement, waste, and material quantities
// Supports room shapes, doorways, closets, and stagger

export interface PlankRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  isCut: boolean;
  isFull: boolean;
  isDoorwayCut: boolean; // plank near a doorway needs special cut
  isClosetPlank: boolean; // plank inside a closet area
}

export interface Doorway {
  id: string;
  wall: "north" | "south" | "east" | "west";
  offset: number; // feet from corner
  width: number; // feet
  label: string;
}

export interface Closet {
  id: string;
  x: number; // feet from left
  y: number; // feet from top
  w: number; // width in feet
  h: number; // height in feet
  label: string;
  hasDoor: boolean;
  doorWall: "north" | "south" | "east" | "west" | null;
  doorOffset: number; // feet from closet corner
  doorWidth: number; // feet
}

export type RoomShape = "rectangular" | "square" | "l-shaped" | "octagonal" | "circular";

export interface LayoutResult {
  planks: PlankRect[];
  totalPlanks: number;
  fullPlanks: number;
  cutPlanks: number;
  doorwayCuts: number;
  closetPlanks: number;
  wastePercentage: number;
  materialNeeded: number; // in material units (boxes)
  materialArea: number; // sqft of material needed
  roomArea: number; // sqft
  closetArea: number; // sqft
  cost: number;
  laborCost: number;
  totalCost: number;
  cutList: CutItem[];
}

export interface CutItem {
  plankIndex: number;
  description: string;
  originalLength: number; // inches
  cutLength: number; // inches
  location: string;
  isDoorway: boolean;
}

export interface LayoutParams {
  roomWidth: number; // feet
  roomLength: number; // feet
  materialWidth: number; // inches
  materialLength: number; // inches
  pattern: "straight" | "diagonal" | "herringbone" | "chevron" | "brick";
  wasteFactor: number; // percentage (e.g. 10 = 10%)
  pricePerSqft: number; // $
  laborPerSqft: number; // $
  staggerInches: number; // drop-back per row in inches (default 12)
  roomShape: RoomShape;
  doorways: Doorway[];
  closets: Closet[];
}

const INCHES_PER_FOOT = 12;

// Check if a plank overlaps with a closet area
function plankInCloset(
  px: number, py: number, pw: number, ph: number,
  closets: Closet[]
): Closet | null {
  for (const c of closets) {
    if (px < c.x + c.w && px + pw > c.x && py < c.y + c.h && py + ph > c.y) {
      return c;
    }
  }
  return null;
}

// Check if a plank is near a doorway (within 1 foot)
function plankNearDoorway(
  px: number, py: number, pw: number, ph: number,
  roomWidth: number, roomLength: number,
  doorways: Doorway[]
): Doorway | null {
  const threshold = 1.0; // 1 foot threshold
  for (const d of doorways) {
    switch (d.wall) {
      case "north": // y ≈ 0
        if (py < threshold && px + pw > d.offset && px < d.offset + d.width) return d;
        break;
      case "south": // y ≈ roomLength
        if (py + ph > roomLength - threshold && px + pw > d.offset && px < d.offset + d.width) return d;
        break;
      case "west": // x ≈ 0
        if (px < threshold && py + ph > d.offset && py < d.offset + d.width) return d;
        break;
      case "east": // x ≈ roomWidth
        if (px + pw > roomWidth - threshold && py + ph > d.offset && py < d.offset + d.width) return d;
        break;
    }
  }
  return null;
}

// Check if a point is inside a room shape (for non-rectangular shapes)
function isInsideShape(
  x: number, y: number,
  rw: number, rl: number,
  shape: RoomShape
): boolean {
  switch (shape) {
    case "rectangular":
    case "square":
      return true;
    case "circular": {
      const cx = rw / 2, cy = rl / 2;
      const rx = rw / 2, ry = rl / 2;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }
    case "octagonal": {
      // Octagon: cut corners at 30% of each dimension
      const cutX = rw * 0.3;
      const cutY = rl * 0.3;
      // Check if point is in the corner triangles
      if (x < cutX && y < cutY) {
        // Bottom-left corner
        return (x / cutX) + (y / cutY) >= 1;
      }
      if (x > rw - cutX && y < cutY) {
        // Bottom-right corner
        return ((rw - x) / cutX) + (y / cutY) >= 1;
      }
      if (x < cutX && y > rl - cutY) {
        // Top-left corner
        return (x / cutX) + ((rl - y) / cutY) >= 1;
      }
      if (x > rw - cutX && y > rl - cutY) {
        // Top-right corner
        return ((rw - x) / cutX) + ((rl - y) / cutY) >= 1;
      }
      return true;
    }
    case "l-shaped": {
      // L-shape: bottom portion is wider, top portion is narrower
      // Assume the notch is in the top-right corner
      const notchW = rw * 0.4;
      const notchH = rl * 0.4;
      if (x > rw - notchW && y > rl - notchH) return false;
      return true;
    }
    default:
      return true;
  }
}

export function calculateLayout(params: LayoutParams): LayoutResult {
  const {
    roomWidth,
    roomLength,
    materialWidth,
    materialLength,
    pattern,
    wasteFactor,
    pricePerSqft,
    laborPerSqft,
    staggerInches = 12,
    roomShape = "rectangular",
    doorways = [],
    closets = [],
  } = params;

  // Calculate effective room area based on shape
  let roomArea = roomWidth * roomLength;
  let closetArea = 0;

  if (roomShape === "circular") {
    roomArea = Math.PI * (roomWidth / 2) * (roomLength / 2);
  } else if (roomShape === "octagonal") {
    const cutX = roomWidth * 0.3;
    const cutY = roomLength * 0.3;
    const cornerArea = 0.5 * cutX * cutY;
    roomArea = roomWidth * roomLength - 4 * cornerArea;
  } else if (roomShape === "l-shaped") {
    const notchW = roomWidth * 0.4;
    const notchH = roomLength * 0.4;
    roomArea = roomWidth * roomLength - notchW * notchH;
  }

  // Closet area
  for (const c of closets) {
    closetArea += c.w * c.h;
  }
  roomArea -= closetArea;

  const matWFt = materialWidth / INCHES_PER_FOOT;
  const matLFt = materialLength / INCHES_PER_FOOT;
  const plankArea = matWFt * matLFt;

  const planks: PlankRect[] = [];
  const cutList: CutItem[] = [];

  switch (pattern) {
    case "straight":
      layoutStraight(planks, roomWidth, roomLength, matWFt, matLFt, staggerInches, roomShape, doorways, closets);
      break;
    case "diagonal":
      layoutDiagonal(planks, roomWidth, roomLength, matWFt, matLFt, staggerInches);
      break;
    case "brick":
      layoutBrick(planks, roomWidth, roomLength, matWFt, matLFt, staggerInches, roomShape, doorways, closets);
      break;
    case "herringbone":
      layoutHerringbone(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
    case "chevron":
      layoutChevron(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
  }

  // Post-process: mark doorway and closet planks
  let doorwayCuts = 0;
  let closetPlanks = 0;

  planks.forEach((plank, i) => {
    const closet = plankInCloset(plank.x, plank.y, plank.w, plank.h, closets);
    const doorway = plankNearDoorway(plank.x, plank.y, plank.w, plank.h, roomWidth, roomLength, doorways);

    if (closet) {
      plank.isClosetPlank = true;
      closetPlanks++;
    }
    if (doorway) {
      plank.isDoorwayCut = true;
      doorwayCuts++;

      // Add to cut list
      const plankLenIn = plank.w * INCHES_PER_FOOT;
      cutList.push({
        plankIndex: i,
        description: `${doorway.label} — cut plank to fit door opening`,
        originalLength: Math.round(plankLenIn * 10) / 10,
        cutLength: Math.round(plankLenIn * 10) / 10,
        location: `${doorway.wall} wall, ${doorway.offset.toFixed(1)}' from corner`,
        isDoorway: true,
      });
    }
  });

  const totalPlanks = planks.length;
  const cutPlanks = planks.filter((p) => p.isCut || p.isDoorwayCut).length;
  const fullPlanks = totalPlanks - cutPlanks;

  // Material area = sum of all plank areas
  const materialArea = planks.reduce((sum, p) => sum + p.w * p.h, 0);

  // With waste factor applied
  const materialWithWaste = materialArea * (1 + wasteFactor / 100);
  const wastePercentage = ((materialWithWaste - roomArea) / roomArea) * 100;

  // Box estimation (typical: covers 20 sqft for plank, 10 sqft for tile)
  const boxCoverage = materialWidth <= 6 ? 20 : 10;
  const materialNeeded = Math.ceil(materialWithWaste / boxCoverage);

  const cost = materialWithWaste * pricePerSqft;
  const laborCost = roomArea * laborPerSqft;
  const totalCost = cost + laborCost;

  return {
    planks,
    totalPlanks,
    fullPlanks,
    cutPlanks,
    doorwayCuts,
    closetPlanks,
    wastePercentage,
    materialNeeded,
    materialArea: materialWithWaste,
    roomArea,
    closetArea,
    cost,
    laborCost,
    totalCost,
    cutList,
  };
}

function layoutStraight(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number,
  staggerIn: number = 12,
  shape: RoomShape = "rectangular",
  doorways: Doorway[] = [],
  closets: Closet[] = []
) {
  const staggerFt = staggerIn / 12;
  let y = 0;
  let row = 0;
  while (y < rl) {
    const remainingHeight = rl - y;
    const plankH = Math.min(mw, remainingHeight);
    const offset = (row * staggerFt) % ml;
    let x = -offset;
    while (x < rw) {
      const remainingWidth = rw - x;
      let plankW = Math.min(ml, remainingWidth);
      const isCut = plankW < ml - 0.01 || plankH < mw - 0.01;

      // Check if plank center is inside the room shape
      const cx = x + plankW / 2;
      const cy = y + plankH / 2;
      if (!isInsideShape(cx, cy, rw, rl, shape)) {
        x += ml;
        continue;
      }

      if (plankW > 0.01 && plankH > 0.01) {
        planks.push({
          x: Math.max(0, x),
          y,
          w: Math.min(plankW, rw - Math.max(0, x)),
          h: plankH,
          rotation: 0,
          isCut,
          isFull: !isCut,
          isDoorwayCut: false,
          isClosetPlank: false,
        });
      }
      x += ml;
    }
    y += mw;
    row++;
  }
}

function layoutBrick(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number,
  staggerIn: number = 12,
  shape: RoomShape = "rectangular",
  doorways: Doorway[] = [],
  closets: Closet[] = []
) {
  const staggerFt = staggerIn / 12;
  let y = 0;
  let row = 0;
  while (y < rl) {
    const remainingHeight = rl - y;
    const plankH = Math.min(mw, remainingHeight);
    const offset = (row * staggerFt) % ml;
    let x = -offset;
    while (x < rw) {
      const remainingWidth = rw - x;
      const plankW = Math.min(ml, remainingWidth);
      const isCut = plankW < ml - 0.01 || plankH < mw - 0.01;

      const cx = x + plankW / 2;
      const cy = y + plankH / 2;
      if (!isInsideShape(cx, cy, rw, rl, shape)) {
        x += ml;
        continue;
      }

      if (plankW > 0.01 && plankH > 0.01) {
        planks.push({
          x: Math.max(0, x),
          y,
          w: Math.min(plankW, rw - Math.max(0, x)),
          h: plankH,
          rotation: 0,
          isCut,
          isFull: !isCut,
          isDoorwayCut: false,
          isClosetPlank: false,
        });
      }
      x += ml;
    }
    y += mw;
    row++;
  }
}

function layoutDiagonal(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number,
  staggerIn: number = 12
) {
  const diag = Math.sqrt(rw * rw + rl * rl);
  const cushion = diag * 0.3;
  const totalW = diag + cushion * 2;
  const totalH = diag + cushion * 2;
  const centerX = totalW / 2;
  const centerY = totalH / 2;

  let y = 0;
  let row = 0;
  while (y < totalH) {
    const plankH = Math.min(mw, totalH - y);
    const offset = (row * (staggerIn / 12)) % ml;
    let x = -offset;
    while (x < totalW) {
      const plankW = Math.min(ml, totalW - x);
      if (plankW > 0.01 && plankH > 0.01) {
        planks.push({
          x: centerX - rw / 2 + (x - totalW / 2) * 0.707 - (y - totalH / 2) * 0.707,
          y: centerY - rl / 2 + (x - totalW / 2) * 0.707 + (y - totalH / 2) * 0.707,
          w: plankW,
          h: plankH,
          rotation: 45,
          isCut: true,
          isFull: false,
          isDoorwayCut: false,
          isClosetPlank: false,
        });
      }
      x += ml;
    }
    y += mw;
    row++;
  }
}

function layoutHerringbone(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number
) {
  const unitW = ml;
  const unitH = mw;
  const vWidth = unitW + unitH;
  const vHeight = unitW + unitH;

  let y = 0;
  let row = 0;
  while (y < rl + vHeight) {
    let x = row % 2 === 0 ? 0 : -vWidth / 2;
    while (x < rw + vWidth) {
      planks.push({
        x: x,
        y: y,
        w: unitW,
        h: unitH,
        rotation: 0,
        isCut: true,
        isFull: false,
        isDoorwayCut: false,
        isClosetPlank: false,
      });
      planks.push({
        x: x + unitW - unitH,
        y: y,
        w: unitH,
        h: unitW,
        rotation: 0,
        isCut: true,
        isFull: false,
        isDoorwayCut: false,
        isClosetPlank: false,
      });
      x += vWidth;
    }
    y += vHeight;
    row++;
  }
}

function layoutChevron(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number
) {
  const centerX = rw / 2;

  let y = 0;
  let row = 0;
  while (y < rl + ml) {
    let x = 0;
    let col = 0;
    while (x < centerX) {
      planks.push({
        x: x,
        y: y,
        w: Math.min(ml, centerX - x),
        h: mw,
        rotation: 0,
        isCut: true,
        isFull: false,
        isDoorwayCut: false,
        isClosetPlank: false,
      });
      x += ml;
      col++;
    }
    x = centerX;
    while (x < rw) {
      planks.push({
        x: x,
        y: y,
        w: Math.min(ml, rw - x),
        h: mw,
        rotation: 0,
        isCut: true,
        isFull: false,
        isDoorwayCut: false,
        isClosetPlank: false,
      });
      x += ml;
    }
    y += mw;
    row++;
  }
}

// Material type presets
export const MATERIAL_PRESETS = {
  plank: [
    { name: "Standard Plank", width: 5, length: 48, label: '5" x 48"' },
    { name: "Wide Plank", width: 7, length: 48, label: '7" x 48"' },
    { name: "Luxury Plank", width: 9, length: 60, label: '9" x 60"' },
    { name: "Narrow Strip", width: 3, length: 36, label: '3" x 36"' },
    { name: "Extra Wide Plank", width: 12, length: 84, label: '12" x 84"' },
  ],
  tile: [
    { name: '12" Square', width: 12, length: 12, label: '12" x 12"' },
    { name: '18" Square', width: 18, length: 18, label: '18" x 18"' },
    { name: '12" x 24" Rectangle', width: 12, length: 24, label: '12" x 24"' },
    { name: '24" Square', width: 24, length: 24, label: '24" x 24"' },
    { name: '6" x 36" Plank Tile', width: 6, length: 36, label: '6" x 36"' },
    { name: '24" x 48" Large Format', width: 24, length: 48, label: '24" x 48"' },
    { name: '8" x 48" Wood-Look Tile', width: 8, length: 48, label: '8" x 48"' },
  ],
  carpet: [
    { name: "12ft Roll", width: 144, length: 144, label: "12' Roll" },
    { name: "15ft Roll", width: 180, length: 144, label: "15' Roll" },
    { name: "6ft Carpet Square", width: 72, length: 72, label: "6' Square" },
  ],
  sheet: [
    { name: "12ft Sheet", width: 144, length: 144, label: "12' Sheet" },
    { name: "6ft Sheet", width: 72, length: 144, label: "6' Sheet" },
  ],
  hardwood: [
    { name: '2-1/4" Strip', width: 2.25, length: 84, label: '2-1/4" x 7\'' },
    { name: '3-1/4" Plank', width: 3.25, length: 84, label: '3-1/4" x 7\'' },
    { name: '4" Plank', width: 4, length: 84, label: '4" x 7\'' },
    { name: '5" Wide Plank', width: 5, length: 84, label: '5" x 7\'' },
    { name: '6" Extra Wide', width: 6, length: 96, label: '6" x 8\'' },
    { name: '7" Engineered', width: 7, length: 96, label: '7" x 8\'' },
  ],
  stone: [
    { name: '12" Travertine', width: 12, length: 12, label: '12" Travertine' },
    { name: '16" Marble', width: 16, length: 16, label: '16" Marble' },
    { name: '18" Slate', width: 18, length: 18, label: '18" Slate' },
    { name: '24" Granite', width: 24, length: 24, label: '24" Granite' },
    { name: '12" x 24" Slate', width: 12, length: 24, label: '12" x 24" Slate' },
    { name: '6" x 24" Travertine', width: 6, length: 24, label: '6" x 24" Travertine' },
  ],
  linoleum: [
    { name: "12ft Sheet Linoleum", width: 144, length: 144, label: "12' Sheet" },
    { name: '13" x 13" Linoleum Tile', width: 13, length: 13, label: '13" x 13"' },
    { name: '20" x 20" Linoleum Tile', width: 20, length: 20, label: '20" x 20"' },
  ],
  cork: [
    { name: '12" x 12" Cork Tile', width: 12, length: 12, label: '12" x 12"' },
    { name: '12" x 24" Cork Plank', width: 12, length: 24, label: '12" x 24"' },
    { name: '12" x 36" Cork Plank', width: 12, length: 36, label: '12" x 36"' },
  ],
  bamboo: [
    { name: '3-3/4" Strand', width: 3.75, length: 72, label: '3-3/4" x 6\'' },
    { name: '5" Wide Plank', width: 5, length: 72, label: '5" x 6\'' },
    { name: '5" x 72" Carbonized', width: 5, length: 72, label: '5" x 6\' Carbonized' },
  ],
};

export const SHAPE_INFO: Record<RoomShape, { label: string; description: string }> = {
  rectangular: { label: "Rectangular", description: "Standard rectangular room" },
  square: { label: "Square", description: "Equal width and length" },
  "l-shaped": { label: "L-Shape", description: "L-shaped room with cutout" },
  octagonal: { label: "Octagonal", description: "8-sided room (turret/bay)" },
  circular: { label: "Circular", description: "Round room or column" },
};

export const PATTERN_INFO = {
  straight: { label: "Straight Lay", description: "Classic parallel installation", free: true },
  brick: { label: "Brick/Offset", description: "Staggered rows, 50% offset", free: false },
  diagonal: { label: "Diagonal", description: "45-degree angle installation", free: false },
  herringbone: { label: "Herringbone", description: "V-shaped pattern, premium look", free: false },
  chevron: { label: "Chevron", description: "Arrow pattern, high-end finish", free: false },
} as const;
