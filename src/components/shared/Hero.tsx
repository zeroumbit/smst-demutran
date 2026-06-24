import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  bannerLink?: string;
  className?: string;
}

const Hero = ({
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  imageUrl,
  bannerLink,
  className
}: HeroProps) => {
  const HeroContent = () => (
    <div className={`relative ${className || 'bg-gradient-hero'} text-primary-foreground min-h-[400px] md:min-h-[450px] lg:min-h-[500px] flex items-center overflow-hidden`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10 flex items-center justify-center h-full">
        <div className="text-center animate-fade-in-up space-y-4 md:space-y-6">
          {subtitle && (
            <div className="inline-block">
              <span className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-semibold md:px-6 md:py-3 md:text-base">
                {subtitle}
              </span>
            </div>
          )}

          <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
            {title}
          </h1>

          {description && (
            <p className="text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto">
              {description}
            </p>
          )}

          {ctaText && ctaLink && (
            ctaLink.startsWith('#') ? (
              <a
                href={ctaLink}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.querySelector(ctaLink);
                  if (element) {
                    element.scrollIntoView({
                      behavior: 'smooth'
                    });
                  }
                }}
                className="inline-block mt-4 md:mt-6"
              >
                <Button variant="cta" size="lg" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 h-auto">
                  {ctaText}
                </Button>
              </a>
            ) : (
              <Link to={ctaLink} className="mt-4 md:mt-6 inline-block">
                <Button variant="cta" size="lg" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 h-auto">
                  {ctaText}
                </Button>
              </Link>
            )
          )}
        </div>

        {/* Banner Image Placeholder - can be replaced with actual banner */}
        {imageUrl && (
          <div className="mt-12 mx-auto animate-fade-in">
            {bannerLink ? (
              <a href={bannerLink} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <img
                  src={imageUrl}
                  alt="Banner"
                  className="w-full h-auto"
                />
              </a>
            ) : (
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={imageUrl}
                  alt="Banner"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return <HeroContent />;
};

export default Hero;
