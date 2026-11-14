import { useState } from 'react';
import { useI18n } from '../i18n/useI18n.js';
import {
  buildCueSheetHtml,
  buildSetListCsv,
  buildSourceChecklist,
  setListFilename,
} from '../lib/djExport.js';

const STATUS_META = {
  ready: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  backup: 'border-amber-800 bg-amber-950/60 text-amber-200',
  missing: 'border-alert/60 bg-alert/20 text-alert-tint',
  unavailable: 'border-alert/60 bg-alert/20 text-alert-tint',
};

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DjExportPack({ wedding, timeline = [], enabled = true }) {
  const { t } = useI18n();
  const [notice, setNotice] = useState('');
  const checklist = buildSourceChecklist(wedding);

  if (!enabled) return null;

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const openCueSheet = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        flash(t('exportPack.popupBlocked'));
        return;
      }
      win.document.open();
      win.document.write(buildCueSheetHtml({ wedding, timeline }));
      win.document.close();
      win.opener = null;
      win.focus();
      win.print();
      flash(t('exportPack.opened'));
    } catch {
      flash(t('exportPack.openFailed'));
    }
  };

  const downloadCsv = () => {
    try {
      downloadText(buildSetListCsv(timeline), setListFilename(wedding), 'text/csv;charset=utf-8');
      flash(t('exportPack.csvDownloaded'));
    } catch {
      flash(t('exportPack.csvFailed'));
    }
  };

  return (
    <section className="rounded-xl border border-brand-strong/50 bg-card/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brand-soft">
            🖨️ {t('exportPack.title')}
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            {t('exportPack.subtitle')}
          </p>
        </div>
        <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-tint">
          {t('exportPack.vip')}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={openCueSheet}
          className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-[10px] font-semibold text-brand-tint transition hover:bg-brand/50"
        >
          {t('exportPack.print')}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] font-semibold text-ink transition hover:bg-line"
        >
          {t('exportPack.downloadCsv')}
        </button>
      </div>

      {notice ? (
        <p className="mt-2 text-[10px] text-emerald-300" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <div className="mt-3 border-t border-line pt-2">
        <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
          {t('exportPack.checklist')}
        </h3>
        {checklist.length === 0 ? (
          <p className="mt-1 text-[10px] text-muted">{t('exportPack.empty')}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {checklist.map((item) => {
              const primaryTone = STATUS_META[item.primaryStatus] ?? STATUS_META.missing;
              const backupTone = item.backupStatus
                ? STATUS_META[item.backupStatus] ?? STATUS_META.missing
                : null;
              return (
                <li key={item.id} className="rounded border border-line bg-page/70 p-2 text-[10px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-heading text-xs font-semibold text-ink">
                        {item.title}
                      </div>
                      <div className="truncate text-muted">
                        {item.moment} · {item.artist}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${primaryTone}`}>
                      {t(`exportPack.status.${item.primaryStatus}`)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] text-muted">
                    <span>{t('exportPack.primary', { label: item.primary })}</span>
                    {item.backup ? (
                      <span className={item.backupStatus === 'ready' ? 'text-muted' : 'text-amber-200'}>
                        {t('exportPack.backup', { label: item.backup })}
                        {backupTone ? ` · ${t(`exportPack.status.${item.backupStatus}`)}` : ''}
                      </span>
                    ) : (
                      <span>{t('exportPack.noBackup')}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
