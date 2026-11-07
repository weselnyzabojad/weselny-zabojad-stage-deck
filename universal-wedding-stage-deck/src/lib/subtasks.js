// Display ordering for step subtasks. The cartridge order is never mutated;
// unchecked work is shown first so the MC can see what is still to do, and
// completed work is grouped afterwards while staying visible.
export function orderSubtasks(tasks = [], checked = {}) {
  if (!Array.isArray(tasks)) return [];
  const pending = [];
  const done = [];
  for (const task of tasks) {
    if (checked?.[task]) done.push(task);
    else pending.push(task);
  }
  return [...pending, ...done];
}
