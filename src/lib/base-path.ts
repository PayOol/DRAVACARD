const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const BASE_PATH =
  configuredBasePath === "" || configuredBasePath === "/"
    ? ""
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;

export function withBasePath(pathname: string) {
  const absolutePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${BASE_PATH}${absolutePath}`;
}
