export function parseLog(rawText) {
  const lines = rawText.split(/\r?\n/);
  const parsedData = [];
  const characters = new Set();

  const angleNameRegex = /^\s*<([^>\n]{1,40})>\s*(.*)\s*$/;

  let currentSpeaker = null;
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let name = null;
    let content = '';

    const match = angleNameRegex.exec(line);
    if (match) {
      name = match[1].trim();
      content = (match[2] || '').trim();
    }

    if (name) {
      characters.add(name);
      currentSpeaker = name;
      if (!content) {
        continue;
      }
      parsedData.push({
        id: id++,
        type: 'dialogue',
        name,
        content,
      });
      continue;
    }

    if (currentSpeaker) {
      parsedData.push({
        id: id++,
        type: 'dialogue',
        name: currentSpeaker,
        content: trimmed,
      });
      continue;
    }

    parsedData.push({
      id: id++,
      type: 'narration',
      name: '旁白',
      content: trimmed,
    });
  }

  return { parsedData, uniqueCharacters: Array.from(characters) };
}
