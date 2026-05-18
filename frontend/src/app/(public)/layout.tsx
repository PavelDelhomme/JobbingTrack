export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pages publiques - pas d'authentification requise
  return <>{children}</>;
}
