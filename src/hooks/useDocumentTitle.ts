import { useEffect } from 'react';

/**
 * Simple hook to update document title
 * For more complex SEO needs, use PageSEO component instead
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export default useDocumentTitle;
