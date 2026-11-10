import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  title: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

/** Diálogo modal nativo (<dialog>): foco preso, Esc fecha, fundo escurecido. */
export function Modal({ title, isOpen, onClose, children, wide = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal--wide' : ''}`}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal__body">
        <header className="modal__head">
          <h2>{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </header>
        {isOpen && children}
      </div>
    </dialog>
  )
}
