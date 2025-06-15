// src/components/LogoutButton.tsx
'use client'; // This is a client component because it has interactivity (onClick)

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // This will refresh the current route and reflect the logged-out state
  };

  return (
    <button
      onClick={handleLogout}
      style={{ background: 'red', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
    >
      Logout
    </button>
  );
}