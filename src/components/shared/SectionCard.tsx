import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  link?: string;
}

const SectionCard = ({ icon: Icon, title, description, link }: SectionCardProps) => {
  const CardWrapper = link ? "a" : "div";
  const cardProps = link
    ? {
        href: link,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "block group h-full",
      }
    : { className: "block h-full" };

  return (
    <CardWrapper {...cardProps}>
      <Card className="h-full border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg group-hover:scale-[1.02] cursor-pointer bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-xl group-hover:bg-gradient-primary transition-all duration-300">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-loose">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

export default SectionCard;
