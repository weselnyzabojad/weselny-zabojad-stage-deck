# Role token signing: ES256 rotation

Status: implemented; ES256 is the only accepted role-token algorithm. Tracking
issue: [#853](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/853).

## Target

Custom role tokens are signed with an **ES256 private key** that is imported as a
Supabase JWT signing key. The private key exists only in the Edge Function secret
`DECK_SUPABASE_JWT_PRIVATE_KEY`; the matching public key is published by the
project JWKS endpoint.

The legacy HS256 shared secret `DECK_SUPABASE_JWT_SECRET` was removed after the
24-hour rotation window. `join_room` and `reveal_speech_key` now fail closed for
HS256 tokens; there is no fallback.

## Rotation order

1. Generate an ES256 private JWK:
   ```sh
   supabase gen signing-key --algorithm ES256
   ```
2. Import the private JWK as a **standby** JWT signing key in:
   `Project Settings → JWT Signing Keys`.
3. Set the Edge secrets:
   ```sh
   supabase secrets set \
     DECK_SUPABASE_JWT_PRIVATE_KEY='<private-jwk-json>' \
     DECK_SUPABASE_JWT_KEY_ID='<imported-kid>'
   ```
4. Deploy `join_room` and `reveal_speech_key`:
   ```sh
   supabase functions deploy join_room
   supabase functions deploy reveal_speech_key --no-verify-jwt
   ```
5. Rotate to the imported key in the dashboard.
6. Verify a role join, live-state read/write and speech reveal.
7. After 24 hours, remove the legacy `DECK_SUPABASE_JWT_SECRET` and redeploy
   `join_room` and `reveal_speech_key` so they reject HS256 tokens.

## Rollback

There is no HS256 fallback anymore. If the ES256 rollout fails:

1. Generate a new ES256 key, import it and rotate to it in the dashboard.
2. Update `DECK_SUPABASE_JWT_PRIVATE_KEY` and `DECK_SUPABASE_JWT_KEY_ID` and
   redeploy `join_room` and `reveal_speech_key`.
3. Verify joins and the speaker reveal.
4. To return to HS256 you would have to set a new shared secret and redeploy a
   previous function version; treat that as a new migration, not a rollback.

Inspect the current public keys at:

```text
https://qdcuxefperykmjlirufe.supabase.co/auth/v1/.well-known/jwks.json
```
