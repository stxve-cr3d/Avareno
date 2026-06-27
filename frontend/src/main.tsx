import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import { App } from "./App";
import { Home } from "./pages/Home";
import { CaptureReceipt } from "./pages/CaptureReceipt";
import { CaptureMessage } from "./pages/CaptureMessage";
import { UniversalCapture } from "./pages/UniversalCapture";
import { Items } from "./pages/Items";
import { ItemDetail } from "./pages/ItemDetail";
import { Rewards } from "./pages/Rewards";
import { FriendProfilePage, FriendsListPage } from "./pages/Friends";
import { CaptureLoop } from "./pages/CaptureLoop";
import { CaptureItem } from "./pages/CaptureItem";
import { HomeBinder } from "./pages/HomeBinder";
import { AskAvareno } from "./pages/AskAvareno";
import { SmartHome } from "./pages/SmartHome";
import { Resolve } from "./pages/Resolve";
import { Care } from "./pages/Care";
import { CookiesPage, DatenschutzPage, ImpressumPage, PricingPage } from "./pages/MarketingPages";
import { AccountSettingsPage, AuthCallbackPage, EmailVerifyPage, ForgotPasswordPage, LoginPage, OnboardingPage, ResetPasswordPage, SignupPage } from "./pages/AuthPages";
import { AuthProvider } from "./lib/authProvider";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
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
      { path: "app", element: <SmartHome /> },
      { path: "app/capture", element: <UniversalCapture /> },
      { path: "app/capture/receipt", element: <CaptureReceipt /> },
      { path: "app/capture/message", element: <CaptureMessage /> },
      { path: "app/capture/loop", element: <CaptureLoop /> },
      { path: "app/capture/item", element: <CaptureItem /> },
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
      { path: "app/rewards", element: <Rewards /> },
      { path: "app/friends", element: <FriendsListPage /> },
      { path: "app/friends/:friendId", element: <FriendProfilePage /> },
      { path: "app/rewards/friends", element: <FriendsListPage /> },
      { path: "app/rewards/friends/:friendId", element: <FriendProfilePage /> },
      { path: "app/rewards/privacy", element: <Rewards /> },
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
