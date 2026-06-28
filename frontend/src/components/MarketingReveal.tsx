import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";

type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  delay?: number;
};

export function Reveal({ as: Component = "div", children, className = "", delay = 0, style, ...props }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const markIfVisible = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88 && rect.bottom > 0) {
        setShown(true);
        return true;
      }
      return false;
    };

    if (markIfVisible()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );

    observer.observe(node);
    const frame = window.requestAnimationFrame(markIfVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const revealStyle = { ...style, "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <Component ref={ref} className={`site-reveal${shown ? " is-visible" : ""}${className ? ` ${className}` : ""}`} style={revealStyle} {...props}>
      {children}
    </Component>
  );
}

type RevealGroupProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  stagger?: number;
};

export function RevealGroup({ as: Component = "div", children, className = "", stagger = 90, ...props }: RevealGroupProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const markIfVisible = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88 && rect.bottom > 0) {
        setShown(true);
        return true;
      }
      return false;
    };

    if (markIfVisible()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );

    observer.observe(node);
    const frame = window.requestAnimationFrame(markIfVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <Component ref={ref} className={`site-reveal-group${shown ? " is-visible" : ""}${className ? ` ${className}` : ""}`} {...props}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<{ className?: string; style?: CSSProperties }>;
        return cloneElement(element, {
          className: `site-reveal${element.props.className ? ` ${element.props.className}` : ""}`,
          style: {
            ...element.props.style,
            "--reveal-delay": `${index * stagger}ms`
          } as CSSProperties
        });
      })}
    </Component>
  );
}
