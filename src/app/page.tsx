"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoTheater } from "@/components/common/video-theater";
import { StructuredData } from "@/components/seo/structured-data";
import {
  Sparkles,
  Zap,
  Users,
  Clock,
  Palette,
  Music,
  Video,
  Wand2,
  Check,
  Star,
  ArrowRight,
  Play,
  Download,
  Share2,
  Heart,
  Eye,
  Maximize2,
  ExternalLink,
  FileText
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI-Powered Long-Form Content Generation",
    description: "Advanced AI algorithms create stunning music videos, social media content, and long-form media from your audio in minutes, not hours. Perfect for TikTok, Instagram, YouTube, and other platforms."
  },
  {
    icon: Palette,
    title: "Multiple Visual Styles & Themes",
    description: "Choose from various visual styles including abstract, cinematic, animated, and more. Optimized for different social media platforms and content types."
  },
  {
    icon: Music,
    title: "Smart Audio Analysis & Sync",
    description: "Intelligent audio analysis automatically syncs visuals with your music's rhythm, mood, and beats. Creates engaging content that resonates with your audience."
  },
  {
    icon: Video,
    title: "4K High Quality Output",
    description: "Export your videos in 4K resolution with professional-grade quality and smooth playback. Perfect for all social media platforms and professional use."
  },
  {
    icon: Clock,
    title: "Lightning Fast Processing",
    description: "Generate complete music videos and social media content in under 5 minutes with our optimized AI processing. Scale your content creation effortlessly."
  },
  {
    icon: Users,
    title: "Team Collaboration & Automation",
    description: "Share projects with team members, collaborate on creative decisions in real-time, and automate your social media posting schedule."
  }
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "Perfect for individual content creators and musicians",
    features: [
      "5 video generations per month",
      "HD quality (1080p) output",
      "Basic visual styles and themes",
      "Social media automation (3 platforms)",
      "Email support",
      "Commercial license included",
      "Basic analytics dashboard"
    ],
    popular: false,
    cta: "Start Free Trial"
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For professional content creators and agencies",
    features: [
      "50 video generations per month",
      "4K quality output",
      "All visual styles and themes",
      "Full social media automation (all platforms)",
      "Priority support",
      "Commercial license included",
      "Custom branding options",
      "API access for integrations",
      "Advanced analytics and insights"
    ],
    popular: true,
    cta: "Start Free Trial"
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    description: "For small teams and content studios",
    features: [
      "200 video generations per month",
      "4K quality output",
      "All visual styles and themes",
      "Complete social media automation suite",
      "Priority support",
      "Team collaboration tools",
      "Custom branding and white-label options",
      "Full API access",
      "Team management dashboard",
      "Advanced analytics and reporting",
      "Content calendar management"
    ],
    popular: false,
    cta: "Start Free Trial"
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations and media companies",
    features: [
      "Unlimited video generations",
      "4K+ quality output",
      "All visual styles and themes",
      "Enterprise social media automation",
      "Dedicated support and account manager",
      "White-label solution",
      "Custom integrations and workflows",
      "Advanced team management",
      "Custom analytics and reporting",
      "SLA guarantee",
      "On-premise deployment options"
    ],
    popular: false,
    cta: "Contact Sales"
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Music Producer & Content Creator",
    content: "VibeWave has revolutionized how I create music videos and social media content. What used to take days now takes minutes! The automated posting feature saves me hours every week.",
    avatar: "SC"
  },
  {
    name: "Marcus Rodriguez",
    role: "Social Media Manager",
    content: "The AI understands my content strategy better than I do. The visual sync is absolutely perfect every time, and the social media automation has increased our engagement by 300%.",
    avatar: "MR"
  },
  {
    name: "Emily Watson",
    role: "Marketing Director",
    content: "We've cut our video production costs by 80% while improving quality and scaling our content output. VibeWave's long-form content creation is a complete game-changer for our brand.",
    avatar: "EW"
  }
];

const stats = [
  { number: "50K+", label: "Videos & Content Created" },
  { number: "2K+", label: "Active Content Creators" },
  { number: "99.9%", label: "Platform Uptime" },
  { number: "4.9/5", label: "User Satisfaction Rating" }
];

export default function Home() {
  const [theaterVideo, setTheaterVideo] = useState<{
    src: string;
    title: string;
    description: string;
  } | null>(null);

  const openTheater = (src: string, title: string, description: string) => {
    setTheaterVideo({ src, title, description });
  };

  const closeTheater = () => {
    setTheaterVideo(null);
  };

  return (
    <div className="min-h-screen">
      {/* STRUCTURED DATA */}
      <StructuredData type="website" data={{}} />
      <StructuredData type="organization" data={{}} />
      <StructuredData type="software" data={{}} />
      <StructuredData type="product" data={{}} />
      <StructuredData type="service" data={{}} />
      
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 animated-bg"></div>
        <div className="absolute inset-0 hero-gradient"></div>
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          autoPlay
          loop
          muted
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 9;
          }}
          onError={(e) => {
            // Hide video if it fails to load
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/media/hero_section.mp4" type="video/mp4" />
        </video>

        <div className="relative container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="heading-responsive font-bold mb-8 fade-in-up">
              Transform Your Audio Into
              <span className="gradient-text-ai block">Stunning Long-Form Media Content</span>
          </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto fade-in-up">
              Upload your audio, describe your vision, and let our advanced AI create
              professional music videos, social media content, and automated posts in minutes. 
              Perfect for TikTok, Instagram, YouTube, and all major platforms. No editing skills required.
            </p>

            <div className="mb-16 fade-in-up">
              <Badge className="px-6 py-3 text-base font-medium gradient-primary text-white">
                <Sparkles className="w-5 h-5 mr-3" />
                AI-Powered Long-Form Media & Social Media Automation
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 fade-in-up">
              <Button size="lg" className="btn-gradient text-lg px-8 py-4" asChild>
                <Link href="/dashboard/create">
                  <Play className="w-5 h-5 mr-2" />
                  Create Your Video
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
                <Link href="/#features">
                  <Eye className="w-5 h-5 mr-2" />
                  Watch Demo
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
                <Link href="/blog">
                  <FileText className="w-5 h-5 mr-2" />
                  Read Blog
                </Link>
              </Button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto fade-in-up">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MEDIA SHOWCASE SECTION */}
      <section className="py-16 bg-muted/20">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See What Our AI Can <span className="gradient-text-ai">Create</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real music videos and social media content generated by our AI from user audio files. 
              Perfect for TikTok, Instagram, YouTube, and all major platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <video
                  className="w-full h-full object-cover rounded-xl"
                  poster="/api/placeholder/800/450"
                  controls
                  preload="metadata"
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 5;
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.play();
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 5;
                  }}
                  onVolumeChange={(e) => {
                    if (e.currentTarget.volume > 0) {
                      e.currentTarget.muted = false;
                    }
                  }}
                  onError={(e) => {
                    console.error('Video load error:', e);
                    // Hide video on error and show placeholder
                    const video = e.target as HTMLVideoElement;
                    video.style.display = 'none';
                    const placeholder = video.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                >
                  <source src="/media/thumbnail_1.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold" style={{display: 'none'}}>
                  Demo Video
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openTheater("/media/thumbnail_1.mp4", "Electronic Dance Track", "AI-generated visuals synced to electronic music")}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Screen
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">AI-generated visuals synced to electronic music</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <video
                  className="w-full h-full object-cover rounded-xl"
                  poster="/api/placeholder/800/450"
                  controls
                  preload="metadata"
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 5;
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.play();
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 5;
                  }}
                  onVolumeChange={(e) => {
                    if (e.currentTarget.volume > 0) {
                      e.currentTarget.muted = false;
                    }
                  }}
                  onError={(e) => {
                    console.error('Video load error:', e);
                    // Hide video on error and show placeholder
                    const video = e.target as HTMLVideoElement;
                    video.style.display = 'none';
                    const placeholder = video.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                >
                  <source src="/media/thumbnail_2.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold" style={{display: 'none'}}>
                  Demo Video
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openTheater("/media/thumbnail_2.mp4", "Ambient Soundscape", "Abstract visuals matching ambient audio")}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Screen
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Abstract visuals matching ambient audio</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <video
                  className="w-full h-full object-cover rounded-xl"
                  poster="/api/placeholder/800/450"
                  controls
                  preload="metadata"
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.currentTime = 5;
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.play();
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 5;
                  }}
                  onVolumeChange={(e) => {
                    if (e.currentTarget.volume > 0) {
                      e.currentTarget.muted = false;
                    }
                  }}
                  onError={(e) => {
                    console.error('Video load error:', e);
                    // Hide video on error and show placeholder
                    const video = e.target as HTMLVideoElement;
                    video.style.display = 'none';
                    const placeholder = video.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                >
                  <source src="/media/thumbnail_3.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold" style={{display: 'none'}}>
                  Demo Video
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openTheater("/media/thumbnail_3.mp4", "Rock Anthem", "High-energy visuals for rock music")}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Screen
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">High-energy visuals for rock music</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/dashboard/create">
                <Play className="w-4 h-4 mr-2" />
                Create Your Own Video
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="section-padding bg-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Powerful Features for
              <span className="gradient-text"> Content Creators & Social Media Professionals</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create professional music videos, long-form content, and automated social media posts with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="feature-card group fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardHeader>
                    <div className="feature-icon">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create professional music videos, social media content, and automated posts in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center fade-in-up">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Audio & Set Goals</h3>
              <p className="text-muted-foreground">
                Upload your audio file, describe your vision, and select target platforms (TikTok, Instagram, YouTube, etc.)
              </p>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Customize Style & Automation</h3>
              <p className="text-muted-foreground">
                Choose your visual style, mood, posting schedule, and automation settings for social media
              </p>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: "0.4s" }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Generate & Automate</h3>
              <p className="text-muted-foreground">
                AI creates your content and automatically posts to your social media platforms
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="section-padding bg-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Loved by <span className="gradient-text">Content Creators & Social Media Professionals Worldwide</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what our users are saying about VibeWave's AI-powered content creation platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                      <span className="text-primary font-semibold">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="section-padding bg-muted/20">
        <div className="container-custom">
          <div className="text-center mb-20">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium gradient-primary text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Pricing Plans
            </Badge>
            <h2 className="heading-responsive font-bold mb-6">
              Simple, Transparent <span className="gradient-text">Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Choose the plan that fits your creative needs. All plans include our core AI video generation features.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-primary mr-2" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-primary mr-2" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-primary mr-2" />
                <span>14-day free trial</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? "pricing-card-featured border-primary/50 shadow-lg scale-105" : "pricing-card hover:shadow-lg"} transition-all duration-300`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-muted-foreground text-lg ml-1">{plan.period}</span>
                  </div>
                  <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "btn-gradient" : "hover:bg-primary hover:text-primary-foreground"} transition-all duration-200`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    asChild
                  >
                    <Link href="/dashboard/create">
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMPREHENSIVE FAQ SECTION */}
      <section className="py-16 bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about VibeWave's AI-powered content creation platform</p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">What types of content can VibeWave create?</h3>
                <p className="text-sm text-muted-foreground">VibeWave creates music videos, TikTok content, Instagram posts, YouTube videos, and other long-form media content. Our AI can generate content for all major social media platforms with platform-specific optimizations.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How does the social media automation work?</h3>
                <p className="text-sm text-muted-foreground">Our platform automatically posts your generated content to your connected social media accounts according to your schedule. You can set posting times, frequency, and platform-specific content variations.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Can I use the generated content commercially?</h3>
                <p className="text-sm text-muted-foreground">Yes! All plans include commercial usage rights. You can use your generated videos and content for any commercial purpose, including marketing, advertising, and client work.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What audio formats are supported?</h3>
                <p className="text-sm text-muted-foreground">We support all major audio formats including MP3, WAV, FLAC, AAC, and M4A. Our AI analyzes the audio to create perfectly synced visual content.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is there a free trial available?</h3>
                <p className="text-sm text-muted-foreground">Yes! All plans come with a 14-day free trial. No credit card required to start. You can create up to 3 videos during the trial period.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-sm text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and you'll be charged or credited accordingly.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How long does it take to generate content?</h3>
                <p className="text-sm text-muted-foreground">Most content is generated in under 5 minutes. Complex long-form content may take up to 15 minutes. You'll receive email notifications when your content is ready.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What social media platforms are supported?</h3>
                <p className="text-sm text-muted-foreground">We support TikTok, Instagram, YouTube, Facebook, Twitter, LinkedIn, and more. Each platform gets optimized content formats and aspect ratios.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer team collaboration features?</h3>
                <p className="text-sm text-muted-foreground">Yes! Team plans include collaboration tools, shared workspaces, approval workflows, and team management features for content studios and agencies.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-sm text-muted-foreground">We accept all major credit cards, PayPal, and bank transfers for Enterprise plans. All payments are processed securely through Stripe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section-padding bg-gradient-primary text-white">
        <div className="container-custom text-center">
          <h2 className="heading-responsive font-bold mb-4">
            Ready to Create Your First
            <span className="block">AI-Powered Long-Form Media Content?</span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of content creators and social media professionals who are already using VibeWave to scale their content production and automate their social media presence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
              <Link href="/dashboard/create">
                <Play className="w-5 h-5 mr-2" />
                Start Creating Now
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link href="/contact">
                <Download className="w-5 h-5 mr-2" />
                Download App
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* VIDEO THEATER MODAL */}
      {theaterVideo && (
        <VideoTheater
          isOpen={!!theaterVideo}
          onClose={closeTheater}
          videoSrc={theaterVideo.src}
          title={theaterVideo.title}
          description={theaterVideo.description}
        />
      )}
    </div>
  );
}
