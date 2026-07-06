import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

type Target = { ref: RefObject<HTMLElement>; text: string };

interface Props {
  targets: Target[];
  onDone: () => void;
}

const PADDING = 8;
const SAFE = 16;
const GAP = 12;

const HomeCoachmarks = ({ targets, onDone }: Props) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tipSize, setTipSize] = useState<{ w: number; h: number } | null>(null);
  const [, force] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);

  const current = targets[step];

  useLayoutEffect(() => {
    const el = current?.ref.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, [current, step]);

  useLayoutEffect(() => {
    if (!tipRef.current) return;
    const r = tipRef.current.getBoundingClientRect();
    setTipSize((prev) =>
      prev && prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
    );
  }, [rect, step]);

  useEffect(() => {
    const handler = () => force((n) => n + 1);
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, []);

  if (!current || !rect) return null;

  const isLast = step === targets.length - 1;

  const hole = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipWidth = Math.min(260, vw - SAFE * 2);
  const tipHeight = tipSize?.h ?? 120; // estimate before measure

  const holeCenterY = hole.top + hole.height / 2;
  const holeCenterX = hole.left + hole.width / 2;

  // Vertical placement: bottom half → above, top half → below.
  const preferAbove = holeCenterY > vh / 2;
  const spaceAbove = hole.top - SAFE - GAP;
  const spaceBelow = vh - (hole.top + hole.height) - SAFE - GAP;
  const spaceLeft = hole.left - SAFE - GAP;
  const spaceRight = vw - (hole.left + hole.width) - SAFE - GAP;

  let top = 0;
  let left = 0;

  const fitsAbove = spaceAbove >= tipHeight;
  const fitsBelow = spaceBelow >= tipHeight;
  const fitsLeft = spaceLeft >= tipWidth;
  const fitsRight = spaceRight >= tipWidth;

  let placement: "above" | "below" | "left" | "right" = preferAbove ? "above" : "below";
  if (placement === "above" && !fitsAbove) {
    placement = fitsBelow ? "below" : fitsRight ? "right" : fitsLeft ? "left" : "above";
  } else if (placement === "below" && !fitsBelow) {
    placement = fitsAbove ? "above" : fitsRight ? "right" : fitsLeft ? "left" : "below";
  }

  if (placement === "above") {
    top = hole.top - GAP - tipHeight;
    left = holeCenterX - tipWidth / 2;
  } else if (placement === "below") {
    top = hole.top + hole.height + GAP;
    left = holeCenterX - tipWidth / 2;
  } else if (placement === "right") {
    left = hole.left + hole.width + GAP;
    top = holeCenterY - tipHeight / 2;
  } else {
    left = hole.left - GAP - tipWidth;
    top = holeCenterY - tipHeight / 2;
  }

  // Clamp within safe area.
  left = Math.max(SAFE, Math.min(left, vw - SAFE - tipWidth));
  top = Math.max(SAFE, Math.min(top, vh - SAFE - tipHeight));

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={() => (isLast ? onDone() : setStep(step + 1))}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with cutout via 4 rectangles */}
      <div className="absolute inset-x-0 top-0 bg-foreground/60" style={{ height: hole.top }} />
      <div
        className="absolute left-0 bg-foreground/60"
        style={{ top: hole.top, height: hole.height, width: hole.left }}
      />
      <div
        className="absolute right-0 bg-foreground/60"
        style={{
          top: hole.top,
          height: hole.height,
          left: hole.left + hole.width,
        }}
      />
      <div
        className="absolute inset-x-0 bg-foreground/60"
        style={{ top: hole.top + hole.height, bottom: 0 }}
      />

      {/* Highlight ring */}
      <div
        className="absolute rounded-2xl ring-2 ring-primary pointer-events-none animate-scale-in"
        style={hole}
      />

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="absolute z-10 rounded-2xl bg-background shadow-xl border border-border p-4"
        style={{ top, left, width: tipWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground leading-snug">{current.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {step + 1} / {targets.length}
          </span>
          <button
            type="button"
            onClick={() => (isLast ? onDone() : setStep(step + 1))}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {isLast ? "Završi" : "Dalje"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeCoachmarks;