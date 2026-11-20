import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminGamesPanel from '../src/admin/AdminGamesPanel.jsx';
import AdminSpeechesPanel from '../src/admin/AdminSpeechesPanel.jsx';
import { resolveAdminGame } from '../src/admin/adminGames.js';
import {
  GAME_TYPES,
  gameQuestionDocCreatePreflight,
  gameQuestionDocCreationAuthorization,
  gameQuestionDocFolderPath,
} from '../src/lib/gameQuestions.js';
import { speechDocCreationAuthorization } from '../src/lib/speeches.js';
import {
  gameQuestionDocCreatePreflight as edgeGamePreflight,
  gameQuestionDocCreationAuthorization as edgeGameAuthorization,
} from '../supabase/functions/_shared/gameQuestions.js';
import { speechDocCreationAuthorization as edgeSpeechAuthorization } from '../supabase/functions/_shared/speechDoc.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const WEDDING_ID = 'Weronika&Guillaume-UM-2027-04-002';

function gameStep(gameType, requested) {
  return {
    id: `step_${gameType}`,
    game: {
      id: gameType.toLowerCase(),
      title: gameType === GAME_TYPES.TEST_WIEDZY ? 'Test Wiedzy' : 'Test Zgodności',
      gameType,
      enabled: requested !== 'NO',
      ...(requested === undefined ? {} : { requested }),
    },
  };
}

function cartridge(requests, extra = {}) {
  return {
    extensions: { languages: { supported: ['PL', 'FR'] } },
    steps: Object.entries(requests).map(([gameType, requested]) => gameStep(gameType, requested)),
    ...extra,
  };
}

const wedding = (value) => ({
  wedding_id: WEDDING_ID,
  room_code: 'testroom',
  couple: 'Bride & Groom',
  archived_at: null,
  cartridge: value,
});

const createButton = (markup) => {
  const match = /<button[^>]*>Create question Doc<\/button>/.exec(markup);
  return match?.[0] ?? '';
};

describe('issue #974 per-game Doc-authorized Drive creation', () => {
  it('authorizes only the game whose own predefined step says YES', () => {
    const yesWiedzy = cartridge({
      [GAME_TYPES.TEST_WIEDZY]: 'YES',
      [GAME_TYPES.TEST_ZGODNOSCI]: 'UNDECIDED',
    });
    expect(
      gameQuestionDocCreationAuthorization(yesWiedzy, GAME_TYPES.TEST_WIEDZY),
    ).toMatchObject({ allowed: true, requested: 'YES' });
    expect(
      gameQuestionDocCreationAuthorization(yesWiedzy, GAME_TYPES.TEST_ZGODNOSCI),
    ).toMatchObject({ allowed: false, code: 'not_requested', requested: 'UNDECIDED' });

    const yesZgodnosci = cartridge({
      [GAME_TYPES.TEST_WIEDZY]: 'NO',
      [GAME_TYPES.TEST_ZGODNOSCI]: 'YES',
    });
    expect(
      gameQuestionDocCreationAuthorization(yesZgodnosci, GAME_TYPES.TEST_ZGODNOSCI),
    ).toMatchObject({ allowed: true });
    expect(
      gameQuestionDocCreationAuthorization(yesZgodnosci, GAME_TYPES.TEST_WIEDZY),
    ).toMatchObject({ allowed: false, requested: 'NO' });
  });

  it('blocks NO, UNDECIDED and a missing Requested value', () => {
    for (const [value, requested] of [
      ['NO', 'NO'],
      ['UNDECIDED', 'UNDECIDED'],
      [undefined, null],
    ]) {
      const result = gameQuestionDocCreationAuthorization(
        cartridge({ [GAME_TYPES.TEST_WIEDZY]: value }),
        GAME_TYPES.TEST_WIEDZY,
      );
      expect(result, String(value)).toMatchObject({
        allowed: false,
        code: 'not_requested',
        requested,
        step: 'found',
      });
    }
  });

  it('blocks missing, duplicated and non-predefined steps without a legacy fallback', () => {
    expect(
      gameQuestionDocCreationAuthorization(
        cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'YES' }),
        GAME_TYPES.TEST_ZGODNOSCI,
      ),
    ).toMatchObject({ allowed: false, step: 'missing' });

    const duplicate = {
      steps: [gameStep(GAME_TYPES.TEST_WIEDZY, 'YES'), gameStep(GAME_TYPES.TEST_WIEDZY, 'YES')],
    };
    expect(
      gameQuestionDocCreationAuthorization(duplicate, GAME_TYPES.TEST_WIEDZY),
    ).toMatchObject({ allowed: false, step: 'duplicate' });

    const nonPredefined = {
      steps: [
        {
          id: 'game_wiedzy',
          title: 'Test Wiedzy',
          game: { id: 'test_wiedzy', title: 'Test Wiedzy', enabled: true, requested: 'YES' },
        },
      ],
      games: {
        enabled: true,
        questionLists: [
          {
            id: 'test_wiedzy',
            title: 'Test Wiedzy',
            gameType: GAME_TYPES.TEST_WIEDZY,
            enabled: true,
            requested: 'YES',
          },
        ],
      },
    };
    expect(
      gameQuestionDocCreationAuthorization(nonPredefined, GAME_TYPES.TEST_WIEDZY),
    ).toMatchObject({ allowed: false, step: 'missing' });
    expect(
      gameQuestionDocCreationAuthorization(
        { games: nonPredefined.games, steps: [] },
        GAME_TYPES.TEST_WIEDZY,
      ),
    ).toMatchObject({ allowed: false, step: 'missing' });

    expect(resolveAdminGame(nonPredefined, GAME_TYPES.TEST_WIEDZY)).toMatchObject({
      creation: { allowed: false, requested: null },
      requested: null,
    });
  });

  it('ignores spoofed client enabled and mode values in the create preflight', () => {
    const authorized = cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'YES' });
    expect(
      gameQuestionDocCreatePreflight({
        cartridge: authorized,
        gameType: GAME_TYPES.TEST_WIEDZY,
        languages: ['PL', 'FR'],
        enabled: false,
      }).value,
    ).toMatchObject({ gameType: GAME_TYPES.TEST_WIEDZY, languages: ['PL', 'FR'] });

    expect(
      gameQuestionDocCreatePreflight({
        cartridge: cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'NO' }),
        gameType: GAME_TYPES.TEST_WIEDZY,
        languages: ['PL'],
        enabled: true,
      }),
    ).toMatchObject({ code: 'not_requested' });

    expect(
      speechDocCreationAuthorization({ speechMode: 'LIGHT', mode: 'COMPLEX' }),
    ).toMatchObject({ allowed: false, code: 'speech_mode_not_complex' });
    expect(
      speechDocCreationAuthorization({ speechMode: 'COMPLEX', mode: 'OFF' }),
    ).toMatchObject({ allowed: true });
    expect(
      speechDocCreationAuthorization({ mode: 'COMPLEX' }),
    ).toMatchObject({ allowed: false, code: 'missing_speech_mode' });
  });

  it('requires cartridge COMPLEX for speech creation and keeps LIGHT metadata-only', () => {
    expect(speechDocCreationAuthorization({ speechMode: 'COMPLEX' })).toMatchObject({
      allowed: true,
      mode: 'COMPLEX',
    });
    for (const [speechMode, code] of [
      ['LIGHT', 'speech_mode_not_complex'],
      ['OFF', 'speech_mode_not_complex'],
      [undefined, 'missing_speech_mode'],
      ['lowercase', 'missing_speech_mode'],
    ]) {
      expect(speechDocCreationAuthorization({ speechMode }), String(speechMode)).toMatchObject({
        allowed: false,
        code,
      });
    }
  });

  it('keeps the browser and Edge authorization copies in sync', () => {
    const cases = [
      cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'YES', [GAME_TYPES.TEST_ZGODNOSCI]: 'NO' }),
      cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'UNDECIDED' }),
      {
        steps: [gameStep(GAME_TYPES.TEST_ZGODNOSCI, 'YES'), gameStep(GAME_TYPES.TEST_ZGODNOSCI, 'YES')],
      },
    ];
    for (const value of cases) {
      for (const gameType of Object.values(GAME_TYPES)) {
        expect(edgeGameAuthorization(value, gameType)).toEqual(
          gameQuestionDocCreationAuthorization(value, gameType),
        );
        expect(
          edgeGamePreflight({ cartridge: value, gameType, languages: ['PL'] }),
        ).toEqual(
          gameQuestionDocCreatePreflight({ cartridge: value, gameType, languages: ['PL'] }),
        );
      }
    }
    for (const speechMode of ['COMPLEX', 'LIGHT', 'OFF', undefined]) {
      expect(edgeSpeechAuthorization({ speechMode })).toEqual(
        speechDocCreationAuthorization({ speechMode }),
      );
    }
  });

  it('disables Create in the admin UI with the Doc reason', () => {
    const blocked = cartridge({
      [GAME_TYPES.TEST_WIEDZY]: 'NO',
      [GAME_TYPES.TEST_ZGODNOSCI]: 'UNDECIDED',
    });
    const markup = renderToStaticMarkup(
      createElement(AdminGamesPanel, { wedding: wedding(blocked), readOnly: false }),
    );

    expect(markup).toContain('DOC REQUESTED NO');
    expect(markup).toContain('DOC REQUESTED UNDECIDED');
    expect(markup).toContain('Create blocked by the wedding Doc.');
    expect(markup).toContain('Set Requested: YES');
    expect(createButton(markup)).toContain('disabled');

    const missing = renderToStaticMarkup(
      createElement(AdminGamesPanel, {
        wedding: wedding({ steps: [{ game: { gameType: GAME_TYPES.TEST_WIEDZY, enabled: true } }] }),
        readOnly: false,
      }),
    );
    expect(missing).toContain('DOC REQUESTED MISSING');
    expect(missing).toContain('is missing in the wedding Doc');
    expect(createButton(missing)).toContain('disabled');
  });

  it('makes the speech mode read-only and surfaces bridge/missing states', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    const api = read('src/admin/adminApi.js');
    const backend = read('supabase/functions/admin_api/index.ts');

    expect(panel).not.toContain('setSpeechMode');
    expect(panel).not.toContain('changeMode');
    expect(panel).toContain('from the wedding Doc · read-only');
    expect(panel).toContain('Speech Doc creation is blocked.');
    expect(panel).toContain('{creation.error} This panel cannot override the Doc.');
    expect(panel).toContain('Speech management is disabled for this wedding.');
    expect(panel).toContain('LIGHT records metadata only');
    expect(api).not.toContain('setSpeechMode');
    expect(backend).not.toContain("action === 'set_speech_mode'");

    for (const [mode, expected] of [
      ['LIGHT', 'Speech mode is LIGHT in the wedding Doc.'],
      ['OFF', 'Speech mode is OFF in the wedding Doc.'],
    ]) {
      const markup = renderToStaticMarkup(
        createElement(AdminSpeechesPanel, {
          wedding: wedding(cartridge({ [GAME_TYPES.TEST_WIEDZY]: 'YES' }, { speechMode: mode })),
          readOnly: false,
        }),
      );
      expect(markup).toContain(`Speeches · ${mode}`);
      expect(speechDocCreationAuthorization({ speechMode: mode }).error).toContain(expected);
    }
    expect(speechDocCreationAuthorization({}).error).toContain(
      'The wedding Doc has no Speech mode.',
    );

    expect(
      renderToStaticMarkup(
        createElement(AdminSpeechesPanel, {
          wedding: wedding({ steps: [] }),
          readOnly: false,
        }),
      ),
    ).toContain('Speeches · MISSING');
  });

  it('checks the stored cartridge before any Drive call and ignores body.enabled', () => {
    const api = read('supabase/functions/admin_drive/index.ts');
    const gameSection = api.slice(
      api.indexOf("action === 'create_game_question_doc'"),
      api.indexOf("action === 'rewrite_game_question_doc_columns'"),
    );
    expect(gameSection.indexOf('loadWeddingCartridge')).toBeGreaterThan(-1);
    expect(gameSection.indexOf('loadWeddingCartridge')).toBeLessThan(
      gameSection.indexOf('gameQuestionDocCreatePreflight'),
    );
    expect(gameSection.indexOf('gameQuestionDocCreatePreflight')).toBeLessThan(
      gameSection.indexOf('resolveWeddingFolderId'),
    );
    expect(gameSection.indexOf('gameQuestionDocCreatePreflight')).toBeLessThan(
      gameSection.indexOf('ensureFolderPath'),
    );
    expect(gameSection).not.toContain('body?.enabled');
    expect(gameSection).not.toContain('enabled: body');

    const speechSection = api.slice(
      api.indexOf("action === 'create_speech_doc'"),
      api.indexOf("action === 'rename_speech_doc'"),
    );
    expect(speechSection.indexOf('loadWeddingCartridge')).toBeGreaterThan(-1);
    expect(speechSection.indexOf('speechDocCreationAuthorization')).toBeLessThan(
      speechSection.indexOf('ensureSpeechFolder'),
    );
  });

  it('returns before resolving folders or creating Docs for every unauthorized speech mode', () => {
    const api = read('supabase/functions/admin_drive/index.ts');
    const speechSection = api.slice(
      api.indexOf("action === 'create_speech_doc'"),
      api.indexOf("action === 'rename_speech_doc'"),
    );
    const gate = speechSection.indexOf('if (!authorization.allowed)');
    expect(gate).toBeGreaterThan(speechSection.indexOf('speechDocCreationAuthorization(cartridge)'));
    for (const sideEffect of ['resolveWeddingFolderId', 'ensureSpeechFolder', 'connector.createGoogleDoc']) {
      expect(gate, sideEffect).toBeLessThan(speechSection.indexOf(sideEffect));
    }
    expect(speechSection.slice(gate)).toContain(
      'return json({ error: authorization.error, code: authorization.code }, 409)',
    );
    expect(speechSection).not.toContain('body?.mode');
  });

  it('uses both #968 folder scopes and reuses existing folders and Docs', () => {
    expect(gameQuestionDocFolderPath(GAME_TYPES.TEST_WIEDZY, WEDDING_ID)).toEqual({
      scope: 'wedding',
      segments: ['games'],
    });
    expect(gameQuestionDocFolderPath(GAME_TYPES.TEST_ZGODNOSCI, WEDDING_ID)).toEqual({
      scope: 'private',
      segments: ['secrets', WEDDING_ID, 'compatibility-test-game'],
    });

    const api = read('supabase/functions/admin_drive/index.ts');
    const gameSection = api.slice(
      api.indexOf("action === 'create_game_question_doc'"),
      api.indexOf("action === 'rewrite_game_question_doc_columns'"),
    );
    expect(gameSection.indexOf('if (existing.files[0])')).toBeLessThan(
      gameSection.indexOf('connector.createGoogleDoc'),
    );
    expect(gameSection).toContain('created: false');
    expect(gameSection).toContain('scope: path.scope');
  });

  it('keeps parse and read actions free of Drive writes', () => {
    const api = read('supabase/functions/admin_drive/index.ts');
    const sections = [
      api.slice(
        api.indexOf("action === 'parse_speech_doc'"),
        api.indexOf("action === 'create_game_question_doc'"),
      ),
      api.slice(
        api.indexOf("action === 'parse_game_question_doc'"),
        api.indexOf('const requestedFileId'),
      ),
      api.slice(api.indexOf("action === 'children'"), api.indexOf("action === 'status'")),
      api.slice(api.indexOf("action === 'list'"), api.indexOf("action === 'create_speech_doc'")),
    ];
    for (const section of sections) {
      expect(section).not.toContain('ensureFolderPath');
      expect(section).not.toContain('ensureSpeechFolder');
      expect(section).not.toContain('createGoogleDoc');
      expect(section).not.toContain('createFolder');
    }
  });
});
