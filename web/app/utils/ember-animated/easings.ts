// https://spicyyoghurt.com/tools/easing-functions

let b = 0; // start value
let c = 1; // change
let d = 1; // duration

export function easeOutQuad(time: number): number {
  return -c * (time /= d) * (time - 2) + b;
}
