import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectType {
  _id: string;
  name: string;
}

export default function CustomOrderPage() {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    projectType: '', // Stores selected project type _id or "other"
    customProjectType: '', // Stores user's custom project type text
    description: '',
    budget: '',
    timeline: '',
    attachments: [] as File[], // Assuming file handling might be added later
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch active project types for the client form
  const { data: projectTypes = [], isLoading: isLoadingProjectTypes } = useQuery<ProjectType[]>({
    queryKey: ['clientProjectTypes'],
    queryFn: async () => {
      const response = await axios.get('/api/custom-orders/project-types');
      return response.data;
    },
  });

  const createCustomOrder = useMutation({
    mutationFn: async (newOrder: any) => {
      const response = await axios.post('/api/custom-orders', newOrder);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Custom order submitted successfully!');
      setFormData({
        clientName: '',
        clientEmail: '',
        projectType: '',
        customProjectType: '',
        description: '',
        budget: '',
        timeline: '',
        attachments: [],
      });
      setErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to submit custom order.';
      toast.error(errorMessage);
    },
  });

  const isOtherSelected = formData.projectType === 'other';

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Your name is required.';
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'Your email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address.';
    }
    if (!formData.projectType) newErrors.projectType = 'Please select a project type.';
    if (isOtherSelected && !formData.customProjectType.trim()) {
      newErrors.customProjectType = 'Please specify your custom project type.';
    }
    if (!formData.description.trim()) newErrors.description = 'Project description is required.';
    if (!formData.budget.trim()) newErrors.budget = 'Your budget is required.';
    if (!formData.timeline.trim()) newErrors.timeline = 'Your desired timeline is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'projectType' && value !== 'other') {
      setFormData(prev => ({ ...prev, customProjectType: '' })); // Clear custom input if not 'other'
    }
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const dataToSubmit = {
      ...formData,
      // The backend will handle 'other' vs actual projectType _id
    };

    createCustomOrder.mutate(dataToSubmit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-800">Request a Custom Order</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Tell us about your project, and we'll get back to you with a quote.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Your Name <span className="text-red-500">*</span></Label>
                <Input
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={errors.clientName ? 'border-red-500' : ''}
                />
                {errors.clientName && <p className="text-red-500 text-sm mt-1">{errors.clientName}</p>}
              </div>
              <div>
                <Label htmlFor="clientEmail">Your Email <span className="text-red-500">*</span></Label>
                <Input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className={errors.clientEmail ? 'border-red-500' : ''}
                />
                {errors.clientEmail && <p className="text-red-500 text-sm mt-1">{errors.clientEmail}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="projectType">Project Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.projectType}
                onValueChange={(value) => handleSelectChange('projectType', value)}
              >
                <SelectTrigger className={errors.projectType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a project type" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingProjectTypes ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" /> Loading...
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="" disabled>Select a project type</SelectItem>
                      {projectTypes.map((type) => (
                        <SelectItem key={type._id} value={type._id}>
                          {type.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other (Custom)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.projectType && <p className="text-red-500 text-sm mt-1">{errors.projectType}</p>}
            </div>

            {isOtherSelected && (
              <div>
                <Label htmlFor="customProjectType">Custom Project Type <span className="text-red-500">*</span></Label>
                <Input
                  id="customProjectType"
                  name="customProjectType"
                  value={formData.customProjectType}
                  onChange={handleChange}
                  placeholder="e.g., Mobile App Development"
                  className={errors.customProjectType ? 'border-red-500' : ''}
                />
                {errors.customProjectType && <p className="text-red-500 text-sm mt-1">{errors.customProjectType}</p>}
              </div>
            )}

            <div>
              <Label htmlFor="description">Project Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your project in detail..."
                rows={5}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Your Budget <span className="text-red-500">*</span></Label>
                <Input
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="e.g., $500 - $1000"
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
              </div>
              <div>
                <Label htmlFor="timeline">Desired Timeline <span className="text-red-500">*</span></Label>
                <Input
                  id="timeline"
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleChange}
                  placeholder="e.g., 2-4 weeks"
                  className={errors.timeline ? 'border-red-500' : ''}
                />
                {errors.timeline && <p className="text-red-500 text-sm mt-1">{errors.timeline}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createCustomOrder.isPending}>
              {createCustomOrder.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}