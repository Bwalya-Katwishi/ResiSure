import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/router';

import { Bell, X } from 'lucide-react';

import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/api';

import { useEscapeKey } from '../../lib/useEscapeKey';



function timeAgo(date) {

  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  return `${days}d ago`;

}



export default function NotificationBell() {

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [items, setItems] = useState([]);

  const [unread, setUnread] = useState(0);

  const panelRef = useRef(null);

  const buttonRef = useRef(null);

  const panelId = 'notification-panel';



  const load = async () => {

    try {

      const res = await getNotifications();

      setItems(res.data.data.notifications || []);

      setUnread(res.data.unread || 0);

    } catch {

      // Keep the last known list if the request fails

    }

  };



  useEffect(() => {

    load();

    const interval = setInterval(load, 30000);

    return () => clearInterval(interval);

  }, []);



  const closePanel = useCallback(() => {

    setOpen(false);

    buttonRef.current?.focus();

  }, []);



  useEscapeKey(closePanel, open);



  useEffect(() => {

    const handleClick = (event) => {

      if (panelRef.current && !panelRef.current.contains(event.target)) {

        setOpen(false);

      }

    };

    if (open) document.addEventListener('mousedown', handleClick);

    return () => document.removeEventListener('mousedown', handleClick);

  }, [open]);



  const handleOpen = () => {

    setOpen((prev) => !prev);

  };



  const handleItemClick = async (item) => {

    if (!item.is_read) {

      try {

        await markNotificationRead(item.id);

        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));

        setUnread((count) => Math.max(0, count - 1));

      } catch {

        // Navigation still works if the read update fails

      }

    }

    setOpen(false);

    if (item.link) router.push(item.link);

  };



  const handleMarkAll = async () => {

    try {

      await markAllNotificationsRead();

      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

      setUnread(0);

    } catch {

      // Leave unread state unchanged

    }

  };



  const bellLabel = unread > 0

    ? `Notifications, ${unread} unread`

    : 'Notifications';



  return (

    <div className="relative" ref={panelRef}>

      <button

        ref={buttonRef}

        type="button"

        onClick={handleOpen}

        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-blue-600"

        aria-label={bellLabel}

        aria-expanded={open}

        aria-haspopup="true"

        aria-controls={panelId}

      >

        <Bell size={18} aria-hidden="true" />

        {unread > 0 && (

          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white" aria-hidden="true">

            {unread > 9 ? '9+' : unread}

          </span>

        )}

      </button>



      {open && (
        <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          aria-label="Close notifications"
          onClick={() => setOpen(false)}
        />
        <div

          id={panelId}

          role="region"

          aria-label="Notifications"

          className="fixed inset-x-3 top-[3.75rem] z-50 mt-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"

        >

          <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 sm:px-4">

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:hidden"
              aria-label="Close notifications"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <p className="min-w-0 flex-1 text-sm font-semibold text-gray-900">Notifications</p>

            {unread > 0 && (

              <button type="button" onClick={handleMarkAll} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">

                Mark all read

              </button>

            )}

          </div>

          <div className="max-h-80 overflow-y-auto">

            {items.length === 0 ? (

              <p className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up.</p>

            ) : (

              items.map((item) => (

                <button

                  key={item.id}

                  type="button"

                  onClick={() => handleItemClick(item)}

                  className={`w-full border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${

                    item.is_read ? 'bg-white' : 'bg-blue-50'

                  }`}

                >

                  <p className={`text-sm ${item.is_read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>

                    {item.message}

                  </p>

                  <p className="mt-1 text-xs text-gray-400">{timeAgo(item.created_at)}</p>

                </button>

              ))

            )}

          </div>

        </div>
        </>
      )}

    </div>

  );

}

