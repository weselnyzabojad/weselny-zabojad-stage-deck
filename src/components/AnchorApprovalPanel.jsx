import { useState } from 'react';
import {
  anchorApprovalFor,
  isApprovableAnchor,
} from '../lib/anchorApprovals.js';

export default function AnchorApprovalPanel({
  steps = [],
  approvals = {},
  readOnly = false,
  onDecision = () => {},
}) {
  const [reasons, setReasons] = useState({});
  const anchors = (Array.isArray(steps) ? steps : []).filter(isApprovableAnchor);
  if (anchors.length === 0) return null;

  return (
    <section
      aria-labelledby="anchor-approval-heading"
      className="rounded-xl border border-line/70 bg-page/60 p-4"
    >
      <h3
        id="anchor-approval-heading"
        className="font-heading text-xs font-bold uppercase tracking-wider text-ink"
      >
        Cake and kitchen approval
      </h3>
      <p className="mt-1 text-[10px] text-muted">
        The Doc proposes the time. Approving or rejecting is informational and never blocks the
        timeline. Approval is bound to the exact time and resets if the time changes.
      </p>
      <ul className="mt-3 space-y-2">
        {anchors.map((anchor) => {
          const approval = anchorApprovalFor(approvals, anchor);
          return (
            <li
              key={anchor.id}
              className="rounded-lg border border-line/70 bg-card p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {anchor.title ?? anchor.id}
                  </p>
                  <p className="text-[10px] text-muted">{anchor.time}</p>
                </div>
                <span
                  className={`rounded border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                    approval.status === 'APPROVED'
                      ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200'
                      : approval.status === 'REJECTED'
                        ? 'border-alert/60 bg-alert/15 text-alert-soft'
                        : 'border-amber-700 bg-amber-950/30 text-amber-200'
                  }`}
                >
                  {approval.status}
                </span>
              </div>
              {approval.status !== 'PENDING' ? (
                <p className="mt-1 text-[9px] text-muted">
                  {approval.approvedBy} at {approval.approvedAt}
                  {approval.reason ? ` - ${approval.reason}` : ''}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="flex-1 text-[9px] uppercase tracking-wider text-muted">
                  Reason (optional)
                  <input
                    value={reasons[anchor.id] ?? ''}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [anchor.id]: event.target.value,
                      }))
                    }
                    disabled={readOnly}
                    className="mt-1 w-full rounded border border-line bg-page px-2 py-1 text-[10px] text-ink disabled:opacity-60"
                  />
                </label>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onDecision(anchor, 'APPROVED', reasons[anchor.id] ?? '')}
                  className="rounded border border-emerald-700 bg-emerald-950/30 px-2 py-1 text-[10px] font-semibold text-emerald-200 disabled:opacity-40"
                >
                  Approve {anchor.title ?? anchor.id}
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onDecision(anchor, 'REJECTED', reasons[anchor.id] ?? '')}
                  className="rounded border border-alert/60 bg-alert/15 px-2 py-1 text-[10px] font-semibold text-alert-soft disabled:opacity-40"
                >
                  Reject {anchor.title ?? anchor.id}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
