import { useState } from 'react';
import { AppIcon } from '../AppIcon';

type ReorderableListProps = {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  /** Used in accessible button labels, e.g. "Naikkan misi 2". */
  itemNoun: string;
};

function move(items: string[], from: number, to: number): string[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Editable, reorderable list of short text lines. Dragging is the primary interaction,
 * but every drag has an equivalent arrow button — pointer-only reordering would be
 * unusable by keyboard.
 */
export function ReorderableList({
  items,
  onChange,
  placeholder,
  addLabel,
  itemNoun,
}: ReorderableListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function commitDrop(target: number) {
    if (draggingIndex === null) return;
    onChange(move(items, draggingIndex, target));
    setDraggingIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="reorderable">
      <ol className="reorderable-list">
        {items.map((item, index) => (
          <li
            key={index}
            className={[
              'reorderable-row',
              draggingIndex === index ? 'dragging' : '',
              overIndex === index && draggingIndex !== index ? 'drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable
            onDragStart={() => setDraggingIndex(index)}
            onDragEnd={() => {
              setDraggingIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              commitDrop(index);
            }}
          >
            <span className="reorderable-grip" aria-hidden="true">
              <AppIcon name="filter" />
            </span>

            <span className="reorderable-index">{index + 1}</span>

            <input
              className="reorderable-input"
              value={item}
              placeholder={placeholder}
              aria-label={`${itemNoun} ${index + 1}`}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
            />

            <span className="reorderable-actions">
              <button
                className="ghost-button"
                type="button"
                aria-label={`Naikkan ${itemNoun} ${index + 1}`}
                disabled={index === 0}
                onClick={() => onChange(move(items, index, index - 1))}
              >
                <AppIcon name="chevronUp" />
              </button>
              <button
                className="ghost-button"
                type="button"
                aria-label={`Turunkan ${itemNoun} ${index + 1}`}
                disabled={index === items.length - 1}
                onClick={() => onChange(move(items, index, index + 1))}
              >
                <AppIcon name="chevronDown" />
              </button>
              <button
                className="ghost-button danger"
                type="button"
                aria-label={`Hapus ${itemNoun} ${index + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <AppIcon name="x" />
              </button>
            </span>
          </li>
        ))}
      </ol>

      {items.length === 0 ? (
        <p className="empty-state compact">Belum ada {itemNoun}.</p>
      ) : null}

      <button
        className="secondary-button"
        type="button"
        onClick={() => onChange([...items, ''])}
      >
        {addLabel}
      </button>
    </div>
  );
}
