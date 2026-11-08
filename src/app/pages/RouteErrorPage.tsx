import { isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <div className="p-8">
      <EmptyState
        icon={<AlertTriangle className="size-5" aria-hidden />}
        title="Something went wrong"
        description={message}
        action={
          <ButtonLink to="/" variant="primary" size="sm">
            Return to Dashboard
          </ButtonLink>
        }
      />
    </div>
  );
}
