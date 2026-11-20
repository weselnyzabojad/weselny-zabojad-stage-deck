import { useState } from 'react';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import SyncStatusBadge from './SyncStatusBadge';
import UtilityControlGroup from './UtilityControlGroup';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import ModalShell from './ModalShell';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarLogo from './TopBarLogo';
import { ceremonySubStepBodies } from './ceremonySubStepBodies';
import TopBarShell from './TopBarShell';
import TimelineFocusStack from './TimelineFocusStack';
import SkipLink from './SkipLink';
import SpeechSummaryChip from './SpeechSummaryChip';
import { useI18n } from '../i18n/useI18n';
import { useReadReceipt } from '../hooks/useReadReceipt';
import useCompact from '../hooks/useCompact';
import {
  applyMandatorySettings,
  cascadeFlexibleSteps,
  settingsFromSteps,
} from '../lib/mandatorySteps.js';
import { venueChangeDecision } from '../lib/venueChangeConfirmation.js';
import {
  FORBIDDEN_FX,
  STEP_TAGS,
  normalizeStepTags,
  normalizeVenuePolicies,
  setStepTag,
  validateVenuePolicyDraft,
} from '../lib/venuePolicies.js';

const STORAGE_PREFIX = 'wzsd:venue-manager:steps:';

const DEFAULT_KITCHEN_COURSES = [
  { id: 'dinner', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_1', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_2', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
  { id: 'supper_3', name: '', time: '', serviceMode: 'TABLE_SERVICE' },
];

const COURSE_LABEL_KEYS = {
  dinner: 'venueManager.course.dinner',
  supper_1: 'venueManager.course.firstSupper',
  supper_2: 'venueManager.course.secondSupper',
  supper_3: 'venueManager.course.thirdSupper',
};

function courseLabel(course, t) {
  if (course?.name) return course.name;
  const key = COURSE_LABEL_KEYS[course?.id];
  return key ? t(key) : course?.id ?? '';
}

function loadSteps(wedding, override = null) {
  if (Array.isArray(override?.value)) return override.value;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${wedding.weddingId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore corrupt local steps
    }
  }
  return Array.isArray(wedding.steps) ? wedding.steps : [];
}

function saveSteps(wedding, steps) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${wedding.weddingId}`, JSON.stringify(steps));
  } catch {
    // local-only persistence is best effort
  }
}

function TimeField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
      {label}
      <input
        type="time"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-line/70 bg-card px-2.5 py-2 font-mono text-xs text-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/20"
      />
    </label>
  );
}

function CourseCard({ label, value, mode, onTime, onMode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line/70 bg-page/60 p-4">
      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
        {label}
      </h3>
      <TimeField label={t('venueManager.time')} value={value} onChange={onTime} />
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
        {t('venueManager.serviceModeLabel')}
        <select
          value={mode ?? 'TABLE_SERVICE'}
          onChange={(event) => onMode(event.target.value)}
          className="rounded-lg border border-line/70 bg-card px-2.5 py-2 text-xs text-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/20"
        >
          <option value="TABLE_SERVICE">{t('mandatory.serviceMode.TABLE_SERVICE')}</option>
          <option value="BUFFET">{t('mandatory.serviceMode.BUFFET')}</option>
        </select>
      </label>
    </div>
  );
}


export default function VenueManagerView({
  wedding,
  timeline = [],
  clock,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  flash = null,
  receiptTarget = null,
  receiptClient = null,
  theme = 'night',
  onToggleTheme,
  pin = null,
  roomCode = null,
  speechMode = 'OFF',
  speeches = [],
  onUpdateMandatory,
  mandatoryOverride = null,
  venuePolicies = null,
  onUpdateVenuePolicies = null,
}) {
  const { t } = useI18n();
  useReadReceipt({
    stepId: receiptTarget?.stepId,
    revision: receiptTarget?.revision,
    enabled: Boolean(receiptTarget && receiptClient),
    client: receiptClient,
  });
  const [settings, setSettings] = useState(() =>
    settingsFromSteps(loadSteps(wedding, mandatoryOverride)),
  );
  const [saved, setSaved] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [pendingChange, setPendingChange] = useState(null);
  const [policyDraft, setPolicyDraft] = useState(() => normalizeVenuePolicies(venuePolicies));
  const [policyError, setPolicyError] = useState('');
  const [policySaved, setPolicySaved] = useState('');
  const [previousPolicyInput, setPreviousPolicyInput] = useState(venuePolicies);
  const [previousInputs, setPreviousInputs] = useState([wedding, mandatoryOverride]);

  if (venuePolicies !== previousPolicyInput) {
    setPreviousPolicyInput(venuePolicies);
    setPolicyDraft(normalizeVenuePolicies(venuePolicies));
    setPolicyError('');
  }

  if (wedding !== previousInputs[0] || mandatoryOverride !== previousInputs[1]) {
    setPreviousInputs([wedding, mandatoryOverride]);
    setSettings((current) => {
      const next = settingsFromSteps(loadSteps(wedding, mandatoryOverride));
      // Keep freshly added service drafts alive across the parent round-trip;
      // they are persisted only once a valid time exists.
      const drafts = (current.kitchenServices ?? []).filter((course) => !course.time);
      if (drafts.length === 0) return next;
      return { ...next, kitchenServices: [...next.kitchenServices, ...drafts] };
    });
  }

  const applyUpdate = (patch, change = null) => {
    const next = { ...settings, ...patch };
    const previousSteps = loadSteps(wedding, mandatoryOverride);
    const nextSteps = applyMandatorySettings({ steps: previousSteps }, next, { sort: false });
    const rescheduled = cascadeFlexibleSteps(previousSteps, nextSteps);
    if (rescheduled.error) {
      setRescheduleError(t('venueManager.rescheduleBlocked'));
      return;
    }
    setRescheduleError('');
    setSettings(next);
    saveSteps(wedding, rescheduled.steps);
    onUpdateMandatory?.(
      rescheduled.steps,
      change
        ? {
            kind: 'reschedule',
            stepTitle: change.label,
            from: change.oldDisplay ?? change.oldValue ?? null,
            to: change.newDisplay ?? change.newValue ?? null,
            authorRole: 'venue_manager',
          }
        : null,
    );
    setSaved(t('venueManager.saved'));
    window.setTimeout(() => setSaved(''), 1500);
  };

  const courses = Array.isArray(settings.kitchenServices)
    ? settings.kitchenServices
    : DEFAULT_KITCHEN_COURSES;
  const activeIndex = timeline.findIndex((entry) => entry.isActive);

  const requestConfirmedChange = (patch, change) => {
    const decision = venueChangeDecision(change.oldValue, change.newValue);
    if (decision === 'noop') return;
    if (decision === 'apply') {
      applyUpdate(patch, change);
      return;
    }
    setPendingChange({ patch, ...change });
  };

  const requestCourseChange = (index, field, value) => {
    const course = courses[index];
    if (!course) return;
    const next = courses.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    const time = field === 'time';
    const current = time ? course.time : course.serviceMode ?? 'TABLE_SERVICE';
    requestConfirmedChange(
      { ...settings, kitchenServices: next },
      {
        label: `${courseLabel(course, t)} · ${t(time ? 'venueManager.time' : 'venueManager.serviceModeLabel')}`,
        oldValue: current,
        newValue: value,
        oldDisplay: time ? current : t(`mandatory.serviceMode.${current}`),
        newDisplay: time ? value : t(`mandatory.serviceMode.${value}`),
      },
    );
  };

  const addCourse = () => {
    const next = [
      ...courses,
      {
        id: `supper_${courses.length + 1}`,
        name: '',
        time: '',
        serviceMode: 'TABLE_SERVICE',
        isHardAnchor: true,
      },
    ];
    applyUpdate({ ...settings, kitchenServices: next });
  };

  const removeCourse = (index) => {
    const next = courses.filter((_, i) => i !== index);
    applyUpdate({ ...settings, kitchenServices: next });
  };

  const tagSteps = loadSteps(wedding, mandatoryOverride);
  const toggleForbiddenFx = (effect, checked) => {
    setPolicyDraft((current) => {
      const forbiddenFx = checked
        ? [...current.forbiddenFx, effect]
        : current.forbiddenFx.filter((entry) => entry !== effect);
      return normalizeVenuePolicies({ ...current, forbiddenFx });
    });
    setPolicyError('');
  };
  const savePolicies = () => {
    const result = validateVenuePolicyDraft(policyDraft);
    if (!result.valid) {
      setPolicyError(t(`venueManager.policies.error.${result.error}`));
      return;
    }
    setPolicyError('');
    setPolicyDraft(result.policies);
    onUpdateVenuePolicies?.(result.policies);
    setPolicySaved(t('venueManager.policies.saved'));
    window.setTimeout(() => setPolicySaved(''), 1500);
  };
  const toggleStepTag = (stepId, tag, checked) => {
    const next = setStepTag(tagSteps, stepId, tag, checked);
    onUpdateMandatory?.(next, null);
  };

  const confirmationDialog = (
    <ModalShell
      open={Boolean(pendingChange)}
      onClose={() => setPendingChange(null)}
      labelledBy="venue-change-title"
      describedBy="venue-change-description"
    >
      <div className="p-5 pt-14">
        <h2 id="venue-change-title" className="font-heading text-lg font-bold text-ink">
          {t('venueManager.confirm.title')}
        </h2>
        <p id="venue-change-description" className="mt-1 text-xs text-muted">
          {t('venueManager.confirm.description')}
        </p>

        <div className="mt-3 rounded-lg border border-line bg-page/70 p-3">
          <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-muted">
            {pendingChange?.label}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-mono text-xs text-ink">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted">
                {t('venueManager.confirm.old')}
              </div>
              <div className="mt-0.5 break-words">{pendingChange?.oldDisplay || '—'}</div>
            </div>
            <span aria-hidden="true" className="text-muted">→</span>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted">
                {t('venueManager.confirm.new')}
              </div>
              <div className="mt-0.5 break-words">{pendingChange?.newDisplay || '—'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingChange(null)}
            className="rounded-lg border border-line-strong bg-raised px-4 py-2 text-xs font-semibold text-ink transition hover:bg-line"
          >
            {t('venueManager.confirm.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              const change = pendingChange;
              setPendingChange(null);
              if (change) applyUpdate(change.patch, change);
            }}
            className="rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
          >
            {t('venueManager.confirm.confirm')}
          </button>
        </div>
      </div>
    </ModalShell>
  );

  const body = (
    <div id="main-content" tabIndex={-1} className="space-y-3 sm:space-y-4">
      <TimelineFocusStack
        entries={timeline}
        activeIndex={activeIndex}
        entryBodies={ceremonySubStepBodies(timeline, 'venue')}
        flash={flash}
      />

      <section className="rounded-xl border border-line bg-card p-4 shadow-lg sm:p-5">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          {t('venueManager.mandatorySteps')}
        </h2>

        <div className="mt-2.5 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {courses.map((course, index) => (
            <div key={course.id ?? index} className="relative">
              <CourseCard
                label={courseLabel(course, t)}
                value={course.time}
                mode={course.serviceMode}
                onTime={(time) => requestCourseChange(index, 'time', time)}
                onMode={(mode) => requestCourseChange(index, 'serviceMode', mode)}
              />
              <button
                type="button"
                onClick={() => removeCourse(index)}
                aria-label={t('venueManager.removeCourse')}
                title={t('venueManager.removeCourse')}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-card text-xs text-muted transition hover:text-ink"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addCourse}
            className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted transition hover:border-line-strong hover:text-ink"
          >
            + {t('venueManager.addCourse')}
          </button>

          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line/70 bg-page/60 p-4 sm:col-span-2 lg:col-span-1">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
              {t('venueManager.cakeService')}
            </h3>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
              {t('venueManager.cakeService')}
              <select
                value={settings.cakeServiceMode ?? 'KITCHEN_RETURN'}
                onChange={(event) => {
                  const value = event.target.value;
                  const oldValue = settings.cakeServiceMode ?? 'KITCHEN_RETURN';
                  requestConfirmedChange(
                    { ...settings, cakeServiceMode: value },
                    {
                      label: t('venueManager.cakeService'),
                      oldValue,
                      newValue: value,
                      oldDisplay: t(`venueManager.cake.${oldValue}`),
                      newDisplay: t(`venueManager.cake.${value}`),
                    },
                  );
                }}
                className="rounded-lg border border-line/70 bg-card px-2.5 py-2 text-xs text-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/20"
              >
                <option value="KITCHEN_RETURN">{t('venueManager.cake.KITCHEN_RETURN')}</option>
                <option value="CUT_IN_PLACE">{t('venueManager.cake.CUT_IN_PLACE')}</option>
              </select>
            </label>
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line/70 bg-page/60 p-4 sm:col-span-2 lg:col-span-1">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-ink">
              {t('venueManager.closure')}
            </h3>
            <TimeField
              label={t('venueManager.time')}
              value={settings.closureTime}
              onChange={(time) =>
                requestConfirmedChange(
                  { ...settings, closureTime: time },
                  {
                    label: `${t('venueManager.closure')} · ${t('venueManager.time')}`,
                    oldValue: settings.closureTime,
                    newValue: time,
                    oldDisplay: settings.closureTime,
                    newDisplay: time,
                  },
                )
              }
            />
            <label className="flex min-h-11 items-center gap-2 rounded border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wider text-muted">
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={settings.closureExtensionAllowed === true}
                onChange={(event) => {
                  const allowed = event.target.checked;
                  applyUpdate({
                    ...settings,
                    closureExtensionAllowed: allowed,
                    closureExtensionUntil: allowed
                      ? settings.closureExtensionUntil ?? null
                      : null,
                  });
                }}
              />
              {t('venueManager.extensionPossible')}
            </label>
            {settings.closureExtensionAllowed === true ? (
              <TimeField
                label={t('venueManager.extensionUntil')}
                value={settings.closureExtensionUntil}
                onChange={(time) =>
                  requestConfirmedChange(
                    { ...settings, closureExtensionUntil: time },
                    {
                      label: t('venueManager.extensionUntil'),
                      oldValue: settings.closureExtensionUntil,
                      newValue: time,
                      oldDisplay: settings.closureExtensionUntil,
                      newDisplay: time,
                    },
                  )
                }
              />
            ) : null}
          </div>
        </div>

        <p className="mt-2 text-[10px] text-muted">
          {t('venueManager.prestationHelper')}
          {saved ? <span className="ml-2 text-emerald-300">{saved}</span> : null}
          {rescheduleError ? (
            <span className="ml-2 text-alert">{rescheduleError}</span>
          ) : null}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-card p-4 shadow-lg sm:p-5">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          {t('venueManager.policies.title')}
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-page/60 px-3 py-2 text-xs text-ink">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={policyDraft.decibelLimitEnabled}
              onChange={(event) => {
                setPolicyDraft((current) =>
                  normalizeVenuePolicies({
                    ...current,
                    decibelLimitEnabled: event.target.checked,
                    decibelLimit: event.target.checked ? current.decibelLimit ?? 95 : current.decibelLimit,
                  }),
                );
                setPolicyError('');
              }}
            />
            {t('venueManager.policies.limiterEnabled')}
          </label>

          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
            {t('venueManager.policies.decibelLimit')}
            <input
              type="number"
              min="50"
              max="120"
              inputMode="numeric"
              value={policyDraft.decibelLimit ?? ''}
              disabled={!policyDraft.decibelLimitEnabled}
              onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value);
                setPolicyDraft((current) =>
                  normalizeVenuePolicies({ ...current, decibelLimit: value }),
                );
                setPolicyError('');
              }}
              className="rounded-lg border border-line/70 bg-card px-2.5 py-2 text-xs text-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/20 disabled:opacity-50"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-[10px] uppercase tracking-wider text-muted">
              {t('venueManager.policies.forbiddenFx')}
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {FORBIDDEN_FX.map((effect) => (
                <label
                  key={effect}
                  className="flex min-h-9 items-center gap-2 rounded border border-line bg-page/60 px-2.5 py-1.5 text-xs text-ink"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={policyDraft.forbiddenFx.includes(effect)}
                    onChange={(event) => toggleForbiddenFx(effect, event.target.checked)}
                  />
                  {t(`venueManager.policies.fx.${effect}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={savePolicies}
            disabled={!onUpdateVenuePolicies}
            className="min-h-10 rounded-lg border border-brand-strong bg-brand px-3 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('venueManager.policies.save')}
          </button>
          {policySaved ? <span className="text-[11px] text-emerald-300">{policySaved}</span> : null}
          {policyError ? (
            <span role="alert" className="text-[11px] text-alert">
              {policyError}
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-4 shadow-lg sm:p-5">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
          {t('venueManager.policies.stepTags')}
        </h2>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {tagSteps.map((step) => {
            const tags = normalizeStepTags(step.tags);
            return (
              <div key={step.id} className="rounded-lg border border-line bg-page/60 p-2.5">
                <div className="text-xs font-semibold text-ink">{step.title ?? step.id}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STEP_TAGS.map((tag) => (
                    <label
                      key={tag}
                      className="flex min-h-8 items-center gap-1.5 rounded border border-line bg-card px-2 py-1 text-[10px] text-ink"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={tags.includes(tag)}
                        onChange={(event) =>
                          toggleStepTag(step.id, tag, event.target.checked)
                        }
                      />
                      {t(`venueManager.policies.tag.${tag}`)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {confirmationDialog}
    </div>
  );

  const compact = useCompact();

  if (compact) {
    return (
      <RoleShell
        compact
        role="venue_manager"
        clock={clock}
        pin={pin}
        wedding={wedding}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        outbox={outbox}
        onToggleTheme={onToggleTheme}
        theme={theme}
      >
        {speechMode !== 'OFF' ? (
          <div className="mb-2">
            <SpeechSummaryChip mode={speechMode} speeches={speeches} compact />
          </div>
        ) : null}
        {body}
      </RoleShell>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink antialiased">
      <SkipLink />
      <TopBarShell
        left={(
          <>
            <TopBarLogo />
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role="venue_manager" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} />}
        right={<ChildrenExpectedBadge wedding={wedding} inline />}
      />

      <SecondaryControlBar
        left={<SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />}
        center={null}
        right={(
          <>
            <UtilityControlGroup>
              <LanguageToggle variant="desktop" />
              <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="desktop" />
            </UtilityControlGroup>
            <OpenOnPhoneButton role="venue_manager" roomCode={roomCode} />
          </>
        )}
      />

      <main className="flex-1 p-4">{body}</main>
    </div>
  );
}
