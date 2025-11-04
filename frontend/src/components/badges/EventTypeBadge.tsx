interface EventTypeBadgeProps {
  type: string
}

export function EventTypeBadge({ type }: EventTypeBadgeProps) {
  const getBadgeStyle = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'entretien':
      case 'interview':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'appel':
      case 'call':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'réunion':
      case 'meeting':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'formation':
      case 'training':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeStyle(type)}`}>
      {type || 'Inconnu'}
    </span>
  )
}
