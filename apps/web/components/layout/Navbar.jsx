import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';
import Logo from '../brand/Logo';

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

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEscapeKey(closeMenu, menuOpen);

  const navLink = (href, label, active, mobile = false) => (
    <Link
      href={href}
      onClick={closeMenu}
      aria-current={active ? 'page' : undefined}
      className={
        mobile
          ? `block rounded-xl px-3 py-3 text-base font-medium ${
              active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`
          : `text-sm font-medium ${active ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`
      }
    >
      {label}
    </Link>
  );

  const isActive = (path) => router.pathname === path || router.pathname.startsWith(`${path}/`);
  const showBrowseRooms = !user || user.role === 'student' || user.role === 'admin';

  const roleLinks = user?.role === 'landlord'
    ? [
        { href: '/dashboard/landlord#landlord-listings', label: 'My properties' },
        { href: '/dashboard/landlord#landlord-booking-requests', label: 'Booking requests' },
        { href: '/dashboard/landlord#landlord-active-bookings', label: 'Active bookings' },
        { href: '/dashboard/landlord#landlord-completed-bookings', label: 'Completed bookings' },
        { href: '/dashboard/landlord#landlord-verification', label: 'Verification' },
      ]
    : user?.role === 'student'
      ? [
          { href: '/favorites', label: 'Saved' },
          { href: '/dashboard/student#student-bookings', label: 'My bookings' },
        ]
      : [];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90" aria-label="Main">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
        <Logo href="/" size="sm" onClick={closeMenu} />

        <div className="hidden items-center gap-6 lg:gap-7 md:flex">
          {showBrowseRooms && navLink('/properties', 'Browse rooms', isActive('/properties'))}
          {!user && navLink('/#how-it-works', 'How it works', false)}
          {!user && navLink('/#for-landlords', 'For landlords', false)}
          {user && navLink(dashboardPath, 'Dashboard', router.pathname.includes('/dashboard'))}
          {roleLinks.map((link) => navLink(link.href, link.label, router.asPath.includes(link.href.split('#')[0])))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <NotificationBell />
              <Link href={dashboardPath} className="flex items-center gap-2 text-sm text-slate-700">
                <LayoutDashboard size={15} aria-hidden="true" />
                {user.full_name.split(' ')[0]}
              </Link>
              <button type="button" onClick={handleLogout} className="inline-flex min-h-0 items-center gap-1 text-sm text-slate-500 hover:text-red-600">
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
              <Link href="/auth/register" className="btn-primary px-4 py-2">Create account</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2.5 text-slate-700 hover:bg-slate-50"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav-menu" className="border-t border-slate-200 bg-white px-3 py-3 md:hidden">
          <div className="space-y-1">
            {showBrowseRooms && navLink('/properties', 'Browse rooms', isActive('/properties'), true)}
            {!user && navLink('/#how-it-works', 'How it works', false, true)}
            {!user && navLink('/#for-landlords', 'For landlords', false, true)}
            {user && navLink(dashboardPath, 'Dashboard', router.pathname.includes('/dashboard'), true)}
            {roleLinks.map((link) => navLink(link.href, link.label, router.asPath.includes(link.href.split('#')[0]), true))}
          </div>

          {user ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Signed in as</p>
              <p className="mb-3 px-3 text-sm font-medium text-slate-900">{user.full_name}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <Link href="/auth/login" onClick={closeMenu} className="btn-secondary w-full">Sign in</Link>
              <Link href="/auth/register" onClick={closeMenu} className="btn-primary w-full">Create account</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
