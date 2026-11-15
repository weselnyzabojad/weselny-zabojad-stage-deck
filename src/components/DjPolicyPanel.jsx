// Soft panel used by the wide DJ layout for policy lists that live under the
// timeline side columns. It deliberately owns no data or headings of its own.
export default function DjPolicyPanel({ label, children }) {
  return (
    <section
      aria-label={label}
      className="rounded-xl border border-line bg-card/80 p-3 shadow-sm"
    >
      {children}
    </section>
  );
}
