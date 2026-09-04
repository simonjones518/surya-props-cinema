import logoAsset from "@/assets/surya-logo.png.asset.json";

/** Company logo mark — defaults to Surya, overridable per company profile. */
export function BrandLogo({
  className = "h-10",
  src,
  alt = "Surya Cine Special Props logo",
}: {
  className?: string;
  src?: string;
  alt?: string;
}) {
  return (
    <img
      src={src || logoAsset.url}
      alt={alt}
      className={`w-auto object-contain ${className}`}
    />
  );
}
