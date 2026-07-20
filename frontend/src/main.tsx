import React, { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { App } from "./App";
import { betaFeatures } from "./lib/betaFeatures";
import { AuthProvider } from "./lib/authProvider";
import { LanguageProvider } from "./lib/language";
import { ThemeProvider } from "./lib/theme";
import { RouteError } from "./components/RouteError";
import "./styles.css";
import "./milky-archive.css";

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
const ProductCreated = lazy(() => import("./pages/ProductCreated").then((m) => ({ default: m.ProductCreated })));
const HomeBinder = lazy(() => import("./pages/HomeBinder").then((m) => ({ default: m.HomeBinder })));
const AskAvareno = lazy(() => import("./pages/AskAvareno").then((m) => ({ default: m.AskAvareno })));
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.Search })));
const SmartHome = lazy(() => import("./pages/SmartHome").then((m) => ({ default: m.SmartHome })));
const HomeDeviceDetailPage = lazy(() => import("./pages/HomeDeviceDetail").then((m) => ({ default: m.HomeDeviceDetailPage })));
const MemoryHome = lazy(() => import("./pages/MemoryHome").then((m) => ({ default: m.MemoryHome })));
const HomeGraphConnect = lazy(() => import("./pages/HomeGraphConnect").then((m) => ({ default: m.HomeGraphConnect })));
const Resolve = lazy(() => import("./pages/Resolve").then((m) => ({ default: m.Resolve })));
const Care = lazy(() => import("./pages/Care").then((m) => ({ default: m.Care })));
const VaultPage = lazy(() => import("./pages/VaultPage").then((m) => ({ default: m.VaultPage })));
const PricingPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.PricingPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const ImpressumPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.ImpressumPage })));
const DatenschutzPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.DatenschutzPage })));
const CookiesPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.CookiesPage })));
const TermsPage = lazy(() => import("./pages/MarketingPages").then((m) => ({ default: m.TermsPage })));
const LoginPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.AuthCallbackPage })));
const EmailVerifyPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.EmailVerifyPage })));
const OnboardingPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.OnboardingPage })));
const AccountSettingsPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.AccountSettingsPage })));

/* Routes of modules that are disabled for the focused Avareno beta redirect
   to the app home instead of rendering a broken or misleading page.
   Kept for a later product phase — flip the flag in lib/betaFeatures.ts. */
const appHomeRedirect = <Navigate to="/app" replace />;

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "checkout/:planId", element: <CheckoutPage /> },
      { path: "impressum", element: <ImpressumPage /> },
      { path: "datenschutz", element: <DatenschutzPage /> },
      { path: "cookies", element: <CookiesPage /> },
      { path: "nutzungsbedingungen", element: <TermsPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      { path: "auth/verify-email", element: <EmailVerifyPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "settings/account", element: <AccountSettingsPage /> },
      { path: "capture", element: betaFeatures.universalCapture ? <UniversalCapture /> : <Navigate to="/app/capture/item" replace /> },
      { path: "capture/receipt", element: <CaptureReceipt /> },
      { path: "capture/message", element: betaFeatures.messageCapture ? <CaptureMessage /> : <Navigate to="/app/capture/loop" replace /> },
      { path: "capture/loop", element: <CaptureLoop /> },
      { path: "capture/item", element: <CaptureItem /> },
      { path: "capture/item/success/:id", element: <ProductCreated /> },
      { path: "items", element: <Items /> },
      { path: "items/:id", element: <ItemDetail /> },
      { path: "ask", element: betaFeatures.ask ? <AskAvareno /> : appHomeRedirect },
      { path: "search", element: <SearchPage /> },
      { path: "smart-home", element: betaFeatures.smartHome ? <SmartHome /> : appHomeRedirect },
      { path: "smart-home/devices/:deviceId", element: betaFeatures.smartHome ? <HomeDeviceDetailPage /> : appHomeRedirect },
      { path: "home-graph", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "home-graph/devices/:deviceId", element: betaFeatures.smartHome ? <HomeDeviceDetailPage /> : appHomeRedirect },
      { path: "home-graph/connect", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "resolve", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "resolve/tickets", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "resolve/tickets/:ticketId", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "resolve/create", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "care", element: <Care /> },
      { path: "care/:loopId", element: <Care /> },
      { path: "reports/home-binder", element: <HomeBinder /> },
      { path: "loops/:id", element: <LoopCareRedirect /> },
      { path: "rewards", element: <Rewards /> },
      { path: "friends", element: betaFeatures.community ? <FriendsListPage /> : appHomeRedirect },
      { path: "friends/:friendId", element: betaFeatures.community ? <FriendProfilePage /> : appHomeRedirect },
      { path: "rewards/friends", element: betaFeatures.community ? <FriendsListPage /> : appHomeRedirect },
      { path: "rewards/friends/:friendId", element: betaFeatures.community ? <FriendProfilePage /> : appHomeRedirect },
      { path: "rewards/privacy", element: <Rewards /> },
      { path: "rewards/datenschutz", element: <Rewards /> },
      { path: "ich", element: <Rewards /> },
      { path: "ich/friends", element: betaFeatures.community ? <Rewards /> : <Navigate to="/ich" replace /> },
      { path: "ich/friends/:friendId", element: betaFeatures.community ? <Rewards /> : <Navigate to="/ich" replace /> },
      { path: "ich/datenschutz", element: <Rewards /> },
      { path: "app", element: <MemoryHome /> },
      { path: "app/capture", element: betaFeatures.universalCapture ? <UniversalCapture /> : <Navigate to="/app/capture/item" replace /> },
      { path: "app/capture/receipt", element: <CaptureReceipt /> },
      { path: "app/capture/message", element: betaFeatures.messageCapture ? <CaptureMessage /> : <Navigate to="/app/capture/loop" replace /> },
      { path: "app/capture/loop", element: <CaptureLoop /> },
      { path: "app/capture/item", element: <CaptureItem /> },
      { path: "app/capture/item/success/:id", element: <ProductCreated /> },
      { path: "app/dinge", element: <Items /> },
      { path: "app/dinge/:id", element: <ItemDetail /> },
      { path: "app/items", element: <Items /> },
      { path: "app/items/:id", element: <ItemDetail /> },
      { path: "app/ask", element: betaFeatures.ask ? <AskAvareno /> : appHomeRedirect },
      { path: "app/search", element: <SearchPage /> },
      { path: "app/smart-home", element: betaFeatures.smartHome ? <SmartHome /> : appHomeRedirect },
      { path: "app/smart-home/devices/:deviceId", element: betaFeatures.smartHome ? <HomeDeviceDetailPage /> : appHomeRedirect },
      { path: "app/home", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "app/home/devices/:deviceId", element: betaFeatures.smartHome ? <HomeDeviceDetailPage /> : appHomeRedirect },
      { path: "app/home/connect", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "app/home-graph", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "app/home-graph/devices/:deviceId", element: betaFeatures.smartHome ? <HomeDeviceDetailPage /> : appHomeRedirect },
      { path: "app/home-graph/connect", element: betaFeatures.connect ? <HomeGraphConnect /> : appHomeRedirect },
      { path: "app/resolve", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "app/resolve/tickets", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "app/resolve/tickets/:ticketId", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "app/resolve/create", element: betaFeatures.resolve ? <Resolve /> : appHomeRedirect },
      { path: "app/care", element: <Care /> },
      { path: "app/care/:loopId", element: <Care /> },
      { path: "app/reports/home-binder", element: <HomeBinder /> },
      { path: "app/loops/:id", element: <LoopCareRedirect app /> },
      { path: "app/profile", element: <Rewards /> },
      { path: "app/profile/friends", element: betaFeatures.community ? <Rewards /> : <Navigate to="/app/profile" replace /> },
      { path: "app/profile/friends/:friendId", element: betaFeatures.community ? <Rewards /> : <Navigate to="/app/profile" replace /> },
      { path: "app/profile/privacy", element: <Rewards /> },
      { path: "app/profile/settings", element: <AccountSettingsPage /> },
      { path: "app/vault", element: betaFeatures.vault ? <VaultPage /> : appHomeRedirect },
      { path: "app/ich", element: <Rewards /> },
      { path: "app/ich/friends", element: betaFeatures.community ? <Rewards /> : <Navigate to="/app/ich" replace /> },
      { path: "app/ich/friends/:friendId", element: betaFeatures.community ? <Rewards /> : <Navigate to="/app/ich" replace /> },
      { path: "app/ich/privacy", element: <Rewards /> },
      { path: "app/ich/datenschutz", element: <Rewards /> },
      { path: "app/ich/settings", element: <AccountSettingsPage /> },
      { path: "app/rewards", element: <Navigate to="/app/ich" replace /> },
      { path: "app/rewards/privacy", element: <Navigate to="/app/ich/privacy" replace /> },
      { path: "app/rewards/datenschutz", element: <Navigate to="/app/ich/privacy" replace /> },
      { path: "app/rewards/friends", element: <Navigate to="/app/ich/friends" replace /> },
      { path: "app/rewards/friends/:friendId", element: betaFeatures.community ? <Rewards /> : <Navigate to="/app/ich" replace /> },
      { path: "app/friends", element: <Navigate to="/app/ich/friends" replace /> },
      { path: "app/friends/:friendId", element: betaFeatures.community ? <FriendProfilePage /> : <Navigate to="/app/ich" replace /> },
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
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
