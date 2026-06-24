import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { IMAGE_UPLOAD_RULES, validateFileUpload } from '@/lib/upload';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange?: (file: File | null) => void;
  onPreviewChange?: (preview: string | null) => void;
  required?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label = 'Imagem',
  value,
  onChange,
  onPreviewChange,
  required = false,
  className = ''
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(value || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      onChange?.(null);
      setImagePreview(null);
      onPreviewChange?.(null);
      return;
    }

    try {
      validateFileUpload(file, IMAGE_UPLOAD_RULES);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Nao foi possivel validar a imagem.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onChange?.(file);
      setImagePreview(base64String);
      onPreviewChange?.(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onChange?.(null);
    setImagePreview(null);
    onPreviewChange?.(null);
    // Limpar o valor do input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="image-upload">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="space-y-3">
        <Input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: PNG, JPEG, WEBP (max. 5MB)
        </p>
        {imagePreview && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="z-10"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Trocar Imagem
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="z-10"
                  onClick={handleRemoveImage}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
