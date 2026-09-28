import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project-detail";
import Pricing from "@/pages/pricing";
import { type ReactNode } from "react";

// Custom hash location hook that strips query string for route matching,
// while preserving it in the URL so pages can read query params (e.g. Stripe's session_id)
function useHashLocationNoQuery() {
  const [location, navigate] = useHashLocation();
  return [location.split("?")[0], navigate] as [string, typeof navigate];
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AppRouter() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login">
        {() => user ? <Redirect to="/dashboard" /> : <AuthPage mode="login" />}
      </Route>
      <Route path="/register">
        {() => user ? <Redirect to="/dashboard" /> : <AuthPage mode="register" />}
      </Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/projects/:id">
        {(params) => (
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocationNoQuery}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
