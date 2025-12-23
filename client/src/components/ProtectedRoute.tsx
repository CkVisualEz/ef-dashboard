import { useLocation, Redirect } from 'wouter';
import { useAuth } from '@/lib/auth';

// Get base path for navigation
const getBasePath = () => {
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    const basePath = import.meta.env.BASE_URL || '/EF-Dashboard/';
    return basePath.replace(/\/$/, '');
  }
  return '';
};

const BASE_PATH = getBasePath();

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated) {
    const loginPath = BASE_PATH ? `${BASE_PATH}/login` : '/login';
    return <Redirect to={loginPath} />;
  }

  return <>{children}</>;
}

