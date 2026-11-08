import { Compass } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden />}
      title="Page not found"
      description="The page you requested does not exist in PHYSICSLAB."
      action={
        <ButtonLink to="/" variant="primary" size="sm">
          Return to Dashboard
        </ButtonLink>
      }
    />
  );
}
