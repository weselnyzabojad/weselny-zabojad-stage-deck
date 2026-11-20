import { useCallback, useEffect, useRef, useState } from 'react';
import { listDriveChildren, previewDriveSource } from './adminApi';
import AdminShareFileDialog from './AdminShareFileDialog';
import { isShareableSecretFile } from './adminSharing';
import {
  DRIVE_ROOT_FOLDER_ID,
  DRIVE_DOC_MIME_TYPE,
  DRIVE_MONTH_NAMES,
  mergeYearFolders,
  partitionMonthFolders,
  manifestHash,
} from '../lib/driveFolders';
import { summarizeSecretDocs } from '../lib/secretDocs';

const MONTH_ORDER = new Map(DRIVE_MONTH_NAMES.map((month, index) => [month.toLowerCase(), index]));

function sortMonths(months) {
  return [...months].sort(
    (a, b) =>
      (MONTH_ORDER.get(String(a.name).toLowerCase()) ?? 99) -
      (MONTH_ORDER.get(String(b.name).toLowerCase()) ?? 99),
  );
}

export default function AdminWeddingFolders({ readOnly = false }) {
  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingYear, setLoadingYear] = useState('');
  const [error, setError] = useState('');
  const [lastLoaded, setLastLoaded] = useState(null);
  const [secretsByWedding, setSecretsByWedding] = useState({});
  const [secretFilesByWedding, setSecretFilesByWedding] = useState({});
  const [secretLoadingId, setSecretLoadingId] = useState('');
  const [scanState, setScanState] = useState('');
  const [shareTarget, setShareTarget] = useState(null);
  const yearCacheRef = useRef(new Map());
  const shareButtonRefs = useRef({});

  const loadYears = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listDriveChildren({ parentId: DRIVE_ROOT_FOLDER_ID, pageSize: 200 });
      const nextYears = mergeYearFolders(result.files ?? []);
      setYears(nextYears);
      setLastLoaded(new Date());
      if (nextYears.length > 0) {
        setSelectedYearId((current) =>
          nextYears.some((year) => year.id === current) ? current : nextYears[0].id,
        );
      }
    } catch (err) {
      setError(err.message ?? 'Could not load Drive year folders.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadYear = useCallback(async (yearId) => {
    if (!yearId) return;
    setLoadingYear(yearId);
    setError('');
    try {
      const monthResult = await listDriveChildren({ parentId: yearId, pageSize: 200 });
      const candidates = sortMonths(partitionMonthFolders(monthResult.files ?? []).months);
      const childResults = await Promise.all(
        candidates.map(async (month) => ({
          month,
          childResult: await listDriveChildren({ parentId: month.id, pageSize: 200 }),
        })),
      );
      const hash = manifestHash([
        ...(monthResult.files ?? []),
        ...childResults.flatMap(({ childResult }) => childResult.files ?? []),
      ]);
      const cached = yearCacheRef.current.get(yearId);
      if (cached && cached.hash === hash) {
        setMonths(cached.months);
        setScanState('No folder changes since the last scan.');
        setLastLoaded(new Date());
        return;
      }

      const loaded = await Promise.all(
        childResults.map(async ({ month, childResult }) => {
          const partition = partitionMonthFolders(childResult.files ?? []);
          let secretByWedding = {};
          if (partition.secrets) {
            const secretResult = await listDriveChildren({
              parentId: partition.secrets.id,
              pageSize: 200,
            });
            secretByWedding = Object.fromEntries(
              (secretResult.files ?? []).map((folder) => [folder.name, folder]),
            );
          }
          return {
            ...month,
            weddings: partition.weddings.map((wedding) => ({
              ...wedding,
              secretFolder: secretByWedding[wedding.name] ?? null,
            })),
            secrets: partition.secrets,
          };
        }),
      );
      yearCacheRef.current.set(yearId, { hash, months: loaded });
      setMonths(loaded);
      setScanState(cached ? 'Folder changes detected and processed.' : 'Folder manifest loaded.');
      setLastLoaded(new Date());
    } catch (err) {
      setError(err.message ?? 'Could not load Drive month folders.');
    } finally {
      setLoadingYear('');
    }
  }, []);

  const loadSecret = useCallback(async (wedding) => {
    if (!wedding?.secretFolder) return;
    setSecretLoadingId(wedding.id);
    setError('');
    try {
      const files = [];
      async function collect(parentId, depth) {
        const result = await listDriveChildren({ parentId, pageSize: 200 });
        for (const entry of result.files ?? []) {
          if (isShareableSecretFile(entry)) {
            files.push(entry);
          } else if (
            entry.mimeType === 'application/vnd.google-apps.folder' &&
            depth < 2
          ) {
            await collect(entry.id, depth + 1);
          }
        }
      }
      await collect(wedding.secretFolder.id, 0);

      const docs = [];
      for (const file of files.filter((entry) => entry.mimeType === DRIVE_DOC_MIME_TYPE)) {
        const source = await previewDriveSource(file.id);
        docs.push({ name: file.name, text: source.text ?? '' });
      }
      const summary = summarizeSecretDocs(docs);
      setSecretsByWedding((current) => ({ ...current, [wedding.id]: summary }));
      setSecretFilesByWedding((current) => ({ ...current, [wedding.id]: files }));
    } catch (err) {
      setError(err.message ?? 'Could not load the wedding secrets.');
    } finally {
      setSecretLoadingId('');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loadYears sets its loading flag before the external Drive fetch
    void loadYears();
  }, [loadYears]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- loadYear sets its loading flag before the external Drive fetch
    if (selectedYearId) void loadYear(selectedYearId);
  }, [loadYear, selectedYearId]);

  const totalWeddings = months.reduce((total, month) => total + month.weddings.length, 0);

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
            Wedding folders
          </h3>
          <p className="mt-1 text-[10px] text-muted">
            Drive library · {totalWeddings} wedding folders in the selected year
            {lastLoaded ? ` · refreshed ${lastLoaded.toLocaleTimeString()}` : ''}
          </p>
          {scanState ? <p className="mt-1 text-[10px] text-brand-tint">{scanState}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void loadYears();
            if (selectedYearId) void loadYear(selectedYearId);
          }}
          disabled={loading || Boolean(loadingYear)}
          className="rounded border border-line-strong bg-raised px-2.5 py-1 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh folders'}
        </button>
      </div>

      {error ? (
        <p className="mt-2 rounded border border-alert/50 bg-alert/15 px-2 py-1.5 text-[11px] text-alert-tint">
          {error}
        </p>
      ) : null}

      <div role="tablist" aria-label="Wedding folder year" className="mt-3 flex flex-wrap gap-4 border-b border-line">
        {years.map((year) => {
          const active = year.id === selectedYearId;
          return (
            <button
              key={year.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedYearId(year.id)}
              className={`-mb-px border-b-2 px-1 pb-1.5 font-mono text-xs font-bold transition ${
                active
                  ? 'border-brand-strong text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {year.name}
            </button>
          );
        })}
      </div>

      {loadingYear ? (
        <p className="mt-3 text-xs text-muted">Loading year folders…</p>
      ) : months.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
          No English month folders or wedding folders found for this year.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {months.map((month) => (
            <div key={month.id} className="rounded-lg border border-line bg-page/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading text-xs font-bold text-ink">{month.name}</h4>
                <span className="font-mono text-[10px] text-muted">
                  {month.weddings.length} weddings
                </span>
              </div>
              {month.weddings.length === 0 ? (
                <p className="mt-1 text-[10px] text-muted">No wedding folders.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {month.weddings.map((wedding) => (
                    <li
                      key={wedding.id}
                      className="rounded border border-line/70 bg-card/60 px-2 py-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink">{wedding.name}</span>
                        <span className="font-mono text-[9px] text-muted">
                          {wedding.wedding.cartridgeName}
                        </span>
                      </div>
                      {wedding.secretFolder ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void loadSecret(wedding)}
                            disabled={secretLoadingId === wedding.id}
                            className="rounded border border-line-strong bg-raised px-2 py-0.5 text-[9px] font-semibold text-ink disabled:opacity-50"
                          >
                            {secretLoadingId === wedding.id ? 'Loading secrets…' : 'Load secrets'}
                          </button>
                          {secretsByWedding[wedding.id] ? (
                            <span className="text-[9px] text-muted">
                              {secretsByWedding[wedding.id].empty
                                ? 'No secret Docs yet'
                                : `${secretsByWedding[wedding.id].speechCount} speeches · ${secretsByWedding[wedding.id].questionCount} questions`}
                            </span>
                          ) : null}
                          {secretFilesByWedding[wedding.id] ? (
                            <ul className="mt-1 w-full space-y-1">
                              {secretFilesByWedding[wedding.id].length === 0 ? (
                                <li className="text-[9px] text-muted">
                                  No shareable private Docs or JSON files.
                                </li>
                              ) : (
                                secretFilesByWedding[wedding.id].map((file) => (
                                  <li
                                    key={file.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-line/60 bg-page/40 px-2 py-1"
                                  >
                                    <span className="break-all font-mono text-[9px] text-ink">
                                      {file.name}
                                    </span>
                                    <button
                                      type="button"
                                      ref={(node) => {
                                        shareButtonRefs.current[file.id] = node;
                                      }}
                                      onClick={() => setShareTarget({ file, wedding })}
                                      disabled={readOnly}
                                      className="rounded border border-line-strong bg-raised px-2 py-0.5 text-[9px] font-semibold text-ink disabled:opacity-50"
                                    >
                                      Share
                                    </button>
                                  </li>
                                ))
                              )}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-[9px] text-muted">No secrets folder for this wedding.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {shareTarget ? (
        <AdminShareFileDialog
          file={shareTarget.file}
          readOnly={readOnly}
          onClose={() => {
            const fileId = shareTarget.file.id;
            setShareTarget(null);
            setTimeout(() => shareButtonRefs.current[fileId]?.focus(), 0);
          }}
        />
      ) : null}
    </section>
  );
}
