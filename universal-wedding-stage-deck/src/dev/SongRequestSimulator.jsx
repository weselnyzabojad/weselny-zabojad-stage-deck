import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/useI18n.js';
import { createGuestDeviceId } from '../lib/guestDeviceId.js';

const COOLDOWN_MS = 10 * 60 * 1000;

function shortId(id) {
  return id.slice(0, 8);
}

// Development-only local simulator. Never imported by a production build
// because DjBoothView gates the dynamic import behind import.meta.env.DEV.
export default function SongRequestSimulator() {
  const { t } = useI18n();
  const [devices, setDevices] = useState(() => [
    createGuestDeviceId(),
    createGuestDeviceId(),
  ]);
  const [selectedDevice, setSelectedDevice] = useState(0);
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  const [requests, setRequests] = useState([]);
  const [lastCreated, setLastCreated] = useState({});
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const deviceId = devices[selectedDevice];
  const deviceRequests = useMemo(
    () => requests.filter((request) => request.deviceId === deviceId).reverse(),
    [requests, deviceId],
  );
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const cooldownMinutes = useMemo(() => {
    const createdAt = lastCreated[deviceId];
    if (!createdAt) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - createdAt);
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  }, [deviceId, lastCreated, requests.length]);

  const addRequest = (event) => {
    event.preventDefault();
    const cleanSong = song.trim();
    const cleanArtist = artist.trim();
    if (!cleanSong || !cleanArtist || cooldownMinutes > 0) return;
    const request = {
      id: `dev-${Date.now()}-${requests.length}`,
      deviceId,
      song: cleanSong,
      artist: cleanArtist,
      status: 'pending',
      playedAt: null,
      createdAt: new Date().toISOString(),
    };
    setRequests((current) => [...current, request]);
    setLastCreated((current) => ({ ...current, [deviceId]: Date.now() }));
    setSelectedRequestId(request.id);
    setSong('');
    setArtist('');
  };

  const changeStatus = (id, status) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status,
              playedAt:
                status === 'played' ? new Date().toISOString() : request.playedAt,
            }
          : request,
      ),
    );
    setSelectedRequestId(id);
  };

  const resetDevice = () => {
    const next = createGuestDeviceId();
    setDevices((current) => current.map((id, index) => (index === selectedDevice ? next : id)));
    setRequests((current) => current.filter((request) => request.deviceId !== deviceId));
    setSelectedRequestId(null);
  };

  const resetCooldown = () => {
    setLastCreated((current) => {
      const next = { ...current };
      delete next[deviceId];
      return next;
    });
  };

  const guestMessage = (() => {
    if (!selectedRequest) return null;
    if (selectedRequest.playedAt) {
      return {
        title: t('songRequest.playedTitle'),
        body: t('songRequest.playedBody'),
      };
    }
    if (selectedRequest.status === 'accepted') {
      return {
        title: t('songRequest.acceptedTitle'),
        body: t('songRequest.acceptedBody'),
      };
    }
    if (selectedRequest.status === 'declined') {
      return {
        title: t('songRequest.declinedTitle'),
        body: t('songRequest.declinedBody'),
      };
    }
    return {
      title: t('songRequest.pendingTitle'),
      body: t('songRequest.pendingBody'),
    };
  })();

  return (
    <section className="mt-4 rounded-xl border-2 border-dashed border-amber-600 bg-amber-950/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-amber-300">
          DEV — Song request simulator
        </h2>
        <span className="rounded border border-amber-600 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
          local only · no cloud writes
        </span>
      </div>
      <p className="mt-1 text-[10px] text-amber-100/80">
        Creates fake guest requests in memory, including two independent device ids and the
        10-minute cooldown. Reload clears everything.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {devices.map((id, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedDevice(index)}
            className={`rounded border px-2 py-1 font-mono text-[10px] ${
              index === selectedDevice
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-line-strong bg-raised text-muted'
            }`}
          >
            Device {index + 1}: {shortId(id)}
          </button>
        ))}
        <button
          type="button"
          onClick={resetDevice}
          className="rounded border border-line-strong bg-raised px-2 py-1 text-[10px] text-ink"
        >
          Reset device id
        </button>
      </div>
      <p className="mt-1 font-mono text-[10px] text-muted">Current guest device id: {deviceId}</p>

      <form className="mt-3 flex flex-wrap items-end gap-1.5" onSubmit={addRequest}>
        <label className="text-[10px] text-amber-100">
          Artist
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            maxLength={120}
            className="mt-0.5 block w-40 rounded border border-line-strong bg-page px-2 py-1 text-[11px] text-ink"
          />
        </label>
        <label className="text-[10px] text-amber-100">
          Song
          <input
            value={song}
            onChange={(event) => setSong(event.target.value)}
            maxLength={120}
            className="mt-0.5 block w-40 rounded border border-line-strong bg-page px-2 py-1 text-[11px] text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={cooldownMinutes > 0}
          className="rounded border border-amber-600 bg-amber-500/20 px-2 py-1.5 text-[10px] font-bold text-amber-200 disabled:opacity-50"
        >
          Add fake pending
        </button>
        {cooldownMinutes > 0 ? (
          <span className="text-[10px] text-amber-200">
            Cooldown: {cooldownMinutes} min ·{' '}
            <button type="button" onClick={resetCooldown} className="underline">
              reset
            </button>
          </span>
        ) : null}
      </form>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-amber-200">
            Fake requests for this device
          </h3>
          {deviceRequests.length === 0 ? (
            <p className="mt-1 text-[10px] text-muted">No fake requests yet.</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {deviceRequests.map((request) => (
                <li
                  key={request.id}
                  className="rounded border border-line bg-page/70 px-2 py-1.5 text-[10px]"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className="block w-full text-left"
                  >
                    <strong className="text-ink">{request.song}</strong>
                    <span className="text-muted"> · {request.artist}</span>
                    <span className="ml-1 font-mono text-amber-300">
                      {request.playedAt ? 'played' : request.status}
                    </span>
                  </button>
                  <div className="mt-1 flex gap-1.5">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => changeStatus(request.id, 'accepted')}
                          className="rounded border border-emerald-700 bg-emerald-950/60 px-1.5 py-0.5 font-bold text-emerald-200"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(request.id, 'declined')}
                          className="rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 font-bold text-alert-soft"
                        >
                          Deny
                        </button>
                      </>
                    ) : null}
                    {request.status === 'accepted' && !request.playedAt ? (
                      <button
                        type="button"
                        onClick={() => changeStatus(request.id, 'played')}
                        className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-bold text-brand-tint"
                      >
                        Played
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-amber-200">
            Guest-side preview
          </h3>
          {guestMessage ? (
            <div className="mt-1 rounded border border-amber-700 bg-amber-950/40 p-2 text-[10px] text-amber-100" role="status">
              <div className="font-bold">{guestMessage.title}</div>
              <p className="mt-0.5">{guestMessage.body}</p>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted">Select a fake request to preview.</p>
          )}
        </div>
      </div>
    </section>
  );
}
