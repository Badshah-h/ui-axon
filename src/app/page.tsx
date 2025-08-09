"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Zap,
  Brain,
  Workflow,
  Shield,
  Globe,
  Star,
  Check,
  Menu,
  X,
  Play,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  Mail,
  Github,
  Twitter,
  Linkedin
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description: "Drag-and-drop interface inspired by n8n.io with React Flow integration for creating complex AI workflows.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Zap,
    title: "Real-time Event System",
    description: "WebSocket-based AxtonPuls protocol enabling bidirectional streaming and live updates across agents.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Brain,
    title: "Multi-Provider AI Integration",
    description: "Smart routing system supporting OpenAI, Claude, Gemini, Mistral with automatic fallbacks.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "JWT authentication, multi-tenant isolation, RBAC permissions, and comprehensive audit logging.",
    gradient: "from-red-500 to-orange-500"
  },
  {
    icon: Globe,
    title: "Embeddable Components",
    description: "SDK for embedding any agent or workflow as widgets with customizable branding and real-time sync.",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    icon: Star,
    title: "Production Ready",
    description: "Built for scale with Redis, PostgreSQL, real-time monitoring, and enterprise-grade infrastructure.",
    gradient: "from-yellow-500 to-orange-500"
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO at TechFlow",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    content: "AxtonStreamAI transformed how we handle AI workflows. The visual builder is intuitive and the real-time capabilities are game-changing.",
    rating: 5
  },
  {
    name: "Marcus Rodriguez",
    role: "AI Engineer at DataCorp",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    content: "The multi-provider integration saved us months of development. Smart routing and fallbacks work flawlessly in production.",
    rating: 5
  },
  {
    name: "Emily Watson",
    role: "Product Manager at InnovateLab",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
    content: "Finally, a platform that makes AI orchestration accessible to non-technical team members. The UI is beautiful and functional.",
    rating: 5
  }
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small teams and individual developers",
    features: [
      "Up to 5 workflows",
      "10,000 executions/month",
      "Basic AI providers",
      "Community support",
      "Standard templates"
    ],
    popular: false
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "Ideal for growing businesses and teams",
    features: [
      "Unlimited workflows",
      "100,000 executions/month",
      "All AI providers",
      "Priority support",
      "Advanced templates",
      "Custom integrations",
      "Analytics dashboard"
    ],
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with specific needs",
    features: [
      "Unlimited everything",
      "Custom deployment",
      "Dedicated support",
      "SLA guarantees",
      "Custom development",
      "Advanced security",
      "Training & onboarding"
    ],
    popular: false
  }
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail) return;
    try {
      setSubscribeStatus("loading");
      // TODO: Hook to your newsletter/signup endpoint
      await new Promise((r) => setTimeout(r, 900));
      setSubscribeStatus("success");
      setSubscribeEmail("");
    } catch (err) {
      setSubscribeStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrollY > 50 ? 'glass-card border-b' : 'bg-transparent'
        }`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AxtonStreamAI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden glass-card border-t">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="block text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#testimonials" className="block text-muted-foreground hover:text-foreground transition-colors">
                Testimonials
              </Link>
              <Link href="/docs" className="block text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        <div className="container mx-auto text-center relative">
          <Badge variant="secondary" className="mb-6 animate-fade-in">
            🚀 Now in Public Beta
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
            Universal AI
            <span className="gradient-text block">Orchestration</span>
            Platform
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-slide-up animation-delay-200">
            Configure, connect, and deploy AI agents and tools through an intuitive workflow builder.
            Built for production with enterprise-grade security and real-time collaboration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up animation-delay-400">
            <Button size="lg" asChild className="animate-pulse-glow">
              <Link href="/auth/signup">
                Start Building Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* Stats - compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-xl mx-auto animate-fade-in animation-delay-600">
            <div>
              <div className="text-xl font-semibold text-primary">10K+</div>
              <div className="text-xs text-muted-foreground">Workflows Created</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-primary">500+</div>
              <div className="text-xs text-muted-foreground">Companies</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-primary">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Support</div>
            </div>
          </div>

          {/* Highlights band - minimal */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {["SOC2-ready", "1-click deploy", "Provider failover", "SSO/SAML", "SDK & Embeds"].map((item) => (
              <span key={item} className="text-[11px] px-2.5 py-1 rounded-full border bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to orchestrate AI
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From visual workflow building to enterprise security, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card hover:scale-105 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 px-4 relative">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-gradient-to-t from-accent/10 via-transparent to-transparent" />
        <div className="container mx-auto text-center relative">
          <div className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">Trusted by modern teams</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 items-center opacity-80">
            {['TechFlow', 'DataCorp', 'InnovateLab', 'PrimeOps', 'NovaSoft', 'QuantumX'].map((logo) => (
              <div key={logo} className="py-1">
                <div className="text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors grayscale hover:grayscale-0">
                  {logo}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-16 px-4 bg-gradient-to-b from-transparent to-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Use Cases</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Built for real-world AI operations</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">Ship faster with opinionated workflows for common automation patterns</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-card group hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Customer Support Automation</h3>
                <p className="text-sm text-muted-foreground">Triage, summarize, and resolve tickets with routed multi-agent workflows and human-in-the-loop.</p>
              </CardContent>
            </Card>

            <Card className="glass-card group hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Marketing Content Ops</h3>
                <p className="text-sm text-muted-foreground">Generate, review, and localize content across channels with provider-aware cost controls.</p>
              </CardContent>
            </Card>

            <Card className="glass-card group hover:-translate-y-0.5 transition-transform">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-1">R&D Assistants</h3>
                <p className="text-sm text-muted-foreground">Chain tools, code understanding, and data sources to accelerate engineering and analysis tasks.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Loved by developers worldwide
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our users are saying about AxtonStreamAI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-9 h-9 rounded-full mr-3"
                    />
                    <div>
                      <div className="text-sm font-semibold">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Subscribe */}
      <section id="subscribe" className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.07] bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT),transparent_60%)]" />
        <div className="container mx-auto relative">
          <div className="max-w-2xl mx-auto text-center glass-card p-6 md:p-8">
            <Badge variant="secondary" className="mb-3">Stay in the loop</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Join our newsletter</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-5">Product updates, best practices, and stories from teams building with AxtonStreamAI.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center">
              <div className="relative flex-1 min-w-[260px]">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-9 h-10"
                />
              </div>
              <Button size="sm" className="h-10 px-4" type="submit" disabled={subscribeStatus === 'loading'}>
                {subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
            {subscribeStatus === 'success' && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-3">Thanks! Please check your inbox to confirm.</div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for your team
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`glass-card relative ${plan.popular ? 'ring-2 ring-primary scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your AI workflows?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of developers and companies already using AxtonStreamAI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
              <Link href="/contact">
                Contact Sales
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">AxtonStreamAI</span>
              </Link>
              <p className="text-muted-foreground mb-4">
                Universal AI orchestration platform for the modern enterprise.
              </p>
              <div className="flex space-x-4">
                <Button size="icon" variant="ghost" asChild>
                  <Link href="https://github.com">
                    <Github className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <Link href="https://twitter.com">
                    <Twitter className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="icon" variant="ghost" asChild>
                  <Link href="https://linkedin.com">
                    <Linkedin className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/tutorials" className="hover:text-foreground transition-colors">Tutorials</Link></li>
                <li><Link href="/community" className="hover:text-foreground transition-colors">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 AxtonStreamAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}