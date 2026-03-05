import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { TimelineView } from '@/components/timeline/TimelineView';
import { HistoryView } from '@/components/timeline/HistoryView';
import { OutreachForm } from '@/components/outreach/OutreachForm';
import { OutreachDetail } from '@/components/outreach/OutreachDetail';

// Initialize data service (seeds localStorage on first load)
import '@/lib/dataService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/WPNT-Client-Dashboard/">
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<TimelineView />} />
            <Route path="history" element={<HistoryView />} />
          </Route>
        </Routes>
        <OutreachForm />
        <OutreachDetail />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
