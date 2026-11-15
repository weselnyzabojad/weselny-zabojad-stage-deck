# Admin UI action hierarchy

Admin-only convention for buttons and surfaces (issue #994). Stage-role views
keep their existing styles.

| Variant | Class helper | Use |
| --- | --- | --- |
| Primary | `ADMIN_BUTTON.primary` | The single main action of a view (e.g. Refresh, Replace cartridge, dialog confirm) |
| Secondary | `ADMIN_BUTTON.secondary` | Normal outlined actions (Rotate PINs, QR cards, Edit, Deactivate) |
| Ghost | `ADMIN_BUTTON.ghost` | Low-emphasis actions and cancels (Sign out, row ellipsis items, Cancel) |
| Danger | `ADMIN_BUTTON.danger` | Destructive only (Delete, destructive confirm) |

Rules:

- One solid primary action per admin view.
- Red is reserved for destructive actions.
- Card surfaces use `ADMIN_CARD` / `.admin-card` (shaded card + light shadow),
  not nested bordered containers.
- Helpers live in `src/admin/adminUi.js`; component styles in `index.css`.
