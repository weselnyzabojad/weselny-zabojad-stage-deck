// Hard anchors are timeline steps whose type is HARD_ANCHOR (issue #622).
//
// The derived list keeps the existing hard-anchor shape so the radar, reel
// clock and photo plan do not change.

function cleanAnchor(anchor) {
  const value = {
    id: anchor.id,
    time: anchor.time,
    label: anchor.label ?? anchor.id,
  };
  if (Number.isFinite(anchor.alertBeforeMin)) value.alertBeforeMin = anchor.alertBeforeMin;
  if (typeof anchor.kind === 'string' && anchor.kind) value.kind = anchor.kind;
  return value;
}

function anchorKind(step) {
  const mandatoryKind = step?.mandatory?.kind;
  if (mandatoryKind === 'MILESTONE') return step.mandatory.milestoneKind ?? 'OTHER';
  if (mandatoryKind === 'FIRST_GUESTS_ARRIVAL') return 'FAMILY';
  if (mandatoryKind === 'KITCHEN_SERVICE') return 'VENDOR';
  if (mandatoryKind === 'CAKE_SERVICE') return 'VENDOR';
  if (mandatoryKind === 'CLOSURE') return 'VENDOR';
  return 'OTHER';
}

export function deriveHardAnchors(source) {
  const input = Array.isArray(source?.steps) ? source.steps : source;
  const steps = Array.isArray(input) ? input : [];

  return steps
    .filter((step) => step?.id && step?.time && step?.type === 'HARD_ANCHOR')
    .map((step) =>
      cleanAnchor({
        id: step.id,
        time: step.time,
        label: step.mandatory?.label ?? step.title ?? step.id,
        kind: anchorKind(step),
        alertBeforeMin: step.mandatory?.alertBeforeMin,
      }),
    );
}
