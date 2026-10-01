import { Auth } from '@supabase/auth-ui-react';
import { ThemeMinimal } from '@supabase/auth-ui-shared'; // <-- Pilihan alternatif
import { supabase } from '../utils/supabaseClient';

export default function AuthPage() {
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeMinimal }}
        view="sign_in"
        redirectTo="http://localhost:5173/reset-password"
      />
    </div>
  );
}