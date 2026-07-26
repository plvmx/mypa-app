'use client';

import { getErrorMessage } from '@/lib/errorUtils';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <p className="text-sm text-red-500">{getErrorMessage(error)}</p>;
}
