import { describe, expect, it } from 'vitest';
import {
  createSpeechRecognitionSession,
  mapSpeechError,
  mergeTranscriptResults,
  speechRecognitionCtor,
} from '../src/lib/speechRecognition.js';

function result(transcript, isFinal = false) {
  return { 0: { transcript }, isFinal, length: 1 };
}

function makeTimers() {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimer(callback) {
      const id = nextId;
      nextId += 1;
      timers.set(id, callback);
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    runAll() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
    count() {
      return timers.size;
    },
  };
}

class FakeRecognition {
  static instances = [];

  constructor() {
    this.startCount = 0;
    this.aborted = false;
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    FakeRecognition.instances.push(this);
  }

  start() {
    this.startCount += 1;
    this.onstart?.();
  }

  abort() {
    this.aborted = true;
    this.onend?.();
  }

  emitResult(results, resultIndex = 0) {
    this.onresult?.({ results, resultIndex });
  }

  emitError(error) {
    this.onerror?.({ error });
  }

  emitEnd() {
    this.onend?.();
  }
}

function sessionFixture() {
  FakeRecognition.instances = [];
  const timers = makeTimers();
  const states = [];
  const transcripts = [];
  const errors = [];
  const session = createSpeechRecognitionSession({
    Recognition: FakeRecognition,
    lang: 'PL',
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    onListening: (value) => states.push(value),
    onTranscript: (value) => transcripts.push(value),
    onError: (value) => errors.push(value),
  });
  return { session, timers, states, transcripts, errors, recognition: FakeRecognition.instances };
}

describe('issue #1172 speech recognition controller', () => {
  it('detects both native constructor names', () => {
    const Native = function Native() {};
    expect(speechRecognitionCtor({ SpeechRecognition: Native })).toBe(Native);
    expect(speechRecognitionCtor({ webkitSpeechRecognition: Native })).toBe(Native);
    expect(speechRecognitionCtor({})).toBeNull();
  });

  it('maps browser error codes to the public union', () => {
    expect(mapSpeechError('not-allowed')).toEqual({
      code: 'denied',
      message: expect.any(String),
    });
    expect(mapSpeechError('service-not-allowed').code).toBe('denied');
    expect(mapSpeechError('audio-capture').code).toBe('no-microphone');
    expect(mapSpeechError('language-not-supported').code).toBe('language');
    expect(mapSpeechError('something-else').code).toBe('unknown');
  });

  it('merges interim and final results without duplicating finals', () => {
    const first = mergeTranscriptResults('', {
      resultIndex: 0,
      results: [result('Dobry ', true), result('wieczór')],
    });
    expect(first).toEqual({ final: 'Dobry ', interim: 'wieczór', text: 'Dobry wieczór' });

    const second = mergeTranscriptResults(first.final, {
      resultIndex: 1,
      results: [result('Dobry '), result('wieczór', true)],
    });
    expect(second).toEqual({ final: 'Dobry wieczór', interim: '', text: 'Dobry wieczór' });
  });

  it('starts, merges a transcript and restarts after a silence end', () => {
    const { session, timers, states, transcripts, recognition } = sessionFixture();
    session.start();
    expect(recognition[0].startCount).toBe(1);
    expect(recognition[0].lang).toBe('pl-PL');
    expect(states).toEqual([true]);

    recognition[0].emitResult([result('Dobry '), result('wieczór')]);
    expect(transcripts.at(-1)).toBe('Dobry wieczór');

    recognition[0].emitEnd();
    expect(states.at(-1)).toBe(false);
    expect(timers.count()).toBe(1);
    timers.runAll();
    expect(recognition[0].startCount).toBe(2);
  });

  it('does not restart after an explicit stop', () => {
    const { session, timers, recognition } = sessionFixture();
    session.start();
    session.stop();
    expect(recognition[0].aborted).toBe(true);
    expect(timers.count()).toBe(0);
  });

  it('does not restart after denied or missing microphone', () => {
    for (const code of ['not-allowed', 'audio-capture']) {
      const { session, timers, errors, recognition } = sessionFixture();
      session.start();
      recognition[0].emitError(code);
      recognition[0].emitEnd();
      expect(errors.at(-1).code).toBe(code === 'not-allowed' ? 'denied' : 'no-microphone');
      expect(timers.count()).toBe(0);
      session.destroy();
    }
  });

  it('keeps the listening intent across a network error', () => {
    const { session, timers, errors, recognition } = sessionFixture();
    session.start();
    recognition[0].emitError('network');
    recognition[0].emitEnd();
    expect(errors.at(-1).code).toBe('network');
    expect(timers.count()).toBe(1);
    session.destroy();
  });

  it('reset clears transcript but keeps the session usable', () => {
    const { session, transcripts, recognition } = sessionFixture();
    session.start();
    recognition[0].emitResult([result('Dobry wieczór', true)]);
    session.reset();
    expect(transcripts.at(-1)).toBe('');
    recognition[0].emitResult([result('Państwu', true)]);
    expect(transcripts.at(-1)).toBe('Państwu');
  });

  it('destroy aborts, clears timers and stops callbacks', () => {
    const { session, timers, transcripts, recognition } = sessionFixture();
    session.start();
    recognition[0].emitEnd();
    expect(timers.count()).toBe(1);
    session.destroy();
    expect(recognition[0].aborted).toBe(true);
    expect(timers.count()).toBe(0);
    const before = transcripts.length;
    recognition[0].emitResult([result('ignored', true)]);
    expect(transcripts.length).toBe(before);
  });
});
