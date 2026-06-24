import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface NewsCardProps {
  title: string;
  description: string;
  date: string;
  imageUrl?: string;
  link?: string;
  newsId?: string;  // Add newsId prop to support internal routing
}

const NewsCard = ({ title, description, date, imageUrl, link, newsId }: NewsCardProps) => {
  // If newsId is provided, create internal link to news detail page
  const internalLink = newsId ? `/noticias/${newsId}` : undefined;
  
  const CardWrapper = link || internalLink ? "a" : "div";
  const cardProps = link || internalLink
    ? {
        href: link || internalLink,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "block group cursor-pointer h-full",
      }
    : { className: "block h-full" };

  return (
    <CardWrapper {...cardProps}>
      <Card className="h-full flex flex-col overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg group-hover:scale-[1.02]">
        {/* Image placeholder - can be replaced with actual images */}
        {imageUrl ? (
          <div className="relative h-48 bg-muted overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-card flex items-center justify-center flex-shrink-0">
            <div className="text-muted-foreground text-sm">Imagem da notícia</div>
          </div>
        )}
        
        <CardContent className="p-6 space-y-3 flex-grow flex flex-col">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-grow">
            {title}
          </h3>
          
          <p className="text-muted-foreground text-sm line-clamp-3 flex-grow">
            {description}
          </p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

export default NewsCard;
