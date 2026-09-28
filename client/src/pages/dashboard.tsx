import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, Crown, FolderOpen, MapPin } from "lucide-react";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const createProject = useMutation({
    mutationFn: async (data: { name: string; clientName?: string; clientAddress?: string; notes?: string }) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      setShowNewProject(false);
      setNewName("");
      setNewClient("");
      setNewAddress("");
      setNewNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast({ title: "Project name required", variant: "destructive" });
      return;
    }
    createProject.mutate({
      name: newName,
      clientName: newClient || undefined,
      clientAddress: newAddress || undefined,
      notes: newNotes || undefined,
    });
  };

  const isFree = user?.plan === "free";
  const projectCount = projects.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="hsl(var(--primary))" />
                <rect x="4" y="4" width="11" height="11" rx="1" fill="#E8A55C" />
                <rect x="17" y="4" width="11" height="11" rx="1" fill="#D4904A" />
                <rect x="4" y="17" width="11" height="11" rx="1" fill="#D4904A" />
                <rect x="17" y="17" width="11" height="11" rx="1" fill="#E8A55C" />
              </svg>
              <span className="font-bold" style={{ fontFamily: "var(--font-display)" }}>FloorPro</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isFree && (
              <Link href="/pricing">
                <Button size="sm" variant="outline" data-testid="upgrade-button">
                  <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/"); }} data-testid="button-logout">
              Log Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              Welcome back, {user?.username}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isFree
                ? `${projectCount}/3 projects used — Free Plan`
                : `${projectCount} projects — ${user?.plan === "enterprise" ? "Enterprise" : "Pro"} Plan`}
            </p>
          </div>
          <Button
            onClick={() => setShowNewProject(true)}
            disabled={isFree && projectCount >= 3}
            data-testid="button-new-project"
          >
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        </div>

        {/* Upgrade banner for free users at limit */}
        {isFree && projectCount >= 3 && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">You've reached the free plan limit</p>
                  <p className="text-xs text-muted-foreground">Upgrade to Pro for unlimited projects</p>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="sm">Upgrade to Pro</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Projects grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first floor covering project to get started</p>
              <Button onClick={() => setShowNewProject(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <Card key={p.id} className="hover:border-primary/40 transition-colors cursor-pointer group">
                <Link href={`/projects/${p.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.name}</CardTitle>
                        {p.clientName && (
                          <p className="text-sm text-muted-foreground mt-1">{p.clientName}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {p.clientAddress && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        {p.clientAddress}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Link>
                <div className="px-6 pb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm("Delete this project?")) {
                        deleteProject.mutate(p.id);
                      }
                    }}
                    data-testid={`button-delete-project-${p.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Smith Residence" data-testid="input-project-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input id="client-name" value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="e.g. John Smith" data-testid="input-client-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-address">Client Address</Label>
              <Input id="client-address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="e.g. 123 Main St, Meridian, MS" data-testid="input-client-address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Project notes..." data-testid="input-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createProject.isPending} data-testid="button-create-project">
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
