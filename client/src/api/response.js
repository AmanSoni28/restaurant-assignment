export function expectArrayResponse(value, endpoint) {
  if (Array.isArray(value)) return value;

  const received = value === null ? 'null' : typeof value;
  throw new Error(
    `Expected a list from ${endpoint}, but received ${received}. Check that VITE_API_URL points to the Express backend, or unset it for a same-service deployment, then redeploy.`
  );
}
