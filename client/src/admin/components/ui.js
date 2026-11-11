/** Shared Tailwind class recipes for the admin's light surfaces. */

export const ICON_BTN =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink/65 transition hover:bg-ink/[0.06] hover:text-fuji-red disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink/65';

export const ICON_BTN_DANGER =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink/65 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40';

export const BTN_DANGER =
  'btn btn-sm border border-red-700/30 text-red-700 hover:bg-red-50 hover:border-red-700/60';

export const BTN_GHOST =
  'btn btn-sm text-ink/75 hover:bg-ink/[0.06] hover:text-ink';

/** `.chip` adapted for light surfaces (pressed = Fuji red). */
export const CHIP_LIGHT =
  'chip border-ink/15 bg-rice text-ink/75 hover:border-fuji-red hover:text-fuji-red aria-pressed:border-fuji-red aria-pressed:bg-fuji-red aria-pressed:text-white aria-pressed:hover:text-white';

export const LINK =
  'font-medium text-fuji-red underline decoration-fuji-red/30 underline-offset-2 transition hover:decoration-fuji-red';

export const CARD = 'card-light';

/**
 * The global `svg { max-width: 100% }` base rule lets icons collapse to 0px inside
 * tight table cells/flex rows. Applied on every admin root (incl. portals).
 */
export const ICON_SAFE = '[&_svg.lucide]:max-w-none';
