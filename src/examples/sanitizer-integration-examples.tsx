/**
 * SANITIZER INTEGRATION EXAMPLES
 * Examples of how to integrate sanitizer into React components
 */
import React, { useState } from 'react';
import { useFormSanitizer, useSanitizedInput, sanitizeInput } from '@/hooks/use-sanitizer';
import { SanitizedInput, SanitizedTextarea } from '@/components/ui/sanitized-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Example 1: Basic form with sanitization
export function BasicSanitizedForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const {
    values,
    setValue,
    validateAll,
    getFieldErrors,
    getFieldWarnings,
    isFieldValid,
    hasErrors,
    isValid,
  } = useFormSanitizer(formData, {
    name: 'string',
    email: 'string',
    message: 'string',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAll();
    
    if (isValid) {
      console.log('Form submitted with sanitized data:', values);
      alert('Form submitted successfully!');
    } else {
      console.log('Form has validation errors');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Basic Sanitized Form</CardTitle>
        <CardDescription>
          Form with automatic input sanitization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <SanitizedInput
              id="name"
              name="name"
              value={values.name}
              onChange={(value, sanitized, isValid) => {
                setValue('name', value);
              }}
              placeholder="Enter your name"
              showValidation
            />
            {!isFieldValid('name') && (
              <div className="mt-1 text-sm text-red-600">
                {getFieldErrors('name').map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <SanitizedInput
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={(value, sanitized, isValid) => {
                setValue('email', value);
              }}
              placeholder="Enter your email"
              showValidation
            />
            {!isFieldValid('email') && (
              <div className="mt-1 text-sm text-red-600">
                {getFieldErrors('email').map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">
              Message
            </label>
            <SanitizedTextarea
              id="message"
              name="message"
              value={values.message}
              onChange={(value, sanitized, isValid) => {
                setValue('message', value);
              }}
              placeholder="Enter your message"
              showValidation
              rows={4}
            />
            {!isFieldValid('message') && (
              <div className="mt-1 text-sm text-red-600">
                {getFieldErrors('message').map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={hasErrors}>
            Submit
          </Button>

          {hasErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                Please fix the errors above before submitting.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Example 2: Advanced form with different input types
export function AdvancedSanitizedForm() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    isPublic: false,
    priority: 1,
  });

  const {
    values,
    setValue,
    validateAll,
    getFieldErrors,
    getFieldWarnings,
    isFieldValid,
    hasErrors,
    hasWarnings,
    isValid,
  } = useFormSanitizer(formData, {
    title: 'string',
    content: 'string',
    tags: 'array',
    isPublic: 'boolean',
    priority: 'number',
  });

  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim()) {
      const result = sanitizeInput(newTag, 'string');
      if (result.isValid) {
        setValue('tags', [...values.tags, result.sanitized]);
        setNewTag('');
      }
    }
  };

  const removeTag = (index: number) => {
    const newTags = values.tags.filter((_, i) => i !== index);
    setValue('tags', newTags);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAll();
    
    if (isValid) {
      console.log('Advanced form submitted:', values);
      alert('Form submitted successfully!');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Advanced Sanitized Form</CardTitle>
        <CardDescription>
          Form with multiple input types and validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <SanitizedInput
              id="title"
              name="title"
              value={values.title}
              onChange={(value, sanitized, isValid) => {
                setValue('title', value);
              }}
              placeholder="Enter title"
              showValidation
            />
            {!isFieldValid('title') && (
              <div className="mt-1 text-sm text-red-600">
                {getFieldErrors('title').map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-1">
              Content
            </label>
            <SanitizedTextarea
              id="content"
              name="content"
              value={values.content}
              onChange={(value, sanitized, isValid) => {
                setValue('content', value);
              }}
              placeholder="Enter content"
              showValidation
              rows={6}
            />
            {!isFieldValid('content') && (
              <div className="mt-1 text-sm text-red-600">
                {getFieldErrors('content').map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <SanitizedInput
                name="newTag"
                value={newTag}
                onChange={(value, sanitized, isValid) => {
                  setNewTag(value);
                }}
                placeholder="Add a tag"
                showValidation={false}
              />
              <Button type="button" onClick={addTag}>
                Add Tag
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {values.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(index)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={values.isPublic}
                onChange={(e) => setValue('isPublic', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Public
              </label>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-1">
                Priority
              </label>
              <SanitizedInput
                id="priority"
                name="priority"
                type="number"
                value={values.priority}
                onChange={(value, sanitized, isValid) => {
                  setValue('priority', parseInt(value) || 1);
                }}
                min="1"
                max="10"
                showValidation
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={hasErrors}>
              Submit
            </Button>
            <Button type="button" variant="outline" onClick={validateAll}>
              Validate All
            </Button>
          </div>

          {hasWarnings && (
            <Alert>
              <AlertDescription>
                <strong>Warnings:</strong> {getFieldWarnings('title').length + getFieldWarnings('content').length} field(s) have warnings.
              </AlertDescription>
            </Alert>
          )}

          {hasErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                Please fix the errors above before submitting.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Example 3: Real-time sanitization display
export function RealTimeSanitizationDemo() {
  const [input, setInput] = useState('');
  const [sanitizedInput, setSanitizedInput] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleInputChange = (value: string) => {
    setInput(value);
    
    const result = sanitizeInput(value, 'string');
    setSanitizedInput(result.sanitized);
    setIsValid(result.isValid);
    setWarnings(result.warnings);
    setErrors(result.errors);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Real-time Sanitization Demo</CardTitle>
        <CardDescription>
          See how input is sanitized in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="demo-input" className="block text-sm font-medium mb-1">
            Try entering malicious input:
          </label>
          <input
            id="demo-input"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Try: <script>alert('xss')</script> or '; DROP TABLE users; --"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Original Input:</h4>
            <div className="p-3 bg-gray-100 rounded-md font-mono text-sm break-all">
              {input || '(empty)'}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Sanitized Output:</h4>
            <div className="p-3 bg-green-50 rounded-md font-mono text-sm break-all">
              {sanitizedInput || '(empty)'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isValid ? 'Valid Input' : 'Invalid Input'}
            </span>
          </div>

          {warnings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-yellow-600 mb-1">Warnings:</h5>
              <ul className="text-sm text-yellow-600 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {errors.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-600 mb-1">Errors:</h5>
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Example 4: API integration with sanitization
export function ApiIntegrationExample() {
  const [apiData, setApiData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { values, setValue, validateAll, isValid, hasErrors } = useFormSanitizer(apiData, {
    name: 'string',
    email: 'string',
    message: 'string',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validateAll();
    
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call with sanitized data
      const response = await fetch('/api/examples/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to submit form' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>API Integration Example</CardTitle>
        <CardDescription>
          Form with API integration and sanitization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SanitizedInput
            name="name"
            value={values.name}
            onChange={(value, sanitized, isValid) => {
              setValue('name', value);
            }}
            placeholder="Name"
            showValidation
          />

          <SanitizedInput
            name="email"
            type="email"
            value={values.email}
            onChange={(value, sanitized, isValid) => {
              setValue('email', value);
            }}
            placeholder="Email"
            showValidation
          />

          <SanitizedTextarea
            name="message"
            value={values.message}
            onChange={(value, sanitized, isValid) => {
              setValue('message', value);
            }}
            placeholder="Message"
            showValidation
            rows={4}
          />

          <Button type="submit" disabled={hasErrors || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>

          {result && (
            <Alert>
              <AlertDescription>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
