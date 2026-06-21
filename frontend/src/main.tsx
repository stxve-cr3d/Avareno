import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./App";
import { Home } from "./pages/Home";
import { CaptureReceipt } from "./pages/CaptureReceipt";
import { CaptureMessage } from "./pages/CaptureMessage";
import { Items } from "./pages/Items";
import { ItemDetail } from "./pages/ItemDetail";
import { LoopDetail } from "./pages/LoopDetail";
import { Rewards } from "./pages/Rewards";
import { CaptureLoop } from "./pages/CaptureLoop";
import { CaptureItem } from "./pages/CaptureItem";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "capture/receipt", element: <CaptureReceipt /> },
      { path: "capture/message", element: <CaptureMessage /> },
      { path: "capture/loop", element: <CaptureLoop /> },
      { path: "capture/item", element: <CaptureItem /> },
      { path: "items", element: <Items /> },
      { path: "items/:id", element: <ItemDetail /> },
      { path: "loops/:id", element: <LoopDetail /> },
      { path: "rewards", element: <Rewards /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
