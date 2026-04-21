import { redirect } from 'next/navigation';

export default function Home() {
  // Landing después del login (o al abrir el bookmark de la app) va al
  // dashboard de Rutinas: resume streaks de hábitos, completitud del día y
  // el split de diarias. Respeta la prioridad del sidebar (Rutinas arriba
  // de Finanzas) y da un overview antes que una pantalla de acción.
  redirect('/reports/routines');
}
