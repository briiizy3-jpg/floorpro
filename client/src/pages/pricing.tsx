import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, ArrowLeft, CreditCard } from "lucide-react";

export default function Pricing() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expDate, setExpDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);

  const isPro = user?.plan === "pro" || user?.plan === "enterprise";
  const isTrial = user?.subscriptionStatus === "trial";

  const handleSubscribe = async (plan: string) => {
    if (!token) {
      setLocation("/register");
      return;
    }
    setProcessing(true);
    try {
      await apiRequest("POST", "/api/subscribe", { plan });
      await refreshUser();
      toast({ title: "Subscription activated", description: `You're now on the ${plan === "pro" ? "Pro" : "Enterprise"} plan` });
      setCheckoutPlan(null);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleTrial = async (plan: string) => {
    if (!token) {
      setLocation("/register");
      return;
    }
    try {
      await apiRequest("POST", "/api/subscribe/trial", { plan });
      await refreshUser();
      toast({ title: "Trial started", description: `14-day ${plan === "pro" ? "Pro" : "Enterprise"} trial activated` });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const plans = [
    {
      name: "Free", price: "$0", period: "forever",
      features: ["3 saved projects", "Straight lay pattern", "Standard material sizes", "Basic waste calculator"],
      cta: "Current Plan", disabled: true,
    },
    {
      name: "Pro", price: "$29", period: "/month",
      features: ["Unlimited projects", "All 5 patterns (brick, diagonal, herringbone, chevron)", "Custom material sizes", "Advanced waste optimization", "Professional quote generation", "Priority email support"],
      cta: "Subscribe to Pro", plan: "pro", popular: true,
    },
    {
      name: "Enterprise", price: "$99", period: "/month",
      features: ["Everything in Pro", "Team collaboration (up to 10 users)", "API access", "Custom material library", "White-label branding", "Dedicated account manager"],
      cta: "Subscribe to Enterprise", plan: "enterprise",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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
            {user ? (
              <Link href="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            ) : (
              <Link href="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to home
          </Button>
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>Choose your plan</h1>
          <p className="text-muted-foreground">Upgrade anytime. Cancel anytime.</p>
          {isPro && (
            <Badge className="mt-3"><Crown className="w-3 h-3 mr-1" /> You're on the {user?.plan === "enterprise" ? "Enterprise" : "Pro"} plan</Badge>
          )}
          {isTrial && (
            <Badge variant="secondary" className="mt-3 ml-2">Trial active</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
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
                {plan.disabled ? (
                  <Button variant="outline" className="w-full" disabled>
                    {isPro ? "Downgrade" : "Current Plan"}
                  </Button>
                ) : isPro && user?.plan === plan.plan ? (
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => setCheckoutPlan(plan.plan!)}
                      data-testid={`button-subscribe-${plan.plan}`}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      {plan.cta}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => handleTrial(plan.plan!)}
                      data-testid={`button-trial-${plan.plan}`}
                    >
                      Start 14-day free trial
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-center" style={{ fontFamily: "var(--font-display)" }}>Frequently asked questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">Yes. Cancel your subscription at any time and you'll keep access until the end of your billing period.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">We accept all major credit cards. This is a demo checkout — no real charges are made.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Do you offer a free trial?</h3>
              <p className="text-sm text-muted-foreground">Yes. Start a 14-day free trial of Pro or Enterprise with full access to all features. No credit card required.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutPlan} onOpenChange={(v) => !v && setCheckoutPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {checkoutPlan === "pro" ? "Pro" : "Enterprise"}</DialogTitle>
            <DialogDescription>
              This is a demo checkout. No real payment will be processed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="card-name">Name on Card</Label>
              <Input id="card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Smith" data-testid="input-card-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                placeholder="4242 4242 4242 4242"
                data-testid="input-card-number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exp">Expiry</Label>
                <Input id="exp" value={expDate} onChange={(e) => setExpDate(e.target.value)} placeholder="MM/YY" data-testid="input-exp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ""))} placeholder="123" data-testid="input-cvc" />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total due today</span>
              <span className="font-bold">${checkoutPlan === "pro" ? "29.00" : "99.00"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutPlan(null)}>Cancel</Button>
            <Button
              onClick={() => handleSubscribe(checkoutPlan!)}
              disabled={processing}
              data-testid="button-confirm-subscribe"
            >
              {processing ? "Processing..." : `Pay $${checkoutPlan === "pro" ? "29" : "99"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
