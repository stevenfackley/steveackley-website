import { useEffect, useRef, useState } from "react";

/**
 * Returns a [ref, visible] tuple. `visible` becomes true (and stays true)
 * once the element enters the viewport. The IntersectionObserver is
 * automatically disconnected after the first intersection.
 *
 * @param threshold - fraction of the element that must be visible (default 0.1)
 */
export function useIntersectionVisible<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.1
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
