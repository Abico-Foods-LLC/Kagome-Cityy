// Дүрийн үйлдвэр: mascot (жимс) эсвэл костюмтай аялагч. Хоёулаа ижил API-тай.
import { Character } from './character.js';
import { Mascot, MASCOTS, DEFAULT_MASCOT } from './mascot.js';

export const AVATARS = { ...MASCOTS, suit: { name: 'Аялагч', emoji: '🕴️' } };
export const DEFAULT_AVATAR = DEFAULT_MASCOT;

export function createAvatar(kind = DEFAULT_AVATAR, opts = {}) {
  if (kind === 'suit') return new Character(opts);
  return new Mascot({ kind: MASCOTS[kind] ? kind : DEFAULT_AVATAR, ...opts });
}
