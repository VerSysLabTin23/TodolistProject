import { Routes, Route, BrowserRouter } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./routes/RequireAuth";

// pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage";
import TasksPage from "./pages/tasks/TasksPage";
import DetailedTaskPage from "./pages/tasks/DetailedTaskPage";
import TeamsPage from "./pages/teams/TeamsPage";
import TeamsDetailedPage from "./pages/teams/TeamsDetailedPage";

export default function App() {
    return (
        <BrowserRouter>
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
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/tasks/:id" element={<DetailedTaskPage />} />
                        <Route path="/teams" element={<TeamsPage />} />
                        <Route path="/teams/:id" element={<TeamsDetailedPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
