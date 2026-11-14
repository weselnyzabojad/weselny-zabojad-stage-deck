import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createGameQuestionDoc,
  getRevisionContext,
  listGameQuestions,
  parseGameQuestionDoc,
  publishGameQuestions,
  restoreGameQuestions,
  rewriteGameQuestionDocColumns,
} from './adminApi';
import { AdminConfirmDialog } from './AdminDialogs';
import {
  GAME_PARSE_PROGRESS,
  gameDocLanguageReview,
  legacyGameMigration,
  resolveAdminGames,
  resolveGameAnswer,
} from './adminGames';
import { formatAdminTime } from './adminUtils';

const EMPTY_LIST = [];
const PRIMARY_BUTTON =
  'rounded border border-brand-strong bg-brand/30 px-2 py-1 font-semibold text-brand-tint disabled:opacity-40';
const SECONDARY_BUTTON =
  'rounded border border-line-strong bg-raised px-2 py-1 font-semibold text-ink disabled:opacity-40';

function PanelBadge({ enabled }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
        enabled
          ? 'border-emerald-700 bg-emerald-950/50 text-emerald-200'
          : 'border-line-strong bg-raised text-muted'
      }`}
    >
      {enabled ? 'ENABLED' : 'DISABLED'}
    </span>
  );
}

function ParseProgress({ state }) {
  if (!state) return null;
  const index = Math.max(0, GAME_PARSE_PROGRESS.indexOf(state.stage));
  const current = state.done ? GAME_PARSE_PROGRESS.length : index + 1;
  return (
    <div className="rounded border border-line bg-page/60 p-2 text-[9px] text-muted">
      <div
        role="progressbar"
        aria-label="Question Doc parse progress"
        aria-valuemin={0}
        aria-valuemax={GAME_PARSE_PROGRESS.length}
        aria-valuenow={current}
        className="flex gap-1"
      >
        {GAME_PARSE_PROGRESS.map((step, stepIndex) => {
          const reached = state.done || stepIndex <= index;
          return (
            <span
              key={step}
              className={`flex-1 rounded px-1 py-0.5 text-center font-mono uppercase ${
                reached
                  ? state.failed && stepIndex === index
                    ? 'bg-alert/40 text-alert-soft'
                    : 'bg-brand/50 text-ink'
                  : 'bg-raised text-muted'
              }`}
            >
              {step}
            </span>
          );
        })}
      </div>
      <p className="mt-1">
        {state.done
          ? 'Parse complete.'
          : state.failed
            ? `Parse stopped at ${state.stage}.`
            : `Working on ${state.stage}…`}
      </p>
    </div>
  );
}

function QuestionPreview({ questions, game, cartridge, published = false }) {
  if (!questions?.length) return null;
  return (
    <div className="mt-1 rounded border border-line bg-page p-2">
      <p className="font-heading text-[10px] font-bold text-ink">
        {published ? 'Live plaintext preview' : 'Plaintext preview'} · {questions.length} questions ·
        answer key
      </p>
      <ol className="mt-1 space-y-1">
        {questions.map((question) => {
          const answer = resolveGameAnswer(question, cartridge);
          return (
            <li key={question.id} className="rounded border border-line/70 bg-card/60 p-1.5 text-[10px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted">{question.id}</span>
                {question.level ? (
                  <span className="rounded border border-line px-1 font-mono text-[8px] text-brand-tint">
                    {question.level}
                  </span>
                ) : null}
              </div>
              <dl className="mt-1 space-y-0.5">
                {(game.languages.length ? game.languages : Object.keys(question.prompt ?? {})).map(
                  (code) => (
                    <div key={code} className="flex gap-1.5">
                      <dt className="w-5 font-mono text-[9px] font-bold text-muted">{code}</dt>
                      <dd className="min-w-0 flex-1 text-ink">{question.prompt?.[code] ?? '—'}</dd>
                    </div>
                  ),
                )}
              </dl>
              {answer ? (
                <p className="mt-1 text-[10px] text-brand-tint">
                  Answer key: {typeof answer === 'object' ? `${answer.name} (${answer.role})` : answer}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GamePanel({
  game,
  cartridge,
  doc,
  revisions,
  logs,
  active,
  languagesMissing,
  disabled,
  busy,
  preview,
  publishedPreview,
  progress,
  parseErrors,
  docReady,
  reviewed,
  onDocReady,
  onReviewed,
  onCreate,
  onCopyLink,
  onRewrite,
  onParse,
  onPublish,
  onRestore,
}) {
  const review = gameDocLanguageReview(doc, game.languages);
  const parseBlocked =
    disabled ||
    !doc ||
    !docReady ||
    game.languagesMissing ||
    Boolean(review && !reviewed);

  return (
    <div className="rounded-lg border border-line bg-card p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-heading text-xs font-bold text-ink">{game.label}</h4>
          <PanelBadge enabled={game.enabled} />
          {doc?.status ? (
            <span className="font-mono text-[9px] uppercase text-muted">{doc.status}</span>
          ) : null}
          {active ? (
            <span className="rounded border border-amber-700 bg-amber-950/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
              RESULTS ACTIVE
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[9px] text-muted">{game.gameType}</span>
      </div>

      {!game.enabled ? (
        <p className="mt-2 rounded border border-line bg-page/60 p-2 text-[10px] text-muted">
          Disabled by the wedding cartridge. No question Doc, parse or publish actions are
          available for this game.
        </p>
      ) : (
        <>
          {languagesMissing ? (
            <p
              role="alert"
              className="mt-2 rounded border border-alert/60 bg-alert/15 p-2 text-[10px] font-semibold text-alert-soft"
            >
              Content languages are missing. Add{' '}
              <span className="font-mono">extensions.languages.supported</span> before creating a
              question Doc.
            </p>
          ) : null}

          {active ? (
            <p className="mt-2 rounded border border-amber-800 bg-amber-950/30 p-2 text-[10px] text-amber-100">
              A results session is active for this game. Publish and restore are blocked until it
              finishes.
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            {doc ? (
              <>
                <span className="rounded border border-line bg-page px-2 py-1 font-mono text-[9px] text-muted">
                  {doc.drive_doc_name || doc.drive_doc_id || 'Question Doc'}
                  {doc.drive_doc_version ? ` · v${doc.drive_doc_version}` : ''}
                </span>
                {doc.drive_doc_url ? (
                  <a
                    href={doc.drive_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SECONDARY_BUTTON}
                  >
                    Open Doc
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => onCopyLink(doc)}
                  disabled={disabled || !doc.drive_doc_url}
                  className={SECONDARY_BUTTON}
                >
                  Copy Doc link
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onCreate}
                disabled={disabled || Boolean(busy) || game.languagesMissing}
                className={PRIMARY_BUTTON}
              >
                Create question Doc
              </button>
            )}
          </div>

          {doc ? (
            <p className="mt-1 font-mono text-[9px] text-muted">
              {doc.drive_doc_id ? `id ${doc.drive_doc_id}` : 'No Doc id'} ·{' '}
              {doc.question_count ?? 0} parsed questions
              {doc.last_parsed_at ? ` · parsed ${formatAdminTime(doc.last_parsed_at)}` : ''}
              {doc.drive_folder_id ? ` · folder ${doc.drive_folder_id}` : ''}
            </p>
          ) : null}

          {review ? (
            <div className="mt-2 rounded border border-amber-800 bg-amber-950/30 p-2 text-[10px] text-amber-100">
              <p className="font-semibold">Question Doc review required</p>
              {review.languagesChanged ? (
                <p className="mt-1 text-amber-200">
                  Content languages changed from{' '}
                  <span className="font-mono">
                    {review.docLanguages.join(', ') || '—'}
                  </span>{' '}
                  to <span className="font-mono">{review.languages.join(', ')}</span>.
                  {review.added.length ? ` Added ${review.added.join(', ')}.` : ''}
                  {review.removed.length ? ` Removed ${review.removed.join(', ')}.` : ''}
                </p>
              ) : (
                <p className="mt-1 text-amber-200">
                  The Doc columns changed. Review the Doc and confirm before re-parsing.
                </p>
              )}
              {review.languagesChanged ? (
                <button
                  type="button"
                  onClick={onRewrite}
                  disabled={disabled || Boolean(busy) || game.languagesMissing}
                  className="mt-2 rounded border border-amber-600 bg-amber-900/60 px-2 py-1 font-semibold text-amber-100 disabled:opacity-40"
                >
                  Rewrite Doc columns
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
            <label className="flex items-center gap-1.5 text-muted">
              <input
                type="checkbox"
                checked={Boolean(docReady)}
                onChange={(event) => onDocReady(event.target.checked)}
                disabled={disabled || !doc || !game.enabled}
              />
              Doc ready
            </label>
            {review ? (
              <label className="flex items-center gap-1.5 text-amber-200">
                <input
                  type="checkbox"
                  checked={Boolean(reviewed)}
                  onChange={(event) => onReviewed(event.target.checked)}
                  disabled={disabled}
                />
                I reviewed the Doc columns
              </label>
            ) : null}
            <button
              type="button"
              onClick={onParse}
              disabled={Boolean(busy) || parseBlocked}
              className={PRIMARY_BUTTON}
            >
              Parse Doc
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={
                disabled ||
                Boolean(busy) ||
                active ||
                !preview?.questions?.length ||
                game.languagesMissing
              }
              className={PRIMARY_BUTTON}
            >
              Publish
            </button>
          </div>

          <ParseProgress state={progress} />

          {parseErrors?.length ? (
            <ul className="mt-1 space-y-0.5 rounded bg-alert/10 p-2 font-mono text-[9px] text-alert-soft">
              {parseErrors.map((entry, index) => (
                <li key={`${entry.code ?? 'error'}-${index}`}>
                  {entry.code ?? 'parse_failed'} · {entry.message}
                </li>
              ))}
            </ul>
          ) : null}

          <QuestionPreview
            questions={preview?.questions?.length ? preview.questions : publishedPreview}
            published={!preview?.questions?.length && Boolean(publishedPreview?.length)}
            game={game}
            cartridge={cartridge}
          />

          {revisions.length ? (
            <details className="mt-2 rounded border border-line bg-page/60 p-2 text-[10px]">
              <summary className="cursor-pointer font-semibold text-ink">
                Revision history · {revisions.length}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {revisions.map((revision) => (
                  <li
                    key={`${revision.gameType ?? revision.game_type}-${revision.revision}`}
                    className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-muted"
                  >
                    <span>v{revision.revision}</span>
                    <span>{revision.questionCount ?? revision.question_count ?? 0} questions</span>
                    <span>{formatAdminTime(revision.publishedAt ?? revision.published_at)}</span>
                    <button
                      type="button"
                      onClick={() => onRestore(revision)}
                      disabled={disabled || Boolean(busy) || active}
                      className="rounded border border-line px-1.5 py-0.5 font-semibold text-ink disabled:opacity-40"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <details className="mt-2 rounded border border-line bg-page/60 p-2 text-[10px]">
            <summary className="cursor-pointer font-semibold text-ink">Admin logs · 90 days</summary>
            <ul className="mt-1 space-y-0.5 font-mono text-[9px] text-muted">
              {logs.length === 0 ? <li>No admin log entries for this game.</li> : null}
              {logs.map((log) => (
                <li key={log.id}>
                  {formatAdminTime(log.created_at)} · {log.actor ?? '—'} · {log.action} · Doc{' '}
                  {doc?.drive_doc_id ?? '—'}
                  {doc?.drive_doc_version ? ` v${doc.drive_doc_version}` : ''} ·{' '}
                  {log.code ?? 'ok'}
                  {log.message ? ` · ${log.message}` : ''}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

export default function AdminGamesPanel({ wedding, readOnly = false, onChanged }) {
  const [context, setContext] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [docReady, setDocReady] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [previews, setPreviews] = useState({});
  const [progress, setProgress] = useState({});
  const [parseErrors, setParseErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const disabled = readOnly || Boolean(wedding.archived_at);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [revisionContext, gamesResult] = await Promise.all([
        getRevisionContext(wedding.wedding_id),
        listGameQuestions(wedding.wedding_id),
      ]);
      setContext(revisionContext);
      setResult(gamesResult);
      setLoaded(true);
    } catch (cause) {
      setError(cause?.message ?? 'Could not load game questions.');
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [wedding.wedding_id]);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- load() sets its loading flag before the admin requests
    if (!loaded && !loading) void load();
  }, [load, loaded, loading]);

  const cartridge = context?.wedding?.cartridge ?? wedding.cartridge ?? null;
  const games = useMemo(() => resolveAdminGames(cartridge), [cartridge]);
  const docs = result?.docs ?? EMPTY_LIST;
  const gamesById = result?.games ?? EMPTY_LIST;
  const revisions = result?.revisions ?? EMPTY_LIST;
  const logs = result?.logs ?? EMPTY_LIST;
  const activeGameTypes = result?.activeGameTypes ?? EMPTY_LIST;
  const migration = useMemo(() => legacyGameMigration(cartridge, docs), [cartridge, docs]);

  const docFor = (gameType) =>
    docs.find(
      (doc) => (doc.game_type ?? doc.gameType) === gameType,
    ) ?? null;
  const gameBundleFor = (gameType) =>
    gamesById.find(
      (bundle) => (bundle.game_type ?? bundle.gameType) === gameType,
    ) ?? null;
  const isActive = (gameType) =>
    activeGameTypes.includes(gameType) ||
    Boolean(gameBundleFor(gameType)?.active);

  const createDoc = async (game) => {
    if (disabled || !game.enabled || game.languagesMissing) return;
    setBusy(game.gameType);
    setError('');
    setMessage('');
    try {
      const created = await createGameQuestionDoc({
        weddingId: wedding.wedding_id,
        weddingFolderId: wedding.drive_folder_id ?? wedding.driveFolderId ?? '',
        gameType: game.gameType,
        gameId: game.gameId,
        title: game.title,
        enabled: true,
        languages: game.languages,
      });
      setMessage(
        created?.created
          ? `${game.label} question Doc created.`
          : `${game.label} question Doc already exists and was linked.`,
      );
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not create the question Doc.');
    } finally {
      setBusy('');
    }
  };

  const copyDocLink = async (doc) => {
    try {
      await navigator.clipboard.writeText(doc.drive_doc_url);
      setMessage('Question Doc link copied.');
    } catch {
      setError('Could not copy the question Doc link.');
    }
  };

  const rewriteColumns = async (game) => {
    const doc = docFor(game.gameType);
    if (disabled || !doc || game.languagesMissing) return;
    if (
      !window.confirm(
        `${game.label}: rewrite the Doc columns for ${game.languages.join(', ')}? Question text is kept, new language cells stay empty, and you must review and re-parse the Doc.`,
      )
    ) {
      return;
    }
    setBusy(game.gameType);
    setError('');
    setMessage('');
    try {
      const rewritten = await rewriteGameQuestionDocColumns({
        weddingId: wedding.wedding_id,
        gameType: game.gameType,
        languages: game.languages,
        fileId: doc.drive_doc_id,
        folderId: doc.drive_folder_id,
      });
      setReviewed((current) => ({ ...current, [game.gameType]: false }));
      setMessage(
        rewritten?.changed
          ? `${game.label} Doc columns rewritten. Review the Doc, then re-parse.`
          : `${game.label} Doc columns already match the supported languages.`,
      );
      await load();
      onChanged?.();
    } catch (cause) {
      setError(cause?.message ?? 'Could not rewrite the Doc columns.');
    } finally {
      setBusy('');
    }
  };

  const parseDoc = async (game) => {
    const doc = docFor(game.gameType);
    if (disabled || !doc || !docReady[game.gameType] || game.languagesMissing) return;
    const review = gameDocLanguageReview(doc, game.languages);
    if (review && !reviewed[game.gameType]) return;
    setBusy(game.gameType);
    setError('');
    setMessage('');
    setParseErrors((current) => ({ ...current, [game.gameType]: [] }));
    setPreviews((current) => {
      const next = { ...current };
      delete next[game.gameType];
      return next;
    });
    setProgress((current) => ({
      ...current,
      [game.gameType]: { stage: 'fetch', done: false, failed: false },
    }));
    try {
      const parsed = await parseGameQuestionDoc({
        weddingId: wedding.wedding_id,
        gameType: game.gameType,
        fileId: doc.drive_doc_id,
        folderId: doc.drive_folder_id,
        languages: game.languages,
        docReady: true,
        reviewed: Boolean(reviewed[game.gameType] || !review?.reviewRequired),
      });
      const stages = Array.isArray(parsed?.progress) && parsed.progress.length
        ? parsed.progress
        : GAME_PARSE_PROGRESS;
      setProgress((current) => ({
        ...current,
        [game.gameType]: {
          stage: stages[stages.length - 1],
          done: true,
          failed: false,
        },
      }));
      setPreviews((current) => ({ ...current, [game.gameType]: parsed }));
      setDocReady((current) => ({ ...current, [game.gameType]: false }));
      await load();
    } catch (cause) {
      const stages = Array.isArray(cause?.progress) && cause.progress.length
        ? cause.progress
        : ['fetch', 'parse', 'validate'];
      setProgress((current) => ({
        ...current,
        [game.gameType]: {
          stage: stages[stages.length - 1],
          done: false,
          failed: true,
        },
      }));
      setParseErrors((current) => ({
        ...current,
        [game.gameType]: cause?.errors?.length
          ? cause.errors
          : [{ code: cause?.code ?? 'parse_failed', message: cause?.message }],
      }));
      setError(cause?.message ?? 'Could not parse the question Doc.');
    } finally {
      setBusy('');
    }
  };

  const requestPublish = (game) => {
    const preview = previews[game.gameType];
    if (!preview?.questions?.length) {
      setError('Parse the Doc and review the plaintext preview before publishing.');
      return;
    }
    if (disabled || isActive(game.gameType)) return;
    setConfirmError('');
    setConfirm({ kind: 'publish', game, revision: null });
  };

  const requestRestore = (game, revision) => {
    if (disabled || isActive(game.gameType)) return;
    setConfirmError('');
    setConfirm({ kind: 'restore', game, revision });
  };

  const confirmAction = async () => {
    if (!confirm) return;
    const { kind, game, revision } = confirm;
    setConfirmBusy(true);
    setConfirmError('');
    setError('');
    setMessage('');
    try {
      if (kind === 'publish') {
        const preview = previews[game.gameType];
        const doc = docFor(game.gameType);
        await publishGameQuestions({
          weddingId: wedding.wedding_id,
          gameType: game.gameType,
          gameId: game.gameId,
          title: game.title,
          sourceDocId: doc?.drive_doc_id ?? game.sourceDocId ?? null,
          questions: preview?.questions ?? [],
        });
        setPreviews((current) => {
          const next = { ...current };
          delete next[game.gameType];
          return next;
        });
        setMessage(`${game.label} published. Previous revisions stay available.`);
      } else {
        await restoreGameQuestions({
          weddingId: wedding.wedding_id,
          gameType: game.gameType,
          revision: revision.revision,
        });
        setMessage(`${game.label} restored to revision ${revision.revision}.`);
      }
      setConfirm(null);
      await load();
      onChanged?.();
    } catch (cause) {
      setConfirmError(cause?.message ?? 'The admin action failed.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const anyLanguagesMissing = games.some((game) => game.languagesMissing);

  return (
    <div className="mt-2 rounded border border-line bg-raised/40 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
          Games
        </h3>
        <div className="flex items-center gap-2">
          {loading ? <span className="text-[9px] text-muted">Loading…</span> : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded border border-line px-2 py-1 text-[9px] font-semibold text-muted disabled:opacity-40"
          >
            Refresh
          </button>
        </div>
      </div>

      {anyLanguagesMissing ? (
        <p
          role="alert"
          className="mt-2 rounded border border-alert/60 bg-alert/15 p-2 text-[10px] font-semibold text-alert-soft"
        >
          Content languages missing: set <span className="font-mono">extensions.languages.supported</span>{' '}
          before creating or parsing game question Docs.
        </p>
      ) : null}

      {migration.hasLegacy ? (
        <div className="mt-2 rounded border border-amber-800 bg-amber-950/30 p-2 text-[10px] text-amber-100">
          <p className="font-heading text-xs font-bold">Legacy game questions detected</p>
          <p className="mt-1 text-amber-200">
            {migration.questionCount} embedded questions remain in the wedding cartridge ·{' '}
            {migration.linkedCount} linked to a Drive Doc · {migration.unlinkedCount} without a Doc
            link.
          </p>
          <ul className="mt-1 space-y-0.5 font-mono text-[9px]">
            {migration.lists.map((list) => (
              <li key={list.gameType}>
                {list.label} · {list.questionCount} questions ·{' '}
                {list.linked ? 'linked Doc' : 'NO Doc link'}
              </li>
            ))}
          </ul>
          {migration.unlinkedCount > 0 ? (
            <p className="mt-1 font-semibold text-amber-200">
              Warning: {migration.unlinkedQuestionCount} unlinked legacy question
              {migration.unlinkedQuestionCount === 1 ? '' : 's'} will lose their text when the
              migration is run. Export or copy them before discarding.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {games.map((game) => {
          const gameLogs = logs.filter(
            (log) => (log.game_type ?? log.gameType) === game.gameType,
          );
          const gameRevisions = revisions.filter(
            (revision) =>
              (revision.gameType ?? revision.game_type) === game.gameType,
          );
          return (
            <GamePanel
              key={game.gameType}
              game={game}
              cartridge={cartridge}
              doc={docFor(game.gameType)}
              revisions={gameRevisions}
              logs={gameLogs}
              active={isActive(game.gameType)}
              languagesMissing={game.languagesMissing}
              disabled={disabled}
              busy={busy === game.gameType}
              preview={previews[game.gameType]}
              publishedPreview={gameBundleFor(game.gameType)?.preview ?? null}
              progress={progress[game.gameType]}
              parseErrors={parseErrors[game.gameType]}
              docReady={docReady[game.gameType]}
              reviewed={reviewed[game.gameType]}
              onDocReady={(checked) =>
                setDocReady((current) => ({ ...current, [game.gameType]: checked }))
              }
              onReviewed={(checked) =>
                setReviewed((current) => ({ ...current, [game.gameType]: checked }))
              }
              onCreate={() => void createDoc(game)}
              onCopyLink={(doc) => void copyDocLink(doc)}
              onRewrite={() => void rewriteColumns(game)}
              onParse={() => void parseDoc(game)}
              onPublish={() => requestPublish(game)}
              onRestore={(revision) => requestRestore(game, revision)}
            />
          );
        })}
      </div>

      {message ? <p className="mt-2 text-[10px] text-emerald-300">{message}</p> : null}
      {error ? (
        <pre className="mt-2 whitespace-pre-wrap rounded bg-alert/10 p-2 text-[10px] text-alert-soft">
          {error}
        </pre>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'restore' ? 'Restore game revision' : 'Publish game questions'}
        description={
          confirm?.kind === 'restore'
            ? `Restore ${confirm.game.label} to revision ${confirm.revision?.revision}? The live bundle changes immediately and the action is logged.`
            : `Publish ${previews[confirm?.game?.gameType]?.questions?.length ?? 0} encrypted ${confirm?.game?.label ?? ''} questions? The live bundle changes immediately and the action is logged.`
        }
        confirmLabel={confirm?.kind === 'restore' ? 'Restore revision' : 'Publish questions'}
        tone={confirm?.kind === 'restore' ? 'danger' : 'primary'}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={() => void confirmAction()}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirm(null);
          setConfirmError('');
        }}
      />
    </div>
  );
}
