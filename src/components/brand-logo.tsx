import logoAsset from "@/assets/surya-logo.png.asset.json";

/** Official Surya Cine Special Props logo mark. */
export function BrandLogo({ className = "h-10" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Surya Cine Special Props logo"
      className={`w-auto object-contain ${className}`}
    />
  );
}