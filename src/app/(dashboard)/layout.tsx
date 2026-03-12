import { DashboardShell } from '@/presentation/components/layout/DashboardShell';
import { AuthProvider } from '@/presentation/providers/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
