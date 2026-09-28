import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, ArrowLeft, CreditCard, Loader2, Settings } from "lucide-react";

// Stripe Payment Links (test mode)
const PAYMENT_LINKS = {
  pro: {
    subscribe: "https://buy.stripe.com/test_00w9AT2Wf0VK8qJ8y133W01",
    trial: "https://buy.stripe.com/test_5kQbJ1cwP9sgbCVcOh33W03",
  },
  enterprise: {
    subscribe: "https://buy.stripe.com/test_eVq6oH40j8ocfTb5lP33W00",
    trial: "https://buy.stripe.com/test_00w28r54n1ZO6iBdSl33W02",
  },
} as const;

export default function Pricing() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  const isPro = user?.plan === "pro" || user?.plan === "enterprise";
  const isTrial = user?.subscriptionStatus === "trial";

  // Check for session_id in URL (returning from Stripe Checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      toast({ title: "Subscription activated", description: "Welcome to your new plan" });
      refreshUser();
      // Clean up the URL
      window.history.replaceState({}, "", window.location.pathname + window.location.hash.split("?")[0]);
    }
  }, []);

  const handleCheckout = (plan: "pro" | "enterprise", trial: boolean) => {
    if (!token) {
      setLocation("/register");
      return;
    }
    const link = PAYMENT_LINKS[plan][trial ? "trial" : "subscribe"];
    // Append client_reference_id so the webhook can identify the user
    const url = `${link}?client_reference_id=${user?.id}`;
    setRedirecting(true);
    window.location.href = url;
  };

  const handlePortal = async () => {
    // Customer Portal requires backend Stripe API access
    // For now, redirect to Stripe's billing portal directly
    toast({ title: "Manage your subscription", description: "Use the link in your confirmation email from Stripe to manage your subscription." });
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
      cta: "Subscribe to Pro", plan: "pro" as const, popular: true,
    },
    {
      name: "Enterprise", price: "$99", period: "/month",
      features: ["Everything in Pro", "Team collaboration (up to 10 users)", "API access", "Custom material library", "White-label branding", "Dedicated account manager"],
      cta: "Subscribe to Enterprise", plan: "enterprise" as const,
    },
  ];

  if (redirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Redirecting to secure Stripe Checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="hsl(var(--primary))" />
                <rect x="4" y="4" width="11" height="11" rx="1" fill="#A08560" />
                <rect x="17" y="4" width="11" height="11" rx="1" fill="#8B7355" />
                <rect x="4" y="17" width="11" height="11" rx="1" fill="#8B7355" />
                <rect x="17" y="17" width="11" height="11" rx="1" fill="#A08560" />
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
            <div className="flex items-center justify-center gap-2 mt-3">
              <Badge><Crown className="w-3 h-3 mr-1" /> You're on the {user?.plan === "enterprise" ? "Enterprise" : "Pro"} plan</Badge>
              {isTrial && <Badge variant="secondary">Trial active</Badge>}
            </div>
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
                      onClick={() => handleCheckout(plan.plan, false)}
                      data-testid={`button-subscribe-${plan.plan}`}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      {plan.cta}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => handleCheckout(plan.plan, true)}
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
              <p className="text-sm text-muted-foreground">Yes. Cancel your subscription at any time and you'll keep access until the end of your billing period. Use the link in your Stripe confirmation email to manage or cancel.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">We accept all major credit cards (Visa, Mastercard, American Express) through Stripe. Payments are processed securely by Stripe — we never see your card details.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Do you offer a free trial?</h3>
              <p className="text-sm text-muted-foreground">Yes. Start a 14-day free trial of Pro or Enterprise with full access to all features. A credit card is required, but you won't be charged until the trial ends.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Is my payment information secure?</h3>
              <p className="text-sm text-muted-foreground">Absolutely. All payments are processed by Stripe, a PCI-compliant payment processor. We never see or store your credit card information.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
