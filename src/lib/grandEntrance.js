export const GRAND_ENTRANCE_ORDERS = {
  GUESTS_FIRST: {
    label: 'Guests first, newlyweds after',
    sequence: '1. Guests · 2. Newlyweds',
  },
  NEWLYWEDS_FIRST: {
    label: 'Newlyweds first, guests after',
    sequence: '1. Newlyweds · 2. Guests',
  },
};

export function resolveGrandEntranceOrder(step) {
  const order = step?.grandEntranceOrder;
  return GRAND_ENTRANCE_ORDERS[order] ? { order, ...GRAND_ENTRANCE_ORDERS[order] } : null;
}
