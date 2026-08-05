import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { Home, Search, BookOpen, LayoutDashboard, LogOut, Menu, X, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push('/');
  };

  const dashboardPath =
    user?.role === 'landlord' ? '/dashboard/landlord' :
    user?.role === 'admin' ? '/dashboard/admin' :
    '/dashboard/student';

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/" onClick={closeMenu} className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900">ResiSure</span>
              <span className="hidden sm:block text-xs text-gray-400 leading-none">Safe Student Housing</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/properties" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${router.pathname === '/properties' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
              <Search size={15} />
              Browse
            </Link>

            {user && (
              <Link href={dashboardPath} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${router.pathname.includes('/dashboard') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
            )}

            {user?.role === 'student' && (
              <Link href="/bookings/my" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${router.pathname === '/bookings/my' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>
                <BookOpen size={15} />
                My Bookings
              </Link>
            )}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-gray-900 leading-none">{user.full_name.split(' ')[0]}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-gray-100 pt-3 space-y-1">
            <Link href="/properties" onClick={closeMenu} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Search size={16} className="text-gray-400" />
              Browse Listings
            </Link>

            {user && (
              <Link href={dashboardPath} onClick={closeMenu} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <LayoutDashboard size={16} className="text-gray-400" />
                Dashboard
              </Link>
            )}

            {user?.role === 'student' && (
              <Link href="/bookings/my" onClick={closeMenu} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <BookOpen size={16} className="text-gray-400" />
                My Bookings
              </Link>
            )}

            <div className="pt-2 border-t border-gray-100 mt-2">
              {user ? (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/auth/login" onClick={closeMenu} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Login
                  </Link>
                  <Link href="/auth/register" onClick={closeMenu} className="block px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white text-center hover:bg-blue-700 transition-colors">
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}