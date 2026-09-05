import { withBasePath } from "@/lib/base-path";

export default function DravaLogo({
  decorative = false,
}: { decorative?: boolean }) {
  return (
    <span className="drava-logo">
      <img
        className="drava-logo-image"
        src={withBasePath("/images/drava-logo-transparent.svg")}
        alt={decorative ? "" : "DRAVA"}
        width={500}
        height={300}
      />
    </span>
  );
}
