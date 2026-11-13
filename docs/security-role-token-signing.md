# Role token signing: ES256 rotation

Status: implemented; live key rotation is an owner action. Tracking issue:
[#853](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/853).

## Target

Custom role tokens are signed with an **ES256 private key** that is imported as a
Supabase JWT signing key. The private key exists only in the Edge Function secret
`DECK_SUPABASE_JWT_PRIVATE_KEY`; the matching public key is published by the
project JWKS endpoint.

`DECK_SUPABASE_JWT_SECRET` remains only as a temporary HS256 verification
fallback for tokens issued before rotation. Remove it after the last old token
has expired (24-hour token TTL).

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
7. After 24 hours, remove `DECK_SUPABASE_JWT_SECRET`:
   ```sh
   supabase secrets unset DECK_SUPABASE_JWT_SECRET
   ```

## Rollback

The previous HS256 key remains trusted while it is in the `previously used`
state. If the ES256 rollout fails:

1. Rotate back to the previous signing key.
2. Redeploy the previous `join_room` version, or leave `DECK_SUPABASE_JWT_PRIVATE_KEY`
   unset so the function uses the HS256 fallback.
3. Verify joins and the speaker reveal.
4. Do not revoke the previous key until the rollback is confirmed.

Inspect the current public keys at:

```text
https://qdcuxefperykmjlirufe.supabase.co/auth/v1/.well-known/jwks.json
```
