import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
/** Carga clientes axios al inicio para registrar interceptors y logging HTTP. */
import "./services/api/client"
import "./services/api/chatClient"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
