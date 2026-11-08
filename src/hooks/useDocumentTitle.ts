import { useEffect } from 'react';

/** Sets the document title for the current page. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · PHYSQORA` : 'PHYSQORA — THE UNIVERSE, EXPLORED.';
  }, [title]);
}
