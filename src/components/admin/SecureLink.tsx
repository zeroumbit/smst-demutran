import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/demutranUploads';
import { ExternalLink, Loader2 } from 'lucide-react';

interface SecureLinkProps {
  url: string | null | undefined;
  label: string;
  className?: string;
}

export function SecureLink({ url, label, className = 'truncate text-xs text-primary underline' }: SecureLinkProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Se já resolvemos a URL anteriormente, deixa seguir o comportamento padrão (abrir a URL assinada)
    if (resolvedUrl) return;

    if (!url) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    setLoading(true);
    try {
      const signed = await getSignedUrl(url);
      setResolvedUrl(signed);
      // Simula o clique após obter a URL assinada para abrir na nova aba
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = signed;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.click();
        setLoading(false);
      }, 50);
    } catch (err) {
      console.error('Erro ao abrir documento seguro:', err);
      setLoading(false);
      // Fallback: tenta abrir a URL original mesmo que dê erro
      window.open(url, '_blank', 'noreferrer');
    }
  };

  if (!url) return <span className="text-xs text-muted-foreground">Nenhum</span>;

  return (
    <a
      href={resolvedUrl || '#'}
      onClick={handleClick}
      target={resolvedUrl ? '_blank' : undefined}
      rel="noreferrer"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span>Carregando...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </>
      )}
    </a>
  );
}
