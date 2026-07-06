import { NavLink } from "react-router-dom";
import { Home, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true, key: "home" },
  { to: "/analiza", label: "Analiza", icon: BarChart3, key: "analiza" },
  { to: "/profil", label: "Profil", icon: User, key: "profil" },
];

const BottomNav = () => {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="sticky bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-3">
        {tabs.map(({ to, label, icon: Icon, end, key }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              data-coachmark={key}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;