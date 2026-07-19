import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { LandingPage } from '@/routes/public/LandingPage';
import { BookingPage } from '@/routes/public/BookingPage';
import { QuoteExplorerPage } from '@/routes/public/QuoteExplorerPage';
import { LoginPage } from '@/routes/staff/LoginPage';
import { DashboardLayout } from '@/routes/staff/DashboardLayout';
import { BookingsListPage } from '@/routes/staff/BookingsListPage';
import { QuotesListPage } from '@/routes/staff/QuotesListPage';
import { NewQuotePage } from '@/routes/staff/NewQuotePage';
import { QuoteDetailPage } from '@/routes/staff/QuoteDetailPage';
import { PricingSyncPage } from '@/routes/staff/PricingSyncPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/reservar" element={<BookingPage />} />
        <Route path="/q/:slug" element={<QuoteExplorerPage />} />

        <Route path="/staff/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<DashboardLayout />}>
            <Route path="/staff/bookings" element={<BookingsListPage />} />
            <Route path="/staff/quotes" element={<QuotesListPage />} />
            <Route path="/staff/quotes/new" element={<NewQuotePage />} />
            <Route path="/staff/quotes/:id" element={<QuoteDetailPage />} />
            <Route path="/staff/pricing" element={<PricingSyncPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
