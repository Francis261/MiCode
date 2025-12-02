export interface Service {
  _id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  actionButton?: {
    label: string;
    url: string;
  };
  statusTag?: string;
  content: string; // Rich text HTML
  contentImages: string[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}
