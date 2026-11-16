export function validBatchId(id) {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
// Extends the existing page URL; unrelated filters are deliberately preserved.
export function batchSelectionUrl(href, registry, id) {
  const url = new URL(href);
  url.searchParams.set("registry", registry);
  url.searchParams.set("registryView", "batches");
  if (validBatchId(id)) url.searchParams.set("batchId", id);
  else url.searchParams.delete("batchId");
  return url;
}
