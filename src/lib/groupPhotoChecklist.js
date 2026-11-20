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
