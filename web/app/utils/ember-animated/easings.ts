// https://spicyyoghurt.com/tools/easing-functions

let b = 0; // start value
let c = 1; // change
let d = 1; // duration

export function easeOutQuad(time: number): number {
  return -c * (time /= d) * (time - 2) + b;
}

export function easeOutExpo(time: number) {
  return time == d ? b + c : c * (-Math.pow(2, (-10 * time) / d) + 1) + b;
}

export function easeOutBack(time: number) {
  let s = 1.70158;
  return c * ((time = time / d - 1) * time * ((s + 1) * time + s) + 1) + b;
}
