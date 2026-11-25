/**
 * Breaks text into lines of at most `max` characters, at spaces.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function wrapText(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}
