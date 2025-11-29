# AI Rules for DevForge Application

This document outlines the core technologies used in the DevForge project and provides guidelines for using specific libraries to maintain consistency and best practices.

## Tech Stack Overview

The DevForge application is built using a modern web development stack, focusing on performance, scalability, and developer experience.

*   **Frontend Framework**: React
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **UI Library**: shadcn/ui (built on Radix UI)
*   **Routing**: React Router DOM
*   **Data Fetching & Server State Management**: React Query
*   **Animations**: Framer Motion
*   **Icons**: Lucide React
*   **Form Handling & Validation**: React Hook Form & Zod
*   **Toast Notifications**: Sonner (and shadcn/ui's Toast)
*   **Backend**: Node.js, Express, MongoDB, Passport.js (for Google OAuth), and OxaPay for payment processing.

## Library Usage Rules

To ensure a consistent and maintainable codebase, please adhere to the following rules when developing new features or modifying existing ones:

1.  **UI Components**:
    *   Always prioritize `shadcn/ui` components for building the user interface. These components are pre-styled with Tailwind CSS and provide accessibility features.
    *   If a `shadcn/ui` component does not exist for a specific need or requires significant customization beyond simple styling, create a new, dedicated component in `src/components/` and style it using Tailwind CSS. Do **NOT** modify existing `shadcn/ui` files directly.

2.  **Styling**:
    *   Use Tailwind CSS exclusively for all styling. Leverage its utility classes for layout, spacing, colors, typography, and responsive design.
    *   Avoid custom CSS files or inline styles unless absolutely necessary for unique, isolated cases (e.g., specific global animations defined in `src/index.css`).

3.  **Routing**:
    *   Use `react-router-dom` for all client-side navigation and route management. All main application routes should be defined within `src/App.tsx`.

4.  **Data Fetching & Server State**:
    *   For managing server state, asynchronous data fetching, caching, and synchronization, use `@tanstack/react-query`.
    *   For simple local component state, use React's built-in `useState` and `useReducer` hooks.

5.  **Animations**:
    *   Utilize `framer-motion` for all complex UI animations and transitions, especially for interactive elements and page transitions.
    *   For simpler animation effects, use Tailwind CSS animation utilities or custom keyframes defined in `src/index.css`.

6.  **Icons**:
    *   All icons used throughout the application should be imported from the `lucide-react` library.

7.  **Forms**:
    *   Implement all forms using `react-hook-form` for efficient form state management, validation, and submission.
    *   Use `zod` for defining schema-based validation rules for all form inputs.

8.  **Notifications**:
    *   For displaying ephemeral toast notifications to the user (e.g., success messages, error alerts), use `sonner`. The `toast` function from `sonner` is the preferred method for new implementations.

9.  **Date Manipulation**:
    *   When working with dates (e.g., formatting, parsing, calculations), use the `date-fns` library.

10. **Carousels**:
    *   For implementing carousel or slider functionalities, use `embla-carousel-react`.

11. **Backend Interaction**:
    *   Interact with the backend API using the standard `fetch` API or `react-query` for data fetching and mutations.
    *   Do not implement direct database queries, authentication logic, or other server-side functions directly within the frontend.

12. **File Structure**:
    *   Place pages in `src/pages/`.
    *   Place reusable components in `src/components/`.
    *   Place UI components from shadcn/ui in `src/components/ui/`.
    *   Place hooks in `src/hooks/`.
    *   Place utility functions in `src/lib/` or `src/utils/`.
    *   Directory names MUST be all lower-case.