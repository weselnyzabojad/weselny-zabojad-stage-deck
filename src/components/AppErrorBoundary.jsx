import React from 'react';
import {
  clearErrorLog,
  formatErrorLog,
  loadErrorLog,
  recordError,
} from '../lib/errorLog.js';
import { loadLatestLastKnownStep } from '../lib/lastKnownStep.js';
import { captureAppError } from '../lib/sentry.js';
import { t } from '../i18n/index.js';

const SCOPE_LABEL_KEY = {
  app: 'error.scope.app',
  mc: 'error.scope.mc',
  dj: 'error.scope.dj',

  photo: 'error.scope.photo',
  speaker: 'error.scope.speaker',
  pairing: 'error.scope.pairing',
  join: 'error.scope.join',
  cartridge: 'error.scope.cartridge',
};

// Catches render crashes so a bad card never leaves a white screen (TODO 24).
// The fallback keeps the last known step, offers a safe reload, and exposes the
// bounded local error log for post-event diagnosis.
export default class AppErrorBoundary extends React.Component {
  state = {
    hasError: false,
    errorId: null,
    lastKnown: null,
    showLog: false,
    copyNotice: '',
    logVersion: 0,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const lastKnown = this.props.lastKnownStep ?? loadLatestLastKnownStep();
    const entry = recordError({
      error,
      errorInfo,
      scope: this.props.scope ?? 'app',
      role: this.props.role ?? lastKnown?.role ?? null,
      weddingId: this.props.weddingId ?? lastKnown?.weddingId ?? null,
      stepId: lastKnown?.stepId ?? null,
      stepTitle: lastKnown?.title ?? null,
    });

    captureAppError({
      error,
      scope: this.props.scope ?? 'app',
      role: entry.role,
      weddingId: entry.weddingId,
      stepId: entry.stepId,
      errorId: entry.id,
    });

    this.setState({
      errorId: entry.id,
      lastKnown,
    });
  }

  componentDidUpdate(previousProps) {
    if (this.props.resetKey !== previousProps.resetKey && this.state.hasError) {
      this.resetView();
    }
  }

  resetView = () => {
    this.setState({
      hasError: false,
      errorId: null,
      lastKnown: null,
      showLog: false,
      copyNotice: '',
    });
  };

  safeReload = () => {
    if (typeof this.props.onSafeReload === 'function') {
      this.props.onSafeReload();
      return;
    }
    window.location.reload();
  };

  copyDiagnostics = async () => {
    const text = formatErrorLog(loadErrorLog());
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copyNotice: 'error.copied' });
    } catch {
      this.setState({ copyNotice: 'error.copyFailed' });
    }
  };

  clearLog = () => {
    clearErrorLog();
    this.setState((state) => ({
      copyNotice: 'error.cleared',
      logVersion: state.logVersion + 1,
    }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const scope = this.props.scope ?? 'app';
    const scopeLabel = t(SCOPE_LABEL_KEY[scope] ?? 'error.scope.app');
    const step = this.props.lastKnownStep ?? this.state.lastKnown;
    const entries = loadErrorLog();
    const recent = entries.slice(0, 5);
    const completedCount = Number.isFinite(step?.completedCount) ? step.completedCount : null;
    const totalSteps = Number.isFinite(step?.totalSteps) && step.totalSteps > 0 ? step.totalSteps : null;

    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 py-8 text-ink">
        <section
          role="alert"
          aria-live="assertive"
          className="w-full max-w-lg rounded-2xl border border-alert/60 bg-card p-5 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded border border-alert/60 bg-alert/20 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-alert-soft">
              {t('error.recovered')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {scopeLabel}
            </span>
          </div>

          <h1 className="mt-3 font-heading text-xl font-bold text-ink">
            {t('error.title')}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {t('error.body')}
          </p>

          <div className="mt-3 rounded-lg border border-line bg-page/80 p-3">
            <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t('error.lastKnownStep')}
            </div>
            {step?.title ? (
              <>
                <div className="mt-1 font-heading text-base font-semibold text-ink">
                  {step.title}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted">
                  <span>{t('error.planned', { time: step.plannedTime ?? '—' })}</span>
                  <span>·</span>
                  <span>{step.location ?? '—'}</span>
                  {step.type ? (
                    <>
                      <span>·</span>
                      <span>{String(step.type).replaceAll('_', ' ')}</span>
                    </>
                  ) : null}
                </div>
                {completedCount != null && totalSteps ? (
                  <div className="mt-1 font-mono text-[10px] text-muted">
                    {t('error.stepsCompleted', { done: completedCount, total: totalSteps })}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-1 text-sm text-ink">
                {t('error.noSnapshot')}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.safeReload}
              className="rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
            >
              {t('error.safeReload')}
            </button>
            <button
              type="button"
              onClick={this.resetView}
              className="rounded-lg border border-line-strong bg-raised px-4 py-2 text-xs font-semibold text-ink transition hover:bg-line"
            >
              {t('error.tryAgain')}
            </button>
          </div>

          <p className="mt-3 text-[10px] leading-snug text-muted">
            {t('error.safeReloadHelp')}
          </p>

          <details
            className="mt-3 rounded-lg border border-line bg-page/60 p-2"
            open={this.state.showLog}
            onToggle={(event) => this.setState({ showLog: event.currentTarget.open })}
          >
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-muted">
              {t('error.logTitle', { count: entries.length })}
            </summary>

            {recent.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted">{t('error.noErrors')}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recent.map((entry) => (
                  <li key={entry.id ?? entry.at} className="rounded border border-line bg-card p-2">
                    <div className="font-mono text-[9px] text-muted">
                      {entry.at ?? '—'} · {entry.scope ?? 'app'}
                    </div>
                    <div className="mt-0.5 break-words text-[11px] text-ink">
                      {entry.message ?? t('error.unknown')}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={this.copyDiagnostics}
                className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink transition hover:bg-line"
              >
                {t('error.copyDiagnostics')}
              </button>
              <button
                type="button"
                onClick={this.clearLog}
                className="rounded border border-line bg-page px-2 py-1 text-[10px] font-semibold text-muted transition hover:text-ink"
              >
                {t('error.clearLog')}
              </button>
              {this.state.copyNotice ? (
                <span className="font-mono text-[10px] text-emerald-300" aria-live="polite">
                  {t(this.state.copyNotice)}
                </span>
              ) : null}
            </div>
          </details>

          {this.state.errorId ? (
            <p className="mt-3 font-mono text-[9px] text-muted">
              {t('error.reference', { id: this.state.errorId })}
            </p>
          ) : null}
        </section>
      </div>
    );
  }
}
