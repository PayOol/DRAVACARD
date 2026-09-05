import { withBasePath } from "@/lib/base-path";

export default function DravaLogo({
  decorative = false,
  variant = "icon",
  className,
}: {
  decorative?: boolean;
  variant?: "icon" | "wordmark";
  className?: string;
}) {
  if (variant === "wordmark") {
    return (
      <span className={`drava-wordmark ${className ?? ""}`.trim()}>
        <img
          className="drava-wordmark-image dark:hidden"
          src={withBasePath("/images/drava-wordmark.svg")}
          alt={decorative ? "" : "DRAVA"}
          width={607}
          height={127}
        />
        <img
          className="drava-wordmark-image hidden dark:block"
          src={withBasePath("/images/drava-wordmark-dark.svg")}
          alt={decorative ? "" : "DRAVA"}
          width={607}
          height={127}
        />
      </span>
    );
  }

  return (
    <span className={`drava-logo ${className ?? ""}`.trim()}>
      <img
        className="drava-logo-image"
        src={withBasePath("/images/drava-logo-transparent.svg")}
        alt={decorative ? "" : "DRAVA"}
        width={280}
        height={207}
      />
    </span>
  );
}
