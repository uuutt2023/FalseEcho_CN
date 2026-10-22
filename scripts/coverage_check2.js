// Second pass: find game-facing English prose that no localization table covers.
const fs = require('fs');
const path = require('path');
const root = 'E:\\FalseEcho_CN';

const raw = fs.readFileSync(path.join(root, 'extracted', 'uncovered_strg.json'), 'utf8');
const items = JSON.parse(raw).map(l => {
  const i = l.indexOf('\t');
  return { idx: +l.slice(0, i), s: l.slice(i + 1).replace(/^"|"$/g, '') };
});

// dev / engine / debug noise filters
const devPatterns = [
  /^gml_Script_/,
  /^gml_Object_/,
  /^gml_/,
  /^__/,
  /^u_/,
  /Crystal/i,
  /PPFX/i,
  /ppf_/i,
  /__cle_/,
  /__ppf_/,
  /#version/,
  /#define/,
  /precision /,
  /^\s*\/\//,
  /^\s*#/,
];
const devWords = /\b(shader|vertex|fragment|uniform|shader_precision|texture2D|gl_|vec[234]|mat[234]|precision|alpha|render_?target|framebuffer|LUT|lut|bloom|polar|radial|distortion|dither|shadow map|lightmap)\b/i;
const pathLike = /^[A-Za-z]:\\|^[A-Za-z]:\/|\.yyp$|\.lightdata$|\*\.\w+$/i;

const hasCJK = s => /[\u3400-\u9FFF]/.test(s);
const sentences = s => {
  if (!s || s.length < 12) return false;
  if (hasCJK(s)) return false;
  if (pathLike.test(s)) return false;
  if (devPatterns.some(p => p.test(s))) return false;
  if (devWords.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 8) return false;
  if (!/\s/.test(s)) return false;
  // needs sentence-ish punctuation or capitalization + spaces
  if (!/[.!?,:;]/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length < 3) return false;
  // all-caps label like UI title is also interesting -> keep
  return true;
};

const cand = items.filter(o => sentences(o.s));
console.log('candidate game-facing uncovered strings:', cand.length);
console.log('');
for (const o of cand) console.log(o.idx + '\t' + JSON.stringify(o.s));
