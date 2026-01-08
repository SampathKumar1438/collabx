import { useDropzone } from 'react-dropzone'
import {
  X,
  File,
  Image,
  MusicNote,
  VideoCamera
} from '@phosphor-icons/react'
import { useCallback } from 'react'

function getFileIcon(type) {
  if (type.startsWith('image')) return <Image size={24} weight='duotone' />;
  if (type.startsWith('audio')) return <MusicNote size={24} weight='duotone' />;
  if (type.startsWith('video')) return <VideoCamera size={24} weight='duotone' />;
  return <File size={24} weight='duotone' />;
}

export default function ChatFileUpload({ files, setFiles, onSend }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles])
    },
    [setFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-stroke bg-gray/50 p-4 transition-colors duration-200 dark:border-strokedark dark:bg-boxdark-2">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg p-6 text-center transition-all duration-200 ${isDragActive ? 'bg-primary/10 scale-[1.02]' : 'hover:bg-gray'
          }`}
        role='button'
        tabIndex={0}
        aria-label='File upload area'
      >
        <input {...getInputProps()} aria-label='Upload files' />
        <p className="text-sm text-body dark:text-bodydark">
          Drag & drop files here or click to upload
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm shadow-card transition-all duration-200 hover:shadow-md dark:bg-boxdark"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-primary dark:text-secondary">
                  {getFileIcon(file.type)}
                </span>
                <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                <span className="text-xs text-body/70">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              <button
                onClick={() => removeFile(index)}
                className="text-body hover:text-danger transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 rounded-md p-1"
                aria-label={`Remove ${file.name}`}
              >
                <X size={18} weight='bold' />
              </button>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-3">
            <button
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-gray dark:border-strokedark dark:hover:bg-boxdark-2"
              onClick={() => setFiles([])}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={onSend}
            >
              Send {files.length} {files.length === 1 ? 'file' : 'files'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
