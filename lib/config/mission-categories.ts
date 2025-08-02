import { Globe, Smartphone, FileText, Building2, Truck, Scale } from 'lucide-react';

export interface MissionCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  fields: MissionField[];
}

export interface MissionField {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'url';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export const missionCategories: MissionCategory[] = [
  {
    id: 'website',
    name: 'Website',
    description: 'Add new websites to your portfolio or improve existing ones',
    icon: Globe,
    color: 'text-blue-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Website Name',
        placeholder: 'e.g., My New Portfolio Site',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Website Description',
        placeholder: 'Describe the purpose and features of this website...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'website_url',
        type: 'url',
        label: 'Website URL',
        placeholder: 'https://mywebsite.com',
        required: true
      },
      {
        name: 'tech_stack',
        type: 'select',
        label: 'Preferred Tech Stack',
        required: false,
        options: ['React + Next.js', 'Vue.js + Nuxt', 'Angular', 'WordPress', 'Custom HTML/CSS', 'Other']
      },
      {
        name: 'purpose',
        type: 'select',
        label: 'Website Purpose',
        required: true,
        options: ['Portfolio', 'Business', 'E-commerce', 'Blog', 'Landing Page', 'Web App', 'Other']
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range ($)',
        placeholder: '5000',
        required: false,
        validation: { min: 100 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Launch Date',
        required: false
      }
    ]
  },
  {
    id: 'app',
    name: 'App',
    description: 'Develop mobile apps, web apps, or software applications',
    icon: Smartphone,
    color: 'text-green-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Mission Title',
        placeholder: 'e.g., Create customer portal app',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe the app functionality and features...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'platform',
        type: 'select',
        label: 'Platform',
        required: true,
        options: ['iOS', 'Android', 'Web App', 'Desktop', 'Cross-platform']
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range',
        placeholder: '10000',
        required: false,
        validation: { min: 1000 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Completion Date',
        required: false
      }
    ]
  },
  {
    id: 'business_plan',
    name: 'Business Plan',
    description: 'Create business strategies, plans, and market analysis',
    icon: FileText,
    color: 'text-purple-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Mission Title',
        placeholder: 'e.g., Develop startup business plan',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe your business goals and requirements...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'industry',
        type: 'select',
        label: 'Industry',
        required: true,
        options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Other']
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range',
        placeholder: '2000',
        required: false,
        validation: { min: 500 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Completion Date',
        required: false
      }
    ]
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'Real estate projects, property management, and development',
    icon: Building2,
    color: 'text-orange-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Mission Title',
        placeholder: 'e.g., Property investment analysis',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe your real estate project requirements...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'property_type',
        type: 'select',
        label: 'Property Type',
        required: true,
        options: ['Residential', 'Commercial', 'Industrial', 'Land', 'Mixed-use']
      },
      {
        name: 'location',
        type: 'text',
        label: 'Location',
        placeholder: 'City, State',
        required: false
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range',
        placeholder: '50000',
        required: false,
        validation: { min: 1000 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Completion Date',
        required: false
      }
    ]
  },
  {
    id: 'transportation',
    name: 'Transportation Network',
    description: 'Logistics, delivery systems, and transportation solutions',
    icon: Truck,
    color: 'text-red-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Mission Title',
        placeholder: 'e.g., Optimize delivery routes',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe your transportation and logistics needs...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'transport_type',
        type: 'select',
        label: 'Transportation Type',
        required: true,
        options: ['Delivery', 'Passenger', 'Freight', 'Logistics', 'Infrastructure']
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range',
        placeholder: '15000',
        required: false,
        validation: { min: 1000 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Completion Date',
        required: false
      }
    ]
  },
  {
    id: 'legal_filing',
    name: 'Legal Filing System',
    description: 'Legal documentation, compliance, and filing systems',
    icon: Scale,
    color: 'text-indigo-500',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Mission Title',
        placeholder: 'e.g., Set up legal compliance system',
        required: true,
        validation: { min: 3, max: 100 }
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe your legal and compliance requirements...',
        required: true,
        validation: { min: 10, max: 500 }
      },
      {
        name: 'legal_area',
        type: 'select',
        label: 'Legal Area',
        required: true,
        options: ['Corporate', 'Employment', 'Intellectual Property', 'Contracts', 'Compliance', 'Litigation']
      },
      {
        name: 'budget',
        type: 'number',
        label: 'Budget Range',
        placeholder: '5000',
        required: false,
        validation: { min: 500 }
      },
      {
        name: 'due_date',
        type: 'date',
        label: 'Target Completion Date',
        required: false
      }
    ]
  }
];

export function getMissionCategory(id: string): MissionCategory | undefined {
  return missionCategories.find(category => category.id === id);
} 