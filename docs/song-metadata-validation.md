# Advisory song metadata validation

Status: approved and implemented (owner decision, 2026-11-13). Tracking issue:
[#459](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/459).

This is **advisory text metadata validation**, not audio recognition. The guest
request form can suggest canonical song/artist spellings; it never requires a
match and never blocks a request.

## Privacy and UX contract

- As the guest types a song or artist, the form may show up to five matching
  suggestions after a short debounce.
- Selecting a suggestion only fills the existing song and artist fields. The
  guest can ignore suggestions and submit the text as typed.
- Lookup failures, offline mode, rate limits and empty results are silent or
  gently labelled. They never become a blocking error.
- Only the typed song and artist are sent to the metadata service. No name,
  email, device id, room code, IP or event data is part of the query. The edge
  function keeps a per-IP counter only in memory for its 60-second abuse window;
  it is never logged, persisted or sent upstream.
- Artwork, preview audio, third-party ids and external URLs are not returned or
  stored.
- The browser never calls iTunes or MusicBrainz directly and never holds an API
  key. The only browser request goes to the project's own
  `search_song_metadata` Edge Function with the public anon key.
- No audio upload, recording or fingerprinting is in scope.

## API and proxy

`supabase/functions/search_song_metadata/index.ts` is a public, CORS-enabled
proxy. It validates the song/artist fields (trimmed, max 120 characters, no
control characters) and returns:

```json
{ "suggestions": [{ "title": "Perfect", "artist": "Ed Sheeran", "album": "÷" }] }
```

`album` is optional. No other upstream field crosses the boundary.

Upstream order:

1. **iTunes Search API** — free, no key, `entity=song`, up to eight upstream
   results, four-second timeout.
2. **MusicBrainz** — free, no key, used only when iTunes returns no usable
   suggestion. It sends the required descriptive `User-Agent`, uses a
   five-second timeout and a best-effort 1.1-second spacing between calls.

If both upstreams fail or return nothing, the function returns
`{ "suggestions": [] }` with HTTP 200. Advisory lookup failures never surface as
a submit-blocking error.

## Cache and rate limits

- In-memory LRU-style cache: 15 minutes TTL, 100 entries per function instance,
  keyed by the normalised song/artist pair. No query text is persisted.
- In-memory per-IP abuse limit: 20 lookups per minute per function instance,
  returning HTTP 429. The IP is not stored beyond the in-memory window.
- MusicBrainz calls are spaced by at least 1.1 seconds per function instance to
  respect its public rate guidance.
- Cache and rate state are intentionally per instance; they reduce upstream
  traffic and are not a durable user profile.

## Deployment

The function needs no secret and no API key:

```sh
supabase functions deploy search_song_metadata
```

`ALLOWED_ORIGIN` is optional and follows the existing Edge Function pattern.
The guest form discovers the function through the existing
`VITE_SUPABASE_URL` / `config.functionsUrl`; no new browser variable is needed.

## Validation

- Unit coverage in `tests/smoke/issue-459.test.js` covers the client helper,
  non-blocking fallback, privacy boundary and function source contract.
- `npm run lint`, `npm test` and `npm run build` must pass.
- A live smoke check after deployment should type a known song/artist pair,
  select a suggestion, then confirm an unmatched/offline entry still submits.

## Out of scope

- Audio recording, upload or fingerprinting (for example AcoustID).
- Storing artwork, preview audio or third-party identifiers.
- Requiring a match before the DJ sees a request.
- Paid APIs, browser-side keys, scraping or analytics on lookup text.
