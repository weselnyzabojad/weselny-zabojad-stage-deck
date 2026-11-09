// Hard anchors are derived from admin-managed mandatory steps (issue #595).
//
// `mandatorySteps.milestones[]` and `mandatorySteps.kitchenServices[]` carry an
// explicit `isHardAnchor` flag. The derived list keeps the existing hard-anchor
// shape so the radar, reel clock and photo plan do not change.

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

export function deriveHardAnchors(mandatorySteps) {
  const data = mandatorySteps && typeof mandatorySteps === 'object' ? mandatorySteps : {};
  const milestones = Array.isArray(data.milestones) ? data.milestones : [];
  const kitchen = Array.isArray(data.kitchenServices) ? data.kitchenServices : [];

  const anchors = [
    ...milestones
      .filter((milestone) => milestone?.isHardAnchor === true)
      .map((milestone) => cleanAnchor(milestone)),
    ...kitchen
      .filter((course) => course?.isHardAnchor === true && course?.time)
      .map((course) =>
        cleanAnchor({
          id: `kitchen_${course.id}`,
          time: course.time,
          label: course.name ?? course.id,
          kind: 'VENDOR',
        }),
      ),
  ];

  return anchors.filter((anchor) => anchor.id && anchor.time);
}
