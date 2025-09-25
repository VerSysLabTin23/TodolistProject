import { Routes, Route, BrowserRouter } from "react-router-dom";
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
import RealtimeRoot from "./realtime/RealtimeRoot";
import CompletedPage from "./pages/CompletedPage";

export default function App() {
    return (
        <BrowserRouter>
            <RealtimeRoot />  {/* keep WS alive globally */}

            {/* Public (no navbar) */}
            <Routes>
                <Route element={<AuthLayout />}>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Private (with navbar) */}
                <Route element={<AppLayout />}>
                    <Route element={<RequireAuth />}>
                        <Route path="/welcome" element={<WelcomePage />} />
                        <Route path="/teams" element={<TeamsPage />} />
                        <Route path="/teams/new" element={<CreateTeamPage />} />
                        <Route path="/teams/:id" element={<TeamsDetailedPage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/tasks/:id" element={<TaskDetailsPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                        <Route path="/completed" element={<CompletedPage />} />
                    </Route>
                </Route>

                {/* ADMIN */}
                <Route element={<RequireAdmin />}>
                    <Route path="/admin/users" element={<UsersAdminPage />} />
                    <Route path="/admin/teams" element={<TeamsAdminPage />} />
                    <Route path="/admin/teams/:id" element={<TeamAdminDetailPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
