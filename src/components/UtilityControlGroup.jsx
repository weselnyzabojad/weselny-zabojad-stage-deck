// Shared utility cluster for integrated language + theme controls. It provides
// the soft #707 segmented surface on desktop and in the pocket header.
export default function UtilityControlGroup({ children, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-2xl border border-panel-border bg-panel/70 p-1 shadow-sm backdrop-blur-md [&>*+*]:ml-1 [&>*+*]:border-l [&>*+*]:border-line/60 [&>*+*]:pl-1 ${className}`}
    >
      {children}
    </div>
  );
}
