// MC-side encrypted game bundle preload (issue #934).
//
// After the MC joins, every cartridge-enabled game is downloaded, decrypted and
// cached so both clickers work offline. Only the MC role is allowed to enable
// this hook. Decrypted questions are cleared on logout, revocation or session
// expiry.

import { useEffect, useState } from 'react';
import {
  fetchGameBundleList,
  loadGameBundleQuestions,
} from '../lib/gameBundleClient.js';
import {
  clearGameQuestions,
  clearGameQuestionsForWedding,
  loadGameQuestions,
  saveGameQuestions,
} from '../lib/gameQuestionCache.js';

function cachedGame(meta, cached) {
  return {
    gameType: meta.gameType,
    gameId: cached.gameId ?? meta.gameId,
    title: cached.title ?? meta.title,
    revision: cached.revision,
    questions: cached.questions,
    status: 'ready',
    fromCache: true,
    loading: false,
    unavailable: false,
  };
}

function pendingGame(meta) {
  return {
    gameType: meta.gameType,
    gameId: meta.gameId,
    title: meta.title,
    revision: null,
    questions: [],
    status: 'loading',
    fromCache: false,
    loading: true,
    unavailable: false,
  };
}

function unavailableGame(meta) {
  return {
    gameType: meta.gameType,
    gameId: meta.gameId,
    title: meta.title,
    revision: null,
    questions: [],
    status: 'unavailable',
    fromCache: false,
    loading: false,
    unavailable: true,
  };
}

function seedGames(weddingId, games, now) {
  const seed = {};
  for (const meta of games) {
    const cached = loadGameQuestions(weddingId, meta.gameType, { now });
    seed[meta.gameType] = cached ? cachedGame(meta, cached) : pendingGame(meta);
  }
  return seed;
}

export default function useGameBundles({
  session,
  weddingId,
  games = [],
  enabled = true,
}) {
  const accessToken = session?.token ?? null;
  const expiresAt = session?.expiresAt ?? null;
  const gameTypes = games.map((game) => game.gameType).join('|');
  const [state, setState] = useState({
    status: 'idle',
    games: {},
    error: null,
  });

  useEffect(() => {
    if (!enabled || !accessToken || !weddingId || !gameTypes) return undefined;
    let active = true;

    const seed = seedGames(weddingId, games, Date.now());
    // eslint-disable-next-line react/set-state-in-effect -- seed the view from the external offline cache before the bundle request
    setState({ status: 'loading', games: seed, error: null });

    const run = async () => {
      let list;
      try {
        list = await fetchGameBundleList({ accessToken });
      } catch (error) {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) {
          clearGameQuestionsForWedding(weddingId);
          setState({
            status: 'revoked',
            games: Object.fromEntries(
              games.map((meta) => [meta.gameType, unavailableGame(meta)]),
            ),
            error: null,
          });
          return;
        }
        const fallback = Object.fromEntries(
          games.map((meta) => {
            const seeded = seed[meta.gameType];
            return [
              meta.gameType,
              seeded?.fromCache ? seeded : unavailableGame(meta),
            ];
          }),
        );
        setState({ status: 'error', games: fallback, error: 'unavailable' });
        return;
      }
      if (!active) return;

      const remoteByType = new Map(
        (list?.games ?? [])
          .filter((game) => game && typeof game.gameType === 'string')
          .map((game) => [game.gameType, game]),
      );
      const next = {};

      for (const meta of games) {
        const remote = remoteByType.get(meta.gameType);
        if (remote?.status !== 'PUBLISHED' || !remote.bundle) {
          clearGameQuestions(weddingId, meta.gameType);
          next[meta.gameType] = unavailableGame(meta);
          continue;
        }

        const cached = loadGameQuestions(weddingId, meta.gameType);
        if (cached && cached.revision === remote.revision) {
          saveGameQuestions({
            weddingId,
            gameType: meta.gameType,
            gameId: remote.gameId ?? meta.gameId,
            title: remote.title ?? cached.title ?? meta.title,
            revision: cached.revision,
            questions: cached.questions,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          });
          next[meta.gameType] = {
            ...cachedGame(meta, cached),
            title: remote.title ?? cached.title ?? meta.title,
            fromCache: false,
          };
          continue;
        }

        try {
          const questions = await loadGameBundleQuestions({
            accessToken,
            weddingId,
            game: remote,
          });
          if (!active) return;
          const record = {
            gameType: meta.gameType,
            gameId: remote.gameId ?? meta.gameId,
            title: remote.title ?? meta.title,
            revision: remote.revision,
            questions,
          };
          saveGameQuestions({
            ...record,
            weddingId,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          });
          next[meta.gameType] = {
            ...record,
            status: 'ready',
            fromCache: false,
            loading: false,
            unavailable: questions.length === 0,
          };
        } catch (error) {
          if (!active) return;
          if (error?.status === 401 || error?.status === 403) {
            clearGameQuestionsForWedding(weddingId);
            setState({
              status: 'revoked',
              games: Object.fromEntries(
                games.map((entry) => [entry.gameType, unavailableGame(entry)]),
              ),
              error: null,
            });
            return;
          }
          next[meta.gameType] = cached
            ? cachedGame(meta, cached)
            : unavailableGame(meta);
        }
      }

      if (active) setState({ status: 'ready', games: next, error: null });
    };

    void run();
    return () => {
      active = false;
    };
  }, [accessToken, enabled, expiresAt, gameTypes, games, weddingId]);

  // A token that expires while the deck is open must drop the decrypted copy.
  useEffect(() => {
    if (!enabled || !weddingId || !expiresAt) return undefined;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearGameQuestionsForWedding(weddingId);
      // eslint-disable-next-line react/set-state-in-effect -- the session expired before this effect ran
      setState({
        status: 'revoked',
        games: Object.fromEntries(
          games.map((meta) => [meta.gameType, unavailableGame(meta)]),
        ),
        error: null,
      });
      return undefined;
    }
    const timer = setTimeout(() => {
      clearGameQuestionsForWedding(weddingId);
      setState({
        status: 'revoked',
        games: Object.fromEntries(
          games.map((meta) => [meta.gameType, unavailableGame(meta)]),
        ),
        error: null,
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [enabled, expiresAt, games, weddingId]);

  return {
    ...state,
    games: enabled ? state.games : {},
  };
}
