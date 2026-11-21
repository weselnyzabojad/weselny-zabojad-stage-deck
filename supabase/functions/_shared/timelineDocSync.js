const HEADER = ['Hour', 'Step name', 'Example values'];

function paragraphText(paragraph) {
  return (paragraph?.elements ?? [])
    .map((element) => element?.textRun?.content ?? '')
    .join('')
    .replace(/\n+$/g, '')
    .trim();
}

function elementText(element) {
  return paragraphText(element?.paragraph);
}

function cellText(cell) {
  return (cell?.content ?? []).map((entry) => paragraphText(entry?.paragraph)).join('\n').trim();
}

function findTimelineTable(document) {
  const content = document?.body?.content ?? [];
  for (let index = 0; index < content.length; index += 1) {
    if (elementText(content[index]).toUpperCase() !== 'TIMELINE') continue;
    for (let cursor = index + 1; cursor < content.length; cursor += 1) {
      if (content[cursor]?.table) return content[cursor].table;
      if (elementText(content[cursor]).startsWith('## ')) break;
    }
  }
  return null;
}

export function planTimelineDocUpdate(document, rows = []) {
  const table = findTimelineTable(document);
  if (!table) {
    return { error: { code: 'timeline_table_missing', message: 'TIMELINE table not found.' } };
  }
  const tableRows = table.tableRows ?? [];
  if (tableRows.length === 0) {
    return { error: { code: 'timeline_table_missing', message: 'TIMELINE table is empty.' } };
  }
  const header = (tableRows[0].tableCells ?? []).map(cellText);
  if (header.join('|') !== HEADER.join('|')) {
    return {
      error: {
        code: 'timeline_header_mismatch',
        message: `TIMELINE header must be ${HEADER.join(' | ')}.`,
      },
    };
  }

  const currentRows = Math.max(0, tableRows.length - 1);
  const requests = [];
  const updates = rows.slice(0, Math.min(currentRows, rows.length));
  for (let rowIndex = 0; rowIndex < updates.length; rowIndex += 1) {
    const cells = tableRows[rowIndex + 1].tableCells ?? [];
    for (let column = 0; column < HEADER.length; column += 1) {
      const cell = cells[column];
      const start = cell?.content?.[0]?.startIndex;
      const end = cell?.content?.at(-1)?.endIndex;
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
      requests.push({ deleteContentRange: { range: { startIndex: start, endIndex: Math.max(start, end - 1) } } });
      requests.push({ insertText: { location: { index: start }, text: String(rows[rowIndex][HEADER[column]] ?? '') } });
    }
  }

  if (rows.length > currentRows) {
    for (let index = currentRows; index < rows.length; index += 1) {
      requests.push({ insertTableRow: { tableCellLocation: { tableStartLocation: { index: table.startIndex }, rowIndex: index + 1 }, insertBelow: true } });
    }
  } else if (rows.length < currentRows) {
    for (let index = currentRows; index > rows.length; index -= 1) {
      requests.push({ deleteTableRow: { tableCellLocation: { tableStartLocation: { index: table.startIndex }, rowIndex: index } } });
    }
  }

  return { requests, tableStartIndex: table.startIndex, header };
}

export function timelineTableText(document) {
  const table = findTimelineTable(document);
  if (!table) return null;
  return (table.tableRows ?? []).map((row) =>
    (row.tableCells ?? []).map(cellText),
  );
}
