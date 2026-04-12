export function extractApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const maybeError = error as any;

  const fromBody =
    maybeError?.error?.message ??
    maybeError?.error?.Message ??
    maybeError?.error?.title ??
    maybeError?.message;

  if (typeof fromBody === 'string' && fromBody.trim().length > 0) {
    return fromBody.trim();
  }

  const validationErrors = maybeError?.error?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const firstKey = Object.keys(validationErrors)[0];
    const firstValue = firstKey ? validationErrors[firstKey] : null;
    if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
      return firstValue[0];
    }
  }

  return fallback;
}

