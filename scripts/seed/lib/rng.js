/**
 * The seeded pseudo-random generator the seed builder uses (prompt 10).
 *
 * `Math.random()` would make `npm run seed:build` produce a different
 * `db.json` on every run, and a seed that changes under you is a seed nobody
 * can review a diff of. mulberry32 is small, fast and — with a fixed 32-bit
 * seed — repeatable across machines and Node versions, which is all this file
 * needs to be.
 *
 * Every draw is a pure function of the generator's state, so the *order* of
 * the calls is part of the contract: inserting a draw in the middle of the
 * build shifts everything after it. Each collection therefore takes its own
 * generator (`Rng.child('properties')`) and the collections cannot disturb
 * each other.
 */

/** 32-bit hash of a string, so a name can seed a generator. */
function hashSeed(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — one 32-bit state word, uniform in [0, 1). */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  /**
   * @param {number|string} seed a fixed number, or a name hashed into one
   */
  constructor(seed) {
    this.seed = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    this.next = mulberry32(this.seed);
  }

  /** An independent generator, named so its draws never move with another's. */
  child(name) {
    return new Rng(hashSeed(`${this.seed}:${name}`));
  }

  /** An integer in `[min, max]`. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** A number in `[min, max]`, rounded to `decimals` places. */
  float(min, max, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round((min + this.next() * (max - min)) * factor) / factor;
  }

  /** True with probability `probability`. */
  chance(probability) {
    return this.next() < probability;
  }

  /** One element of `list`. */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** A copy of `list` in a shuffled order (Fisher–Yates). */
  shuffle(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  /** `count` distinct elements of `list`, in the list's own order. */
  sample(list, count) {
    const chosen = new Set(this.shuffle(list.map((_, index) => index)).slice(0, count));
    return list.filter((_, index) => chosen.has(index));
  }
}

module.exports = { Rng, mulberry32, hashSeed };
