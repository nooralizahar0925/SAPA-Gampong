import { createContext, useContext, useEffect } from 'react';

export type SaveHandler = () => Promise<unknown>;

type ContentSaveValue = {
  /** Tabs register the function the header's save button should call. */
  register: (handler: SaveHandler | null) => void;
  markDirty: () => void;
};

export const ContentSaveContext = createContext<ContentSaveValue>({
  register: () => {},
  markDirty: () => {},
});

/**
 * Registers this tab's save handler with the page header and clears it on unmount, so
 * switching tabs never leaves the previous tab's handler wired to the save button.
 */
export function useRegisterSave(handler: SaveHandler, deps: unknown[]) {
  const { register } = useContext(ContentSaveContext);

  useEffect(() => {
    register(handler);
    return () => register(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useMarkDirty() {
  return useContext(ContentSaveContext).markDirty;
}
