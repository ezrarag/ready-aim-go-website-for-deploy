import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function PartnerNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Partner Not Found</h1>
        <p className="text-gray-600 mb-6">
          The partner you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </Card>
    </div>
  )
}


