import { ArrowLeft, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header mobile estilo app nativo */}
        <div className="sticky top-0 z-20 flex items-center gap-1 border-b border-slate-200/80 bg-white/95 px-1 py-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
            Perfil
          </h1>
        </div>

        <section className="lg:rounded-[34px] lg:bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_46%,_#2563eb_100%)]">
          <div className="space-y-4 lg:space-y-6 lg:px-6 lg:pb-5 lg:pt-6">
            <div className="hidden items-start justify-between gap-4 lg:flex">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/70 md:text-[11px]">Administracao</p>
                <h1 className="mt-2 text-xl font-black tracking-[-0.05em] text-white sm:text-2xl md:mt-3 md:text-[32px] md:tracking-[-0.07em] lg:text-[38px]">Perfil</h1>
                <p className="mt-1.5 hidden max-w-xl text-[13px] leading-5 text-white md:block md:mt-2 md:text-[14px] md:leading-6">
                  Dados do próprio perfil administrativo.
                </p>
              </div>
              <div className="mt-2 hidden shrink-0 sm:block md:mt-3">
                <div className="rounded-[18px] bg-white/15 p-3.5 text-white backdrop-blur-sm">
                  <UserCircle2 className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Mobile: dados cadastrais em formato de campos somente leitura */}
            <div className="space-y-3 lg:hidden">
              <ProfileField
                label="Nome"
                value={profile?.name || '-'}
              />
              <ProfileField
                label="Papel"
                value={profile?.papel ? (papelLabels[profile.papel] || profile.papel) : 'Sem perfil'}
              />
              {profile?.papel !== 'super_admin' && (
                <ProfileField
                  label="Setor"
                  value={profile?.setor_nome || 'Nao vinculado'}
                />
              )}
            </div>

            {/* Desktop: cards no banner */}
            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-3">
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
            </div>
          </div>
        </section>

        <div className="rounded-[34px] border border-slate-200/80 bg-white px-6 py-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
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

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-medium text-slate-800">
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

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
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 lg:border-transparent lg:bg-white/10 lg:shadow-none lg:backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:text-white/60">{label}</p>
          <p className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-900 sm:text-xl lg:text-white">{value}</p>
        </div>
        <div className="shrink-0 rounded-[18px] bg-slate-100 p-3 text-slate-500 lg:bg-white/15 lg:text-white lg:backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default Profile;
