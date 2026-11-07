import { useCallback, useEffect, useState } from 'react';
import { listDriveChildren, previewDriveSource } from './adminApi';
import {
  DRIVE_ROOT_FOLDER_ID,
  DRIVE_DOC_MIME_TYPE,
  DRIVE_MONTH_NAMES,
  mergeYearFolders,
  partitionMonthFolders,
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

export default function AdminWeddingFolders() {
  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingYear, setLoadingYear] = useState('');
  const [error, setError] = useState('');
  const [lastLoaded, setLastLoaded] = useState(null);
  const [secretsByWedding, setSecretsByWedding] = useState({});
  const [secretLoadingId, setSecretLoadingId] = useState('');

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
      const loaded = await Promise.all(
        candidates.map(async (month) => {
          const childResult = await listDriveChildren({ parentId: month.id, pageSize: 200 });
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
      setMonths(loaded);
      setLastLoaded(new Date());
    } catch (err) {
      setError(err.message ?? 'Could not load Drive month folders.');
      setMonths([]);
    } finally {
      setLoadingYear('');
    }
  }, []);

  const loadSecret = useCallback(async (wedding) => {
    if (!wedding?.secretFolder) return;
    setSecretLoadingId(wedding.id);
    setError('');
    try {
      const result = await listDriveChildren({
        parentId: wedding.secretFolder.id,
        mimeType: DRIVE_DOC_MIME_TYPE,
        pageSize: 100,
      });
      const docs = [];
      for (const file of result.files ?? []) {
        const source = await previewDriveSource(file.id);
        docs.push({ name: file.name, text: source.text ?? '' });
      }
      const summary = summarizeSecretDocs(docs);
      setSecretsByWedding((current) => ({ ...current, [wedding.id]: summary }));
    } catch (err) {
      setError(err.message ?? 'Could not load the wedding secrets.');
    } finally {
      setSecretLoadingId('');
    }
  }, []);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  useEffect(() => {
    if (selectedYearId) void loadYear(selectedYearId);
  }, [loadYear, selectedYearId]);

  const totalWeddings = months.reduce((total, month) => total + month.weddings.length, 0);

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
            Wedding folders
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Drive library · {totalWeddings} wedding folders in the selected year
            {lastLoaded ? ` · refreshed ${lastLoaded.toLocaleTimeString()}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadYears()}
          disabled={loading}
          className="rounded border border-line-strong bg-raised px-2.5 py-1 text-xs font-semibold text-slate-200 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh folders'}
        </button>
      </div>

      {error ? (
        <p className="mt-2 rounded border border-alert/50 bg-alert/15 px-2 py-1.5 text-[11px] text-alert-tint">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {years.map((year) => {
          const active = year.id === selectedYearId;
          return (
            <button
              key={year.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedYearId(year.id)}
              className={`rounded border px-3 py-1.5 font-mono text-xs font-bold ${
                active
                  ? 'border-brand-strong bg-brand/40 text-white'
                  : 'border-line bg-raised text-slate-400'
              }`}
            >
              {year.name}
            </button>
          );
        })}
      </div>

      {loadingYear ? (
        <p className="mt-3 text-xs text-slate-500">Loading year folders…</p>
      ) : months.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-line px-3 py-4 text-center text-xs text-slate-500">
          No English month folders or wedding folders found for this year.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {months.map((month) => (
            <div key={month.id} className="rounded-lg border border-line bg-page/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading text-xs font-bold text-white">{month.name}</h4>
                <span className="font-mono text-[10px] text-slate-500">
                  {month.weddings.length} weddings
                </span>
              </div>
              {month.weddings.length === 0 ? (
                <p className="mt-1 text-[10px] text-slate-500">No wedding folders.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {month.weddings.map((wedding) => (
                    <li
                      key={wedding.id}
                      className="rounded border border-line/70 bg-card/60 px-2 py-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-200">{wedding.name}</span>
                        <span className="font-mono text-[9px] text-slate-500">
                          {wedding.wedding.cartridgeName}
                        </span>
                      </div>
                      {wedding.secretFolder ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void loadSecret(wedding)}
                            disabled={secretLoadingId === wedding.id}
                            className="rounded border border-line-strong bg-raised px-2 py-0.5 text-[9px] font-semibold text-slate-300 disabled:opacity-50"
                          >
                            {secretLoadingId === wedding.id ? 'Loading secrets…' : 'Load secrets'}
                          </button>
                          {secretsByWedding[wedding.id] ? (
                            <span className="text-[9px] text-slate-400">
                              {secretsByWedding[wedding.id].empty
                                ? 'No secret Docs yet'
                                : `${secretsByWedding[wedding.id].speechCount} speeches · ${secretsByWedding[wedding.id].questionCount} questions`}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-[9px] text-slate-500">No secrets folder for this wedding.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
