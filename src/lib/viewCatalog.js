// Independent public views (issue #886). Song Requestor is not a stage role:
// it has no PIN, no session and is projected only for VIP weddings.
export const SONG_REQUEST_VIEW = Object.freeze({
  id: 'song_request',
  path: '/request/:roomCode',
  kind: 'public',
  pin: false,
  session: false,
  vipOnly: true,
});

export const VIEW_CATALOG = Object.freeze({
  [SONG_REQUEST_VIEW.id]: SONG_REQUEST_VIEW,
});
