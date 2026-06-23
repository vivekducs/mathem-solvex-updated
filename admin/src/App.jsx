
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// --- Import all necessary admin pages and layouts ---
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QuestionListPage from './pages/QuestionListPage';
import AddQuestionPage from './pages/AddQuestionPage';
import ReportsPage from './pages/ReportsPage';
import PostListPage from './pages/PostListPage';
import AddPostPage from './pages/AddPostPage';
import ManageTaxonomyPage from './pages/ManageTaxonomyPage';
import AdminLayout from './components/AdminLayout';

// This is a new helper component to handle the root URL
const RootRedirect = () => {
    const { token, loading } = useAuth();
    if (loading) {
        return <div>Loading...</div>; // Or a loading spinner
    }
    // If a token exists, the user is logged in, so go to the dashboard.
    // Otherwise, go to the login page.
    return token ? <Navigate to="/admin/dashboard" /> : <Navigate to="/login" />;
};

const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    if (loading) {
        return <div>Loading...</div>;
    }
    return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
        <Toaster position="top-center" />
        <Routes>
            {/* The root path now uses the new RootRedirect component */}
            <Route path="/" element={<RootRedirect />} />

            <Route path="/login" element={<LoginPage />} />
            
            {/* All admin pages are now explicitly under the /admin path */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="questions" element={<QuestionListPage />} />
                <Route path="questions/add" element={<AddQuestionPage />} />
                <Route path="questions/edit/:id" element={<AddQuestionPage />} />
                <Route path="posts" element={<PostListPage />} />
                <Route path="posts/add" element={<AddPostPage />} />
                <Route path="posts/edit/:id" element={<AddPostPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="taxonomy" element={<ManageTaxonomyPage />} />
            </Route>
        </Routes>
    </AuthProvider>
  );
}

export default App;