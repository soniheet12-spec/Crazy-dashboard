// Module-level reduce-motion flag, set from settings by a provider effect and
// read by animation-heavy components (e.g. the celebration confetti).
let reduce = false;

export function setReduceMotion(value: boolean) {
  reduce = value;
}

export function getReduceMotion(): boolean {
  return reduce;
}
