// Floor layout calculation engine
// Computes plank/tile placement, waste, and material quantities

export interface PlankRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  isCut: boolean;
  isFull: boolean;
}

export interface LayoutResult {
  planks: PlankRect[];
  totalPlanks: number;
  fullPlanks: number;
  cutPlanks: number;
  wastePercentage: number;
  materialNeeded: number; // in material units (boxes)
  materialArea: number; // sqft of material needed
  roomArea: number; // sqft
  cost: number;
  laborCost: number;
  totalCost: number;
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
}

const INCHES_PER_FOOT = 12;

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
  } = params;

  const roomArea = roomWidth * roomLength;
  const matWFt = materialWidth / INCHES_PER_FOOT;
  const matLFt = materialLength / INCHES_PER_FOOT;
  const plankArea = matWFt * matLFt;

  const planks: PlankRect[] = [];

  switch (pattern) {
    case "straight":
      layoutStraight(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
    case "diagonal":
      layoutDiagonal(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
    case "brick":
      layoutBrick(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
    case "herringbone":
      layoutHerringbone(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
    case "chevron":
      layoutChevron(planks, roomWidth, roomLength, matWFt, matLFt);
      break;
  }

  const totalPlanks = planks.length;
  const cutPlanks = planks.filter((p) => p.isCut).length;
  const fullPlanks = totalPlanks - cutPlanks;

  // Material area = sum of all plank areas
  const materialArea = planks.reduce((sum, p) => sum + p.w * p.h, 0);

  // With waste factor applied
  const materialWithWaste = materialArea * (1 + wasteFactor / 100);
  const wastePercentage = ((materialWithWaste - roomArea) / roomArea) * 100;

  // Box estimation (typical: covers 20 sqft for plank, 10 sqft for tile)
  const boxCoverage = materialWidth <= 6 ? 20 : 10; // planks ~20, tiles ~10
  const materialNeeded = Math.ceil(materialWithWaste / boxCoverage);

  const cost = materialWithWaste * pricePerSqft;
  const laborCost = roomArea * laborPerSqft;
  const totalCost = cost + laborCost;

  return {
    planks,
    totalPlanks,
    fullPlanks,
    cutPlanks,
    wastePercentage,
    materialNeeded,
    materialArea: materialWithWaste,
    roomArea,
    cost,
    laborCost,
    totalCost,
  };
}

function layoutStraight(
  planks: PlankRect[],
  rw: number,
  rl: number,
  mw: number,
  ml: number
) {
  let y = 0;
  let row = 0;
  while (y < rl) {
    const remainingHeight = rl - y;
    const plankH = Math.min(mw, remainingHeight);
    let x = 0;
    // Offset every other row for visual interest (subtle stagger)
    const offset = row % 2 === 0 ? 0 : ml / 2;
    x = -offset;
    while (x < rw) {
      const remainingWidth = rw - x;
      let plankW = Math.min(ml, remainingWidth);
      const isCut = plankW < ml - 0.01 || plankH < mw - 0.01;
      if (plankW > 0.01 && plankH > 0.01) {
        planks.push({
          x: Math.max(0, x),
          y,
          w: Math.min(plankW, rw - Math.max(0, x)),
          h: plankH,
          rotation: 0,
          isCut,
          isFull: !isCut,
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
  ml: number
) {
  let y = 0;
  let row = 0;
  while (y < rl) {
    const remainingHeight = rl - y;
    const plankH = Math.min(mw, remainingHeight);
    const offset = row % 2 === 0 ? 0 : ml / 2;
    let x = -offset;
    while (x < rw) {
      const remainingWidth = rw - x;
      const plankW = Math.min(ml, remainingWidth);
      const isCut = plankW < ml - 0.01 || plankH < mw - 0.01;
      if (plankW > 0.01 && plankH > 0.01) {
        planks.push({
          x: Math.max(0, x),
          y,
          w: Math.min(plankW, rw - Math.max(0, x)),
          h: plankH,
          rotation: 0,
          isCut,
          isFull: !isCut,
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
  ml: number
) {
  // Diagonal at 45 degrees — use a larger bounding area
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
    const offset = row % 2 === 0 ? 0 : ml / 2;
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
  // Herringbone: planks laid in V pattern
  const unitW = ml;
  const unitH = mw;
  // Create a grid of V-units
  const vWidth = unitW + unitH; // each V takes width = plank length + plank width
  const vHeight = unitW + unitH;

  let y = 0;
  let row = 0;
  while (y < rl + vHeight) {
    let x = row % 2 === 0 ? 0 : -vWidth / 2;
    while (x < rw + vWidth) {
      // Two planks forming a V
      // Plank 1: horizontal-ish
      planks.push({
        x: x,
        y: y,
        w: unitW,
        h: unitH,
        rotation: 0,
        isCut: true,
        isFull: false,
      });
      // Plank 2: vertical-ish, offset
      planks.push({
        x: x + unitW - unitH,
        y: y,
        w: unitH,
        h: unitW,
        rotation: 0,
        isCut: true,
        isFull: false,
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
  // Chevron: planks at 45 degrees meeting at center
  const centerX = rw / 2;
  const plankDiag = ml * 0.707; // projected length at 45deg

  // Left side going up-right
  let y = 0;
  let row = 0;
  while (y < rl + ml) {
    // Left planks
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
      });
      x += ml;
      col++;
    }
    // Right planks (mirrored)
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
  ],
  tile: [
    { name: "12\" Square", width: 12, length: 12, label: '12" x 12"' },
    { name: "18\" Square", width: 18, length: 18, label: '18" x 18"' },
    { name: "12\" x 24\" Rectangle", width: 12, length: 24, label: '12" x 24"' },
    { name: "24\" Square", width: 24, length: 24, label: '24" x 24"' },
    { name: "6\" x 36\" Plank Tile", width: 6, length: 36, label: '6" x 36"' },
  ],
  carpet: [
    { name: "12ft Roll", width: 144, length: 144, label: '12\' Roll' },
    { name: "15ft Roll", width: 180, length: 144, label: '15\' Roll' },
  ],
  sheet: [
    { name: "12ft Sheet", width: 144, length: 144, label: '12\' Sheet' },
    { name: "6ft Sheet", width: 72, length: 144, label: '6\' Sheet' },
  ],
};

export const PATTERN_INFO = {
  straight: { label: "Straight Lay", description: "Classic parallel installation", free: true },
  brick: { label: "Brick/Offset", description: "Staggered rows, 50% offset", free: false },
  diagonal: { label: "Diagonal", description: "45-degree angle installation", free: false },
  herringbone: { label: "Herringbone", description: "V-shaped pattern, premium look", free: false },
  chevron: { label: "Chevron", description: "Arrow pattern, high-end finish", free: false },
} as const;
