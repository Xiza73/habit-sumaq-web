import { DashboardShell } from '@/presentation/components/layout/DashboardShell';
import { CelebrationModal } from '@/presentation/features/habits/CelebrationModal';
import { AuthProvider } from '@/presentation/providers/AuthProvider';
import { LocaleSync } from '@/presentation/providers/LocaleSync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {/* Sync the rendered locale to the user's saved language setting. */}
      <LocaleSync />
      <DashboardShell>{children}</DashboardShell>
      {/* Global celebration modal — pops when useLogHabit crosses a big
          milestone (month, century). Mounted at layout level so it shows
          regardless of which route the log happened on. */}
      <CelebrationModal />
    </AuthProvider>
  );
}
