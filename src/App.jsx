import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import Navbar from './Navbar';
import EmployerDashboard from './EmployerDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import { Loader2 } from 'lucide-react';

const AuthScreen = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      {showLogin ? (
        <LoginForm onToggle={() => setShowLogin(false)} />
      ) : (
        <SignUpForm onToggle={() => setShowLogin(true)} />
      )}
    </div>
  );
};

const MainApp = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      {profile.role === 'employer' ? <EmployerDashboard /> : <EmployeeDashboard />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
