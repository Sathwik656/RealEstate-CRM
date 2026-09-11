import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PropertyDetailView } from '@/components/views/PropertyDetailView';
import { CreateProperty } from '@/components/forms/CreateProperty';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function PropertyViewPage() {
  const { propertyCode } = useParams<{ propertyCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['property', propertyCode],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyCode}`);
      return res.data;
    },
    enabled: !!propertyCode,
  });

  // Handle edit completion
  const handleEditSuccess = () => {
    setEditingItem(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="page-wrapper flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="page-wrapper flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary mb-2">Property Not Found</h2>
          <p className="text-muted mb-6">The property you are looking for does not exist or you don't have access.</p>
          <button 
            className="btn-accent"
            onClick={() => navigate('/properties')}
          >
            Go to Properties
          </button>
        </div>
      </div>
    );
  }

  const property = data.data;

  if (editingItem) {
    return (
      <CreateProperty
        initialData={property}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditingItem(null)}
      />
    );
  }

  return (
    <PropertyDetailView
      property={property}
      onBack={() => navigate('/properties')}
      onEdit={() => {
        // Only admins can edit from this view
        if (user?.role === 'admin') {
          setEditingItem(property);
        } else {
          alert('Only administrators can edit properties.');
        }
      }}
    />
  );
}
