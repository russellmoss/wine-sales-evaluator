import dynamic from 'next/dynamic';

const WineEvaluationDashboard = dynamic(
  () => import('./components/WineEvaluationDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <WineEvaluationDashboard />
    </main>
  );
} 