import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Target,
  Users,
  Zap,
  Lightbulb,
  Heart,
  ArrowRight,
  CheckCircle,
  Play,
  Award,
  Globe,
  Shield,
  Sparkles
} from "lucide-react";

const values = [
  {
    icon: Brain,
    title: "AI-First Innovation",
    description: "We believe in pushing the boundaries of what's possible with artificial intelligence to democratize creative content creation."
  },
  {
    icon: Heart,
    title: "Creator-Centric",
    description: "Every feature we build is designed with creators in mind, making professional-quality content accessible to everyone."
  },
  {
    icon: Zap,
    title: "Speed & Efficiency",
    description: "We understand that time is precious for creators, so we've optimized our platform for maximum speed and efficiency."
  },
  {
    icon: Globe,
    title: "Global Community",
    description: "We're building a worldwide community of creators who inspire and support each other in their creative journeys."
  }
];

const team = [
  {
    name: "Alex Chen",
    role: "CEO & Co-Founder",
    bio: "Former Google AI researcher with 10+ years in machine learning and computer vision.",
    avatar: "AC"
  },
  {
    name: "Sarah Martinez",
    role: "CTO & Co-Founder",
    bio: "Ex-Meta engineer specializing in real-time video processing and neural networks.",
    avatar: "SM"
  },
  {
    name: "David Kim",
    role: "Head of Product",
    bio: "Creative director with experience at major studios and passion for democratizing content creation.",
    avatar: "DK"
  },
  {
    name: "Emma Thompson",
    role: "Head of AI Research",
    bio: "PhD in Computer Science, leading our AI research team in developing cutting-edge video generation models.",
    avatar: "ET"
  }
];

const milestones = [
  {
    year: "2023",
    title: "Company Founded",
    description: "Started with a vision to democratize video content creation using AI"
  },
  {
    year: "2024 Q1",
    title: "First AI Model",
    description: "Launched our first music video generation model with 70% user satisfaction"
  },
  {
    year: "2024 Q2",
    title: "10K Users",
    description: "Reached our first major milestone of 10,000 active creators"
  },
  {
    year: "2024 Q3",
    title: "4K Quality",
    description: "Introduced 4K video generation and advanced style customization"
  },
  {
    year: "2024 Q4",
    title: "Enterprise Launch",
    description: "Launched enterprise solutions for agencies and large content teams"
  }
];

const stats = [
  { number: "50K+", label: "Videos Generated" },
  { number: "2K+", label: "Active Creators" },
  { number: "15+", label: "Countries" },
  { number: "99.9%", label: "Uptime" }
];

export default function About() {
  return (
    <div className="min-h-screen pt-16">
      {/* HERO SECTION */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 animated-bg"></div>
        <div className="absolute inset-0 hero-gradient"></div>

        <div className="relative container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium gradient-primary text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              About clipizy
            </Badge>

            <h1 className="heading-responsive font-bold mb-6 fade-in-up">
              Democratizing Creative
              <span className="gradient-text-ai block">Content Creation</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto fade-in-up">
              We're on a mission to make professional-quality music video creation accessible to everyone.
              Through cutting-edge AI technology, we're empowering creators worldwide to bring their
              musical visions to life without the traditional barriers of time, cost, or technical expertise.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 fade-in-up">
              <Button size="lg" className="btn-gradient text-lg px-8 py-4" asChild>
                <Link href="/dashboard/create">
                  <Play className="w-5 h-5 mr-2" />
                  Try clipizy
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
                <Link href="/contact">
                  <Heart className="w-5 h-5 mr-2" />
                  Join Our Mission
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

      {/* MISSION SECTION */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="fade-in-up">
              <h2 className="heading-responsive font-bold mb-6">
                Our <span className="gradient-text">Mission</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We believe that creativity shouldn't be limited by technical barriers or budget constraints.
                Our mission is to democratize content creation by making professional-quality music video
                production accessible to creators of all levels.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Through advanced AI technology, we're breaking down the traditional barriers that have
                prevented many talented creators from bringing their musical visions to life. Whether
                you're an independent artist, content creator, or marketing professional, clipizy
                empowers you to create stunning visuals that match your audio perfectly.
              </p>
              <div className="flex items-center space-x-4">
                <Button className="btn-gradient" asChild>
                  <Link href="/dashboard/create">
                    Start Creating
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/#features">Learn More</Link>
                </Button>
              </div>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium">Watch Our Story</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="section-padding bg-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Our <span className="gradient-text">Values</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="feature-card fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardHeader>
                    <div className="feature-icon">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Meet Our <span className="gradient-text">Team</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind clipizy's innovation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center p-6 fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-0">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">{member.avatar}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section className="section-padding bg-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Our <span className="gradient-text">Journey</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Key milestones in our mission to democratize content creation
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-start space-x-6 fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        {milestone.year}
                      </Badge>
                      <h3 className="text-xl font-semibold">{milestone.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY SECTION */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="fade-in-up">
              <h2 className="heading-responsive font-bold mb-6">
                Powered by <span className="gradient-text-ai">Advanced AI</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our platform leverages state-of-the-art machine learning models trained on millions
                of music videos to understand the intricate relationship between audio and visual elements.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Privacy-first AI processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Real-time audio analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Industry-leading quality</span>
                </div>
              </div>
              <Button className="btn-gradient" asChild>
                <Link href="/dashboard/create">
                  Experience the Technology
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="w-24 h-24 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium">AI-Powered</p>
                    <p className="text-sm text-muted-foreground">Neural Networks</p>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section-padding bg-gradient-primary text-white">
        <div className="container-custom text-center">
          <h2 className="heading-responsive font-bold mb-4">
            Ready to Join Our
            <span className="block">Creative Revolution?</span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Be part of the future of content creation. Start creating amazing music videos today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
              <Link href="/dashboard/create">
                <Play className="w-5 h-5 mr-2" />
                Start Creating
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link href="/contact">
                <Heart className="w-5 h-5 mr-2" />
                Get in Touch
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
