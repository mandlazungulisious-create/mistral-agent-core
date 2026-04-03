export function cleanDOM(dom: string): string {
  return dom
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 3000);
}
