import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope";
import "@fontsource/oswald/cyrillic-500.css";
import "@fontsource/oswald/cyrillic-600.css";
import "@fontsource/oswald/cyrillic-700.css";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-600.css";
import "@fontsource/oswald/latin-700.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
