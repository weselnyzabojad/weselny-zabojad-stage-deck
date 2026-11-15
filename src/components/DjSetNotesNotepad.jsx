import { useI18n } from '../i18n/useI18n';
import MusicPolicyCard from './MusicPolicyCard';

const NOTE_KEYS = ['dj.setNotes.project', 'dj.setNotes.cutoffs', 'dj.setNotes.private'];

// Physical DJ notepad: the paper, ruled lines and punched holes are decorative.
// Music Policy is rendered inside the same sheet so the wide DJ view reads as
// one continuous notebook rather than two stacked cards.
export default function DjSetNotesNotepad({ policy }) {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="set-notes-title"
      data-testid="dj-set-notes-notepad"
      className="overflow-hidden rounded-2xl border border-[#d8c9ae] bg-[#FDFBF7] text-[#3b2f23] shadow-2xl"
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-2 border-b border-[#d8c9ae] bg-[#efe7d8] px-5 py-2"
      >
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-[#7a6244]/50 bg-[#3b2f23]/75 shadow-inner"
          />
        ))}
      </div>

      <div
        className="px-5 pb-5 pt-4"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(120, 100, 70, 0.16) 23px, rgba(120, 100, 70, 0.16) 24px)',
          backgroundSize: '100% 24px',
        }}
      >
        <h2
          id="set-notes-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-[#3b2f23]"
        >
          {t('dj.setNotes')}
        </h2>

        <ul className="mt-3 font-handwriting text-lg leading-6 text-[#3b2f23]">
          {NOTE_KEYS.map((key) => (
            <li key={key} className="min-h-6">
              {t(key)}
            </li>
          ))}
        </ul>

        <div
          aria-hidden="true"
          className="my-5 border-t-2 border-dashed border-[#8b6f47]/55"
        />

        <MusicPolicyCard policy={policy} paper />
      </div>
    </section>
  );
}
