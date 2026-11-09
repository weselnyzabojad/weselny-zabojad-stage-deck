# Overlay stacking scale

Overlay z-index is centralised in `src/index.css` (issue #437):

| Token | Value | Use |
| --- | --- | --- |
| `z-base` | 0 | page content |
| `z-raised` | 10 | local dropdowns, inline controls |
| `z-banner` | 20 | non-blocking banners and sticky headers |
| `z-toast` | 60 | undo/admin/PWA toasts |
| `z-modal` | 70 | modal dialogs and fullscreen stage overlays |
| `z-critical` | 120 | mandatory update popup |

No overlay component may use an arbitrary `z-[...]` value. Modals sit above
toasts and banners; the mandatory update popup stays above ordinary modals.

## Manual stacking check

With a stage view open, trigger all of the following together:

1. a modal (teleprompter or game clicker),
2. an undo toast,
3. a stage ping or hard-anchor banner,
4. the PWA update notice,
5. the mandatory update popup when one is available.

Verify:

- the modal overlay covers the toast, banner and PWA notice;
- the update notice does not pierce the modal;
- the mandatory update popup renders above the modal and everything else;
- focus stays inside the modal and Escape still closes it.
