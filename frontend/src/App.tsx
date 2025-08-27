import { Routes, Route, BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage.tsx";
import TaskDetailsPage from "./pages/tasks/DetailedTaskPage.tsx";
import TasksPage from "./pages/tasks/TasksPage.tsx";
import Navbar from "./components/Navbar.tsx";
import TeamDetailsPage from "./pages/teams/TeamRenamePage.tsx";
import TeamsPage from "./pages/teams/TeamsPage.tsx";


export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <div style={{padding: 16}}>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tasks/:id" element={<TaskDetailsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:id" element={<TeamDetailsPage />} />
            </Routes>
            </div>
        </BrowserRouter>
    );
}
