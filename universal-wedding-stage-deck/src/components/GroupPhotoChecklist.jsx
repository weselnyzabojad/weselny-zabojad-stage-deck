import { useMemo } from 'react';

export const GROUP_PHOTO_ALL_GUESTS_KEY = 'groupPhoto:allGuests';
export const GROUP_PHOTO_EXTRA_ALL_GUESTS_KEY = 'groupPhoto:extraAllGuests';
export const GROUP_PHOTO_WALK_INS_KEY = 'groupPhoto:walkIns';

export function groupPhotoGroupKey(groupId) {
  return `groupPhoto:group:${groupId}`;
}

export function buildGroupPhotoItems(groups = []) {
  return [
    {
      key: GROUP_PHOTO_ALL_GUESTS_KEY,
      label: 'All guests + newlyweds — at least one smiling photo',
      required: true,
    },
    {
      key: GROUP_PHOTO_EXTRA_ALL_GUESTS_KEY,
      label: 'Additional all-guest photos (optional)',
      required: false,
    },
    ...groups.map((group) => ({
      key: groupPhotoGroupKey(group.id),
      label: group.label,
      required: false,
    })),
    {
      key: GROUP_PHOTO_WALK_INS_KEY,
      label: 'Open invitation — any guest who wants a photo',
      required: false,
    },
  ];
}

function ChecklistRow({ item, checked, onToggle }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded border p-2 transition ${
        checked
          ? 'border-brand/40 bg-brand/20 text-muted'
          : 'border-line bg-card text-ink hover:border-line-strong'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle?.(item.key)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-700 bg-page"
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${checked ? 'line-through' : ''}`}>{item.label}</span>
        {item.required ? (
          <span className="mt-0.5 inline-block rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
            Required
          </span>
        ) : null}
      </span>
    </label>
  );
}

export default function GroupPhotoChecklist({
  groups = [],
  checked = {},
  onToggle,
  location,
  mediaTeam = [],
}) {
  const items = useMemo(() => buildGroupPhotoItems(groups), [groups]);
  const doneCount = items.filter((item) => checked?.[item.key]).length;
  const media = mediaTeam
    .filter((member) => ['PHOTO', 'VIDEO'].includes(String(member?.role ?? '').toUpperCase()))
    .map((member) => member?.name)
    .filter(Boolean);

  return (
    <section
      aria-label="Group photo checklist"
      className="rounded-lg border border-line bg-page/70 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-ink">
          📸 Group photo sequence
        </h3>
        <span className="font-mono text-[10px] text-muted">
          {doneCount} / {items.length} done
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        {location ? <span>Location: {location}</span> : null}
        {media.length ? <span>Media: {media.join(', ')}</span> : null}
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <ChecklistRow
            key={item.key}
            item={item}
            checked={Boolean(checked?.[item.key])}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}
