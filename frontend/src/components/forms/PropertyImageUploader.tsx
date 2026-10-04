import { useState, useRef } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export interface PropertyImage {
  url: string;
  publicId: string;
  visibility: 'Public' | 'Private';
}

interface Props {
  images: PropertyImage[];
  onChange: (images: PropertyImage[]) => void;
}

export function PropertyImageUploader({ images, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [globalVisibility, setGlobalVisibility] = useState<'Public' | 'Private'>(
    images.length > 0 ? images[0].visibility : 'Public'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxImages = 5;

  const handleGlobalVisibilityChange = (visibility: 'Public' | 'Private') => {
    setGlobalVisibility(visibility);
    const newImages = images.map(img => ({ ...img, visibility }));
    onChange(newImages);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      setUploadError(`You can only upload up to ${maxImages} images.`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const newImages: PropertyImage[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload only image files.');
        continue;
      }

      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newImages.push({
          url: res.data.data.url,
          publicId: res.data.data.publicId,
          visibility: globalVisibility
        });
      } catch (err: any) {
        setUploadError(err.response?.data?.message || 'Failed to upload image.');
        break;
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async (publicId: string, index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);

    try {
      // Fire and forget delete
      await api.delete(`/upload/image/${encodeURIComponent(publicId)}`);
    } catch (err) {
      console.error('Failed to delete image from server', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="form-label mb-0">Property Images ({images.length}/{maxImages})</label>
        
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-md transition-all ${globalVisibility === 'Public' ? 'bg-white shadow-sm border border-slate-200/60' : 'hover:bg-slate-200/50'}`}>
            <input 
              type="radio" 
              name="globalVisibility" 
              value="Public" 
              checked={globalVisibility === 'Public'}
              onChange={() => handleGlobalVisibilityChange('Public')}
              className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span className="text-[13px] font-semibold text-slate-700">Public</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-md transition-all ${globalVisibility === 'Private' ? 'bg-white shadow-sm border border-slate-200/60' : 'hover:bg-slate-200/50'}`}>
            <input 
              type="radio" 
              name="globalVisibility" 
              value="Private" 
              checked={globalVisibility === 'Private'}
              onChange={() => handleGlobalVisibilityChange('Private')}
              className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span className="text-[13px] font-semibold text-slate-700">Private</span>
          </label>
        </div>
      </div>

      {uploadError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{uploadError}</div>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          {images.map((img, idx) => (
            <div key={img.publicId} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
              <img src={img.url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemove(img.publicId, idx)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                  title="Remove Image"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading ? 'border-slate-300 bg-slate-50 cursor-not-allowed' : 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 mb-2 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500">Uploading images...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mb-2 text-indigo-400" />
                  <p className="text-sm text-slate-600 font-medium">Click to upload images</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, JPEG up to 10MB</p>
                </>
              )}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
