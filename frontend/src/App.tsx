import { Routes, Route, BrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage.tsx";


export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Routes>
        </BrowserRouter>
    );
}
