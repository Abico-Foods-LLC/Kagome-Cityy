// Яриа → clip нэр: normalize (emoji, хашилт арилгана) + djb2 hash. Runtime ба scripts/gen-voice.mjs хоёулаа ашиглана.
export function normalizeLine(text) {
  return String(text).replace(/<[^>]+>/g, '').replace(/[«»"“”*_<>]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
}
export function lineHash(text) {
  let h = 5381; for (const ch of normalizeLine(text)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0');
}
