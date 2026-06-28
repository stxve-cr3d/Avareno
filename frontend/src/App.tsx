import { AppShell } from "./components/AppShell";
import { NotificationProvider } from "./components/app/Notifications";

export function App() {
  return (
    <NotificationProvider>
      <AppShell />
    </NotificationProvider>
  );
}
