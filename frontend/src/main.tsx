import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { useAuth } from "./store/auth";

function Boot() {
  const hydrate = useAuth((s) => s.hydrate);
  React.useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Boot />
    </BrowserRouter>
  </React.StrictMode>
);
