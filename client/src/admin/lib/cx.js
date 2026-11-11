/** Join truthy class names. */
export function cx(...args) {
  return args.flat(Infinity).filter(Boolean).join(' ');
}
