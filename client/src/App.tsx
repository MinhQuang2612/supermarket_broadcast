import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/user-management";
import SupermarketManagement from "@/pages/supermarket-management";
import AudioManagement from "@/pages/audio-management";
import BroadcastManagement from "@/pages/broadcast-management";
import PlaylistCreation from "@/pages/playlist-creation";
import PlaylistPreview from "@/pages/playlist-preview";
import BroadcastAssignment from "@/pages/broadcast-assignment";
import SystemManagement from "@/pages/system-management";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <ProtectedRoute path="/supermarkets" component={SupermarketManagement} />
      <ProtectedRoute path="/audio-files" component={AudioManagement} />
      <ProtectedRoute path="/broadcast-programs" component={BroadcastManagement} />
      <ProtectedRoute path="/playlists" component={PlaylistCreation} />
      <ProtectedRoute path="/playlist-preview" component={PlaylistPreview} />
      <ProtectedRoute path="/broadcast-assignments" component={BroadcastAssignment} />
      <ProtectedRoute path="/system" component={SystemManagement} />
      <Route path="/auth" component={AuthPage} />
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
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
