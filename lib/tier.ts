import { createClient } from '@/lib/supabase/client';

export type Tier = 'free' | 'premium';

export async function getUserTier(): Promise<Tier> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'free';

  const { data } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  return (data?.tier as Tier) ?? 'free';
}
