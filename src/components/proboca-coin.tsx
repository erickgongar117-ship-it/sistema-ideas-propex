import Image from "next/image";

type ProbocaCoinProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

export function ProbocaCoin({ className = "", size = "md" }: ProbocaCoinProps) {
  return (
    <span aria-hidden className={`proboca-coin proboca-coin-${size} ${className}`.trim()}>
      <span className="proboca-coin-face">
        <Image
          alt=""
          fill
          priority={size === "xl"}
          sizes={size === "xl" ? "112px" : size === "lg" ? "64px" : size === "md" ? "32px" : "20px"}
          src="/brand/mejora-continua-icon.png"
        />
      </span>
    </span>
  );
}
