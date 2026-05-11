import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { Home, Search, BookOpen, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const dashboardPath =
    user?.role === 'landlord' ? '/dashboard/landlord' :
    user?.role === 'admin' ? '/dashboard/admin' :
    '/dashboard/student';

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">ResiSure</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/properties" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
            <Search size={16} />
            <span className="text-sm font-medium">Browse</span>
          </Link>

          {user ? (
            <>
              <Link href={dashboardPath} className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                <LayoutDashboard size={16} />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>

              {user.role === 'student' && (
                <Link href="/bookings/my" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                  <BookOpen size={16} />
                  <span className="text-sm font-medium">My Bookings</span>
                </Link>
              )}

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {user.full_name.split(' ')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Login
              </Link>
              <Link href="/auth/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}