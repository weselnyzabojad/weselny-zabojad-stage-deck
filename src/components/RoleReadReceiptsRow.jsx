import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import {
  onlineReceiptGroups,
  readReceiptGroups,
  receiptRoleGroup,
} from '../lib/readReceipts.js';
import { createConfirmationTracker } from '../lib/readReceiptConfirmation.js';
import RolePresenceBadge from './RolePresenceBadge.jsx';

const ROWS = [
  { group: 'dj', labelKey: 'mc.readReceipts.role.dj' },
  { group: 'musician', labelKey: 'mc.readReceipts.role.musician' },
  { group: 'photo', labelKey: 'mc.readReceipts.role.photo' },
  { group: 'venue', labelKey: 'mc.readReceipts.role.venue' },
];

const PRESENCE_REFRESH_MS = 60000;

/**
 * MC-only row of role read receipts for the latest reschedule (issue #1160).
 *
 * Receipts are revision-keyed; a group is "read" when any of its devices
 * acknowledged that revision. Presence adds the online dot. Sync errors and
 * local/offline mode degrade to neutral badges instead of false unread states.
 */
export default function RoleReadReceiptsRow({ target = null, client = null }) {
  const { t } = useI18n();
  const [receipts, setReceipts] = useState([]);
  const [presence, setPresence] = useState([]);
  const [failed, setFailed] = useState(false);
  const [confirmed, setConfirmed] = useState({});
  const confirmationRef = useRef(null);

  if (confirmationRef.current === null) {
    confirmationRef.current = createConfirmationTracker({
      onChange: (group, active) => {
        setConfirmed((current) => {
          const next = { ...current };
          if (active) next[group] = true;
          else delete next[group];
          return next;
        });
      },
    });
  }

  useEffect(
    () => () => {
      confirmationRef.current?.clear();
    },
    [],
  );

  const stepId = target?.stepId ?? null;
  const revision = target?.revision ?? null;

  useEffect(() => {
    if (!client || !stepId || !revision) {
      // eslint-disable-next-line react/set-state-in-effect -- resetting the card when the revision disappears is a sync with an external target
      setReceipts([]);
      setPresence([]);
      return undefined;
    }

    let cancelled = false;
    setReceipts([]);
    setPresence([]);
    setFailed(false);
    setConfirmed({});
    confirmationRef.current?.clear();

    const loadReceipts = () =>
      client
        .fetchStepReceipts({ stepId, revision })
        .then((rows) => {
          if (!cancelled) setReceipts(rows);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });

    const loadPresence = () =>
      client
        .fetchRolePresence()
        .then((rows) => {
          if (!cancelled) setPresence(rows);
        })
        .catch(() => {
          if (!cancelled) setPresence([]);
        });

    loadReceipts();
    loadPresence();

    const unsubscribe = client.subscribeStepReceipts({
      stepId,
      revision,
      onChange: (row) => {
        if (!row?.role) return;
        setReceipts((current) => {
          if (
            current.some(
              (item) =>
                item.role === row.role &&
                item.device_id === row.device_id &&
                item.step_id === row.step_id,
            )
          ) {
            return current;
          }
          return [...current, row];
        });
        confirmationRef.current?.confirm(receiptRoleGroup(row.role));
      },
    });

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadPresence();
    }, PRESENCE_REFRESH_MS);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      loadReceipts();
      loadPresence();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [client, revision, stepId]);

  if (!target) return null;

  const readGroups = readReceiptGroups(receipts);
  const onlineGroups = onlineReceiptGroups(presence);
  // Without a client (local/demo) or after a failed first load, show neutral
  // badges; never claim "unread" when we simply do not know.
  const known = Boolean(client) && (!failed || receipts.length > 0);

  return (
    <section aria-labelledby="mc-read-receipts-title" className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h2
          id="mc-read-receipts-title"
          className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
        >
          {t('mc.readReceipts.title')}
        </h2>
        {target.stepTitle ? (
          <p className="min-w-0 truncate text-[10px] text-muted">
            {t('mc.readReceipts.lastUpdate', { step: target.stepTitle })}
          </p>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {ROWS.map(({ group, labelKey }) => (
          <RolePresenceBadge
            key={group}
            roleName={t(labelKey)}
            hasUnreadUpdate={known && !readGroups.has(group)}
            isOnline={onlineGroups.has(group)}
            justConfirmed={Boolean(confirmed[group])}
          />
        ))}
      </ul>
    </section>
  );
}
