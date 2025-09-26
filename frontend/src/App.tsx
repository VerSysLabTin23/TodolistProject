// Application router and layout composition.
// Purpose:
// - Define public vs. private route trees and mount the correct layout shells.
// - Mount a global RealtimeRoot ONLY for authenticated routes (saves WS resources).
// - Wire up admin-only routes behind the <RequireAdmin/> guard.
//
// Structure:
//   Public (AuthLayout):
//     /            → LoginPage
//     /register    → RegisterPage
//
//   Private (AppLayout) + RequireAuth + RealtimeShell:
//     /welcome                 → WelcomePage
//     /teams                   → TeamsPage
//     /teams/new               → CreateTeamPage
//     /teams/:id               → TeamTasksPage
//     /teams/:id/manage        → TeamsDetailedPage
//     /tasks                   → TasksPage
//     /tasks/:id               → TaskDetailsPage
//     /completed               → CompletedPage
//     *                        → NotFoundPage
//
//   Admin (RequireAdmin):
//     /admin/users             → UsersAdminPage
//     /admin/teams             → TeamsAdminPage
//     /admin/teams/:id         → TeamAdminDetailPage
//
// Notes:
// - If your <RequireAdmin/> does not imply auth, you can also nest admin routes
//   under <AppLayout><RequireAuth>...</RequireAuth></AppLayout> to reuse the navbar.
// - RealtimeShell mounts <RealtimeRoot/> so WS is active only inside the private area.

import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./routes/RequireAuth";

// pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage";
import TasksPage from "./pages/tasks/TasksPage";
import TeamsPage from "./pages/teams/TeamsPage";
import TeamsDetailedPage from "./pages/teams/TeamsDetailedPage";
import NotFoundPage from "./pages/NotFound.tsx";
import TaskDetailsPage from "./pages/tasks/DetailedTaskPage";
import CreateTeamPage from "./pages/teams/CreateTeamPage";
import RequireAdmin from "./routes/RequireAdmin.tsx";
import UsersAdminPage from "./pages/admin/UsersAdminPage.tsx";
import TeamsAdminPage from "./pages/admin/TeamsAdminPage.tsx";
import TeamAdminDetailPage from "./pages/admin/TeamAdminDetailPage.tsx";
import CompletedPage from "./pages/CompletedPage";
import TeamTasksPage from "./pages/teams/TeamTasksPage.tsx";

// IMPORTANT: keep WS mounted only for authenticated routes
import RealtimeRoot from "./realtime/RealtimeRoot";

// Tiny wrapper that mounts the realtime socket and then renders the nested
// private routes via <Outlet/>. This avoids creating the socket on the login page.
function RealtimeShell() {
    return (
        <>
            <RealtimeRoot />
            <Outlet />
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public (no navbar) */}
                <Route element={<AuthLayout />}>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Private (with navbar) */}
                <Route element={<AppLayout />}>
                    <Route element={<RequireAuth />}>
                        {/* Mount WS only for authenticated area */}
                        <Route element={<RealtimeShell />}>
                            <Route path="/welcome" element={<WelcomePage />} />
                            <Route path="/teams" element={<TeamsPage />} />
                            <Route path="/teams/new" element={<CreateTeamPage />} />
                            <Route path="/teams/:id" element={<TeamTasksPage />} />
                            <Route path="/teams/:id/manage" element={<TeamsDetailedPage />} />
                            <Route path="/tasks" element={<TasksPage />} />
                            <Route path="/tasks/:id" element={<TaskDetailsPage />} />
                            <Route path="/completed" element={<CompletedPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                    </Route>
                </Route>

                {/* ADMIN
                   If <RequireAdmin/> already implies authentication (via localStorage),
                   it can live top-level. Otherwise, nest under AppLayout/RequireAuth. */}
                <Route element={<RequireAdmin />}>
                    <Route path="/admin/users" element={<UsersAdminPage />} />
                    <Route path="/admin/teams" element={<TeamsAdminPage />} />
                    <Route path="/admin/teams/:id" element={<TeamAdminDetailPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
