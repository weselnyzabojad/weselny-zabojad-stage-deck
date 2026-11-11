import { useId, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import BottomNav from './BottomNav';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import CulturalRulesBar from './CulturalRulesBar';
import SpeechesChip from './SpeechesChip';
import TopBarCenterIdentity from './TopBarCenterIdentity';

/**
 * RoleShell — shared responsive shell for role views.
 *
 * On wide screens (≥640px) it is a pass-through: the view renders its own full
 * desktop layout untouched. On phones (<640px) it wraps the compact content in
 * a low-height header (role, language, theme and a details disclosure) and the
 * persistent bottom navigation bar.
 *
 * The date, couple common languages, children badge, sync state, speeches and
 * cultural pills live behind the disclosure so the current step stays above
 * the fold at 375x812.
 */
export default function RoleShell({
  compact,
  children,
  role,
  wedding = null,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox,
  onToggleTheme,
  theme,
  culturalRules = null,
  oczepinyStatus = null,
  speeches = null,
  speechMode = null,
  activeSpeechId = null,
  viewSwitch = null,
  authControl = null,
  showChildrenExpected = true,
}) {
  const { t } = useI18n();
  const mediaCompact = useCompact();
  const isCompact = compact === true || mediaCompact;
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Wide/desktop: the view owns its full layout. Do not add chrome.
  if (!isCompact) {
    return <>{children}</>;
  }

  return (
    <div className="font-body min-h-dvh flex flex-col bg-page text-ink">
      <header className="bg-card border-b border-line px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="rounded border-2 border-black bg-white px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-black">
              {t(`role.${role}.short`)}
            </span>
            {showChildrenExpected ? <ChildrenExpectedBadge wedding={wedding} compact /> : null}
            <SyncStatusBadge
              status={syncStatus}
              error={syncError}
              remoteUpdatedAt={remoteUpdatedAt}
              outbox={outbox}
              compact
            />
          </div>
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-1 rounded border-2 border-black bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-black hover:bg-slate-100"
          >
            {t('pocket.details')}
            <span aria-hidden="true">{detailsOpen ? '▴' : '▾'}</span>
          </button>
        </div>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>

        <div
          id={detailsId}
          hidden={!detailsOpen}
          className="mt-1.5 flex flex-col gap-1.5 border-t border-line pt-1.5"
        >
            <TopBarCenterIdentity wedding={wedding} compact />
            <div className="flex flex-wrap items-center gap-1.5">
              {viewSwitch}
              {authControl}
            </div>
            {culturalRules || speechMode != null ? (
              <CulturalRulesBar
                rules={culturalRules ?? {}}
                oczepinyStatus={oczepinyStatus}
                compact
                showRules={Boolean(culturalRules)}
              >
                {speechMode != null ? (
                  <SpeechesChip
                    mode={speechMode}
                    speeches={speeches ?? []}
                    activeSpeechId={activeSpeechId}
                    compact
                  />
                ) : null}
              </CulturalRulesBar>
            ) : null}
        </div>
      </header>

      <main id="phone-main" className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {children}
      </main>

      <BottomNav role={role} isCompact />
    </div>
  );
}

