import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  Layers, Ruler, Calculator, FileDown, Users, Zap,
  Check, ArrowRight, LayoutGrid, Scissors
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))" />
              <rect x="4" y="4" width="11" height="11" rx="1" fill="#E8A55C" stroke="#8B5A1F" strokeWidth="1" />
              <rect x="17" y="4" width="11" height="11" rx="1" fill="#D4904A" stroke="#8B5A1F" strokeWidth="1" />
              <rect x="4" y="17" width="11" height="11" rx="1" fill="#D4904A" stroke="#8B5A1F" strokeWidth="1" />
              <rect x="17" y="17" width="11" height="11" rx="1" fill="#E8A55C" stroke="#8B5A1F" strokeWidth="1" />
            </svg>
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>FloorPro</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" data-testid="nav-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="nav-login">Log In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="nav-signup">Start Free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1" /> Professional floor covering tool
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          Design floor layouts.<br />
          Calculate materials. Win bids.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          The all-in-one tool for floor covering specialists. Visualize patterns,
          estimate materials, and generate professional quotes in minutes.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={user ? "/dashboard" : "/register"}>
            <Button size="lg" data-testid="cta-start">
              {user ? "Go to Dashboard" : "Start Free Today"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" data-testid="cta-pricing">View Plans</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-3">No credit card required for free tier</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: LayoutGrid, title: "Pattern Visualizer", desc: "See straight, brick, diagonal, herringbone, and chevron patterns rendered in real-time on your room dimensions." },
            { icon: Calculator, title: "Material Calculator", desc: "Get exact plank counts, box quantities, and waste factors. Never over-order or under-order again." },
            { icon: Ruler, title: "Room Designer", desc: "Define room dimensions, choose material sizes, and adjust waste percentages for accurate estimates." },
            { icon: Scissors, title: "Cut List Generation", desc: "Pro automatically identifies which planks need cuts and which are full pieces." },
            { icon: FileDown, title: "Professional Quotes", desc: "Generate client-ready estimates with material costs, labor, and total project pricing." },
            { icon: Users, title: "Team Collaboration", desc: "Enterprise plan supports team workflows for multi-installer operations." },
          ].map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-2" style={{ fontFamily: "var(--font-display)" }}>Simple, transparent pricing</h2>
        <p className="text-center text-muted-foreground mb-10">Start free. Upgrade when you need more.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: "Free", price: "$0", period: "forever", features: ["3 projects", "Straight lay pattern", "Basic material calculator", "Standard plank/tile sizes"], cta: "Start Free" },
            { name: "Pro", price: "$29", period: "/month", features: ["Unlimited projects", "All 5 patterns", "Custom material sizes", "Waste optimization", "Quote generation", "Priority support"], cta: "Start Pro", popular: true },
            { name: "Enterprise", price: "$99", period: "/month", features: ["Everything in Pro", "Team collaboration", "API access", "Custom material library", "White-label quotes", "Dedicated manager"], cta: "Contact Sales" },
          ].map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary ring-1 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.popular && <Badge>Most Popular</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={user ? "/pricing" : "/register"}>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-12">
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Ready to lay it out?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join floor covering professionals who use FloorPro to save time on estimates and impress clients with visual layouts.
          </p>
          <Link href={user ? "/dashboard" : "/register"}>
            <Button size="lg">
              {user ? "Go to Dashboard" : "Create Free Account"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))" />
              <rect x="4" y="4" width="11" height="11" rx="1" fill="#E8A55C" />
              <rect x="17" y="4" width="11" height="11" rx="1" fill="#D4904A" />
              <rect x="4" y="17" width="11" height="11" rx="1" fill="#D4904A" />
              <rect x="17" y="17" width="11" height="11" rx="1" fill="#E8A55C" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)" }}>FloorPro</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for floor covering specialists</p>
        </div>
      </footer>
    </div>
  );
}
