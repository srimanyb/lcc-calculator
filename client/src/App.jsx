import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CalculatorPage from './pages/CalculatorPage';
import SavedEventsPage from './pages/SavedEventsPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recipes" element={
            <ProtectedRoute><RecipesPage /></ProtectedRoute>
          } />
          <Route path="/recipes/:id" element={
            <ProtectedRoute><RecipeDetailPage /></ProtectedRoute>
          } />
          <Route path="/calculator" element={
            <ProtectedRoute><CalculatorPage /></ProtectedRoute>
          } />
          <Route path="/saved-events" element={
            <ProtectedRoute><SavedEventsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
