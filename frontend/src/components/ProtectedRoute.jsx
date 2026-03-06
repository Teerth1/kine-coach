import React from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        return <Login />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="dashboard-layout items-center justify-center">
                <div className="bg-bg-glass p-8 rounded-2xl border border-red-500/30 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
                    <p className="text-gray-300">Your account ({user.role}) does not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return children;
}
