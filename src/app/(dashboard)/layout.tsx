import { DashboardShell } from '@/presentation/components/layout/DashboardShell';
import { CelebrationModal } from '@/presentation/features/habits/CelebrationModal';
import { AuthProvider } from '@/presentation/providers/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
      {/* Global celebration modal — pops when useLogHabit crosses a big
          milestone (month, century). Mounted at layout level so it shows
          regardless of which route the log happened on. */}
      <CelebrationModal />
    </AuthProvider>
  );
}
