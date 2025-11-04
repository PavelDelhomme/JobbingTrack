export default function Breadcrumb() {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Backoffice
          </span>
        </li>
      </ol>
    </nav>
  )
}
