import React, { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./lib/authProvider";
import { LanguageProvider } from "./lib/language";
import { RouteError } from "./components/RouteError";
import "./styles.css";

/* Route components are code-split: each page loads on demand so the
   initial bundle only carries the app shell, providers and error
   fallback. Suspense boundaries live in AppShell around the Outlet. */
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const CaptureReceipt = lazy(() => import("./pages/CaptureReceipt").then((m) => ({ default: m.CaptureReceipt })));
const CaptureMessage = lazy(() => import("./pages/CaptureMessage").then((m) => ({ default: m.CaptureMessage })));
const UniversalCapture = lazy(() => import("./pages/UniversalCapture").then((m) => ({ default: m.UniversalCapture })));
const Items = lazy(() => import("./pages/Items").then((m) => ({ default: m.Items })));
const ItemDetail = lazy(() => import("./pages/ItemDetail").then((m) => ({ default: m.ItemDetail })));
const Rewards = lazy(() => import("./pages/Rewards").then((m) => ({ default: m.Rewards })));
const FriendsListPage = lazy(() => import("./pages/Friends").then((m) => ({ default: m.FriendsListPage })));
const FriendProfilePage = lazy(() => import("./pages/Friends").then((m) => ({ default: m.FriendProfilePage })));
const CaptureLoop = lazy(() => import("./pages/CaptureLoop").then((m) => ({ default: m.CaptureLoop })));
const CaptureItem = lazy(() => import("./pages/CaptureItem").then((m) => ({ default: m.CaptureItem })));
const HomeBinder = lazy(() => import("./pages/HomeBinder").then((m) => ({ default: m.HomeBinder })));
const AskAvareno = lazy(() => import("./pages/AskAvareno").then((m) => ({ default: m.AskAvareno })));
const SmartHome = lazy(() => import("./pages/SmartHome").then((m) => ({ default: m.SmartHome })));
const Resolve = lazy(() => import("./pages/Resolve").then((m) => ({ default: m.Resolve })));
const Care = lazy(() => import("./pages/Care").then((m) => ({ default: m.Care })));
const PricingPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.PricingPage })));
const ImpressumPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.ImpressumPage })));
const DatenschutzPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.DatenschutzPage })));
const CookiesPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.CookiesPage })));
const LoginPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.AuthCallbackPage })));
const EmailVerifyPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.EmailVerifyPage })));
const OnboardingPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.OnboardingPage })));
const AccountSettingsPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.AccountSettingsPage })));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "impressum", element: <ImpressumPage /> },
      { path: "datenschutz", element: <DatenschutzPage /> },
      { path: "cookies", element: <CookiesPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      { path: "auth/verify-email", element: <EmailVerifyPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "settings/account", element: <AccountSettingsPage /> },
      { path: "capture", element: <UniversalCapture /> },
      { path: "capture/receipt", element: <CaptureReceipt /> },
      { path: "capture/message", element: <CaptureMessage /> },
      { path: "capture/loop", element: <CaptureLoop /> },
      { path: "capture/item", element: <CaptureItem /> },
      { path: "items", element: <Items /> },
      { path: "items/:id", element: <ItemDetail /> },
      { path: "ask", element: <AskAvareno /> },
      { path: "smart-home", element: <SmartHome /> },
      { path: "resolve", element: <Resolve /> },
      { path: "resolve/tickets", element: <Resolve /> },
      { path: "resolve/tickets/:ticketId", element: <Resolve /> },
      { path: "resolve/create", element: <Resolve /> },
      { path: "care", element: <Care /> },
      { path: "care/:loopId", element: <Care /> },
      { path: "reports/home-binder", element: <HomeBinder /> },
      { path: "loops/:id", element: <LoopCareRedirect /> },
      { path: "rewards", element: <Rewards /> },
      { path: "friends", element: <FriendsListPage /> },
      { path: "friends/:friendId", element: <FriendProfilePage /> },
      { path: "rewards/friends", element: <FriendsListPage /> },
      { path: "rewards/friends/:friendId", element: <FriendProfilePage /> },
      { path: "rewards/privacy", element: <Rewards /> },
      { path: "rewards/datenschutz", element: <Rewards /> },
      { path: "ich", element: <Rewards /> },
      { path: "ich/friends", element: <Rewards /> },
      { path: "ich/friends/:friendId", element: <Rewards /> },
      { path: "ich/datenschutz", element: <Rewards /> },
      { path: "app", element: <SmartHome /> },
      { path: "app/capture", element: <UniversalCapture /> },
      { path: "app/capture/receipt", element: <CaptureReceipt /> },
      { path: "app/capture/message", element: <CaptureMessage /> },
      { path: "app/capture/loop", element: <CaptureLoop /> },
      { path: "app/capture/item", element: <CaptureItem /> },
      { path: "app/dinge", element: <Items /> },
      { path: "app/dinge/:id", element: <ItemDetail /> },
      { path: "app/items", element: <Items /> },
      { path: "app/items/:id", element: <ItemDetail /> },
      { path: "app/ask", element: <AskAvareno /> },
      { path: "app/smart-home", element: <SmartHome /> },
      { path: "app/resolve", element: <Resolve /> },
      { path: "app/resolve/tickets", element: <Resolve /> },
      { path: "app/resolve/tickets/:ticketId", element: <Resolve /> },
      { path: "app/resolve/create", element: <Resolve /> },
      { path: "app/care", element: <Care /> },
      { path: "app/care/:loopId", element: <Care /> },
      { path: "app/reports/home-binder", element: <HomeBinder /> },
      { path: "app/loops/:id", element: <LoopCareRedirect app /> },
      { path: "app/profile", element: <Rewards /> },
      { path: "app/profile/friends", element: <Rewards /> },
      { path: "app/profile/friends/:friendId", element: <Rewards /> },
      { path: "app/profile/privacy", element: <Rewards /> },
      { path: "app/profile/settings", element: <AccountSettingsPage /> },
      { path: "app/ich", element: <Rewards /> },
      { path: "app/ich/friends", element: <Rewards /> },
      { path: "app/ich/friends/:friendId", element: <Rewards /> },
      { path: "app/ich/privacy", element: <Rewards /> },
      { path: "app/ich/datenschutz", element: <Rewards /> },
      { path: "app/ich/settings", element: <AccountSettingsPage /> },
      { path: "app/rewards", element: <Navigate to="/app/ich" replace /> },
      { path: "app/rewards/privacy", element: <Navigate to="/app/ich/privacy" replace /> },
      { path: "app/rewards/datenschutz", element: <Navigate to="/app/ich/privacy" replace /> },
      { path: "app/rewards/friends", element: <Navigate to="/app/ich/friends" replace /> },
      { path: "app/rewards/friends/:friendId", element: <Rewards /> },
      { path: "app/friends", element: <Navigate to="/app/ich/friends" replace /> },
      { path: "app/friends/:friendId", element: <FriendProfilePage /> },
      { path: "app/settings", element: <AccountSettingsPage /> },
      { path: "app/settings/account", element: <AccountSettingsPage /> }
    ]
  }
]);

function LoopCareRedirect({ app = false }: { app?: boolean }) {
  const { id } = useParams();
  return <Navigate to={`${app ? "/app" : ""}/care/${id ?? ""}`} replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);
