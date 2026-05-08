---
applyTo: "frontend/**/*"
---
# React & Vite Standards
- **Components**: Use functional components with TypeScript interfaces for Props.
- **Styling**: Use Tailwind CSS utility classes.
- **API Calls**: 
    - Use `axios` for requests.
    - Reference the backend via `import.meta.env.VITE_API_BASE_URL`.
- **UX**: 
    - Implement "Copy to Clipboard" using the `navigator.clipboard` API.
    - Ensure the "Shorten" button has a loading state during the API call.
- **Safety**: Always validate the URL format on the client side before hitting the backend.