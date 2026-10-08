export function formatInr(value: string | number): string {
  const amount =
    typeof value === "number" ? value : Number(value.replace(/,/g, ""));
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
