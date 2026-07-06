import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import MobileFrame from "./MobileFrame";

const AppLayout = () => {
  return (
    <MobileFrame>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <BottomNav />
    </MobileFrame>
  );
};

export default AppLayout;