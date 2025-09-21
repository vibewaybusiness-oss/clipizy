"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Users,
  HelpCircle,
  Sparkles,
  CheckCircle,
  ArrowRight
} from "lucide-react";

const supportTopics = [
  {
    icon: HelpCircle,
    title: "General Support",
    description: "Questions about features, billing, or account issues"
  },
  {
    icon: MessageSquare,
    title: "Technical Support",
    description: "Help with technical issues or bug reports"
  },
  {
    icon: Users,
    title: "Enterprise Sales",
    description: "Custom solutions for teams and organizations"
  },
  {
    icon: Sparkles,
    title: "Feature Requests",
    description: "Suggest new features or improvements"
  }
];

const faqs = [
  {
    question: "How long does it take to generate a music video?",
    answer: "Most videos are generated within 2-5 minutes, depending on the length and complexity of your audio file."
  },
  {
    question: "What audio formats do you support?",
    answer: "We support all major audio formats including MP3, WAV, FLAC, AAC, and M4A files up to 100MB."
  },
  {
    question: "Can I use the generated videos commercially?",
    answer: "Yes! All our plans include commercial usage rights. You can use your generated videos for any commercial purpose."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for all new subscriptions. Contact us if you're not satisfied."
  },
  {
    question: "Is there an API available?",
    answer: "Yes! Our Pro and Enterprise plans include API access for developers who want to integrate our technology."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel your subscription anytime from your account settings, or contact our support team for assistance."
  }
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    topic: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, topic: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: "Message Sent!",
      description: "Thank you for contacting us. We'll get back to you within 24 hours.",
    });

    setFormData({
      name: "",
      email: "",
      company: "",
      subject: "",
      topic: "",
      message: ""
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen pt-16">
      {/* HERO SECTION */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 animated-bg"></div>
        <div className="absolute inset-0 hero-gradient"></div>

        <div className="relative container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium gradient-primary text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Us
            </Badge>

            <h1 className="heading-responsive font-bold mb-6 fade-in-up">
              Get in <span className="gradient-text-ai">Touch</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto fade-in-up">
              Have questions about clipizi? Need help with your account? Want to discuss
              enterprise solutions? We're here to help and would love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT FORM & SUPPORT TOPICS */}
      <section className="section-padding bg-muted/30">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* CONTACT FORM */}
            <div className="fade-in-up">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="topic">Topic *</Label>
                        <Select value={formData.topic} onValueChange={handleSelectChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Support</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                            <SelectItem value="enterprise">Enterprise Sales</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="billing">Billing Question</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="mt-1"
                        placeholder="Tell us how we can help you..."
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full btn-gradient"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* SUPPORT TOPICS */}
            <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-2xl font-bold mb-6">How can we help?</h2>
              <div className="space-y-4">
                {supportTopics.map((topic, index) => {
                  const Icon = topic.icon;
                  return (
                    <Card key={index} className="p-4 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20">
                <h3 className="font-semibold mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-2" />
                  Quick Response
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We typically respond to all inquiries within 24 hours during business days.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/#features">
                    Explore Features
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="heading-responsive font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about clipizi
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-6 fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section-padding bg-gradient-primary text-white">
        <div className="container-custom text-center">
          <h2 className="heading-responsive font-bold mb-4">
            Still Have Questions?
            <span className="block">We're Here to Help</span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Can't find what you're looking for? Our support team is ready to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
              <Link href="mailto:hello@clipizi.ai">
                <Mail className="w-5 h-5 mr-2" />
                Email Support
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link href="/dashboard/create">
                <Sparkles className="w-5 h-5 mr-2" />
                Try clipizi
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
