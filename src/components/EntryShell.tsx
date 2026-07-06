import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const EntryShell = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const navigate = useNavigate();
  return (
    <div
      className="fixed inset-0 z-50 bg-background flex justify-center overflow-y-auto"
      style={{ height: "100dvh" }}
    >
      <div
        className="relative w-full max-w-[440px] flex flex-col"
        style={{
          minHeight: "100dvh",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <button
          type="button"
          aria-label="Zatvori"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="px-5 pt-20 pb-6 flex-1 flex flex-col">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
};

export default EntryShell;