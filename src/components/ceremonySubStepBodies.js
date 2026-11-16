import { createElement } from 'react';
import CeremonySubSteps from './CeremonySubSteps.jsx';

// Builds the `entryBodies` map for the shared focus stack. Only steps that
// actually carry Ceremony sub-steps receive a body.
export function ceremonySubStepBodies(entries, detail = 'full') {
  const bodies = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    const step = entry?.step;
    const subSteps = step?.ceremony?.subSteps;
    if (step?.id && Array.isArray(subSteps) && subSteps.length > 0) {
      bodies[step.id] = createElement(CeremonySubSteps, { subSteps, detail });
    }
  }
  return bodies;
}
