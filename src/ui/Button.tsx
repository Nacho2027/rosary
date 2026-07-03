/** The gold-outline action button (Begin, Pray again). */
export function GoldButton({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`caps cursor-pointer rounded-md border border-gold-deep/50 bg-transparent px-5 py-2.5 text-sm text-gold-deep transition-colors duration-200 hover:bg-gold-deep/8 ${className}`}
    >
      {children}
    </button>
  )
}
