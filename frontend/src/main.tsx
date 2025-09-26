// Client entrypoint.
// Purpose:
// - Create the React root and render the application within React.StrictMode.
// - Keep the DOM mounting minimal; move document-level metadata (e.g., <title>)
//   into index.html's <head> for correctness.
//
// Note:
// - Placing <title> inside the React tree has no effect on the real document
//   title. Prefer <head><title>…</title></head> in index.html or use a head
//   manager (e.g., react-helmet-async) if dynamic titles are required.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
        {/* Move this into index.html <head>. Consider react-helmet-async for dynamic titles. */}
        <title>ToDoList</title>
    </StrictMode>,
)
