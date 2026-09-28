import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, email || undefined);
      } else {
        await login(username, password);
      }
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="back-home">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="hsl(var(--primary))" />
                <rect x="4" y="4" width="11" height="11" rx="1" fill="#A08560" />
                <rect x="17" y="4" width="11" height="11" rx="1" fill="#8B7355" />
                <rect x="4" y="17" width="11" height="11" rx="1" fill="#8B7355" />
                <rect x="17" y="17" width="11" height="11" rx="1" fill="#A08560" />
              </svg>
              <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>FloorPro</span>
            </div>
            <CardTitle>{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  data-testid="input-username"
                  placeholder="Enter username"
                />
              </div>
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                    placeholder="you@example.com"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                  placeholder="Enter password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
                {loading ? "Please wait..." : isRegister ? "Create Account" : "Log In"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <Link href={isRegister ? "/login" : "/register"}>
                <span className="text-primary hover:underline cursor-pointer">
                  {isRegister ? "Log in" : "Sign up free"}
                </span>
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
