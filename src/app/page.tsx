import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            School Organiser
          </h1>
          <p className="text-sm text-gray-500">
            Your Social Schools messages at a glance
          </p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Dashboard />
      </div>
    </main>
  );
}
