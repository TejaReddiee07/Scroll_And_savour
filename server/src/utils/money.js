// Money is stored as GBP numbers with two decimals, but all arithmetic happens in integer pence.

export const toPence = (gbp) => Math.round(Number(gbp) * 100);

export const fromPence = (pence) => Math.round(pence) / 100;

/** Rounds a GBP number to 2 decimals (guards against float noise such as 12.950000000001). */
export const roundGbp = (gbp) => fromPence(toPence(gbp));

/** True when a number has at most two decimal places. */
export const hasAtMostTwoDecimals = (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
