import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface Photo {
  id: string;
  url: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean | null;
}

interface PhotoGalleryProps {
  categoria: string;
}

const PhotoGallery = ({ categoria }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('galeria_fotos')
          .select('*')
          .eq('categoria', categoria)
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching photos:', fetchError.message);
          // Em caso de erro, silenciar para o usuário
          setError(null);
        } else {
          setPhotos(data || []);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error fetching photos:', err);
        // Em caso de erro crítico, silenciar para evitar tela vermelha
        setPhotos([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [categoria]);

  if (loading || error || photos.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Galeria de Fotos</h2>
          <p className="text-muted-foreground mt-2">Confira as fotos relacionadas a este departamento</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.titulo}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.jpg'; // Placeholder image if the actual image fails to load
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground line-clamp-1">{photo.titulo}</h3>
                  {photo.descricao && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{photo.descricao}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PhotoGallery;