import { ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
}

/**
 * Vertical mobile-first frame. Centers the app on larger viewports
 * while keeping a true mobile feel.
 */
const MobileFrame = ({ children }: MobileFrameProps) => {
  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-start justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-background shadow-sm flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default MobileFrame;