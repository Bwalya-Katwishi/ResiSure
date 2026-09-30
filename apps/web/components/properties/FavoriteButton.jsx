import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { Heart } from 'lucide-react';

import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';

import { addFavorite, removeFavorite } from '../../lib/api';



export default function FavoriteButton({

  propertyId,

  isFavorite = false,

  onChange,

  className = '',

  size = 18,

}) {

  const { user } = useAuth();

  const router = useRouter();

  const [saved, setSaved] = useState(Boolean(isFavorite));

  const [busy, setBusy] = useState(false);



  useEffect(() => {

    setSaved(Boolean(isFavorite));

  }, [isFavorite]);



  const toggle = async (event) => {

    event.preventDefault();

    event.stopPropagation();

    if (!user) {

      toast.error('Login to save listings');

      router.push('/auth/login');

      return;

    }

    if (user.role !== 'student') {

      toast.error('Only students can save listings');

      return;

    }

    if (busy) return;

    setBusy(true);

    const next = !saved;

    setSaved(next);

    try {

      if (next) await addFavorite(propertyId);

      else await removeFavorite(propertyId);

      onChange?.(propertyId, next);

    } catch (err) {

      setSaved(!next);

      toast.error(err.response?.data?.message || 'Could not update saved listing');

    } finally {

      setBusy(false);

    }

  };



  if (user && user.role !== 'student') return null;



  return (

    <button

      type="button"

      onClick={toggle}

      disabled={busy}

      aria-label={saved ? 'Remove from saved' : 'Save listing'}

      aria-pressed={saved}

      aria-busy={busy || undefined}

      className={`rounded-full border border-white bg-white/90 p-2.5 shadow-sm transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70 sm:p-1.5 ${className}`}

    >

      <Heart

        size={size}

        aria-hidden="true"

        className={saved ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}

      />

    </button>

  );

}

