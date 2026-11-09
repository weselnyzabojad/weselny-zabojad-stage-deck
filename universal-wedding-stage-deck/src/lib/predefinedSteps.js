// Optional predefined steps are included only when their cartridge feature
// flag is enabled. Mandatory steps have no optionalFlag.
export function filterEnabledSteps(wedding) {
  const steps = Array.isArray(wedding?.steps) ? wedding.steps : [];
  return steps.filter((step) => {
    if (!step?.optionalFlag) return true;
    if (step.optionalFlag === 'oczepiny') return wedding?.oczepiny?.enabled === true;
    if (step.optionalFlag === 'wishes') return wedding?.wishes?.enabled === true;
    if (step.optionalFlag === 'games') {
      if (wedding?.games?.enabled !== true) return false;
      if (!step.gameId) return true;
      const list = (wedding?.games?.questionLists ?? []).find((entry) => entry?.id === step.gameId);
      return list ? list.enabled !== false : false;
    }
    return true;
  });
}
