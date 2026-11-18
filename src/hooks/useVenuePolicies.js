import { useMemo } from 'react';
import { venuePolicyWarnings } from '../lib/venuePolicies.js';

// Pure guard output for the current step. UI stays in the consuming view.
export default function useVenuePolicies(stepTags, venueData = null) {
  return useMemo(
    () => venuePolicyWarnings(stepTags, venueData?.venuePolicies ?? venueData),
    [stepTags, venueData],
  );
}
