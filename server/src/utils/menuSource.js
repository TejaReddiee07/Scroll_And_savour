import { readFileSync } from 'node:fs';

/** The owner's transcribed menu (seed source). Read-only. */
export const menuSource = JSON.parse(readFileSync(new URL('../data/menu.json', import.meta.url), 'utf8'));
