// Desktop utility cluster: the language selector and theme toggle share one
// soft segmented surface. Pocket and join screens keep their own controls.
export default function DesktopUtilityGroup({ children, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-2xl border border-panel-border bg-panel/70 p-1 shadow-sm backdrop-blur-md [&>*+*]:ml-1 [&>*+*]:border-l [&>*+*]:border-line/60 [&>*+*]:pl-1 ${className}`}
    >
      {children}
    </div>
  );
}
