import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  fieldId: string
  copiedField: string | null
  onCopy: (text: string, fieldId: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  title?: string
}

export default function CopyButton({
  text,
  fieldId,
  copiedField,
  onCopy,
  size = 'md',
  className = '',
  title = 'Copy to clipboard'
}: CopyButtonProps) {
  const isCopied = copiedField === fieldId

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const iconSize = sizeClasses[size]

  return (
    <button
      onClick={() => onCopy(text, fieldId)}
      className={`p-1 hover:bg-gray-600 rounded transition-colors ${className}`}
      title={title}
    >
      {isCopied ? (
        <Check className={`${iconSize} text-green-400`} />
      ) : (
        <Copy className={`${iconSize} text-gray-400`} />
      )}
    </button>
  )
}
