// Unit formatting utility — converts feet to the display unit

export type DisplayUnit = "ft" | "in";

/** Format a dimension in feet as a string in the chosen unit */
export function fmtDim(feet: number, unit: DisplayUnit): string {
  if (unit === "in") {
    return `${Math.round(feet * 12)}"`;
  }
  return `${feet}'`;
}

/** Format a dimension showing both units */
export function fmtDimBoth(feet: number, unit: DisplayUnit): string {
  if (unit === "in") {
    return `${Math.round(feet * 12)}" (${feet}')`;
  }
  return `${feet}' (${Math.round(feet * 12)}")`;
}
