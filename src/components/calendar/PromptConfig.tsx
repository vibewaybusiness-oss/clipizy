"use client";

import { useState } from 'react';
import type { GeminiPrompt } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Bot,
  Settings
} from 'lucide-react';

interface PromptConfigProps {
  prompts: GeminiPrompt[];
  onSavePrompt: (prompt: GeminiPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onUpdateSettings: (settings: { prefix: string; suffix: string }) => void;
  settings: { prefix: string; suffix: string };
}

export function PromptConfig({
  prompts,
  onSavePrompt,
  onDeletePrompt,
  onUpdateSettings,
  settings
}: PromptConfigProps) {
  const [editingPrompt, setEditingPrompt] = useState<GeminiPrompt | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSavePrompt = (prompt: GeminiPrompt) => {
    onSavePrompt(prompt);
    setEditingPrompt(null);
    setShowAddForm(false);
  };

  const handleDeletePrompt = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      onDeletePrompt(id);
    }
  };

  const defaultPrompts: GeminiPrompt[] = [
    {
      id: 'blog-post',
      name: 'Blog Post Generator',
      description: 'Generate a comprehensive blog post based on the title and keywords',
      prefix: 'Generate a blog post for the following scene: ',
      suffix: '. Make it engaging, informative, and SEO-optimized. Include headings, subheadings, and actionable tips.',
      variables: ['title', 'keywords', 'target_audience'],
      example: 'Generate a blog post for the following scene: How to Make a Music Video in 5 Minutes with AI. Make it engaging, informative, and SEO-optimized.',
      category: 'Blog Content'
    },
    {
      id: 'tutorial',
      name: 'Tutorial Generator',
      description: 'Generate step-by-step tutorial content',
      prefix: 'Create a detailed tutorial for: ',
      suffix: '. Include step-by-step instructions, tips, and common mistakes to avoid.',
      variables: ['title', 'skill_level'],
      example: 'Create a detailed tutorial for: How to Start a Faceless YouTube Channel. Include step-by-step instructions.',
      category: 'Tutorials'
    },
    {
      id: 'comparison',
      name: 'Comparison Generator',
      description: 'Generate comparison and review content',
      prefix: 'Write a comprehensive comparison article about: ',
      suffix: '. Include pros and cons, features, pricing, and recommendations.',
      variables: ['products', 'criteria'],
      example: 'Write a comprehensive comparison article about: Top 5 AI Music Video Generators. Include pros and cons.',
      category: 'Reviews'
    },
    {
      id: 'case-study',
      name: 'Case Study Generator',
      description: 'Generate case study content with real examples',
      prefix: 'Create a detailed case study about: ',
      suffix: '. Include background, challenges, solutions, results, and key takeaways.',
      variables: ['subject', 'results', 'industry'],
      example: 'Create a detailed case study about: How an Indie Artist Got 100k Views Using AI-Generated Videos.',
      category: 'Case Studies'
    }
  ];

  const allPrompts = [...defaultPrompts, ...prompts];

  return (
    <div className="space-y-6">
      {/* GLOBAL SETTINGS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Prompt Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="globalPrefix">Default Prompt Prefix</Label>
            <Input
              id="globalPrefix"
              value={settings.prefix}
              onChange={(e) => onUpdateSettings({ ...settings, prefix: e.target.value })}
              placeholder="Generate a blog post for the following scene: "
            />
          </div>
          <div>
            <Label htmlFor="globalSuffix">Default Prompt Suffix</Label>
            <Textarea
              id="globalSuffix"
              value={settings.suffix}
              onChange={(e) => onUpdateSettings({ ...settings, suffix: e.target.value })}
              placeholder="Make it engaging, informative, and SEO-optimized..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* PROMPT TEMPLATES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Prompt Templates
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allPrompts.map((prompt) => (
              <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{prompt.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPrompt(prompt)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {!defaultPrompts.find(p => p.id === prompt.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePrompt(prompt.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{prompt.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{prompt.description}</p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs font-medium">Prefix:</Label>
                      <p className="text-xs text-muted-foreground">{prompt.prefix}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Suffix:</Label>
                      <p className="text-xs text-muted-foreground">{prompt.suffix}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Variables:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prompt.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ADD/EDIT FORM */}
      {(showAddForm || editingPrompt) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPrompt ? 'Edit Prompt Template' : 'Add New Prompt Template'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PromptForm
              prompt={editingPrompt}
              onSave={handleSavePrompt}
              onCancel={() => {
                setEditingPrompt(null);
                setShowAddForm(false);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PromptFormProps {
  prompt?: GeminiPrompt | null;
  onSave: (prompt: GeminiPrompt) => void;
  onCancel: () => void;
}

function PromptForm({ prompt, onSave, onCancel }: PromptFormProps) {
  const [formData, setFormData] = useState({
    name: prompt?.name || '',
    description: prompt?.description || '',
    prefix: prompt?.prefix || '',
    suffix: prompt?.suffix || '',
    variables: prompt?.variables || [],
    example: prompt?.example || '',
    category: prompt?.category || 'General'
  });

  const [newVariable, setNewVariable] = useState('');

  const handleAddVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: prompt?.id || `prompt-${Date.now()}`,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          required
        />
      </div>

      <div>
        <Label htmlFor="prefix">Prefix</Label>
        <Input
          id="prefix"
          value={formData.prefix}
          onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="suffix">Suffix</Label>
        <Textarea
          id="suffix"
          value={formData.suffix}
          onChange={(e) => setFormData(prev => ({ ...prev, suffix: e.target.value }))}
          rows={2}
          required
        />
      </div>

      <div>
        <Label>Variables</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            placeholder="Add variable (e.g., title, keywords)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
          />
          <Button type="button" onClick={handleAddVariable}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.variables.map((variable) => (
            <Badge key={variable} variant="secondary" className="flex items-center gap-1">
              {variable}
              <button
                type="button"
                onClick={() => handleRemoveVariable(variable)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="example">Example</Label>
        <Textarea
          id="example"
          value={formData.example}
          onChange={(e) => setFormData(prev => ({ ...prev, example: e.target.value }))}
          rows={2}
          placeholder="Example of how this prompt would be used"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
