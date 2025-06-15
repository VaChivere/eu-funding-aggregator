// src/app/account/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AccountPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // This is a protected route. If a user is not logged in, redirect them to the login page.
    redirect('/login');
  }

  return (
    <div>
      <h2>Welcome to your account page!</h2>
      <p>This page is protected and only you can see it.</p>
      <p>Your email: {session.user.email}</p>
    </div>
  );
}