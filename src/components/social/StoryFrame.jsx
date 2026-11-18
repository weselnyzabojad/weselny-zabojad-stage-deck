import { STORY_HEIGHT, STORY_SAFE_BOTTOM, STORY_SAFE_TOP, STORY_WIDTH } from '../../lib/socialStory.js';

// Fixed 1080x1920 canvas. The Studio scales this node only for the preview; the
// exported PNG keeps these exact dimensions.
export default function StoryFrame({ mode = 'dark', safeZones = false, label, children }) {
  const hud = mode === 'hud';
  return (
    <div
      data-story-frame="true"
      data-story-mode={mode}
      role="img"
      aria-label={label}
      style={{ width: `${STORY_WIDTH}px`, height: `${STORY_HEIGHT}px` }}
      className={`relative overflow-hidden font-heading ${
        hud ? 'bg-transparent' : 'bg-slate-950'
      } text-[#F8FAFC]`}
    >
      <div
        className="flex h-full w-full flex-col"
        style={{
          paddingTop: `${STORY_SAFE_TOP}px`,
          paddingBottom: `${STORY_SAFE_BOTTOM}px`,
        }}
      >
        {children}
      </div>
      {safeZones ? (
        <>
          <div
            aria-hidden="true"
            data-safe-zone="top"
            style={{ height: `${STORY_SAFE_TOP}px` }}
            className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-fuchsia-500/50 bg-fuchsia-500/10"
          />
          <div
            aria-hidden="true"
            data-safe-zone="bottom"
            style={{ height: `${STORY_SAFE_BOTTOM}px` }}
            className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-fuchsia-500/50 bg-fuchsia-500/10"
          />
        </>
      ) : null}
    </div>
  );
}
