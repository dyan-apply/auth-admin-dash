import CopyButton from './CopyButton'

interface CodeBlockProps {
  code: string
  language?: string
  label?: string
  fieldId: string
  copiedField: string | null
  onCopy: (text: string, fieldId: string) => void
  showLineNumbers?: boolean
  className?: string
}

export default function CodeBlock({
  code,
  language = 'text',
  label,
  fieldId,
  copiedField,
  onCopy,
  showLineNumbers = false,
  className = ''
}: CodeBlockProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-200">{label}</label>
          <CopyButton
            text={code}
            fieldId={fieldId}
            copiedField={copiedField}
            onCopy={onCopy}
          />
        </div>
      )}
      <pre className="text-xs text-gray-400 bg-gray-900 border border-gray-700 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  )
}
