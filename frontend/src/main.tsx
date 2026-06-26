import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App";
import { Home } from "./pages/Home";
import { CaptureReceipt } from "./pages/CaptureReceipt";
import { CaptureMessage } from "./pages/CaptureMessage";
import { UniversalCapture } from "./pages/UniversalCapture";
import { Items } from "./pages/Items";
import { ItemDetail } from "./pages/ItemDetail";
import { LoopDetail } from "./pages/LoopDetail";
import { Rewards } from "./pages/Rewards";
import { CaptureLoop } from "./pages/CaptureLoop";
import { CaptureItem } from "./pages/CaptureItem";
import { HomeBinder } from "./pages/HomeBinder";
import { AskAvareno } from "./pages/AskAvareno";
import { SmartHome } from "./pages/SmartHome";
import { CookiesPage, DatenschutzPage, ImpressumPage, PricingPage } from "./pages/MarketingPages";
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
      { path: "capture", element: <UniversalCapture /> },
      { path: "capture/receipt", element: <CaptureReceipt /> },
      { path: "capture/message", element: <CaptureMessage /> },
      { path: "capture/loop", element: <CaptureLoop /> },
      { path: "capture/item", element: <CaptureItem /> },
      { path: "items", element: <Items /> },
      { path: "items/:id", element: <ItemDetail /> },
      { path: "ask", element: <AskAvareno /> },
      { path: "smart-home", element: <SmartHome /> },
      { path: "reports/home-binder", element: <HomeBinder /> },
      { path: "loops/:id", element: <LoopDetail /> },
      { path: "rewards", element: <Rewards /> },
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
      { path: "app/reports/home-binder", element: <HomeBinder /> },
      { path: "app/loops/:id", element: <LoopDetail /> },
      { path: "app/rewards", element: <Rewards /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
