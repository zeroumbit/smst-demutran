import { Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';

const papelLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  gestor: 'Gestor',
  admin_setor: 'Admin do Setor',
  tecnico: 'Tecnico',
};

const Profile = () => {
  const { profile } = useAuth();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-[34px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-6 px-5 pb-5 pt-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-100/70">Administracao</p>
                <h1 className="mt-3 text-[32px] font-black tracking-[-0.07em] text-white sm:text-[38px]">Perfil</h1>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-white">
                  Dados do proprio perfil administrativo.
                </p>
              </div>
              <div className="mt-3 hidden shrink-0 sm:block">
                <div className="rounded-[18px] bg-white/15 p-3.5 text-white backdrop-blur-sm">
                  <UserCircle2 className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${profile?.papel === 'super_admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
              <ProfileCard
                label="Nome"
                value={profile?.name || '-'}
                icon={UserCircle2}
              />
              <ProfileCard
                label="Papel"
                value={profile?.papel ? (papelLabels[profile.papel] || profile.papel) : 'Sem perfil'}
                icon={ShieldCheck}
              />
              {profile?.papel !== 'super_admin' && (
                <ProfileCard
                  label="Setor"
                  value={profile?.setor_nome || 'Nao vinculado'}
                  icon={ShieldCheck}
                />
              )}
              <ProfileCard
                label="E-mail"
                value={profile?.email || '-'}
                icon={Mail}
              />
            </div>
          </div>
        </section>

        <div className="rounded-[26px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="rounded-[14px] bg-slate-900 p-2.5 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900">Contato de acesso</p>
              <p className="text-[12px] text-slate-500">E-mail vinculado</p>
            </div>
          </div>
          <div className="mt-4 text-[14px] leading-6 text-slate-600">
            O acesso administrativo deste perfil esta vinculado ao e-mail{' '}
            <strong className="text-slate-900">{profile?.email || 'smstcaninde@gmail.com'}</strong>.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

function ProfileCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserCircle2;
}) {
  return (
    <div className="rounded-[26px] bg-white/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{label}</p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-white sm:text-xl">{value}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-white/15 p-3 text-white backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default Profile;
